import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Reclaiming WETH from Credit Line...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Recovering with account:", deployer.address);

    // Base Sepolia WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // Credit line address from our successful test
    const creditLineAddress = "0xe392b80CE5c4c72324233a9334E353E0F07a070B";
    
    console.log("Credit Line Address:", creditLineAddress);

    // Check WETH balance in the credit line
    const wethBalance = await wethContract.balanceOf(creditLineAddress);
    console.log("WETH balance in credit line:", ethers.formatEther(wethBalance));

    if (wethBalance === 0n) {
        console.log("ℹ️  No WETH to reclaim from credit line");
        return;
    }

    // Check if the deployer is the borrower
    console.log("\n🔍 Checking credit line ownership...");
    try {
        const creditLine = new ethers.Contract(creditLineAddress, [
            "function borrower() external view returns (address)",
            "function owner() external view returns (address)"
        ], ethers.provider);

        const borrower = await creditLine.borrower();
        const owner = await creditLine.owner();
        
        console.log("Borrower:", borrower);
        console.log("Owner:", owner);
        console.log("Deployer is borrower:", borrower === deployer.address);
        console.log("Deployer is owner:", owner === deployer.address);

        if (borrower === deployer.address || owner === deployer.address) {
            console.log("✅ Deployer has permission to withdraw");
        } else {
            console.log("❌ Deployer does not have permission to withdraw");
            return;
        }
    } catch (error) {
        console.log("❌ Error checking ownership:", error instanceof Error ? error.message : String(error));
        return;
    }

    // Try to withdraw WETH using the credit line's withdrawCredit function
    console.log("\n💸 Attempting to withdraw WETH from credit line...");
    try {
        const creditLine = new ethers.Contract(creditLineAddress, [
            "function withdrawCredit(uint256 amount) external",
            "function emergencyWithdraw(address token, uint256 amount) external onlyOwner"
        ], deployer);

        // Try withdrawCredit first
        try {
            console.log("📋 Trying withdrawCredit function...");
            const tx = await creditLine.withdrawCredit(wethBalance);
            await tx.wait();
            console.log("✅ Successfully withdrew WETH using withdrawCredit");
        } catch (error) {
            console.log("❌ withdrawCredit failed:", error instanceof Error ? error.message : String(error));
            
            // Try emergencyWithdraw as fallback
            try {
                console.log("📋 Trying emergencyWithdraw function...");
                const tx = await creditLine.emergencyWithdraw(WETH, wethBalance);
                await tx.wait();
                console.log("✅ Successfully withdrew WETH using emergencyWithdraw");
            } catch (error2) {
                console.log("❌ emergencyWithdraw failed:", error2 instanceof Error ? error2.message : String(error2));
            }
        }
    } catch (error) {
        console.log("❌ Error withdrawing WETH:", error instanceof Error ? error.message : String(error));
    }

    // Check final balances
    console.log("\n💰 Final Balances:");
    const finalWethBalance = await wethContract.balanceOf(creditLineAddress);
    const deployerWethBalance = await wethContract.balanceOf(deployer.address);
    
    console.log("Credit Line WETH balance:", ethers.formatEther(finalWethBalance));
    console.log("Deployer WETH balance:", ethers.formatEther(deployerWethBalance));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
