import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking all deployed contracts for tokens...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Checking with account:", deployer.address);

    // Base Sepolia addresses
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // All deployed contract addresses from our tests
    const contractAddresses = [
        // Factories
        "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9",
        "0xa5b2E851F0f233237B0Be3881AD4dFe002f8f5d2", 
        "0x123FB0cC8e8FB9c0375Dd21DdaCFD797E9F8008A",
        
        // Aerodrome Adapters
        "0x3A77269C9A608cC348A876eC0B1f5A7b0042Ee02",
        "0x211080e966B3206E6169B2e3F7fE4f6c73CaD8c2",
        "0x7DF0891bCD1e058bD5C6F1e2e93A04d4c64c1dDA",
        "0x65C1327828373116f6aC2fb2777E0Cf85FcC378c"
    ];

    console.log("📊 Checking WETH balances in all contracts...\n");

    let totalWETHFound = 0n;

    for (let i = 0; i < contractAddresses.length; i++) {
        const contractAddress = contractAddresses[i];
        
        try {
            const balance = await wethContract.balanceOf(contractAddress);
            console.log(`Contract ${i + 1} (${contractAddress}):`);
            console.log(`  WETH Balance: ${ethers.formatEther(balance)} WETH`);
            
            if (balance > 0) {
                totalWETHFound += balance;
                console.log(`  💰 Has WETH to reclaim`);
            }
            console.log("");
            
        } catch (error) {
            console.log(`Contract ${i + 1} (${contractAddress}):`);
            console.log(`  ❌ Error checking balance:`, error instanceof Error ? error.message : String(error));
            console.log("");
        }
    }

    console.log(`💰 Total WETH found in contracts: ${ethers.formatEther(totalWETHFound)} WETH`);
    
    // Check deployer's current balance
    const deployerBalance = await wethContract.balanceOf(deployer.address);
    console.log(`💰 Deployer's current WETH balance: ${ethers.formatEther(deployerBalance)} WETH`);
    
    if (totalWETHFound > 0) {
        console.log("\n💡 To reclaim WETH, run: npx hardhat run scripts/reclaim-weth.ts --network baseSepolia");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
