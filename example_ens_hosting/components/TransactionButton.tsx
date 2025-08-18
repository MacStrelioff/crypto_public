'use client'

import { useCallback, useState } from 'react'
import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from '@coinbase/onchainkit/transaction'
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction'
// Example transaction calls for a lending dApp
// This is a sample transaction that could represent creating a credit line
const calls = [
  {
    address: '0x4200000000000000000000000000000000000006' as `0x${string}`, // WETH on Base mainnet
    abi: [
      {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
    ] as const,
    functionName: 'approve',
    args: ['0x1234567890123456789012345678901234567890' as `0x${string}`, BigInt('1000000000000000000')], // 1 ETH
  },
]

const BASE_MAINNET_CHAIN_ID = 8453

export default function TransactionButtonComponent() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleOnStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status)
    if (status.statusName === 'success' || status.statusName === 'error') {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="mt-4 tx-scope">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Transact</h3>
      
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
  )
}
