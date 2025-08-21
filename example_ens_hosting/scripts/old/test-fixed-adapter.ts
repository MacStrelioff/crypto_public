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
    console.log("🔧 Testing Fixed Adapter with Higher Gas Limits...\n");

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

    try {
        console.log("🔍 Step 1: Deploying Fixed AerodromeAdapter...");
        const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
        const aerodromeAdapter = await AerodromeAdapter.deploy();
        await waitForTransactionWithConfirmations(aerodromeAdapter.deploymentTransaction(), "Fixed AerodromeAdapter deployment", 3);
        
        const adapterAddress = await aerodromeAdapter.getAddress();
        console.log(`   Fixed adapter address: ${adapterAddress}`);

        console.log("\n🔍 Step 2: Deploying Fixed CreditLineFactory...");
        const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
        const factory = await CreditLineFactory.deploy(adapterAddress);
        await waitForTransactionWithConfirmations(factory.deploymentTransaction(), "Fixed CreditLineFactory deployment", 3);
        
        const factoryAddress = await factory.getAddress();
        console.log(`   Fixed factory address: ${factoryAddress}`);

        console.log("\n🔍 Step 3: Authorizing factory to call adapter...");
        const authGasPrice = await getHigherGasPrice(3);
        const authTx = await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true, {
            gasPrice: authGasPrice
        });
        await waitForTransactionWithConfirmations(authTx, "Factory authorization", 3);

        console.log("\n🔍 Step 4: Transferring WETH to factory...");
        const WETH = "0x4200000000000000000000000000000000000006";
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const initialLiquidity = ethers.parseEther("0.001"); // 0.001 WETH
        
        const transferGasPrice = await getHigherGasPrice(3);
        const transferTx = await wethContract.transfer(factoryAddress, initialLiquidity, {
            gasPrice: transferGasPrice
        });
        await waitForTransactionWithConfirmations(transferTx, "WETH transfer to factory", 3);

        // Check factory WETH balance
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`   Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);

        console.log("\n🔍 Step 5: Creating credit line via fixed factory...");
        const createGasPrice = await getHigherGasPrice(3);
        const createTx = await factory.createCreditLine(
            "Fixed Credit Line",          // name
            "FCL",                       // symbol
            WETH,                        // underlying asset
            ethers.parseEther("1000"),   // credit limit (1000 tokens)
            500,                         // APY (5% = 500 basis points)
            deployer.address,            // borrower
            initialLiquidity,            // initial liquidity
            {
                gasPrice: createGasPrice,
                gasLimit: 12000000 // Very high gas limit for the fixed adapter
            }
        );
        
        await waitForTransactionWithConfirmations(createTx, "Fixed credit line creation", 5);

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
            console.log(`\n🎉 Fixed adapter is working!`);
        } else {
            console.log(`\n❌ Pool creation still failed`);
        }

        console.log(`\n📋 Final Contract Addresses:`);
        console.log(`   Fixed AerodromeAdapter: ${adapterAddress}`);
        console.log(`   Fixed CreditLineFactory: ${factoryAddress}`);
        console.log(`   CreditLineToken: ${creditLineAddress}`);

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
