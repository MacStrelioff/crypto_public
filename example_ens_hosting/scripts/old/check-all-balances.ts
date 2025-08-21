import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Checking All Balances on Base Mainnet...\n");

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

    // Base Mainnet WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // All addresses from our recent tests
    const addresses = [
        { name: "Deployer", address: deployer.address },
        { name: "Latest Factory (canceled)", address: "0x6Fc250732bA7b0755AD480c16668a02d5daD57ee" },
        { name: "Latest Adapter", address: "0xaA7280808D5829715F5288633908685c5fc7C692" },
        { name: "Mock Test Factory", address: "0xF707cf2D5d1f504DfBd7C926ac8ef0b59f910C4e" },
        { name: "Step-by-step Factory", address: "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8" },
        { name: "Previous Test Factory", address: "0x292e93171bf4B51b7186f083C33678bCAa2246b0" },
        { name: "Earlier Test Factory", address: "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9" },
        { name: "Earlier Test Factory 2", address: "0xa5b2E851F0f233237B0Be3881AD4dFe002f8f5d2" },
        { name: "Earlier Test Factory 3", address: "0x123FB0cC8e8FB9c0375Dd21DdaCFD797E9F8008A" }
    ];

    console.log("🔍 Checking balances in all addresses...\n");

    let totalWethFound = 0n;
    let totalEthFound = 0n;

    for (const addr of addresses) {
        try {
            // Check ETH balance
            const ethBalance = await ethers.provider.getBalance(addr.address);
            
            // Check WETH balance
            const wethBalance = await wethContract.balanceOf(addr.address);
            
            console.log(`${addr.name} (${addr.address}):`);
            console.log(`  ETH: ${ethers.formatEther(ethBalance)} ETH`);
            console.log(`  WETH: ${ethers.formatEther(wethBalance)} WETH`);
            
            if (ethBalance > 0 || wethBalance > 0) {
                console.log(`  💰 HAS FUNDS!`);
                totalEthFound += ethBalance;
                totalWethFound += wethBalance;
            }
            console.log("");
            
        } catch (error) {
            console.log(`${addr.name} (${addr.address}):`);
            console.log(`  ❌ Error checking balance:`, error instanceof Error ? error.message : String(error));
            console.log("");
        }
    }

    console.log("📊 Summary:");
    console.log(`Total ETH found: ${ethers.formatEther(totalEthFound)} ETH`);
    console.log(`Total WETH found: ${ethers.formatEther(totalWethFound)} WETH`);

    if (totalEthFound > 0 || totalWethFound > 0) {
        console.log("\n💡 Funds found! You may want to reclaim them.");
        console.log("Run: npx hardhat run scripts/reclaim-weth.ts --network base");
    } else {
        console.log("\nℹ️  No funds found in deployed contracts.");
    }

    // Check deployer's current balance
    const deployerEth = await ethers.provider.getBalance(deployer.address);
    const deployerWeth = await wethContract.balanceOf(deployer.address);
    
    console.log("\n💰 Your Current Balances:");
    console.log(`ETH: ${ethers.formatEther(deployerEth)} ETH`);
    console.log(`WETH: ${ethers.formatEther(deployerWeth)} WETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
