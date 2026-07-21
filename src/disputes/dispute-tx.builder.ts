import { Injectable } from '@nestjs/common';
import { MeshTxBuilder, MeshWallet, BlockfrostProvider } from '@meshsdk/core';
// Using require to avoid typescript compilation issues if resolveJsonModule is false
const plutus = require('../assets/plutus.json');

@Injectable()
export class DisputeTxBuilder {
  private platformWallet: MeshWallet;
  private blockfrostProvider: BlockfrostProvider;
  private scriptCbor: string;

  constructor() {
    this.blockfrostProvider = new BlockfrostProvider(process.env.BLOCKFROST_PROJECT_ID || '');
    this.platformWallet = new MeshWallet({
      networkId: 0,
      fetcher: this.blockfrostProvider,
      signer: this.blockfrostProvider,
      key: {
        type: 'mnemonic',
        words: (process.env.PLATFORM_WALLET_MNEMONIC || '').split(' '),
      },
    });
    this.scriptCbor = plutus.validators[0].compiledCode;
  }

  async buildOpenDisputeTx(
    escrowUtxo: any, 
    newDatum: any, // The updated datum with Disputed state
    signerAddress: string,
    scriptAddress: string
  ): Promise<string> {
    const tx = new MeshTxBuilder({ fetcher: this.blockfrostProvider, evaluator: this.blockfrostProvider });
    
    // Redeemer for OpenDispute is alternative 1 (Release=0, OpenDispute=1, ResolveDispute=2, Refund=3)
    const redeemer = { data: { alternative: 1, fields: [] } };

    await tx
      .spendingPlutusScript('V3')
      .txIn(
        escrowUtxo.input.txHash,
        escrowUtxo.input.outputIndex,
        escrowUtxo.output.amount,
        escrowUtxo.output.address
      )
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(this.scriptCbor)
      .txOut(scriptAddress, escrowUtxo.output.amount)
      .txOutInlineDatumValue(newDatum) // The new datum with state = Disputed
      .changeAddress(signerAddress)
      .selectUtxosFrom(await this.blockfrostProvider.fetchAddressUTxOs(signerAddress))
      .complete();

    return tx.txHex;
  }

  async assembleAndSubmitResolveDispute(
    escrowUtxo: any,
    outcomeParams: {
      voterPkhs: string[],
      outcomeIndex: number, // ClientWins=0, FreelancerWins=1, SplitEqual=2
      payouts: { address: string, amount: string }[] // Where ADA should go based on outcome
    },
    partialSigCbors: string[],
    scriptAddress: string
  ): Promise<string> {
    const tx = new MeshTxBuilder({ fetcher: this.blockfrostProvider, evaluator: this.blockfrostProvider });
    
    // Redeemer ResolveDispute = alternative 2
    // Fields: [ List of VerificationKeyHash, DisputeOutcome ]
    const redeemer = {
      data: {
        alternative: 2,
        fields: [
          { list: outcomeParams.voterPkhs.map(pkh => ({ bytes: pkh })) },
          { alternative: outcomeParams.outcomeIndex, fields: [] }
        ]
      }
    };

    const platformAddress = this.platformWallet.getPaymentAddress();

    tx
      .spendingPlutusScript('V3')
      .txIn(
        escrowUtxo.input.txHash,
        escrowUtxo.input.outputIndex,
        escrowUtxo.output.amount,
        escrowUtxo.output.address
      )
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer)
      .txInScript(this.scriptCbor);

    // Add payouts based on outcome
    for (const payout of outcomeParams.payouts) {
      tx.txOut(payout.address, [{ unit: 'lovelace', quantity: payout.amount }]);
    }

    // Platform wallet pays fees
    tx.changeAddress(platformAddress)
      .selectUtxosFrom(await this.platformWallet.getUtxos());

    // Required signers are the admins (voterPkhs)
    for (const pkh of outcomeParams.voterPkhs) {
      tx.requiredSignerHash(pkh);
    }

    await tx.complete();
    const unsignedTx = tx.txHex;

    // Platform wallet signs to pay fee
    const platformSignedTx = await this.platformWallet.signTx(unsignedTx, true);

    // Merge admin signatures
    let finalTx = platformSignedTx;
    for (const adminSig of partialSigCbors) {
      finalTx = MeshTxBuilder.mergeWitnesses(finalTx, adminSig);
    }

    // Submit to Blockfrost
    const txHash = await this.blockfrostProvider.submitTx(finalTx);
    return txHash;
  }
}
