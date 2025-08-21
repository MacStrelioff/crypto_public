import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    console.log("💰 Checking WETH balance on Base Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    const address = deployer.address;
    
    console.log("Your address:", address);
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(address);
    console.log("ETH balance:", ethers.formatEther(ethBalance), "ETH");
    
    // Check WETH balance
    const WETH = "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH
    const wethContract = await ethers.getContractAt("IERC20", WETH);
    
    try {
        const wethBalance = await wethContract.balanceOf(address);
        console.log("WETH balance:", ethers.formatEther(wethBalance), "WETH");
        
        if (wethBalance > 0) {
            console.log("✅ You have WETH! You can proceed with deployment.");
        } else {
            console.log("❌ No WETH found. You need to wrap some ETH to WETH first.");
            console.log("\n📋 To wrap ETH to WETH:");
            console.log("1. Visit: https://sepolia.basescan.org/address/0x4200000000000000000000000000000000000006#writeContract");
            console.log("2. Connect your wallet");
            console.log("3. Call the 'deposit' function");
            console.log("4. Send the amount of ETH you want to wrap");
        }
    } catch (error) {
        console.log("❌ Error checking WETH balance:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
