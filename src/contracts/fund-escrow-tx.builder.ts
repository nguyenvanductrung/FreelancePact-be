import { Injectable } from '@nestjs/common';
import { MeshTxBuilder, BlockfrostProvider, serializePlutusScript } from '@meshsdk/core';
const plutus = require(process.cwd() + '/src/assets/plutus.json');

@Injectable()
export class FundEscrowTxBuilder {
  private blockfrostProvider: BlockfrostProvider;
  private scriptCbor: string;
  public scriptAddress: string;

  constructor() {
    this.blockfrostProvider = new BlockfrostProvider(process.env.BLOCKFROST_PROJECT_ID || '');
    this.scriptCbor = plutus.validators[0].compiledCode;
    
    // Network ID 0 for testnet (Preprod)
    const { address } = serializePlutusScript(
      { code: this.scriptCbor, version: 'V3' },
      undefined,
      0
    );
    this.scriptAddress = address;
  }

  async buildFundEscrowTx(
    clientPkh: string,
    freelancerPkh: string,
    councilPkhs: string[],
    threshold: number,
    amountLovelace: string,
    clientWalletAddress: string
  ): Promise<{ unsignedTxCbor: string, datumJson: string, scriptAddress: string }> {
    
    // Aiken EscrowDatum encoding:
    // {
    //   client: VerificationKeyHash,
    //   freelancer: VerificationKeyHash,
    //   council: List<VerificationKeyHash>,
    //   threshold: Int,
    //   escrow_lovelace: Int,
    //   state: EscrowState (Active = 0)
    // }
    const datum = {
      alternative: 0,
      fields: [
        { bytes: clientPkh },
        { bytes: freelancerPkh },
        { list: councilPkhs.map(pkh => ({ bytes: pkh })) },
        { int: threshold },
        { int: Number(amountLovelace) },
        { alternative: 0, fields: [] }
      ]
    };

    const tx = new MeshTxBuilder({ fetcher: this.blockfrostProvider, evaluator: this.blockfrostProvider });
    
    await tx
      .txOut(this.scriptAddress, [{ unit: 'lovelace', quantity: amountLovelace }])
      .txOutInlineDatumValue(datum)
      .changeAddress(clientWalletAddress)
      .selectUtxosFrom(await this.blockfrostProvider.fetchAddressUTxOs(clientWalletAddress))
      .complete();

    // We store the datum as a JSON string so we can parse and use it later in Dispute flows
    const datumJson = JSON.stringify(datum);
      
    return {
      unsignedTxCbor: tx.txHex,
      datumJson,
      scriptAddress: this.scriptAddress
    };
  }
}
