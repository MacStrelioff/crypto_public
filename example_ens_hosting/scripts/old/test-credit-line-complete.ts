import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to wait for transaction to be mined
async function waitForTransaction(tx: any, description: string) {
    console.log(`⏳ Waiting for ${description} to be mined...`);
    console.log(`   Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ ${description} completed!`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    
    return receipt;
}

// Helper function to get higher gas price
async function getHigherGasPrice(multiplier: number = 2) {
    const feeData = await ethers.provider.getFeeData();
    const higherGasPrice = feeData.gasPrice * BigInt(multiplier);
    
    console.log(`   Current gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
    console.log(`   Using gas price: ${ethers.formatUnits(higherGasPrice, 'gwei')} gwei`);
    
    return higherGasPrice;
}

async function main() {
    console.log("🧪 Complete Credit Line Test (with proper transaction handling)...\n");

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

    try {
        console.log("🔍 Step 1: Deploying AerodromeAdapter...");
        const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
        const aerodromeAdapter = await AerodromeAdapter.deploy();
        await waitForTransaction(aerodromeAdapter.deploymentTransaction(), "AerodromeAdapter deployment");
        
        const adapterAddress = await aerodromeAdapter.getAddress();
        console.log(`   Adapter address: ${adapterAddress}`);

        console.log("\n🔍 Step 2: Deploying CreditLineFactory...");
        const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
        const factory = await CreditLineFactory.deploy(adapterAddress);
        await waitForTransaction(factory.deploymentTransaction(), "CreditLineFactory deployment");
        
        const factoryAddress = await factory.getAddress();
        console.log(`   Factory address: ${factoryAddress}`);

        console.log("\n🔍 Step 3: Authorizing factory to call adapter...");
        const higherGasPrice = await getHigherGasPrice(2);
        const authTx = await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true, {
            gasPrice: higherGasPrice
        });
        await waitForTransaction(authTx, "Factory authorization");

        console.log("\n🔍 Step 4: Transferring WETH to factory...");
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const initialLiquidity = ethers.parseEther("0.001"); // 0.001 WETH
        
        const transferTx = await wethContract.transfer(factoryAddress, initialLiquidity, {
            gasPrice: higherGasPrice
        });
        await waitForTransaction(transferTx, "WETH transfer to factory");

        // Check factory WETH balance
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`   Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);

        console.log("\n🔍 Step 5: Creating credit line via factory...");
        const createTx = await factory.createCreditLine(
            "Test Credit Line",           // name
            "TCL",                       // symbol
            WETH,                        // underlying asset
            ethers.parseEther("1000"),   // credit limit (1000 tokens)
            500,                         // APY (5% = 500 basis points)
            deployer.address,            // borrower
            initialLiquidity             // initial liquidity
        );
        
        await waitForTransaction(createTx, "Credit line creation");

        // Get the created credit line address
        const creditLines = await factory.getAllCreditLines();
        const creditLineAddress = creditLines[creditLines.length - 1];
        console.log(`   Credit line address: ${creditLineAddress}`);

        console.log("\n🔍 Step 6: Getting credit line information...");
        const creditLineInfo = await factory.getCreditLineInfo(creditLineAddress);
        
        console.log(`\n📊 Credit Line Info:`);
        console.log(`   Underlying Asset: ${creditLineInfo.status.underlyingAsset}`);
        console.log(`   Credit Limit: ${ethers.formatEther(creditLineInfo.status.creditLimit)} tokens`);
        console.log(`   APY: ${creditLineInfo.status.apy} basis points (${creditLineInfo.status.apy / 100}%)`);
        console.log(`   Borrower: ${creditLineInfo.status.borrower}`);
        console.log(`   Total Provided: ${ethers.formatEther(creditLineInfo.status.totalProvided)}`);
        console.log(`   Total Withdrawn: ${ethers.formatEther(creditLineInfo.status.totalWithdrawn)}`);
        console.log(`   Available Liquidity: ${ethers.formatEther(creditLineInfo.status.availableLiquidity)}`);

        console.log(`\n🏊 Aerodrome Position Info:`);
        console.log(`   Pool: ${creditLineInfo.position.pool}`);
        console.log(`   Full Range Token ID: ${creditLineInfo.position.fullRangeTokenId}`);
        console.log(`   Concentrated Token ID: ${creditLineInfo.position.concentratedTokenId}`);
        console.log(`   Position Exists: ${creditLineInfo.position.exists}`);

        // Check if pool was created
        if (creditLineInfo.position.pool !== "0x0000000000000000000000000000000000000000") {
            console.log(`\n✅ SUCCESS: Pool created successfully: ${creditLineInfo.position.pool}`);
            console.log(`\n🎉 Credit line system is working!`);
        } else {
            console.log(`\n❌ Pool creation failed`);
        }

        console.log(`\n📋 Final Contract Addresses:`);
        console.log(`   AerodromeAdapter: ${adapterAddress}`);
        console.log(`   CreditLineFactory: ${factoryAddress}`);
        console.log(`   CreditLineToken: ${creditLineAddress}`);

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
