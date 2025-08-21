import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    console.log("🔄 Wrapping ETH to WETH on Base Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    const address = deployer.address;
    
    console.log("Your address:", address);
    
    // Check current balances
    const ethBalance = await ethers.provider.getBalance(address);
    const WETH = "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH
    
    // Use the correct WETH9 interface based on the actual contract
    const wethAbi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function deposit() payable",
        "function withdraw(uint256 wad)",
        "function transfer(address dst, uint256 wad) returns (bool)",
        "function transferFrom(address src, address dst, uint256 wad) returns (bool)",
        "function approve(address guy, uint256 wad) returns (bool)",
        "function totalSupply() view returns (uint256)",
        "event Deposit(address indexed dst, uint256 wad)",
        "event Withdrawal(address indexed src, uint256 wad)"
    ];
    
    const wethContract = new ethers.Contract(WETH, wethAbi, deployer);
    const wethBalance = await wethContract.balanceOf(address);
    
    console.log("Current balances:");
    console.log("- ETH:", ethers.formatEther(ethBalance), "ETH");
    console.log("- WETH:", ethers.formatEther(wethBalance), "WETH");
    
    // Calculate how much to wrap (keep some ETH for gas)
    const gasReserve = ethers.parseEther("0.01"); // Keep 0.01 ETH for gas
    const availableToWrap = ethBalance - gasReserve;
    
    if (availableToWrap <= 0) {
        console.log("❌ Insufficient ETH to wrap (need to keep some for gas)");
        return;
    }
    
    // Wrap 0.1 ETH for testing (or less if not enough available)
    const amountToWrap = ethers.parseEther("0.1");
    const actualAmountToWrap = availableToWrap < amountToWrap ? availableToWrap : amountToWrap;
    
    console.log(`\n📦 Wrapping ${ethers.formatEther(actualAmountToWrap)} ETH to WETH...`);
    
    try {
        // Call the deposit function on WETH contract
        const tx = await wethContract.deposit({ value: actualAmountToWrap });
        console.log("Transaction hash:", tx.hash);
        
        // Wait for the transaction to be mined
        console.log("⏳ Waiting for transaction to be mined...");
        await tx.wait();
        
        console.log("✅ ETH successfully wrapped to WETH!");
        
        // Check new balances
        const newEthBalance = await ethers.provider.getBalance(address);
        const newWethBalance = await wethContract.balanceOf(address);
        
        console.log("\nUpdated balances:");
        console.log("- ETH:", ethers.formatEther(newEthBalance), "ETH");
        console.log("- WETH:", ethers.formatEther(newWethBalance), "WETH");
        
        console.log("\n🎉 You can now proceed with the credit line deployment!");
        
    } catch (error) {
        console.log("❌ Error wrapping ETH:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
