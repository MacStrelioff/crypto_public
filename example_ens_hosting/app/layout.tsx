import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Navigation from '../components/Navigation'

export const metadata: Metadata = {
  title: 'Credit Line dApp',
  description: 'A decentralized lending platform built on Base',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  )
}
