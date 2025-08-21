const { ethers } = require("hardhat");

async function pause(seconds: number) {
    console.log(`⏳ Waiting ${seconds} seconds...`);
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function waitForTransaction(tx: any, confirmations: number = 1) {
    console.log(`⏳ Waiting for transaction ${tx.hash} to be mined...`);
    const receipt = await tx.wait(confirmations);
    console.log(`✅ Transaction mined in block ${receipt.blockNumber}`);
    return receipt;
}

async function main() {
    console.log("🚀 Testing Step-by-Step Credit Line Creation");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    // Get WETH contract
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    // Check WETH balance
    const wethBalance = await weth.balanceOf(deployer.address);
    console.log("WETH balance:", ethers.formatEther(wethBalance));
    
    if (wethBalance < ethers.parseEther("0.001")) {
        console.log("❌ Insufficient WETH balance. Need at least 0.001 WETH");
        return;
    }
    
    // Deploy Simplified Aerodrome Adapter
    console.log("\n📦 Deploying Simplified Aerodrome Adapter...");
    const SimplifiedAerodromeAdapter = await ethers.getContractFactory("SimplifiedAerodromeAdapter");
    const adapter = await SimplifiedAerodromeAdapter.deploy();
    await adapter.waitForDeployment();
    console.log("Adapter deployed to:", await adapter.getAddress());
    
    // Deploy Credit Line Factory
    console.log("\n🏭 Deploying Credit Line Factory...");
    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const factory = await CreditLineFactory.deploy(await adapter.getAddress());
    await factory.waitForDeployment();
    console.log("Factory deployed to:", await factory.getAddress());
    
    // Authorize factory to call adapter
    console.log("\n🔐 Authorizing factory...");
    const authTx = await adapter.setAuthorizedCaller(await factory.getAddress(), true);
    await waitForTransaction(authTx);
    console.log("Factory authorized");
    
    // Transfer WETH to factory
    const initialLiquidity = ethers.parseEther("0.001");
    console.log("\n💰 Transferring WETH to factory...");
    const transferTx = await weth.transfer(await factory.getAddress(), initialLiquidity);
    await waitForTransaction(transferTx);
    console.log("WETH transferred to factory");
    
    // Step 1: Deploy and Initialize
    console.log("\n🔧 Step 1: Deploy and Initialize Credit Line Token...");
    const step1Tx = await factory.step1_DeployAndInitialize(
        "Test Credit Line",
        "TCL",
        WETH_ADDRESS,
        ethers.parseEther("1"), // 1 WETH credit limit
        500, // 5% APY
        deployer.address, // borrower
        initialLiquidity
    );
    const step1Receipt = await waitForTransaction(step1Tx);
    
    // Get creation ID and token address from events
    const step1Events = step1Receipt.logs.map((log: any) => {
        try {
            return factory.interface.parseLog(log);
        } catch (e) {
            return null;
        }
    }).filter(Boolean);
    
    console.log("Step 1 events:", step1Events.length);
    
    // Get the creation ID from the return value
    console.log("Getting step 1 return values...");
    const step1Result = await factory.step1_DeployAndInitialize.staticCall(
        "Test Credit Line",
        "TCL",
        WETH_ADDRESS,
        ethers.parseEther("1"),
        500,
        deployer.address,
        initialLiquidity
    );
    
    const [creationId, creditLineToken] = step1Result;
    console.log("Creation ID:", creationId);
    console.log("Credit Line Token:", creditLineToken);
    
    await pause(3);
    
    // Step 2: Mint and Approve
    console.log("\n🔧 Step 2: Mint and Approve...");
    const step2Tx = await factory.step2_MintAndApprove(creationId);
    await waitForTransaction(step2Tx);
    console.log("Step 2 completed");
    
    await pause(3);
    
    // Step 3: Create Pool
    console.log("\n🔧 Step 3: Create Pool...");
    const step3Tx = await factory.step3_CreatePool(creationId);
    await waitForTransaction(step3Tx);
    console.log("Step 3 completed");
    
    await pause(3);
    
    // Step 4: Finalize
    console.log("\n🔧 Step 4: Finalize...");
    const step4Tx = await factory.step4_Finalize(creationId);
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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });