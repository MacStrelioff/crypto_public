import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to pause execution
function pause(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🧪 Testing Factory Credit Line Creation...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Your address:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    if (network.chainId !== 8453n) {
        console.log("❌ This script should be run on Base mainnet (chain ID 8453)");
        return;
    }

    // Base Mainnet addresses
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log("🔍 Deploying contracts...\n");

    try {
        // Deploy the AerodromeAdapter
        const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
        const aerodromeAdapter = await AerodromeAdapter.deploy();
        await aerodromeAdapter.waitForDeployment();
        const adapterAddress = await aerodromeAdapter.getAddress();
        console.log(`✅ AerodromeAdapter deployed: ${adapterAddress}`);

        // Deploy the CreditLineFactory
        const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
        const factory = await CreditLineFactory.deploy(adapterAddress);
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log(`✅ CreditLineFactory deployed: ${factoryAddress}`);

        // Pause to let transactions settle
        console.log("⏳ Pausing for 3 seconds...");
        await pause(3000);

        // Authorize the factory to call the adapter
        await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true);
        console.log("✅ Factory authorized to call adapter");

        // Pause to let transaction settle
        console.log("⏳ Pausing for 3 seconds...");
        await pause(3000);

        // Transfer WETH to the factory for initial liquidity
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const initialLiquidity = ethers.parseEther("0.001"); // 0.001 WETH
        
        await wethContract.transfer(factoryAddress, initialLiquidity);
        console.log(`✅ Transferred ${ethers.formatEther(initialLiquidity)} WETH to factory`);

        // Pause to let transaction settle
        console.log("⏳ Pausing for 3 seconds...");
        await pause(3000);

        // Check factory WETH balance
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);

        // Create a credit line using the factory
        console.log("\n🔄 Creating credit line via factory...");
        
        const tx = await factory.createCreditLine(
            "Test Credit Line",           // name
            "TCL",                       // symbol
            WETH,                        // underlying asset
            ethers.parseEther("1000"),   // credit limit (1000 tokens)
            500,                         // APY (5% = 500 basis points)
            deployer.address,            // borrower
            initialLiquidity             // initial liquidity
        );
        
        console.log(`📝 Credit line creation transaction: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Credit line created successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

        // Get the created credit line address
        const creditLines = await factory.getAllCreditLines();
        const creditLineAddress = creditLines[creditLines.length - 1];
        console.log(`   Credit line address: ${creditLineAddress}`);

        // Get credit line info
        const creditLineInfo = await factory.getCreditLineInfo(creditLineAddress);
        console.log(`\n📊 Credit Line Info:`);
        console.log(`   Underlying Asset: ${creditLineInfo.status.underlyingAsset}`);
        console.log(`   Credit Limit: ${ethers.formatEther(creditLineInfo.status.creditLimit)} tokens`);
        console.log(`   APY: ${creditLineInfo.status.apy} basis points (${creditLineInfo.status.apy / 100}%)`);
        console.log(`   Borrower: ${creditLineInfo.status.borrower}`);
        console.log(`   Total Provided: ${ethers.formatEther(creditLineInfo.status.totalProvided)}`);
        console.log(`   Total Withdrawn: ${ethers.formatEther(creditLineInfo.status.totalWithdrawn)}`);
        console.log(`   Available Liquidity: ${ethers.formatEther(creditLineInfo.status.availableLiquidity)}`);

        // Get Aerodrome position info
        console.log(`\n🏊 Aerodrome Position Info:`);
        console.log(`   Pool: ${creditLineInfo.position.pool}`);
        console.log(`   Full Range Token ID: ${creditLineInfo.position.fullRangeTokenId}`);
        console.log(`   Concentrated Token ID: ${creditLineInfo.position.concentratedTokenId}`);
        console.log(`   Position Exists: ${creditLineInfo.position.exists}`);

        // Check if pool was created
        if (creditLineInfo.position.pool !== "0x0000000000000000000000000000000000000000") {
            console.log(`\n✅ Pool created successfully: ${creditLineInfo.position.pool}`);
        } else {
            console.log(`\n❌ Pool creation failed`);
        }

    } catch (error) {
        console.log("❌ Error:", error instanceof Error ? error.message : String(error));
        
        // Try to decode the error
        if (error instanceof Error && error.message.includes("execution reverted")) {
            console.log("\n🔍 Attempting to decode error...");
            try {
                const errorData = error.message.match(/0x[a-fA-F0-9]+/);
                if (errorData) {
                    console.log(`Error data: ${errorData[0]}`);
                }
            } catch (decodeError) {
                console.log("Could not decode error");
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
