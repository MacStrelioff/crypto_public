import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ENS Web App',
  description: 'A decentralized web application hosted on ENS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
