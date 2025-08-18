import DocsLayout from '../../components/DocsLayout'

export default function DocsPage() {
  return (
    <DocsLayout>
      <div className="prose prose-lg max-w-none">
        <h1>Welcome to Credit Line dApp Documentation</h1>
        
        <p className="text-xl text-gray-600 mb-8">
          A comprehensive guide to the Credit Line dApp - a decentralized lending platform built on Base.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">For Borrowers</h3>
            <p className="text-blue-700 mb-4">
              Learn how to create credit lines, manage interest payments, and set borrowing limits.
            </p>
            <a href="/docs/borrowers/creating" className="text-blue-600 hover:text-blue-800 font-medium">
              Get Started →
            </a>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2">For Lenders</h3>
            <p className="text-green-700 mb-4">
              Discover how to find investment opportunities, understand risks, and manage your portfolio.
            </p>
            <a href="/docs/lenders/finding" className="text-green-600 hover:text-green-800 font-medium">
              Start Investing →
            </a>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Smart Contracts</h3>
            <p className="text-purple-700 mb-4">
              Explore the technical architecture and smart contract interfaces.
            </p>
            <a href="/docs/contracts/factory" className="text-purple-600 hover:text-purple-800 font-medium">
              View Contracts →
            </a>
          </div>

          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">Roadmap</h3>
            <p className="text-orange-700 mb-4">
              See what's coming next and the development timeline.
            </p>
            <a href="/docs/roadmap/v0" className="text-orange-600 hover:text-orange-800 font-medium">
              View Roadmap →
            </a>
          </div>
        </div>

        <div className="mt-12">
          <h2>Quick Start</h2>
          <p>
            New to Credit Line dApp? Start with our quick start guide to get up and running in minutes.
          </p>
          <a href="/docs/quick-start" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Quick Start Guide
          </a>
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            Can't find what you're looking for? Check out our technical documentation or reach out to our community.
          </p>
          <div className="flex space-x-4">
            <a href="/docs/technical/architecture" className="text-blue-600 hover:text-blue-800">
              Technical Docs
            </a>
            <a href="/docs/technical/api" className="text-blue-600 hover:text-blue-800">
              API Reference
            </a>
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}
