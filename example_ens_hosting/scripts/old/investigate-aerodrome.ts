import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Investigating Aerodrome Contracts on Base Sepolia...\n");

    // Base Sepolia Aerodrome addresses
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log("📋 Contract Addresses:");
    console.log("CL Factory:", CL_FACTORY);
    console.log("Position Manager:", POSITION_MANAGER);
    console.log("WETH:", WETH);
    console.log("");

    // Check if contracts exist
    console.log("🔍 Checking Contract Existence...");
    
    const clFactoryCode = await ethers.provider.getCode(CL_FACTORY);
    const positionManagerCode = await ethers.provider.getCode(POSITION_MANAGER);
    const wethCode = await ethers.provider.getCode(WETH);

    console.log(`CL Factory code length: ${clFactoryCode.length}`);
    console.log(`Position Manager code length: ${positionManagerCode.length}`);
    console.log(`WETH code length: ${wethCode.length}`);
    console.log("");

    if (clFactoryCode === "0x" || positionManagerCode === "0x") {
        console.log("❌ ERROR: One or more contracts not found!");
        return;
    }

    // Try to call basic functions on the CL factory
    console.log("🔍 Testing CL Factory Functions...");
    
    try {
        // Create a minimal interface for the CL factory
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function poolImplementation() external view returns (address)",
            "function owner() external view returns (address)",
            "function getPool(address tokenA, address tokenB, int24 tickSpacing) external view returns (address pool)",
            "function computePoolAddress(address tokenA, address tokenB, int24 tickSpacing) external view returns (address pool)"
        ], ethers.provider);

        // Try to get the pool implementation
        console.log("📋 Getting pool implementation...");
        const poolImplementation = await clFactory.poolImplementation();
        console.log("Pool Implementation:", poolImplementation);

        // Try to get the owner
        console.log("📋 Getting factory owner...");
        const factoryOwner = await clFactory.owner();
        console.log("Factory Owner:", factoryOwner);

        // Try to compute a pool address
        console.log("📋 Computing pool address for WETH/TCLT...");
        const mockToken = "0x1234567890123456789012345678901234567890"; // Mock token address
        const poolAddress = await clFactory.computePoolAddress(WETH, mockToken, 60);
        console.log("Computed Pool Address:", poolAddress);

        // Check if the pool exists
        console.log("📋 Checking if pool exists...");
        const existingPool = await clFactory.getPool(WETH, mockToken, 60);
        console.log("Existing Pool:", existingPool);

    } catch (error) {
        console.log("❌ Error calling CL factory functions:", error instanceof Error ? error.message : String(error));
    }

    // Try to call basic functions on the position manager
    console.log("\n🔍 Testing Position Manager Functions...");
    
    try {
        const positionManager = new ethers.Contract(POSITION_MANAGER, [
            "function factory() external view returns (address)",
            "function WETH9() external view returns (address)",
            "function owner() external view returns (address)"
        ], ethers.provider);

        const pmFactory = await positionManager.factory();
        console.log("Position Manager Factory:", pmFactory);
        console.log("Factory addresses match:", pmFactory === CL_FACTORY);

        const pmWeth = await positionManager.WETH9();
        console.log("Position Manager WETH:", pmWeth);
        console.log("WETH addresses match:", pmWeth === WETH);

        const pmOwner = await positionManager.owner();
        console.log("Position Manager Owner:", pmOwner);

    } catch (error) {
        console.log("❌ Error calling position manager functions:", error instanceof Error ? error.message : String(error));
    }

    console.log("\n✅ Investigation complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
