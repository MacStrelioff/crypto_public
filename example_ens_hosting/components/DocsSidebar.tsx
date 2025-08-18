'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface DocSection {
  title: string
  items: {
    name: string
    href: string
    description?: string
  }[]
}

const docSections: DocSection[] = [
  {
    title: 'Getting Started',
    items: [
      { name: 'Introduction', href: '/docs', description: 'Welcome to Credit Line dApp' },
      { name: 'Quick Start', href: '/docs/quick-start', description: 'Get up and running quickly' },
      { name: 'Installation', href: '/docs/installation', description: 'Setup and configuration' },
    ]
  },
  {
    title: 'Smart Contracts',
    items: [
      { name: 'Credit Line Factory', href: '/docs/contracts/factory', description: 'Deploy new credit lines' },
      { name: 'Credit Line Token', href: '/docs/contracts/token', description: 'ERC20 implementation' },
      { name: 'Principal Pool', href: '/docs/contracts/principal-pool', description: 'Manage deposits' },
      { name: 'Interest Pool', href: '/docs/contracts/interest-pool', description: 'Handle APY payments' },
      { name: 'Liquidity Manager', href: '/docs/contracts/liquidity-manager', description: 'Aerodrome integration' },
    ]
  },
  {
    title: 'For Borrowers',
    items: [
      { name: 'Creating Credit Lines', href: '/docs/borrowers/creating', description: 'How to create a credit line' },
      { name: 'Managing Interest', href: '/docs/borrowers/interest', description: 'Interest payment strategies' },
      { name: 'Credit Limits', href: '/docs/borrowers/limits', description: 'Setting and modifying limits' },
    ]
  },
  {
    title: 'For Lenders',
    items: [
      { name: 'Finding Opportunities', href: '/docs/lenders/finding', description: 'Discover credit lines' },
      { name: 'Investment Process', href: '/docs/lenders/investing', description: 'How to invest' },
      { name: 'Redemption Options', href: '/docs/lenders/redemption', description: 'Getting your money back' },
      { name: 'Risk Management', href: '/docs/lenders/risk', description: 'Understanding risks' },
    ]
  },
  {
    title: 'Technical',
    items: [
      { name: 'Architecture', href: '/docs/technical/architecture', description: 'System overview' },
      { name: 'API Reference', href: '/docs/technical/api', description: 'Smart contract interfaces' },
      { name: 'Security', href: '/docs/technical/security', description: 'Security considerations' },
    ]
  },
  {
    title: 'Roadmap',
    items: [
      { name: 'V0: Core Platform', href: '/docs/roadmap/v0', description: 'Basic lending functionality' },
      { name: 'V1: Social Features', href: '/docs/roadmap/v1', description: 'Farcaster integration' },
      { name: 'V2: ZK P2P', href: '/docs/roadmap/v2', description: 'Cross-chain payments' },
    ]
  }
]

export default function DocsSidebar() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Getting Started']))

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h2>
        
        <nav className="space-y-1">
          {docSections.map((section) => (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <span>{section.title}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    expandedSections.has(section.title) ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              {expandedSections.has(section.title) && (
                <div className="ml-4 mt-1 space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                        pathname === item.href
                          ? 'text-blue-600 bg-blue-50 border-l-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
