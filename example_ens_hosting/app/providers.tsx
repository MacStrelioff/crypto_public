'use client'

import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'wagmi/chains'
import type { ReactNode } from 'react'

export function Providers(props: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY

  // Debug: Log the API key status (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('API Key present:', !!apiKey)
    console.log('API Key length:', apiKey?.length || 0)
  }

  // If no API key is provided, show a helpful message
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-200 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Configuration Required
          </h1>
          <p className="text-gray-600 mb-4">
            Please set your OnchainKit API key in the environment variables.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-700 font-mono">
            NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Current environment: {process.env.NODE_ENV}
          </p>
        </div>
      </div>
    )
  }

  return (
    <OnchainKitProvider
      apiKey={apiKey}
      chain={base}
      config={{
        appearance: {
          mode: 'auto',
        }
      }}
    >
      {props.children}
    </OnchainKitProvider>
  )
}
