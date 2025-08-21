import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Debugging Aerodrome Pool Creation...\n");

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
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";

    console.log("📋 Aerodrome Addresses:");
    console.log("CL Factory:", CL_FACTORY);
    console.log("Position Manager:", POSITION_MANAGER);
    console.log("WETH:", WETH);

    // Create a mock credit line token address for testing
    const mockCreditLineToken = "0x1234567890123456789012345678901234567890";

    // Test different tick spacings
    const tickSpacings = [60, 100, 200, 500, 1000];

    for (const tickSpacing of tickSpacings) {
        console.log(`\n🔍 Testing tick spacing: ${tickSpacing}`);
        
        // Sort tokens by address
        const [token0, token1] = mockCreditLineToken < WETH 
            ? [mockCreditLineToken, WETH] 
            : [WETH, mockCreditLineToken];
        
        console.log(`Token0: ${token0}`);
        console.log(`Token1: ${token1}`);
        
        // Check if pool already exists
        try {
            const clFactory = new ethers.Contract(CL_FACTORY, [
                "function getPool(address,address,int24) external view returns (address pool)"
            ], ethers.provider);
            
            const existingPool = await clFactory.getPool(token0, token1, tickSpacing);
            console.log(`Existing pool: ${existingPool}`);
            
            if (existingPool !== "0x0000000000000000000000000000000000000000") {
                console.log("✅ Pool already exists!");
                continue;
            }
        } catch (error) {
            console.log("❌ Error checking existing pool:", error instanceof Error ? error.message : String(error));
        }
        
        // Try to create the pool
        try {
            const clFactory = new ethers.Contract(CL_FACTORY, [
                "function createPool(address,address,int24) external returns (address pool)"
            ], deployer);
            
            console.log("📦 Attempting to create pool...");
            const tx = await clFactory.createPool(token0, token1, tickSpacing);
            console.log("✅ Pool creation transaction sent:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("✅ Pool creation successful! Block:", receipt.blockNumber);
            
            // Get the created pool address
            const poolAddress = await clFactory.getPool(token0, token1, tickSpacing);
            console.log("✅ Pool address:", poolAddress);
            
            // Try to initialize the pool
            try {
                const pool = new ethers.Contract(poolAddress, [
                    "function initialize(uint160 sqrtPriceX96) external"
                ], deployer);
                
                const initTx = await pool.initialize("79228162514264337593543950336"); // 1:1 price
                await initTx.wait();
                console.log("✅ Pool initialized successfully!");
                
                console.log(`\n🎉 SUCCESS: Pool creation works with tick spacing ${tickSpacing}!`);
                return;
                
            } catch (initError) {
                console.log("❌ Pool initialization failed:", initError instanceof Error ? initError.message : String(initError));
            }
            
        } catch (error) {
            console.log("❌ Pool creation failed:", error instanceof Error ? error.message : String(error));
            
            // Try to get more detailed error information
            if (error.data) {
                console.log("Error data:", error.data);
            }
            if (error.reason) {
                console.log("Error reason:", error.reason);
            }
        }
    }
    
    console.log("\n❌ All tick spacing tests failed");
    console.log("💡 Possible issues:");
    console.log("1. Factory doesn't allow external pool creation");
    console.log("2. Invalid token addresses");
    console.log("3. Factory requires specific permissions");
    console.log("4. Factory is not fully deployed or configured");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
