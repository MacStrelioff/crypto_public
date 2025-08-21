import { ethers } from "hardhat";
import { waitForTransactionWithConfirmations } from "./utils";

async function main() {
    console.log("🚀 Testing Simplified Aerodrome Adapter");
    
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
    const simplifiedAdapter = await SimplifiedAerodromeAdapter.deploy();
    await simplifiedAdapter.waitForDeployment();
    console.log("Simplified Adapter deployed to:", await simplifiedAdapter.getAddress());
    
    // Deploy Credit Line Factory
    console.log("\n🏭 Deploying Credit Line Factory...");
    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const factory = await CreditLineFactory.deploy(await simplifiedAdapter.getAddress());
    await factory.waitForDeployment();
    console.log("Factory deployed to:", await factory.getAddress());
    
    // Authorize factory to call adapter
    console.log("\n🔐 Authorizing factory...");
    const authTx = await simplifiedAdapter.setAuthorizedCaller(await factory.getAddress(), true);
    await authTx.wait();
    console.log("Factory authorized");
    
    // Transfer WETH to factory
    const initialLiquidity = ethers.parseEther("0.001");
    console.log("\n💰 Transferring WETH to factory...");
    const transferTx = await weth.transfer(await factory.getAddress(), initialLiquidity);
    await transferTx.wait();
    console.log("WETH transferred to factory");
    
    // Create credit line
    console.log("\n🎯 Creating credit line...");
    const createTx = await factory.createCreditLine();
    await createTx.wait();
    console.log("Credit line created successfully!");
    
    // Get the created credit line token
    const creditLineCount = await factory.creditLineCount();
    const creditLineToken = await factory.creditLines(creditLineCount - 1n);
    console.log("Credit line token address:", creditLineToken);
    
    // Get position info
    const position = await simplifiedAdapter.getPosition(creditLineToken);
    console.log("\n📊 Position Info:");
    console.log("- Full Range Token ID:", position.fullRangeTokenId.toString());
    console.log("- Pool Address:", position.pool);
    console.log("- Exists:", position.exists);
    
    console.log("\n✅ Simplified adapter test completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
