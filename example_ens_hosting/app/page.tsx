'use client'

import WalletConnect from '../components/ConnectButton'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-200">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Lending dApp
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Connect your wallet to get started
        </p>
        <WalletConnect />
      </div>
    </main>
  )
}
