import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Tracing WETH on Base Mainnet...\n");

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

    // Get recent transactions for our address
    console.log("🔍 Checking recent transactions...");
    
    try {
        // Get the latest block number
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`Latest block: ${latestBlock}`);
        
        // Check last 10 blocks for transactions involving our address
        for (let i = 0; i < 10; i++) {
            const blockNumber = latestBlock - i;
            const block = await ethers.provider.getBlock(blockNumber, true);
            
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.from === deployer.address || tx.to === deployer.address) {
                        console.log(`\nBlock ${blockNumber}:`);
                        console.log(`  Hash: ${tx.hash}`);
                        console.log(`  From: ${tx.from}`);
                        console.log(`  To: ${tx.to}`);
                        console.log(`  Value: ${ethers.formatEther(tx.value)} ETH`);
                        
                        // Check if this is a WETH transfer
                        if (tx.to === WETH) {
                            console.log(`  📋 This is a WETH interaction!`);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log("❌ Error checking recent transactions:", error instanceof Error ? error.message : String(error));
    }

    // Check all possible addresses where WETH might be
    console.log("\n🔍 Checking all possible WETH locations...");
    
    const addresses = [
        { name: "Deployer", address: deployer.address },
        { name: "Latest Factory", address: "0x6Fc250732bA7b0755AD480c16668a02d5daD57ee" },
        { name: "Latest Adapter", address: "0xaA7280808D5829715F5288633908685c5fc7C692" },
        { name: "Mock Test Factory", address: "0xF707cf2D5d1f504DfBd7C926ac8ef0b59f910C4e" },
        { name: "Step-by-step Factory", address: "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8" },
        { name: "Previous Test Factory", address: "0x292e93171bf4B51b7186f083C33678bCAa2246b0" },
        { name: "Earlier Test Factory", address: "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9" },
        { name: "Earlier Test Factory 2", address: "0xa5b2E851F0f233237B0Be3881AD4dFe002f8f5d2" },
        { name: "Earlier Test Factory 3", address: "0x123FB0cC8e8FB9c0375Dd21DdaCFD797E9F8008A" }
    ];

    // Also check if any credit line tokens were created
    const possibleCreditLines = [
        "0x1234567890123456789012345678901234567890", // Mock address
        "0x0000000000000000000000000000000000000000"  // Zero address
    ];

    // Generate some possible credit line addresses based on our factory deployments
    for (const factory of addresses) {
        if (factory.name.includes("Factory")) {
            // Try to predict credit line addresses
            const factoryAddress = factory.address;
            const salt = ethers.keccak256(ethers.toUtf8Bytes("CreditLineToken"));
            const predictedCreditLine = ethers.getCreateAddress({
                from: factoryAddress,
                nonce: 0 // First deployment
            });
            possibleCreditLines.push(predictedCreditLine);
        }
    }

    console.log("\n🔍 Checking predicted credit line addresses...");
    for (const creditLine of possibleCreditLines) {
        try {
            const wethBalance = await wethContract.balanceOf(creditLine);
            if (wethBalance > 0) {
                console.log(`💰 WETH found in credit line ${creditLine}: ${ethers.formatEther(wethBalance)} WETH`);
            }
        } catch (error) {
            // Ignore errors for invalid addresses
        }
    }

    // Check WETH contract for any unusual activity
    console.log("\n🔍 Checking WETH contract events...");
    try {
        const wethContractWithEvents = new ethers.Contract(WETH, [
            "event Transfer(address indexed from, address indexed to, uint256 value)",
            "event Approval(address indexed owner, address indexed spender, uint256 value)"
        ], ethers.provider);

        // Get recent transfer events from our address
        const filter = wethContractWithEvents.filters.Transfer(deployer.address);
        const events = await wethContractWithEvents.queryFilter(filter, latestBlock - 20, latestBlock);
        
        console.log(`Found ${events.length} recent WETH transfers from our address:`);
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

    console.log("\n💡 Summary:");
    console.log("If WETH is missing, it might be:");
    console.log("1. In a credit line token that was created");
    console.log("2. In the Aerodrome adapter");
    console.log("3. In a pool that was created");
    console.log("4. Transferred to an unexpected address");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
