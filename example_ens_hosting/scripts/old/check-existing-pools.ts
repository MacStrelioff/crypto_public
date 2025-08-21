import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Existing Aerodrome Pools...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    if (network.chainId !== 8453n) {
        console.log("❌ This script should be run on Base mainnet (chain ID 8453)");
        return;
    }

    // Base Mainnet addresses
    const WETH = "0x4200000000000000000000000000000000000006";
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const USDbC = "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"; // Base USDbC
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";

    console.log("📋 Checking Factory Configuration:");
    
    try {
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function owner() external view returns (address)",
            "function poolImplementation() external view returns (address)",
            "function getPool(address,address,int24) external view returns (address pool)"
        ], ethers.provider);
        
        const factoryOwner = await clFactory.owner();
        const poolImplementation = await clFactory.poolImplementation();
        
        console.log("Factory Owner:", factoryOwner);
        console.log("Pool Implementation:", poolImplementation);
        
        // Check if we're the factory owner
        console.log("Are we factory owner?", factoryOwner === deployer.address);
        
    } catch (error) {
        console.log("❌ Error checking factory:", error instanceof Error ? error.message : String(error));
    }

    console.log("\n📋 Checking Common Token Pairs:");
    
    const commonPairs = [
        { token0: WETH, token1: USDC, name: "WETH/USDC" },
        { token0: WETH, token1: USDbC, name: "WETH/USDbC" },
        { token0: USDC, token1: USDbC, name: "USDC/USDbC" }
    ];
    
    const tickSpacings = [60, 100, 200, 500, 1000];
    
    for (const pair of commonPairs) {
        console.log(`\n🔍 Checking ${pair.name}:`);
        
        for (const tickSpacing of tickSpacings) {
            try {
                const clFactory = new ethers.Contract(CL_FACTORY, [
                    "function getPool(address,address,int24) external view returns (address pool)"
                ], ethers.provider);
                
                const [token0, token1] = pair.token0 < pair.token1 ? [pair.token0, pair.token1] : [pair.token1, pair.token0];
                const pool = await clFactory.getPool(token0, token1, tickSpacing);
                
                if (pool !== "0x0000000000000000000000000000000000000000") {
                    console.log(`  ✅ Pool exists for tick spacing ${tickSpacing}: ${pool}`);
                    
                    // Try to get pool info
                    try {
                        const poolContract = new ethers.Contract(pool, [
                            "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
                        ], ethers.provider);
                        
                        const slot0 = await poolContract.slot0();
                        console.log(`    - Initialized: Yes`);
                        console.log(`    - Current tick: ${slot0[1]}`);
                        console.log(`    - Unlocked: ${slot0[6]}`);
                        
                    } catch (poolError) {
                        console.log(`    - Pool exists but can't read info`);
                    }
                    
                    break; // Found a pool, no need to check other tick spacings
                }
            } catch (error) {
                console.log(`  ❌ Error checking ${pair.name} with tick spacing ${tickSpacing}:`, error instanceof Error ? error.message : String(error));
            }
        }
    }
    
    console.log("\n💡 Analysis:");
    console.log("If pools exist, we can use them instead of creating new ones");
    console.log("If no pools exist, the factory might require specific permissions");
    console.log("We might need to use existing pools or get factory permissions");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
