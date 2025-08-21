'use client'

import { useState } from 'react'
import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from '@coinbase/onchainkit/transaction'
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction'

const BASE_MAINNET_CHAIN_ID = 8453

// Common token addresses on Base
const COMMON_TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
}

export default function CreateCreditLine() {
  const [underlyingAsset, setUnderlyingAsset] = useState(COMMON_TOKENS.WETH)
  const [creditLimit, setCreditLimit] = useState('10')
  const [apy, setApy] = useState('5')
  const [initialLiquidity, setInitialLiquidity] = useState('1')
  const [isLoading, setIsLoading] = useState(false)

  const handleOnStatus = (status: LifecycleStatus) => {
    console.log('Transaction status:', status)
    if (status.statusName === 'success' || status.statusName === 'error') {
      setIsLoading(false)
    }
  }

  // Convert values to the format expected by the smart contract
  const creditLimitWei = BigInt(parseFloat(creditLimit) * 10**18)
  const apyBasisPoints = BigInt(parseFloat(apy) * 100) // Convert percentage to basis points
  const initialLiquidityWei = BigInt(parseFloat(initialLiquidity) * 10**18)

  const calls = [
    {
      address: '0x1234567890123456789012345678901234567890' as `0x${string}`, // Factory address (placeholder)
      abi: [
        {
          name: 'createCreditLine',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            {
              name: 'params',
              type: 'tuple',
              components: [
                { name: 'underlyingAsset', type: 'address' },
                { name: 'creditLimit', type: 'uint256' },
                { name: 'apy', type: 'uint256' },
                { name: 'initialLiquidity', type: 'uint256' }
              ]
            }
          ],
          outputs: [{ name: '', type: 'address' }],
        },
      ] as const,
      functionName: 'createCreditLine',
      args: [{
        underlyingAsset: underlyingAsset as `0x${string}`,
        creditLimit: creditLimitWei,
        apy: apyBasisPoints,
        initialLiquidity: initialLiquidityWei
      }],
    },
  ]

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Credit Line</h2>
      
      <div className="space-y-4">
        {/* Underlying Asset */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Underlying Asset
          </label>
          <select
            value={underlyingAsset}
            onChange={(e) => setUnderlyingAsset(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={COMMON_TOKENS.WETH}>WETH</option>
            <option value={COMMON_TOKENS.USDC}>USDC</option>
            <option value={COMMON_TOKENS.USDbC}>USDbC</option>
            <option value="custom">Custom Address</option>
          </select>
          {underlyingAsset === 'custom' && (
            <input
              type="text"
              placeholder="Enter token address"
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setUnderlyingAsset(e.target.value)}
            />
          )}
        </div>

        {/* Credit Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credit Limit
          </label>
          <div className="relative">
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10"
              min="0"
              step="0.1"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
              {underlyingAsset === COMMON_TOKENS.WETH ? 'ETH' : 'tokens'}
            </div>
          </div>
        </div>

        {/* APY */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Annual Percentage Yield (APY)
          </label>
          <div className="relative">
            <input
              type="number"
              value={apy}
              onChange={(e) => setApy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="5"
              min="0"
              max="50"
              step="0.1"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
              %
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Maximum 50%</p>
        </div>

        {/* Initial Liquidity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Liquidity
          </label>
          <div className="relative">
            <input
              type="number"
              value={initialLiquidity}
              onChange={(e) => setInitialLiquidity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
              min="0"
              step="0.1"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
              {underlyingAsset === COMMON_TOKENS.WETH ? 'ETH' : 'tokens'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Amount of underlying asset to provide as initial liquidity
          </p>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div>Credit Limit: {creditLimit} {underlyingAsset === COMMON_TOKENS.WETH ? 'ETH' : 'tokens'}</div>
            <div>APY: {apy}%</div>
            <div>Initial Liquidity: {initialLiquidity} {underlyingAsset === COMMON_TOKENS.WETH ? 'ETH' : 'tokens'}</div>
          </div>
        </div>

        {/* Transaction Button */}
        <div className="mt-6">
          <Transaction
            chainId={BASE_MAINNET_CHAIN_ID}
            calls={calls}
            onStatus={handleOnStatus}
          >
            <TransactionButton />
            <TransactionSponsor />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction>
        </div>
      </div>
    </div>
  )
}
