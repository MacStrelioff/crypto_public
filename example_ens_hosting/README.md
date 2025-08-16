# Lending dApp

A simple lending dApp built on Base using Next.js and OnchainKit.

## Features

- ✅ Wallet connection (EOA and smart wallets)
- ✅ Smart wallet creation for new users
- ✅ Base network support
- ✅ Modern React with TypeScript

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

## Benefits of OnchainKit

- **Smart Wallet Creation**: New users can create wallets without leaving your app
- **Passkey Support**: Secure authentication using biometrics
- **Sponsored Transactions**: Gasless transactions for better UX
- **Simplified Setup**: Less configuration needed
- **Base-Optimized**: Specifically designed for Base ecosystem

## Next Steps

This is a minimal setup. You can now add:
- Lending/borrowing functionality
- Smart contract integration
- Transaction handling
- User interface improvements
