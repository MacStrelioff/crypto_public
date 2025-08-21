import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Aerodrome Adapter for WETH...\n");

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

    // Our adapter addresses
    const adapters = [
        { name: "Latest Adapter", address: "0xaA7280808D5829715F5288633908685c5fc7C692" },
        { name: "Previous Adapter", address: "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9" }
    ];

    console.log("🔍 Checking adapters for WETH...\n");

    for (const adapter of adapters) {
        try {
            console.log(`Checking ${adapter.name} (${adapter.address}):`);
            
            // Check WETH balance
            const wethBalance = await wethContract.balanceOf(adapter.address);
            console.log(`  WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
            
            if (wethBalance > 0) {
                console.log(`  💰 FOUND WETH!`);
                
                // Try to get adapter info
                try {
                    const adapterContract = new ethers.Contract(adapter.address, [
                        "function owner() external view returns (address)",
                        "function authorizedCallers(address) external view returns (bool)"
                    ], ethers.provider);
                    
                    const owner = await adapterContract.owner();
                    console.log(`  Owner: ${owner}`);
                    console.log(`  Is deployer authorized: ${await adapterContract.authorizedCallers(deployer.address)}`);
                    
                    // Try to withdraw WETH if we're the owner
                    if (owner === deployer.address) {
                        console.log(`  ✅ We can withdraw this WETH!`);
                    }
                } catch (error) {
                    console.log(`  ❌ Error getting adapter info:`, error instanceof Error ? error.message : String(error));
                }
            }
            console.log("");
            
        } catch (error) {
            console.log(`❌ Error checking ${adapter.name}:`, error instanceof Error ? error.message : String(error));
            console.log("");
        }
    }

    // Also check if WETH might be in any Aerodrome pools
    console.log("🔍 Checking if WETH might be in Aerodrome pools...\n");
    
    // Check if any pools were created with our tokens
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    
    try {
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function getPool(address,address,int24) external view returns (address pool)"
        ], ethers.provider);
        
        // Check if any pools exist with our mock token
        const mockToken = "0x1234567890123456789012345678901234567890";
        const pool = await clFactory.getPool(mockToken, WETH, 100);
        
        if (pool !== "0x0000000000000000000000000000000000000000") {
            console.log(`Found pool: ${pool}`);
            
            // Check if this pool has WETH
            const poolWethBalance = await wethContract.balanceOf(pool);
            console.log(`Pool WETH balance: ${ethers.formatEther(poolWethBalance)} WETH`);
            
            if (poolWethBalance > 0) {
                console.log(`💰 WETH found in pool!`);
            }
        } else {
            console.log("No pools found with our mock token");
        }
    } catch (error) {
        console.log("❌ Error checking pools:", error instanceof Error ? error.message : String(error));
    }

    console.log("\n💡 Summary:");
    console.log("If WETH is not found in any of these locations, it might have been:");
    console.log("1. Burned during a failed transaction");
    console.log("2. Sent to an unexpected address");
    console.log("3. Used in a pool creation that failed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
