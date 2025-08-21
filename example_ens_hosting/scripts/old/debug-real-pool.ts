import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Debugging Real Token Pool Creation...\n");

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
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";

    console.log("📋 Real Token Addresses:");
    console.log("WETH:", WETH);
    console.log("USDC:", USDC);
    console.log("CL Factory:", CL_FACTORY);

    // Test with real tokens
    const [token0, token1] = WETH < USDC ? [WETH, USDC] : [USDC, WETH];
    const tickSpacing = 60;

    console.log(`\n🔍 Testing with real tokens:`);
    console.log(`Token0: ${token0}`);
    console.log(`Token1: ${token1}`);
    console.log(`Tick Spacing: ${tickSpacing}`);

    // Check if pool already exists
    try {
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function getPool(address,address,int24) external view returns (address pool)"
        ], ethers.provider);
        
        const existingPool = await clFactory.getPool(token0, token1, tickSpacing);
        console.log(`Existing pool: ${existingPool}`);
        
        if (existingPool !== "0x0000000000000000000000000000000000000000") {
            console.log("✅ Pool already exists! This is expected for WETH/USDC");
            
            // Try to get pool info
            try {
                const pool = new ethers.Contract(existingPool, [
                    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
                ], ethers.provider);
                
                const slot0 = await pool.slot0();
                console.log("✅ Pool is initialized!");
                console.log("Current sqrtPriceX96:", slot0[0].toString());
                console.log("Current tick:", slot0[1].toString());
                
                console.log("\n🎉 SUCCESS: Real pool exists and is accessible!");
                return;
                
            } catch (poolError) {
                console.log("❌ Error getting pool info:", poolError instanceof Error ? poolError.message : String(poolError));
            }
        }
    } catch (error) {
        console.log("❌ Error checking existing pool:", error instanceof Error ? error.message : String(error));
    }

    // Try to create the pool
    try {
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function createPool(address,address,int24) external returns (address pool)"
        ], deployer);
        
        console.log("📦 Attempting to create pool with real tokens...");
        const tx = await clFactory.createPool(token0, token1, tickSpacing);
        console.log("✅ Pool creation transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Pool creation successful! Block:", receipt.blockNumber);
        
        // Get the created pool address
        const poolAddress = await clFactory.getPool(token0, token1, tickSpacing);
        console.log("✅ Pool address:", poolAddress);
        
        console.log("\n🎉 SUCCESS: Pool creation works with real tokens!");
        
    } catch (error) {
        console.log("❌ Pool creation failed:", error instanceof Error ? error.message : String(error));
        
        // Try to get more detailed error information
        if (error.data) {
            console.log("Error data:", error.data);
        }
        if (error.reason) {
            console.log("Error reason:", error.reason);
        }
        
        console.log("\n💡 Analysis:");
        console.log("The factory might not allow external pool creation");
        console.log("Or the tokens might not be properly configured");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
