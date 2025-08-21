import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Checking Balances on Base Mainnet...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Your address:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    if (network.chainId !== 8453n) {
        console.log("❌ This script should be run on Base mainnet (chain ID 8453)");
        console.log("Run with: npx hardhat run scripts/check-mainnet-balances.ts --network base");
        return;
    }

    // Base Mainnet WETH address
    const WETH = "0x4200000000000000000000000000000000000006";

    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    console.log("ETH balance:", ethers.formatEther(ethBalance), "ETH");

    // Check WETH balance
    const wethContract = await ethers.getContractAt("IERC20", WETH);
    const wethBalance = await wethContract.balanceOf(deployer.address);
    console.log("WETH balance:", ethers.formatEther(wethBalance), "WETH");

    // Calculate requirements
    const requiredEth = ethers.parseEther("0.005"); // For gas + WETH wrapping
    const requiredWeth = ethers.parseEther("0.001"); // For the test
    const totalRequired = requiredEth + requiredWeth;

    console.log("\n📊 Requirements for Tiny Test:");
    console.log("- Required ETH (for gas + WETH):", ethers.formatEther(requiredEth), "ETH");
    console.log("- Required WETH (for test):", ethers.formatEther(requiredWeth), "WETH");
    console.log("- Total required:", ethers.formatEther(totalRequired), "ETH equivalent");

    // Check if we have enough
    const hasEnoughEth = ethBalance >= requiredEth;
    const hasEnoughWeth = wethBalance >= requiredWeth;
    const hasEnoughTotal = ethBalance >= totalRequired;

    console.log("\n✅ Balance Check Results:");
    console.log("- Sufficient ETH for gas:", hasEnoughEth ? "✅ YES" : "❌ NO");
    console.log("- Sufficient WETH for test:", hasEnoughWeth ? "✅ YES" : "❌ NO");
    console.log("- Sufficient total funds:", hasEnoughTotal ? "✅ YES" : "❌ NO");

    if (hasEnoughTotal) {
        console.log("\n🎉 Ready to run the tiny test!");
        console.log("Run: npx hardhat run scripts/test-mainnet-tiny.ts --network base");
    } else {
        console.log("\n❌ Insufficient funds for testing");
        
        if (!hasEnoughEth) {
            console.log("- Need more ETH for gas costs");
        }
        
        if (!hasEnoughWeth && hasEnoughEth) {
            console.log("- Have enough ETH, can wrap to WETH during test");
        }
        
        console.log("\n💡 Options:");
        console.log("1. Add more ETH to your wallet");
        console.log("2. Use a faucet to get test ETH (if available)");
        console.log("3. Bridge ETH from Ethereum mainnet to Base");
    }

    // Show current ETH price estimate
    console.log("\n💵 Cost Estimate:");
    console.log("- Test amount: 0.001 WETH (~$0.30 USD)");
    console.log("- Estimated gas: 0.002-0.005 ETH (~$5-12 USD)");
    console.log("- Total estimated cost: ~$5-15 USD");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
