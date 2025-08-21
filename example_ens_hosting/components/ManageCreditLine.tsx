'use client'

import { useState, useEffect } from 'react'
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

interface CreditLine {
  address: string
  underlyingAsset: string
  creditLimit: string
  apy: string
  borrower: string
  fullRangePool: string
  concentratedPool: string
}

export default function ManageCreditLine() {
  const [creditLines, setCreditLines] = useState<CreditLine[]>([])
  const [selectedCreditLine, setSelectedCreditLine] = useState<string>('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleOnStatus = (status: LifecycleStatus) => {
    console.log('Transaction status:', status)
    if (status.statusName === 'success' || status.statusName === 'error') {
      setIsLoading(false)
    }
  }

  // Mock data - in a real app, this would come from blockchain queries
  useEffect(() => {
    // Simulate loading credit lines
    setCreditLines([
      {
        address: '0x1234567890123456789012345678901234567890',
        underlyingAsset: '0x4200000000000000000000000000000000000006',
        creditLimit: '10000000000000000000', // 10 ETH
        apy: '500', // 5%
        borrower: '0x1234567890123456789012345678901234567890',
        fullRangePool: '0x1234567890123456789012345678901234567890',
        concentratedPool: '0x1234567890123456789012345678901234567890'
      }
    ])
  }, [])

  const withdrawCalls = [
    {
      address: selectedCreditLine as `0x${string}`,
      abi: [
        {
          name: 'withdrawCredit',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'amount', type: 'uint256' }],
          outputs: [],
        },
      ] as const,
      functionName: 'withdrawCredit',
      args: [BigInt(parseFloat(withdrawAmount) * 10**18)],
    },
  ]

  const accrueInterestCalls = [
    {
      address: selectedCreditLine as `0x${string}`,
      abi: [
        {
          name: 'accrueInterest',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [],
          outputs: [],
        },
      ] as const,
      functionName: 'accrueInterest',
      args: [],
    },
  ]

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Credit Lines</h2>
      
      {creditLines.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No credit lines found. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Credit Line Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Credit Line
            </label>
            <select
              value={selectedCreditLine}
              onChange={(e) => setSelectedCreditLine(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a credit line...</option>
              {creditLines.map((cl, index) => (
                <option key={index} value={cl.address}>
                  Credit Line {index + 1} - {parseInt(cl.creditLimit) / 10**18} ETH - {parseInt(cl.apy) / 100}% APY
                </option>
              ))}
            </select>
          </div>

          {selectedCreditLine && (
            <>
              {/* Credit Line Details */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Credit Line Details</h3>
                {(() => {
                  const cl = creditLines.find(c => c.address === selectedCreditLine)
                  if (!cl) return null
                  
                  return (
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Address: {cl.address}</div>
                      <div>Credit Limit: {parseInt(cl.creditLimit) / 10**18} ETH</div>
                      <div>APY: {parseInt(cl.apy) / 100}%</div>
                      <div>Borrower: {cl.borrower}</div>
                      <div>Full Range Pool: {cl.fullRangePool}</div>
                      <div>Concentrated Pool: {cl.concentratedPool}</div>
                    </div>
                  )
                })()}
              </div>

              {/* Withdraw Credit */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdraw Credit</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Withdraw
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.1"
                        min="0"
                        step="0.01"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                        ETH
                      </div>
                    </div>
                  </div>

                  <Transaction
                    chainId={BASE_MAINNET_CHAIN_ID}
                    calls={withdrawCalls}
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

              {/* Accrue Interest */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Accrue Interest</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Update the price of the concentrated liquidity pool to reflect accrued interest.
                </p>

                <Transaction
                  chainId={BASE_MAINNET_CHAIN_ID}
                  calls={accrueInterestCalls}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
