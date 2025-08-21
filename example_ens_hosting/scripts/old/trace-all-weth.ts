import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Comprehensive WETH Tracing...\n");

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

    // ALL addresses we've deployed or interacted with (from our scripts)
    const allAddresses = [
        // Factories
        { name: "Latest Factory (canceled)", address: "0x6Fc250732bA7b0755AD480c16668a02d5daD57ee" },
        { name: "Latest Adapter", address: "0xaA7280808D5829715F5288633908685c5fc7C692" },
        { name: "Mock Test Factory", address: "0xF707cf2D5d1f504DfBd7C926ac8ef0b59f910C4e" },
        { name: "Step-by-step Factory", address: "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8" },
        { name: "Previous Test Factory", address: "0x292e93171bf4B51b7186f083C33678bCAa2246b0" },
        { name: "Earlier Test Factory", address: "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9" },
        { name: "Earlier Test Factory 2", address: "0xa5b2E851F0f233237B0Be3881AD4dFe002f8f5d2" },
        { name: "Earlier Test Factory 3", address: "0x123FB0cC8e8FB9c0375Dd21DdaCFD797E9F8008A" },
        
        // Credit Lines
        { name: "Credit Line 1", address: "0xe392b80CE5c4c72324233a9334E353E0F07a070B" },
        { name: "Credit Line 2", address: "0xd04E10D6601873cb28fDDC04839DFd3C0C95fDDD" },
        
        // Other contracts
        { name: "Contract 1", address: "0x3A77269C9A608cC348A876eC0B1f5A7b0042Ee02" },
        { name: "Contract 2", address: "0x211080e966B3206E6169B2e3F7fE4f6c73CaD8c2" },
        { name: "Contract 3", address: "0x7DF0891bCD1e058bD5C6F1e2e93A04d4c64c1dDA" },
        { name: "Contract 4", address: "0x65C1327828373116f6aC2fb2777E0Cf85FcC378c" },
        
        // Mock tokens
        { name: "Mock Token", address: "0x1234567890123456789012345678901234567890" },
        
        // Aerodrome contracts
        { name: "CL Factory", address: "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A" },
        { name: "Position Manager", address: "0x827922686190790b37229fd06084350E74485b72" },
        
        // Existing pools
        { name: "WETH/USDC Pool", address: "0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59" },
        
        // Special addresses
        { name: "Zero Address", address: "0x0000000000000000000000000000000000000000" }
    ];

    console.log("🔍 Checking WETH balances in ALL addresses...\n");

    let totalWethFound = 0n;
    const addressesWithWeth = [];

    for (const addr of allAddresses) {
        try {
            const wethBalance = await wethContract.balanceOf(addr.address);
            console.log(`${addr.name} (${addr.address}):`);
            console.log(`  WETH: ${ethers.formatEther(wethBalance)} WETH`);
            
            if (wethBalance > 0) {
                console.log(`  💰 HAS WETH!`);
                totalWethFound += wethBalance;
                addressesWithWeth.push({ ...addr, balance: wethBalance });
            }
            console.log("");
            
        } catch (error) {
            console.log(`${addr.name} (${addr.address}):`);
            console.log(`  ❌ Error checking balance:`, error instanceof Error ? error.message : String(error));
            console.log("");
        }
    }

    console.log(`\n💰 Total WETH found: ${ethers.formatEther(totalWethFound)} WETH`);
    
    if (addressesWithWeth.length > 0) {
        console.log("\n📍 Addresses with WETH:");
        for (const addr of addressesWithWeth) {
            console.log(`  ${addr.name}: ${ethers.formatEther(addr.balance)} WETH`);
        }
    }

    // Now trace WETH transfers FROM your address
    console.log("\n🔍 Tracing WETH transfers FROM your address...\n");
    
    try {
        const wethContractWithEvents = new ethers.Contract(WETH, [
            "event Transfer(address indexed from, address indexed to, uint256 value)"
        ], ethers.provider);

        // Get recent transfer events FROM your address
        const filter = wethContractWithEvents.filters.Transfer(deployer.address, null);
        const latestBlock = await ethers.provider.getBlockNumber();
        const events = await wethContractWithEvents.queryFilter(filter, latestBlock - 1000, latestBlock);
        
        console.log(`Found ${events.length} recent WETH transfers FROM your address:`);
        for (const event of events) {
            console.log(`  From: ${event.args?.from}`);
            console.log(`  To: ${event.args?.to}`);
            console.log(`  Amount: ${ethers.formatEther(event.args?.value)} WETH`);
            console.log(`  Block: ${event.blockNumber}`);
            console.log(`  Hash: ${event.transactionHash}`);
            
            // Check if the recipient has WETH
            try {
                const recipientBalance = await wethContract.balanceOf(event.args?.to);
                if (recipientBalance > 0) {
                    console.log(`  💰 Recipient still has: ${ethers.formatEther(recipientBalance)} WETH`);
                }
            } catch (error) {
                // Ignore errors
            }
            console.log("");
        }
    } catch (error) {
        console.log("❌ Error checking WETH transfers:", error instanceof Error ? error.message : String(error));
    }

    // Check if any of the recipients have WETH
    console.log("\n🔍 Checking if any recipients have WETH...\n");
    
    try {
        const wethContractWithEvents = new ethers.Contract(WETH, [
            "event Transfer(address indexed from, address indexed to, uint256 value)"
        ], ethers.provider);

        const filter = wethContractWithEvents.filters.Transfer(deployer.address, null);
        const latestBlock = await ethers.provider.getBlockNumber();
        const events = await wethContractWithEvents.queryFilter(filter, latestBlock - 1000, latestBlock);
        
        const recipients = new Set();
        for (const event of events) {
            recipients.add(event.args?.to);
        }
        
        console.log(`Checking ${recipients.size} unique recipients for WETH...`);
        for (const recipient of recipients) {
            try {
                const balance = await wethContract.balanceOf(recipient);
                if (balance > 0) {
                    console.log(`💰 ${recipient}: ${ethers.formatEther(balance)} WETH`);
                }
            } catch (error) {
                // Ignore errors
            }
        }
    } catch (error) {
        console.log("❌ Error checking recipients:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
