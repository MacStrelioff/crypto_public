import DocsLayout from '../../../../components/DocsLayout'

export default function FactoryPage() {
  return (
    <DocsLayout>
      <div className="prose prose-lg max-w-none">
        <h1>Credit Line Factory</h1>
        
        <p className="text-xl text-gray-600 mb-8">
          The Credit Line Factory is the main entry point for creating new credit lines. It deploys and manages individual credit line contracts.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Contract Address:</strong> <code className="bg-blue-100 px-2 py-1 rounded">0x...</code> (Base Mainnet)
              </p>
            </div>
          </div>
        </div>

        <h2>Overview</h2>
        <p>
          The Credit Line Factory is responsible for deploying new credit line contracts. Each credit line is represented by an ERC20 token 
          that lenders can purchase to fund the borrower's credit line.
        </p>

        <h2>Key Functions</h2>

        <h3>createCreditLine</h3>
        <div className="bg-gray-50 p-4 rounded-lg my-4">
          <pre className="text-sm overflow-x-auto">
{`function createCreditLine(
    string memory name,
    uint256 creditLimit,
    uint256 apy,
    address underlyingAsset
) external returns (address creditLineAddress)`}
          </pre>
        </div>

        <h4>Parameters</h4>
        <ul>
          <li><strong>name:</strong> The name of the credit line (e.g., "CL.1234.001")</li>
          <li><strong>creditLimit:</strong> Maximum amount that can be borrowed</li>
          <li><strong>apy:</strong> Annual percentage yield (in basis points, e.g., 500 = 5%)</li>
          <li><strong>underlyingAsset:</strong> Address of the underlying token (USDC, crvUSD, etc.)</li>
        </ul>

        <h4>Returns</h4>
        <p>The address of the newly deployed credit line contract.</p>

        <h3>getCreditLinesByBorrower</h3>
        <div className="bg-gray-50 p-4 rounded-lg my-4">
          <pre className="text-sm overflow-x-auto">
{`function getCreditLinesByBorrower(address borrower) 
    external view returns (address[] memory creditLines)`}
          </pre>
        </div>

        <h2>Events</h2>

        <h3>CreditLineCreated</h3>
        <div className="bg-gray-50 p-4 rounded-lg my-4">
          <pre className="text-sm overflow-x-auto">
{`event CreditLineCreated(
    address indexed borrower,
    address indexed creditLine,
    string name,
    uint256 creditLimit,
    uint256 apy,
    address underlyingAsset
)`}
          </pre>
        </div>

        <h2>Usage Examples</h2>

        <h3>Creating a Credit Line</h3>
        <div className="bg-gray-50 p-4 rounded-lg my-4">
          <pre className="text-sm overflow-x-auto">
{`// Example: Create a $10,000 USDC credit line with 5% APY
const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);

const tx = await factory.createCreditLine(
    "CL.1234.001",
    ethers.utils.parseUnits("10000", 6), // 10,000 USDC (6 decimals)
    500, // 5% APY (500 basis points)
    usdcAddress
);

const receipt = await tx.wait();
const event = receipt.events.find(e => e.event === 'CreditLineCreated');
const creditLineAddress = event.args.creditLine;`}
          </pre>
        </div>

        <h3>Querying Credit Lines</h3>
        <div className="bg-gray-50 p-4 rounded-lg my-4">
          <pre className="text-sm overflow-x-auto">
{`// Get all credit lines created by a borrower
const creditLines = await factory.getCreditLinesByBorrower(borrowerAddress);

// Iterate through credit lines
for (const creditLineAddress of creditLines) {
    const creditLine = await ethers.getContractAt("CreditLineToken", creditLineAddress);
    const name = await creditLine.name();
    const creditLimit = await creditLine.creditLimit();
    console.log(\`Credit Line: \${name}, Limit: \${creditLimit}\`);
}`}
          </pre>
        </div>

        <h2>Security Considerations</h2>
        <ul>
          <li><strong>Access Control:</strong> Only the factory owner can upgrade the implementation</li>
          <li><strong>Input Validation:</strong> All parameters are validated before deployment</li>
          <li><strong>Gas Optimization:</strong> Uses minimal proxy pattern for efficient deployment</li>
          <li><strong>Reentrancy Protection:</strong> Protected against reentrancy attacks</li>
        </ul>

        <h2>Integration with Other Contracts</h2>
        <p>
          The factory works closely with several other contracts in the system:
        </p>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-600">Credit Line Token</h4>
            <p className="text-sm text-gray-600 mt-1">
              Each credit line deploys an ERC20 token that represents the investment opportunity.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-600">Principal Pool</h4>
            <p className="text-sm text-gray-600 mt-1">
              Manages the actual deposits and redemptions for each credit line.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-600">Interest Pool</h4>
            <p className="text-sm text-gray-600 mt-1">
              Handles interest payments and vesting schedules.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-600">Liquidity Manager</h4>
            <p className="text-sm text-gray-600 mt-1">
              Manages Aerodrome pool integration for secondary market trading.
            </p>
          </div>
        </div>

        <h2>Related Documentation</h2>
        <div className="grid md:grid-cols-2 gap-4 my-6">
          <a href="/docs/contracts/token" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <h4 className="font-semibold text-gray-900">Credit Line Token</h4>
            <p className="text-sm text-gray-600 mt-1">Learn about the ERC20 implementation</p>
          </a>
          
          <a href="/docs/technical/architecture" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <h4 className="font-semibold text-gray-900">Architecture Overview</h4>
            <p className="text-sm text-gray-600 mt-1">Understand the system design</p>
          </a>
        </div>
      </div>
    </DocsLayout>
  )
}
