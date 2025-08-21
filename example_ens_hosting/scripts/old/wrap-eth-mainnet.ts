import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔄 Wrapping ETH to WETH on Base Mainnet...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Your address:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    if (network.chainId !== 8453n) {
        console.log("❌ This script should be run on Base mainnet (chain ID 8453)");
        console.log("Run with: npx hardhat run scripts/wrap-eth-mainnet.ts --network base");
        return;
    }

    // Base Mainnet WETH address
    const WETH = "0x4200000000000000000000000000000000000006";

    // Check current balances
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    const wethContract = await ethers.getContractAt("IERC20", WETH);
    const wethBalance = await wethContract.balanceOf(deployer.address);

    console.log("Current balances:");
    console.log("- ETH:", ethers.formatEther(ethBalance), "ETH");
    console.log("- WETH:", ethers.formatEther(wethBalance), "WETH");

    // Calculate how much to wrap
    const amountToWrap = ethers.parseEther("0.002"); // Wrap 0.002 ETH to have some buffer
    const gasEstimate = ethers.parseEther("0.001"); // Estimate for gas
    const totalNeeded = amountToWrap + gasEstimate;

    console.log("\n📊 Wrapping Plan:");
    console.log("- Amount to wrap:", ethers.formatEther(amountToWrap), "ETH");
    console.log("- Gas estimate:", ethers.formatEther(gasEstimate), "ETH");
    console.log("- Total needed:", ethers.formatEther(totalNeeded), "ETH");

    if (ethBalance < totalNeeded) {
        console.log("❌ Insufficient ETH for wrapping");
        console.log("Need at least", ethers.formatEther(totalNeeded), "ETH");
        return;
    }

    // Wrap ETH to WETH
    console.log("\n🔄 Wrapping ETH to WETH...");
    try {
        const wethWithDeposit = new ethers.Contract(WETH, [
            "function deposit() external payable",
            "function balanceOf(address) external view returns (uint256)"
        ], deployer);
        
        const tx = await wethWithDeposit.deposit({ value: amountToWrap });
        console.log("✅ Wrapping transaction sent:", tx.hash);
        
        console.log("⏳ Waiting for transaction to be mined...");
        const receipt = await tx.wait();
        console.log("✅ Wrapping successful! Block:", receipt.blockNumber);
        console.log("💰 Gas used:", receipt.gasUsed.toString());

        // Check new balances
        const newEthBalance = await ethers.provider.getBalance(deployer.address);
        const newWethBalance = await wethContract.balanceOf(deployer.address);

        console.log("\n📊 New balances:");
        console.log("- ETH:", ethers.formatEther(newEthBalance), "ETH");
        console.log("- WETH:", ethers.formatEther(newWethBalance), "WETH");

        console.log("\n🎉 Ready for testing!");
        console.log("Run: npx hardhat run scripts/test-mainnet-tiny.ts --network base");

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
