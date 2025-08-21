# Credit Line dApp

A decentralized lending platform where borrowers create credit lines and lenders fund them. Built on Base with ERC20 tokens and concentrated liquidity pools using Aerodrome.

## Overview

This dApp allows borrowers to create credit lines by:
1. Providing an underlying asset (e.g., WETH, USDC)
2. Setting a credit limit
3. Specifying an APY rate
4. Providing initial liquidity

The system creates two Aerodrome pools:
- A full range pool for general trading
- A concentrated liquidity pool for precise price management

## Smart Contracts

### CreditLineToken.sol
The main ERC20 token contract that represents a credit line. Key features:

- **Initialization**: Sets up credit line parameters and creates pools
- **Withdraw Credit**: Allows borrowers to withdraw underlying assets
- **Accrue Interest**: Updates pool prices to reflect accrued interest
- **Pool Management**: Creates and manages Aerodrome pools

### CreditLineFactory.sol
Factory contract for deploying new credit line tokens.

### Interfaces
- `ICreditLine.sol`: Main interface for credit line functionality
- `IAerodromeFactory.sol`: Interfaces for Aerodrome pool creation

## Frontend Components

### CreateCreditLine.tsx
Form component for creating new credit lines with:
- Underlying asset selection (WETH, USDC, USDbC, or custom)
- Credit limit input
- APY rate input (max 50%)
- Initial liquidity input
- Transaction execution via Coinbase OnchainKit

### ManageCreditLine.tsx
Component for managing existing credit lines with:
- Credit line selection
- Withdraw functionality
- Interest accrual
- Pool information display

## Key Features

### For Borrowers
- Create credit lines with configurable limits and APY rates
- Withdraw underlying assets at any time
- Update credit limits
- Pre-pay interest through pool price adjustments

### For Lenders
- Browse available credit lines
- Invest in ERC20 tokens representing credit lines
- Trade on secondary markets via Aerodrome
- Earn interest through price appreciation

### DeFi Integration
- Built on Base network
- Uses Aerodrome concentrated liquidity pools
- ERC20 token standard
- Seamless DeFi integration

## Technical Implementation

### Pool Creation
1. **Full Range Pool**: Created as a volatile pool on Aerodrome for general trading
2. **Concentrated Liquidity Pool**: Created with precise price positioning for interest accrual

### Interest Accrual
- Interest is accrued by adjusting the price in the concentrated liquidity pool
- Price increases over time based on the APY rate
- Borrowers can call `accrueInterest()` to update prices

### Liquidity Management
- Initial liquidity is provided by the borrower
- Liquidity is added to both pools during initialization
- Pool addresses are stored for future interactions

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Hardhat

### Installation
```bash
npm install
```

### Compile Contracts
```bash
npx hardhat compile
```

### Deploy Contracts
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

### Run Frontend
```bash
npm run dev
```

## Contract Addresses

### Base Mainnet
- Aerodrome Factory: `0x420DD381b31aEf6683db6B902084cB0FFECe40Da`
- WETH: `0x4200000000000000000000000000000000000006`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- USDbC: `0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA`

## Usage Flow

1. **Connect Wallet**: User connects their wallet using Coinbase Wallet
2. **Create Credit Line**: 
   - Select underlying asset
   - Set credit limit and APY
   - Provide initial liquidity
   - Execute transaction
3. **Manage Credit Line**:
   - View credit line details
   - Withdraw funds as needed
   - Accrue interest to update prices

## Security Considerations

- All contracts use OpenZeppelin's security libraries
- Reentrancy protection implemented
- Access control for borrower-only functions
- Input validation for all parameters
- Emergency withdrawal functions for contract owner

## Future Enhancements

- [ ] Implement concentrated liquidity pool creation
- [ ] Add liquidation mechanisms
- [ ] Implement credit scoring
- [ ] Add multi-asset support
- [ ] Create governance token
- [ ] Add insurance mechanisms

## License

MIT License
