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

// Helper function to pause execution
async function pause(ms: number) {
    console.log(`⏸️  Pausing for ${ms / 1000} seconds...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🧪 Testing Complete Factory Flow...\n");

    // Pause to let any pending transactions settle
    await pause(10000);

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

    // Contract addresses
    const factoryAddress = "0x3627E21a934102bF2390C721954d91aa453C5f79";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`WETH address: ${WETH}`);

    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        const wethContract = await ethers.getContractAt("IERC20", WETH);

        // Check current balances
        const deployerWethBalance = await wethContract.balanceOf(deployer.address);
        const factoryWethBalance = await wethContract.balanceOf(factoryAddress);
        
        console.log(`\n💰 Current balances:`);
        console.log(`   Deployer WETH: ${ethers.formatEther(deployerWethBalance)} WETH`);
        console.log(`   Factory WETH: ${ethers.formatEther(factoryWethBalance)} WETH`);

        // Transfer WETH to factory if needed
        const initialLiquidity = ethers.parseEther("0.001");
        if (factoryWethBalance < initialLiquidity) {
            console.log(`\n💰 Transferring ${ethers.formatEther(initialLiquidity)} WETH to factory...`);
            
            if (deployerWethBalance < initialLiquidity) {
                console.log("❌ Deployer doesn't have enough WETH.");
                return;
            }
            
            const higherGasPrice = await getHigherGasPrice(2);
            const transferTx = await wethContract.transfer(factoryAddress, initialLiquidity, {
                gasPrice: higherGasPrice
            });
            await waitForTransaction(transferTx, "WETH transfer to factory");
            
            // Check factory balance after transfer
            const newFactoryBalance = await wethContract.balanceOf(factoryAddress);
            console.log(`   Factory WETH balance: ${ethers.formatEther(newFactoryBalance)} WETH`);
        }

        // Check existing credit lines
        console.log("\n🔍 Checking existing credit lines...");
        const existingCreditLines = await factory.getAllCreditLines();
        console.log(`   Existing credit lines: ${existingCreditLines.length}`);

        // Try to create credit line
        console.log("\n🔄 Creating credit line via factory...");
        
        const higherGasPrice = await getHigherGasPrice(2);
        const createTx = await factory.createCreditLine(
            "Test Credit Line",           // name
            "TCL",                       // symbol
            WETH,                        // underlying asset
            ethers.parseEther("1000"),   // credit limit (1000 tokens)
            500,                         // APY (5% = 500 basis points)
            deployer.address,            // borrower
            initialLiquidity,            // initial liquidity
            {
                gasPrice: higherGasPrice,
                gasLimit: 5000000 // Higher gas limit for complex operation
            }
        );
        
        await waitForTransaction(createTx, "Credit line creation");

        // Check if credit line was created
        console.log("\n🔍 Checking if credit line was created...");
        const newCreditLines = await factory.getAllCreditLines();
        console.log(`   Total credit lines: ${newCreditLines.length}`);
        
        if (newCreditLines.length > existingCreditLines.length) {
            const newCreditLineAddress = newCreditLines[newCreditLines.length - 1];
            console.log(`   ✅ New credit line created: ${newCreditLineAddress}`);
            
            // Get credit line info
            const creditLineInfo = await factory.getCreditLineInfo(newCreditLineAddress);
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
                console.log(`\n✅ SUCCESS: Pool created successfully: ${creditLineInfo.position.pool}`);
                console.log(`\n🎉 Complete factory flow is working!`);
            } else {
                console.log(`\n❌ Pool creation failed`);
            }
            
        } else {
            console.log(`   ❌ No new credit line was created`);
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
                    
                    // Try to decode common errors
                    const commonErrors = [
                        "error InsufficientBalance()",
                        "error TransferFailed()",
                        "error MintFailed()",
                        "error PoolCreationFailed()",
                        "error InvalidParameters()"
                    ];
                    
                    for (const errorSig of commonErrors) {
                        try {
                            const iface = new ethers.Interface([errorSig]);
                            const decoded = iface.parseError(errorData[0]);
                            console.log(`Decoded error: ${decoded.name}`);
                            break;
                        } catch (decodeError) {
                            // Continue to next error signature
                        }
                    }
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
