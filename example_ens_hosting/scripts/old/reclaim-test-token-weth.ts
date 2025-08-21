import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Reclaiming WETH from Test Token...\n");

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

    // Contract addresses
    const testTokenAddress = "0xc29CFB6E21eF7cdfEb18C547252E297D6246a284"; // From our last test
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Test token address: ${testTokenAddress}`);
    console.log(`WETH address: ${WETH}`);

    try {
        const testToken = await ethers.getContractAt("CreditLineToken", testTokenAddress);
        const wethContract = await ethers.getContractAt("IERC20", WETH);

        // Check test token owner
        const testTokenOwner = await testToken.owner();
        console.log(`Test token owner: ${testTokenOwner}`);
        console.log(`Deployer address: ${deployer.address}`);
        
        if (testTokenOwner !== deployer.address) {
            console.log("❌ Deployer is not the test token owner. Cannot reclaim WETH.");
            return;
        }

        // Check WETH balance in test token
        const testTokenWethBalance = await wethContract.balanceOf(testTokenAddress);
        console.log(`Test token WETH balance: ${ethers.formatEther(testTokenWethBalance)} WETH`);

        if (testTokenWethBalance === 0n) {
            console.log("❌ Test token has no WETH to reclaim.");
            return;
        }

        // Check deployer WETH balance before
        const deployerBalanceBefore = await wethContract.balanceOf(deployer.address);
        console.log(`Deployer WETH balance before: ${ethers.formatEther(deployerBalanceBefore)} WETH`);

        // Reclaim WETH from test token using emergencyWithdraw
        console.log("\n🔄 Reclaiming WETH from test token...");
        
        const reclaimTx = await testToken.emergencyWithdraw(WETH, testTokenWethBalance);
        console.log(`📝 Reclaim transaction: ${reclaimTx.hash}`);
        
        const receipt = await reclaimTx.wait();
        console.log(`✅ WETH reclaimed successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);

        // Check balances after
        const testTokenBalanceAfter = await wethContract.balanceOf(testTokenAddress);
        const deployerBalanceAfter = await wethContract.balanceOf(deployer.address);
        
        console.log(`\n💰 Balances after reclaim:`);
        console.log(`   Test token WETH: ${ethers.formatEther(testTokenBalanceAfter)} WETH`);
        console.log(`   Deployer WETH: ${ethers.formatEther(deployerBalanceAfter)} WETH`);
        
        const reclaimed = deployerBalanceAfter - deployerBalanceBefore;
        console.log(`   WETH reclaimed: ${ethers.formatEther(reclaimed)} WETH`);

        // Also check if there are any NFTs in the test token that we can reclaim
        console.log("\n🔍 Checking for NFTs in test token...");
        
        try {
            const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";
            const adapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);
            
            const position = await adapter.getPosition(testTokenAddress);
            console.log(`   Full Range Token ID: ${position.fullRangeTokenId}`);
            console.log(`   Concentrated Token ID: ${position.concentratedTokenId}`);
            console.log(`   Position Exists: ${position.exists}`);
            
            if (position.exists) {
                console.log("   ⚠️  There are NFTs in the test token. Consider reclaiming them too.");
            }
            
        } catch (nftError) {
            console.log(`   ❌ Error checking NFTs: ${nftError instanceof Error ? nftError.message : String(nftError)}`);
        }

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
