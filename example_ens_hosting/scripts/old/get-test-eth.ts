import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    console.log("💰 Getting Test ETH for Base Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    const address = deployer.address;
    
    console.log("Your address:", address);
    
    // Check current balance
    const balance = await ethers.provider.getBalance(address);
    console.log("Current balance:", ethers.formatEther(balance), "ETH");
    
    if (balance > ethers.parseEther("0.01")) {
        console.log("✅ You already have sufficient test ETH!");
        return;
    }
    
    console.log("\n🔗 Available Faucets:");
    console.log("1. Coinbase Base Sepolia Faucet:");
    console.log("   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
    console.log("   - Connect your wallet");
    console.log("   - Request test ETH");
    
    console.log("\n2. Base Sepolia Faucet:");
    console.log("   https://bridge.base.org/deposit");
    console.log("   - Bridge ETH from mainnet to Base Sepolia");
    
    console.log("\n3. Alchemy Base Sepolia Faucet:");
    console.log("   https://www.alchemy.com/faucets/base-sepolia-faucet");
    console.log("   - Sign up for free account");
    console.log("   - Request test ETH");
    
    console.log("\n4. QuickNode Base Sepolia Faucet:");
    console.log("   https://faucet.quicknode.com/base-sepolia");
    console.log("   - No signup required");
    console.log("   - Quick and easy");
    
    console.log("\n5. Chainlink Base Sepolia Faucet:");
    console.log("   https://faucets.chain.link/base-sepolia");
    console.log("   - Reliable and fast");
    
    console.log("\n📋 Instructions:");
    console.log("1. Visit any of the faucets above");
    console.log("2. Enter your address:", address);
    console.log("3. Request test ETH (usually 0.01-0.1 ETH)");
    console.log("4. Wait for the transaction to be processed");
    console.log("5. Run this script again to verify your balance");
    
    console.log("\n⏳ After getting test ETH, run:");
    console.log("npx hardhat run scripts/deploy-sepolia.ts --network baseSepolia");
    
    // Try to check balance again in a few seconds
    console.log("\n🔄 Checking balance again in 30 seconds...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    const newBalance = await ethers.provider.getBalance(address);
    console.log("New balance:", ethers.formatEther(newBalance), "ETH");
    
    if (newBalance > ethers.parseEther("0.005")) {
        console.log("✅ Great! You now have test ETH. You can proceed with deployment.");
    } else {
        console.log("❌ Still no test ETH. Please try one of the faucets above.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
