import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔐 Authorizing Factory and Testing Credit Line...\n");

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

    // Contract addresses from our deployments
    const adapterAddress = "0x84D92E50459Dca53861F11bDB919BDF033006B39";
    const factoryAddress = "0x07A12BacaDfe0D180e4e5136BbBce500869d1297";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Using AerodromeAdapter: ${adapterAddress}`);
    console.log(`Using CreditLineFactory: ${factoryAddress}`);

    try {
        // Get current gas price and increase it
        const feeData = await ethers.provider.getFeeData();
        const higherGasPrice = feeData.gasPrice * 2n;
        
        console.log(`Current gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
        console.log(`Using gas price: ${ethers.formatUnits(higherGasPrice, 'gwei')} gwei`);

        // Authorize the factory to call the adapter
        console.log("\n🔐 Authorizing factory to call adapter...");
        const aerodromeAdapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);
        const authTx = await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true, {
            gasPrice: higherGasPrice
        });
        console.log(`📝 Authorization transaction: ${authTx.hash}`);
        await authTx.wait();
        console.log("✅ Factory authorized to call adapter");

        // Transfer WETH to the factory for initial liquidity
        console.log("\n💰 Transferring WETH to factory...");
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const initialLiquidity = ethers.parseEther("0.001"); // 0.001 WETH
        
        const transferTx = await wethContract.transfer(factoryAddress, initialLiquidity, {
            gasPrice: higherGasPrice
        });
        console.log(`📝 WETH transfer transaction: ${transferTx.hash}`);
        await transferTx.wait();
        console.log(`✅ Transferred ${ethers.formatEther(initialLiquidity)} WETH to factory`);

        // Check factory WETH balance
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);

        // Create a credit line using the factory
        console.log("\n🔄 Creating credit line via factory...");
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        
        const createTx = await factory.createCreditLine(
            "Test Credit Line",           // name
            "TCL",                       // symbol
            WETH,                        // underlying asset
            ethers.parseEther("1000"),   // credit limit (1000 tokens)
            500,                         // APY (5% = 500 basis points)
            deployer.address,            // borrower
            initialLiquidity             // initial liquidity
        );
        
        console.log(`📝 Credit line creation transaction: ${createTx.hash}`);
        
        const receipt = await createTx.wait();
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
