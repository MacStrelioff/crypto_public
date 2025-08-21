import pkg from 'hardhat';
const { ethers } = pkg;

// Enhanced waiting function that waits for multiple block confirmations
async function waitForTransactionWithConfirmations(tx: any, description: string, confirmations: number = 5) {
    console.log(`⏳ Waiting for ${description} to be mined...`);
    console.log(`   Transaction hash: ${tx.hash}`);
    
    // First wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log(`✅ ${description} mined in block ${receipt.blockNumber}!`);
    console.log(`   Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   BaseScan: https://basescan.org/tx/${tx.hash}`);
    
    if (receipt.status === 0) {
        throw new Error(`Transaction failed: ${tx.hash}`);
    }
    
    // Now wait for additional confirmations
    console.log(`⏳ Waiting for ${confirmations} block confirmations...`);
    const targetBlock = receipt.blockNumber + confirmations;
    
    while (true) {
        const currentBlock = await ethers.provider.getBlockNumber();
        const confirmationsReceived = currentBlock - receipt.blockNumber;
        
        console.log(`   Current block: ${currentBlock}, confirmations: ${confirmationsReceived}/${confirmations}`);
        
        if (currentBlock >= targetBlock) {
            console.log(`✅ ${confirmations} confirmations received!`);
            break;
        }
        
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return receipt;
}

// Helper function to get higher gas price
async function getHigherGasPrice(multiplier: number = 3) {
    const feeData = await ethers.provider.getFeeData();
    const higherGasPrice = feeData.gasPrice * BigInt(multiplier);
    
    console.log(`   Current gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
    console.log(`   Using gas price: ${ethers.formatUnits(higherGasPrice, 'gwei')} gwei`);
    
    return higherGasPrice;
}

async function main() {
    console.log("🔄 Debug Test with Block Confirmations...\n");

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
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Factory address: ${factoryAddress}`);

    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const initialLiquidity = ethers.parseEther("0.001"); // 0.001 WETH
        
        // Check current balances
        console.log("\n💰 Checking balances...");
        const deployerBalance = await wethContract.balanceOf(deployer.address);
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        
        console.log(`   Deployer WETH balance: ${ethers.formatEther(deployerBalance)} WETH`);
        console.log(`   Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);
        
        if (deployerBalance < initialLiquidity) {
            console.log("❌ Not enough WETH in deployer account");
            return;
        }

        if (factoryBalance < initialLiquidity) {
            console.log("\n💰 Factory needs WETH, transferring...");
            
            const transferGasPrice = await getHigherGasPrice(3);
            const transferTx = await wethContract.transfer(factoryAddress, initialLiquidity, {
                gasPrice: transferGasPrice,
                gasLimit: 100000
            });
            await waitForTransactionWithConfirmations(transferTx, "WETH transfer to factory", 5);
            
            // Check factory balance after transfer and confirmations
            const newFactoryBalance = await wethContract.balanceOf(factoryAddress);
            console.log(`   Factory WETH balance after transfer: ${ethers.formatEther(newFactoryBalance)} WETH`);
            
            if (newFactoryBalance < initialLiquidity) {
                console.log("❌ WETH transfer failed or insufficient");
                return;
            }
        } else {
            console.log("✅ Factory already has sufficient WETH");
        }

        console.log("\n🔍 Creating credit line via factory (with debug events)...");
        const createGasPrice = await getHigherGasPrice(3);
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
                gasLimit: 10000000
            }
        );
        
        await waitForTransactionWithConfirmations(createTx, "Credit line creation", 5);

        // Get the created credit line address
        const creditLines = await factory.getAllCreditLines();
        const creditLineAddress = creditLines[creditLines.length - 1];
        console.log(`   Credit line address: ${creditLineAddress}`);

        console.log("\n✅ SUCCESS: Credit line created with debug events!");
        console.log(`\n🔍 Check debug events on BaseScan:`);
        console.log(`   Factory: https://basescan.org/address/${factoryAddress}`);
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
