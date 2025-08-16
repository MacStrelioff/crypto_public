'use client'

import { useState } from 'react'
import ENSResolver from '../components/ENSResolver'

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [ensName, setEnsName] = useState('')

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        setIsConnected(true)
        // You can add ENS resolution here
        console.log('Connected:', accounts[0])
      } catch (error) {
        console.error('Error connecting wallet:', error)
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ens-blue to-ens-purple">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4">
            Welcome to Your ENS Domain
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            This is your decentralized web application hosted on the Ethereum Name Service.
            Connect your wallet to get started.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Connection Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <h2 className="text-3xl font-semibold text-white mb-6">
              Connect Your Wallet
            </h2>
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="bg-white text-ens-purple px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="text-white">
                <p className="text-lg mb-4">✅ Wallet Connected!</p>
                <button
                  onClick={() => setIsConnected(false)}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="text-3xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold text-white mb-2">Decentralized</h3>
              <p className="text-white/80">
                Hosted on IPFS and accessible through your ENS domain
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-white mb-2">Secure</h3>
              <p className="text-white/80">
                Built with Web3 standards and cryptographic security
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-2">Fast</h3>
              <p className="text-white/80">
                Optimized for performance with modern web technologies
              </p>
            </div>
          </div>

          {/* ENS Resolver */}
          <div className="mb-8">
            <ENSResolver />
          </div>

          {/* ENS Info */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mt-8">
            <h2 className="text-3xl font-semibold text-white mb-6">
              About ENS Domains
            </h2>
            <div className="text-white/80 space-y-4">
              <p>
                The Ethereum Name Service (ENS) is a distributed, open, and extensible naming system 
                based on the Ethereum blockchain. ENS can be used to store and resolve names to resources.
              </p>
              <p>
                Your ENS domain serves as a human-readable identifier that can point to various resources 
                including IPFS content, traditional websites, or other blockchain addresses.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-white/60">
            Built with Next.js, TypeScript, and Tailwind CSS
          </p>
        </div>
      </div>
    </main>
  )
}
