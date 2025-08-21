import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Reclaiming WETH from Factory...\n");

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

    // Contract addresses from our deployment
    const factoryAddress = "0x3627E21a934102bF2390C721954d91aa453C5f79";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`WETH address: ${WETH}`);

    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        const wethContract = await ethers.getContractAt("IERC20", WETH);

        // Check factory WETH balance
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);

        if (factoryBalance === 0n) {
            console.log("❌ Factory has no WETH to reclaim.");
            return;
        }

        // Check factory owner
        const factoryOwner = await factory.owner();
        console.log(`Factory owner: ${factoryOwner}`);
        console.log(`Deployer address: ${deployer.address}`);
        
        if (factoryOwner !== deployer.address) {
            console.log("❌ Deployer is not the factory owner. Cannot reclaim WETH.");
            return;
        }

        // Check deployer WETH balance before
        const deployerBalanceBefore = await wethContract.balanceOf(deployer.address);
        console.log(`Deployer WETH balance before: ${ethers.formatEther(deployerBalanceBefore)} WETH`);

        // Reclaim WETH from factory
        console.log("\n🔄 Reclaiming WETH from factory...");
        
        const reclaimTx = await factory.emergencyWithdraw(WETH, factoryBalance);
        console.log(`📝 Reclaim transaction: ${reclaimTx.hash}`);
        
        const receipt = await reclaimTx.wait();
        console.log(`✅ WETH reclaimed successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);

        // Check balances after
        const factoryBalanceAfter = await wethContract.balanceOf(factoryAddress);
        const deployerBalanceAfter = await wethContract.balanceOf(deployer.address);
        
        console.log(`\n💰 Balances after reclaim:`);
        console.log(`   Factory WETH: ${ethers.formatEther(factoryBalanceAfter)} WETH`);
        console.log(`   Deployer WETH: ${ethers.formatEther(deployerBalanceAfter)} WETH`);
        
        const reclaimed = deployerBalanceAfter - deployerBalanceBefore;
        console.log(`   WETH reclaimed: ${ethers.formatEther(reclaimed)} WETH`);

    } catch (error) {
        console.log("❌ Error:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
