# Changelog - Web3 Integration (Mock UI)

## [2026-06-26]

### Frontend (FreelancePact)
- **Web3 Infrastructure & Types**
  - Created `types/web3.ts` to define types for `WalletProvider`, `WalletState`, `EscrowStatus`, and `ReputationNFT`.
  - Created `lib/mock-web3.ts` to provide mock wallet connection functions with realistic delays and balances, as well as mock data for NFTs and contract escrow statuses.
- **Wallet Connection**
  - Added `contexts/WalletContext.tsx` to handle global wallet state with `localStorage` persistence.
  - Added `<WalletContextProvider>` to the root `app/layout.tsx`.
  - Created `WalletConnectButton` UI with a mock selection dialog (Nami vs Eternl).
  - Integrated `WalletConnectButton` into `components/shared/NavBar.tsx`.
  - Replaced the local NavBar in `app/contracts/[id]/page.tsx` with the global shared NavBar to ensure the connect button is accessible directly on the contract details page.
- **Escrow Simulation**
  - Created `EscrowStatusCard` in `components/web3/` displaying color-coded contract states.
  - Integrated "Deposit ADA to Escrow" functionality (simulated 1.5s transaction).
  - Added mock transaction history with Cardanoscan links.
  - Inserted the Escrow Card into the right sidebar of the contract details page (`app/contracts/[id]/page.tsx`).
- **Dispute & Council Vote Simulation**
  - Created `DisputeModal` to simulate a DAO Council Vote with 3 admins.
  - Integrated the modal into the `EscrowStatusCard` under an "Open Dispute (Simulation)" action button.
  - Simulates the resolution process changing state from `DISPUTED` to `RESOLVED` dynamically.
- **Reputation NFT Gallery**
  - Created `ReputationNFTGallery` in `components/profile/` to display mock on-chain CIP-25 NFT badges.
  - Displayed the gallery in the Freelancer Profile page (`app/profile/page.tsx`), reusing the existing layout styling.

### Backend/Docs (freelance-pact-be)
- **Web3 Specification Update**
  - Updated `docs/WEB3_SPEC.md` to shift the paradigm from "AI Agent tự quyết off-chain" to relying on Aiken smart contracts for on-chain condition checks, significantly improving decentralization and trustless security.
