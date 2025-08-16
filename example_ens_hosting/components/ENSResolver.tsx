'use client'

import { useState } from 'react'
import { ethers } from 'ethers'

interface ENSResolverProps {
  onResolve?: (name: string, address: string) => void
}

export default function ENSResolver({ onResolve }: ENSResolverProps) {
  const [ensName, setEnsName] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const resolveENS = async () => {
    if (!ensName) return

    setIsLoading(true)
    setError('')
    setResolvedAddress('')

    try {
      // Use a public provider (you can replace with your own)
      const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/demo')
      
      const address = await provider.resolveName(ensName)
      
      if (address) {
        setResolvedAddress(address)
        onResolve?.(ensName, address)
      } else {
        setError('ENS name not found')
      }
    } catch (err) {
      setError('Failed to resolve ENS name')
      console.error('ENS resolution error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const reverseResolve = async () => {
    if (!resolvedAddress) return

    setIsLoading(true)
    setError('')

    try {
      const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/demo')
      const name = await provider.lookupAddress(resolvedAddress)
      
      if (name) {
        setEnsName(name)
      } else {
        setError('No ENS name found for this address')
      }
    } catch (err) {
      setError('Failed to reverse resolve address')
      console.error('Reverse resolution error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
      <h3 className="text-2xl font-semibold text-white mb-6">ENS Resolver</h3>
      
      {/* Forward Resolution */}
      <div className="mb-6">
        <label className="block text-white mb-2">ENS Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            placeholder="vitalik.eth"
            className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:border-white/40"
          />
          <button
            onClick={resolveENS}
            disabled={isLoading || !ensName}
            className="px-6 py-2 bg-ens-blue text-white rounded-lg hover:bg-ens-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resolving...' : 'Resolve'}
          </button>
        </div>
      </div>

      {/* Reverse Resolution */}
      <div className="mb-6">
        <label className="block text-white mb-2">Ethereum Address</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={resolvedAddress}
            onChange={(e) => setResolvedAddress(e.target.value)}
            placeholder="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
            className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:border-white/40"
          />
          <button
            onClick={reverseResolve}
            disabled={isLoading || !resolvedAddress}
            className="px-6 py-2 bg-ens-purple text-white rounded-lg hover:bg-ens-purple/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resolving...' : 'Reverse'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Results */}
      {resolvedAddress && (
        <div className="p-4 bg-green-500/20 border border-green-500/40 rounded-lg">
          <p className="text-green-200">
            <strong>Resolved Address:</strong> {resolvedAddress}
          </p>
        </div>
      )}

      {ensName && resolvedAddress && (
        <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/40 rounded-lg">
          <p className="text-blue-200">
            <strong>ENS Name:</strong> {ensName}
          </p>
          <p className="text-blue-200">
            <strong>Address:</strong> {resolvedAddress}
          </p>
        </div>
      )}
    </div>
  )
}
