# Credit Line dApp

A decentralized lending platform built on Base using Next.js and OnchainKit, where borrowers can create credit lines and lenders can fund them. The platform leverages ERC20 tokens, concentrated liquidity pools, and social features to create a transparent and efficient lending ecosystem.

## Features

- ✅ Wallet connection (EOA and smart wallets)
- ✅ Smart wallet creation for new users
- ✅ Base network support
- ✅ Modern React with TypeScript
- 🔄 Credit line creation and management
- 🔄 ERC20 token-based lending
- 🔄 Aerodrome liquidity integration
- 🔄 Social features with Farcaster

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Get an OnchainKit API Key:
   - Go to [OnchainKit Dashboard](https://onchainkit.com)
   - Create a new project
   - Copy your API Key

3. Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here
```

4. Update the configuration (optional):
   - Open `app/providers.tsx`
   - Update the app name, logo URL, and terms/privacy URLs

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Tech Stack

- **Next.js 14** - React framework
- **OnchainKit** - Base's wallet connection solution
- **Base** - Layer 2 blockchain
- **Tailwind CSS** - Styling
- **Solidity** - Smart contract development
- **Aerodrome** - Concentrated liquidity pools

## Benefits of OnchainKit

- **Smart Wallet Creation**: New users can create wallets without leaving your app
- **Passkey Support**: Secure authentication using biometrics
- **Sponsored Transactions**: Gasless transactions for better UX
- **Simplified Setup**: Less configuration needed
- **Base-Optimized**: Specifically designed for Base ecosystem

---

## Product Overview & Roadmap

### Core Architecture

#### Credit Line Implementation
- **ERC20 Token**: Each credit line is represented by a tradeable ERC20 token
- **Token Naming**: `CL-{FID}-{CreditLineID}` (e.g., `CL.1234.1`)
- **Concentrated Liquidity**: Integration with Aerodome for secondary market liquidity
- **Underlying Assets**: Support for USDC, crvUSD, and other ERC20 tokens

#### Key Components
- **Credit Line Contract**: Manages borrowing limits, interest accrual, and redemption
- **Principal Pool**: Holds lender deposits, available for 1:1 redemption
- **Interest Pool**: Manages APY payments and vesting schedules
- **Liquidity Management**: Automated pool rebalancing for accurate price discovery

---

## V0: Core Lending Platform

### Borrower Features

#### Credit Line Creation
- A credit line 
- Borrowers can set:
    - Underlying asset (USDC, crvUSD, cbBTC, ETH, etc.). 
    - Credit limit. The credit limit is the max float of underlying ERC20, where float refers to: 
`float = ERC20 supply - balance in the Aerodome pool`. Transactions will error if they cause float > credit limit.
    - APY. This will control the rate of price appreciation of the token. The credit line contract will manage the liquidity to target the APY.

#### Interest Management
- Pre-pay interest deposits (locked until principal is repaid)
- Interest vests to lenders over time
- Withdraw excess interest after 26+ weeks of coverage
- Modify credit limits anytime (affects ERC20 supply)

### Lender Features

#### Investment Interface
- Browse and search available credit lines
- Deposit funds to receive ERC20 tokens
- Real-time APY and risk metrics
- Secondary market trading via Aerodrome

#### Redemption Options
- Claim accrued interest from interest pool
- Redeem ERC20 for principal when interest pool is overfunded
- 1:1 redemption from principal pool
- Secondary market exit via Aerodrome

### Technical Implementation

#### ERC20 Token Mechanics
```solidity
// Core token functions
function mint(address to, uint256 amount) external
function redeem(uint256 amount) external
function claimInterest() external
```

#### Interest Accrual System
- **Rebasing Token**: Lender balances increase at APY rate
- **Redemption Pool**: Borrower-funded pool for principal withdrawals

#### Liquidity Pool Integration
- **Price Accuracy**: Automated pool rebalancing for interest accrual
- **Transfer Hooks**: Price validation on Aerodrome transactions
- **Market Efficiency**: Concentrated liquidity for better price discovery

---

## V1: Social Integration (Farcaster)

### Borrower Enhancements

#### Credit Building
- **Social Feed**: Casts with text/image/video to build creditworthiness
- **Profile Integration**: Telegram links and social verification
- **Marketing**: Casts can promote credit lines and the platform

#### Credit Scoring
- **Wallet Analysis**: USDC deposit/withdrawal volume tracking
- **Social Proof**: Farcaster-linked address verification
- **Reputation System**: Community reviews and ratings

### Lender Features

#### Due Diligence Tools
- **Borrower Reviews**: Cast-based reviews pinned to profiles
- **Credit Metrics**: Automated scoring based on on-chain activity
- **Social Signals**: Community sentiment and engagement metrics

#### Discovery
- **Social Discovery**: Find credit lines through Farcaster network
- **Reputation Filtering**: Sort by borrower ratings and history
- **Community Curation**: Featured credit lines from trusted sources

---

## V2: ZK P2P Integration

### Cross-Chain Interest Payments

#### Payment Methods
- **Web2 → ZK**: Venmo/PayPal → zkBridge → credit line
- **Direct ZK**: zkP2P → specific credit line address
- **Multi-Asset**: Support for various payment networks

#### Technical Features
- **Privacy**: Zero-knowledge proofs for payment verification
- **Compliance**: KYC/AML integration where required
- **Automation**: Smart contract triggers for interest payments

---

## VN: Advanced Features

### Analytics & Transparency
- **Top Holders**: Display major credit line investors
- **Repayment Tracking**: Monitor borrower buyback activity
- **Market Metrics**: Volume, liquidity, and performance analytics

### Governance & Community
- **DAO Structure**: Community governance for platform parameters
- **Feature Proposals**: Open source development framework
- **Ecosystem Growth**: Developer tools and API access

---

## Technical Specifications

### Smart Contract Architecture

#### Core Contracts
1. **CreditLineFactory**: Deploys new credit line contracts
2. **CreditLineToken**: ERC20 implementation with interest accrual
3. **PrincipalPool**: Manages lender deposits and redemptions
4. **InterestPool**: Handles APY payments and vesting
5. **LiquidityManager**: Aerodrome pool integration and rebalancing

#### Key Functions
```solidity
// Credit line management
function createCreditLine(
    string memory name,
    uint256 creditLimit,
    uint256 apy,
    address underlyingAsset
) external returns (address);

// Interest and redemption
function depositInterest() external payable;
function claimInterest() external;
function redeemPrincipal(uint256 amount) external;
```

### Security Considerations
- **Reentrancy Protection**: Secure withdrawal mechanisms
- **Access Control**: Borrower-only functions properly restricted
- **Price Manipulation**: Liquidity pool safeguards
- **Emergency Pauses**: Circuit breakers for critical functions

---

## Development Roadmap

### Phase 1 (V0): Core Platform
- [ ] Smart contract development and testing
- [ ] Frontend miniapp development
- [ ] Aerodrome integration
- [ ] Security audit

### Phase 2 (V1): Social Features
- [ ] Farcaster API integration
- [ ] Credit scoring algorithms
- [ ] Social discovery features
- [ ] Review and reputation system

### Phase 3 (V2): P2P Payments
- [ ] ZK bridge integration
- [ ] Payment network APIs
- [ ] Compliance framework
- [ ] Cross-chain functionality

### Phase 4 (VN): Ecosystem
- [ ] Open source release
- [ ] Developer documentation
- [ ] Community governance
- [ ] Advanced analytics

---

## Open Source Vision

The platform will be open-sourced to enable:
- **Community Development**: Feature contributions from developers
- **Forking**: Custom implementations for specific use cases
- **Innovation**: Rapid iteration and experimentation
- **Transparency**: Full codebase visibility and auditability

---

*This document serves as a living specification that will evolve with community feedback and development progress.*
