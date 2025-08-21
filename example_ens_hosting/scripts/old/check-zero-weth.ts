import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking WETH in Zero Address...\n");

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

    // Check suspicious addresses
    const suspiciousAddresses = [
        { name: "Zero Address", address: "0x0000000000000000000000000000000000000000" },
        { name: "Mock Address", address: "0x1234567890123456789012345678901234567890" },
        { name: "Latest Factory", address: "0x6Fc250732bA7b0755AD480c16668a02d5daD57ee" },
        { name: "Latest Adapter", address: "0xaA7280808D5829715F5288633908685c5fc7C692" },
        { name: "Deployer", address: deployer.address }
    ];

    console.log("🔍 Checking WETH balances in suspicious addresses...\n");

    for (const addr of suspiciousAddresses) {
        try {
            const wethBalance = await wethContract.balanceOf(addr.address);
            console.log(`${addr.name} (${addr.address}):`);
            console.log(`  WETH: ${ethers.formatEther(wethBalance)} WETH`);
            
            if (wethBalance > 0) {
                console.log(`  💰 HAS WETH!`);
                
                // If it's the zero address, this is very suspicious
                if (addr.address === "0x0000000000000000000000000000000000000000") {
                    console.log(`  ⚠️  WARNING: WETH in zero address! This might indicate a contract bug.`);
                }
            }
            console.log("");
            
        } catch (error) {
            console.log(`${addr.name} (${addr.address}):`);
            console.log(`  ❌ Error checking balance:`, error instanceof Error ? error.message : String(error));
            console.log("");
        }
    }

    // Check if we can recover WETH from the zero address (probably not, but worth checking)
    console.log("💡 Analysis:");
    console.log("WETH in the zero address (0x0000...) is usually unrecoverable.");
    console.log("This might indicate:");
    console.log("1. A contract bug that sent WETH to the zero address");
    console.log("2. A failed transaction that resulted in WETH being burned");
    console.log("3. An issue with our contract logic");
    
    console.log("\n🔍 Let's check if this is our WETH by looking at recent transactions...");
    
    try {
        // Get the latest block number
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`Latest block: ${latestBlock}`);
        
        // Check if there were any recent WETH transfers to the zero address
        const wethContractWithEvents = new ethers.Contract(WETH, [
            "event Transfer(address indexed from, address indexed to, uint256 value)"
        ], ethers.provider);

        // Get recent transfer events TO the zero address
        const filter = wethContractWithEvents.filters.Transfer(null, "0x0000000000000000000000000000000000000000");
        const events = await wethContractWithEvents.queryFilter(filter, latestBlock - 50, latestBlock);
        
        console.log(`Found ${events.length} recent WETH transfers TO zero address:`);
        for (const event of events) {
            console.log(`  From: ${event.args?.from}`);
            console.log(`  To: ${event.args?.to}`);
            console.log(`  Amount: ${ethers.formatEther(event.args?.value)} WETH`);
            console.log(`  Block: ${event.blockNumber}`);
            console.log(`  Hash: ${event.transactionHash}`);
            console.log("");
        }
    } catch (error) {
        console.log("❌ Error checking WETH events:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
