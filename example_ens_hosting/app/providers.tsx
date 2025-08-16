'use client'

import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'wagmi/chains'
import type { ReactNode } from 'react'

export function Providers(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
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
