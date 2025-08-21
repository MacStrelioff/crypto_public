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
    console.log("🔄 Continuing Debug Test from Deployed Contracts...\n");

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

    // Use the contracts we just deployed
    const factoryAddress = "0x562C820290771cFe9B24ED44e0fddf8a258F0ada";
    const adapterAddress = "0xabA86EE69E72bE6D4b66227874a00CE5ff5d69df";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`Adapter address: ${adapterAddress}`);

    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        
        console.log("\n🔍 Step 1: Transferring WETH to factory...");
        const WETH = "0x4200000000000000000000000000000000000006";
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const initialLiquidity = ethers.parseEther("0.001"); // 0.001 WETH
        
        // Check current balances
        const deployerBalance = await wethContract.balanceOf(deployer.address);
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        
        console.log(`   Deployer WETH balance: ${ethers.formatEther(deployerBalance)} WETH`);
        console.log(`   Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);
        
        if (factoryBalance < initialLiquidity) {
            if (deployerBalance < initialLiquidity) {
                console.log("❌ Not enough WETH in deployer account");
                return;
            }
            
            const transferGasPrice = await getHigherGasPrice(2);
            const transferTx = await wethContract.transfer(factoryAddress, initialLiquidity, {
                gasPrice: transferGasPrice
            });
            await waitForTransaction(transferTx, "WETH transfer to factory");
            
            // Check factory balance after transfer
            const newFactoryBalance = await wethContract.balanceOf(factoryAddress);
            console.log(`   Factory WETH balance after transfer: ${ethers.formatEther(newFactoryBalance)} WETH`);
        } else {
            console.log("✅ Factory already has sufficient WETH");
        }

        console.log("\n🔍 Step 2: Creating credit line via factory (with debug events)...");
        const createGasPrice = await getHigherGasPrice(2);
        const createTx = await factory.createCreditLine(
            "Test Credit Line Debug",     // name
            "TCLD",                      // symbol
            WETH,                        // underlying asset
            ethers.parseEther("1000"),   // credit limit (1000 tokens)
            500,                         // APY (5% = 500 basis points)
            deployer.address,            // borrower
            initialLiquidity,            // initial liquidity
            {
                gasPrice: createGasPrice,
                gasLimit: 8000000 // Higher gas limit for complex operation with debug events
            }
        );
        
        await waitForTransaction(createTx, "Credit line creation");

        // Get the created credit line address
        const creditLines = await factory.getAllCreditLines();
        const creditLineAddress = creditLines[creditLines.length - 1];
        console.log(`   Credit line address: ${creditLineAddress}`);

        console.log("\n🔍 Step 3: Getting credit line information...");
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
            console.log(`\n🎉 Credit line system with debug events is working!`);
        } else {
            console.log(`\n❌ Pool creation failed`);
        }

        console.log(`\n🔍 Debug Events:`);
        console.log(`   Check BaseScan for detailed debug events:`);
        console.log(`   Factory: https://basescan.org/address/${factoryAddress}`);
        console.log(`   Adapter: https://basescan.org/address/${adapterAddress}`);
        console.log(`   Credit Line: https://basescan.org/address/${creditLineAddress}`);
        console.log(`   Transaction: https://basescan.org/tx/${createTx.hash}`);

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
