const { ethers } = require("hardhat");

async function pause(seconds) {
    console.log(`⏳ Waiting ${seconds} seconds...`);
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function getHigherGasPrice() {
    const provider = ethers.provider;
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.gasPrice;
    const higherGasPrice = currentGasPrice * 150n / 100n; // 50% higher
    console.log(`Current gas price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei`);
    console.log(`Using gas price: ${ethers.formatUnits(higherGasPrice, "gwei")} gwei`);
    return higherGasPrice;
}

async function getNextNonce() {
    const [deployer] = await ethers.getSigners();
    const nonce = await deployer.getNonce();
    console.log(`Using nonce: ${nonce}`);
    return nonce;
}

async function waitForBlocks(blocks = 3) {
    console.log(`⏳ Waiting for ${blocks} blocks...`);
    const provider = ethers.provider;
    const currentBlock = await provider.getBlockNumber();
    const targetBlock = currentBlock + blocks;
    
    while (await provider.getBlockNumber() < targetBlock) {
        await pause(1);
    }
    console.log(`✅ Waited for ${blocks} blocks (current block: ${await provider.getBlockNumber()})`);
}

async function waitForTransaction(tx, confirmations = 1) {
    console.log(`⏳ Waiting for transaction ${tx.hash} to be mined...`);
    const receipt = await tx.wait(confirmations);
    console.log(`✅ Transaction mined in block ${receipt.blockNumber}`);
    
    // Wait for 3 additional blocks after transaction confirmation
    await waitForBlocks(3);
    
    return receipt;
}

async function main() {
    console.log("🚀 Testing Step-by-Step Credit Line Creation");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get WETH contract on Base mainnet
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    // Check WETH balance
    const wethBalance = await weth.balanceOf(deployer.address);
    console.log("WETH balance:", ethers.formatEther(wethBalance));
    
    if (wethBalance < ethers.parseEther("0.001")) {
        console.log("❌ Insufficient WETH balance. Need at least 0.001 WETH");
        return;
    }
    
    // Deploy Simplified Aerodrome Adapter for mainnet
    console.log("\n📦 Deploying Simplified Aerodrome Adapter...");
    const SimplifiedAerodromeAdapter = await ethers.getContractFactory("SimplifiedAerodromeAdapter");
    const higherGasPrice1 = await getHigherGasPrice();
    const adapter = await SimplifiedAerodromeAdapter.deploy({
        gasPrice: higherGasPrice1
    });
    await adapter.waitForDeployment();
    console.log("Simplified Adapter deployed to:", await adapter.getAddress());
    
    await waitForBlocks(3); // Wait 3 blocks after deployment
    
    // Deploy Credit Line Factory
    console.log("\n🏭 Deploying Credit Line Factory...");
    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const higherGasPrice2 = await getHigherGasPrice();
    const factory = await CreditLineFactory.deploy(await adapter.getAddress(), {
        gasPrice: higherGasPrice2
    });
    await factory.waitForDeployment();
    console.log("Factory deployed to:", await factory.getAddress());
    
    await waitForBlocks(3); // Wait 3 blocks after deployment
    
    // Authorize factory to call adapter
    console.log("\n🔐 Authorizing factory...");
    const higherGasPrice3 = await getHigherGasPrice();
    const authTx = await adapter.setAuthorizedCaller(await factory.getAddress(), true, {
        gasPrice: higherGasPrice3
    });
    await waitForTransaction(authTx);
    console.log("Factory authorized");
    
    // Transfer WETH to factory
    const initialLiquidity = ethers.parseEther("0.001");
    console.log("\n💰 Transferring WETH to factory...");
    const higherGasPrice4 = await getHigherGasPrice();
    const transferTx = await weth.transfer(await factory.getAddress(), initialLiquidity, {
        gasPrice: higherGasPrice4
    });
    await waitForTransaction(transferTx);
    console.log("WETH transferred to factory");
    
            // Step 1: Deploy and Initialize
        console.log("\n🔧 Step 1: Deploy and Initialize Credit Line Token...");
        try {
            const higherGasPrice5 = await getHigherGasPrice();
            const step1Tx = await factory.step1_DeployAndInitialize(
                "Test Credit Line",
                "TCL",
                WETH_ADDRESS,
                ethers.parseEther("1"), // 1 WETH credit limit
                500, // 5% APY
                deployer.address, // borrower
                initialLiquidity,
                {
                    gasPrice: higherGasPrice5
                }
            );
            
            // Wait for transaction and get return values from events
            const step1Receipt = await waitForTransaction(step1Tx);
            console.log("Step 1 transaction completed, parsing events...");
            
            // Parse events to get token address
            let creditLineToken = null;
            
            for (const log of step1Receipt.logs) {
                try {
                    const event = factory.interface.parseLog(log);
                    if (event && event.name === "DebugFactoryStep") {
                        console.log("Debug event:", event.args.step, "for token:", event.args.creditLineToken);
                        if (event.args.step === "token_deployed") {
                            creditLineToken = event.args.creditLineToken;
                        }
                    }
                } catch (e) {
                    // Ignore unparseable logs
                }
            }
            
            console.log("Credit Line Token:", creditLineToken);
            
            if (!creditLineToken) {
                console.log("❌ Step 1 failed - no token address");
                return;
            }
            
            // Generate the creation ID using the same method as the factory
            // We need to get the block timestamp from the transaction receipt
            const block = await ethers.provider.getBlock(step1Receipt.blockNumber);
            const creationId = ethers.keccak256(ethers.solidityPacked(
                ["address", "uint256", "address"], 
                [creditLineToken, block.timestamp, deployer.address]
            ));
            
            console.log("Generated Creation ID:", creationId);
            
            console.log("Creation ID:", creationId);
            console.log("Credit Line Token:", creditLineToken);
            
            if (!creditLineToken) {
                console.log("❌ Step 1 failed - no token address");
                return;
            }
            
            await pause(3);
            
            // Step 2: Mint and Approve
            console.log("\n🔧 Step 2: Mint and Approve...");
            const higherGasPrice6 = await getHigherGasPrice();
            const step2Tx = await factory.step2_MintAndApprove(creationId, {
                gasPrice: higherGasPrice6
            });
            await waitForTransaction(step2Tx);
            console.log("Step 2 completed");
            
            await pause(3);
            
            // Step 3: Create Pool
            console.log("\n🔧 Step 3: Create Pool...");
            const higherGasPrice7 = await getHigherGasPrice();
            const step3Tx = await factory.step3_CreatePool(creationId, {
                gasPrice: higherGasPrice7
            });
            await waitForTransaction(step3Tx);
            console.log("Step 3 completed");
            
            await pause(3);
            
            // Step 4: Finalize
            console.log("\n🔧 Step 4: Finalize...");
            const higherGasPrice8 = await getHigherGasPrice();
            const step4Tx = await factory.step4_Finalize(creationId, {
                gasPrice: higherGasPrice8
            });
            await waitForTransaction(step4Tx);
            console.log("Step 4 completed");
            
            // Check final status
            console.log("\n📊 Final Status:");
            const creationStatus = await factory.getCreationStatus(creationId);
            console.log("- Step:", creationStatus.step);
            console.log("- Completed:", creationStatus.completed);
            console.log("- Credit Line Token:", creationStatus.creditLineToken);
            
            // Get position info
            const position = await adapter.getPosition(creationStatus.creditLineToken);
            console.log("\n📊 Position Info:");
            console.log("- Full Range Token ID:", position.fullRangeTokenId.toString());
            console.log("- Pool Address:", position.pool);
            console.log("- Exists:", position.exists);
            
            console.log("\n✅ Step-by-step test completed successfully!");
            
        } catch (error) {
            console.log("❌ Error in step 1:", error.message);
            console.log("Full error:", error);
        }
        
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });