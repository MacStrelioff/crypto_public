import DocsLayout from '../../../components/DocsLayout'

export default function QuickStartPage() {
  return (
    <DocsLayout>
      <div className="prose prose-lg max-w-none">
        <h1>Quick Start Guide</h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Get up and running with Credit Line dApp in minutes. This guide will walk you through the basics of creating and using credit lines.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Prerequisites:</strong> You'll need a Web3 wallet (like MetaMask) and some Base ETH for gas fees.
              </p>
            </div>
          </div>
        </div>

        <h2>Step 1: Connect Your Wallet</h2>
        <p>
          First, connect your Web3 wallet to the Credit Line dApp. We support MetaMask, WalletConnect, and other popular wallets.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg my-6">
          <h4 className="font-semibold mb-2">Supported Wallets:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>MetaMask</li>
            <li>WalletConnect</li>
            <li>Coinbase Wallet</li>
            <li>OnchainKit Smart Wallets</li>
          </ul>
        </div>

        <h2>Step 2: Choose Your Role</h2>
        <p>
          Credit Line dApp has two main user types: <strong>Borrowers</strong> and <strong>Lenders</strong>.
        </p>

        <div className="grid md:grid-cols-2 gap-6 my-8">
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-600 mb-3">For Borrowers</h3>
            <p className="text-gray-600 mb-4">
              Create credit lines to borrow funds from lenders. You'll need to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Choose an underlying asset (USDC, crvUSD, etc.)</li>
              <li>Set your credit limit</li>
              <li>Configure APY rates</li>
              <li>Pre-pay interest</li>
            </ul>
            <a href="/docs/borrowers/creating" className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium">
              Learn More →
            </a>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-600 mb-3">For Lenders</h3>
            <p className="text-gray-600 mb-4">
              Invest in credit lines to earn interest. You can:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Browse available credit lines</li>
              <li>Review borrower profiles and ratings</li>
              <li>Invest in ERC20 tokens</li>
              <li>Trade on secondary markets</li>
            </ul>
            <a href="/docs/lenders/finding" className="inline-block mt-4 text-green-600 hover:text-green-800 font-medium">
              Learn More →
            </a>
          </div>
        </div>

        <h2>Step 3: Create Your First Credit Line (Borrowers)</h2>
        <p>
          If you're a borrower, here's how to create your first credit line:
        </p>

        <div className="bg-gray-50 p-6 rounded-lg my-6">
          <ol className="list-decimal list-inside space-y-3">
            <li><strong>Select Asset:</strong> Choose USDC, crvUSD, or another supported token</li>
            <li><strong>Set Credit Limit:</strong> Define the maximum amount you can borrow</li>
            <li><strong>Configure APY:</strong> Set the interest rate for lenders</li>
            <li><strong>Pre-pay Interest:</strong> Deposit initial interest payments</li>
            <li><strong>Deploy:</strong> Create your credit line contract</li>
          </ol>
        </div>

        <h2>Step 4: Invest in Credit Lines (Lenders)</h2>
        <p>
          If you're a lender, here's how to start investing:
        </p>

        <div className="bg-gray-50 p-6 rounded-lg my-6">
          <ol className="list-decimal list-inside space-y-3">
            <li><strong>Browse Credit Lines:</strong> View available opportunities</li>
            <li><strong>Research Borrowers:</strong> Check profiles, ratings, and history</li>
            <li><strong>Review Terms:</strong> Understand APY, limits, and risks</li>
            <li><strong>Invest:</strong> Purchase ERC20 tokens representing your investment</li>
            <li><strong>Monitor:</strong> Track your investment and earned interest</li>
          </ol>
        </div>

        <h2>Next Steps</h2>
        <p>
          Now that you understand the basics, explore our detailed documentation:
        </p>

        <div className="grid md:grid-cols-3 gap-4 my-8">
          <a href="/docs/contracts/factory" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <h4 className="font-semibold text-gray-900">Smart Contracts</h4>
            <p className="text-sm text-gray-600 mt-1">Learn about the technical architecture</p>
          </a>
          
          <a href="/docs/technical/security" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <h4 className="font-semibold text-gray-900">Security</h4>
            <p className="text-sm text-gray-600 mt-1">Understand security considerations</p>
          </a>
          
          <a href="/docs/roadmap/v0" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <h4 className="font-semibold text-gray-900">Roadmap</h4>
            <p className="text-sm text-gray-600 mt-1">See what's coming next</p>
          </a>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Need Help?</strong> If you run into any issues, check our troubleshooting guide or reach out to our community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}
