import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    console.log("🔍 Investigating Aerodrome Contracts in Forked Environment...\n");

    // Aerodrome contract addresses on Base mainnet
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";
    
    // Test tokens for comparison
    const WETH = "0x4200000000000000000000000000000000000006"; // Base WETH
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

    console.log("📋 Contract Addresses:");
    console.log(`CL Factory: ${CL_FACTORY}`);
    console.log(`Position Manager: ${POSITION_MANAGER}`);
    console.log(`WETH: ${WETH}`);
    console.log(`USDC: ${USDC}\n`);

    // Check if contracts exist and are callable
    console.log("🔍 Checking Contract Existence...");
    
    const clFactoryCode = await ethers.provider.getCode(CL_FACTORY);
    const positionManagerCode = await ethers.provider.getCode(POSITION_MANAGER);
    const wethCode = await ethers.provider.getCode(WETH);
    const usdcCode = await ethers.provider.getCode(USDC);

    console.log(`CL Factory code length: ${clFactoryCode.length}`);
    console.log(`Position Manager code length: ${positionManagerCode.length}`);
    console.log(`WETH code length: ${wethCode.length}`);
    console.log(`USDC code length: ${usdcCode.length}\n`);

    if (clFactoryCode === "0x" || positionManagerCode === "0x") {
        console.log("❌ ERROR: One or more contracts not found in forked environment!");
        return;
    }

    // Try to call basic functions on the position manager
    console.log("🔍 Testing Position Manager Functions...");
    
    try {
        // Try to get the factory address from position manager
        const positionManager = new ethers.Contract(
            POSITION_MANAGER,
            ["function factory() external view returns (address)"],
            ethers.provider
        );
        
        const factoryFromPM = await positionManager.factory();
        console.log(`Position Manager's factory: ${factoryFromPM}`);
        console.log(`Expected factory: ${CL_FACTORY}`);
        console.log(`Match: ${factoryFromPM.toLowerCase() === CL_FACTORY.toLowerCase()}\n`);
        
    } catch (error) {
        console.log(`❌ Error calling position manager factory(): ${error}\n`);
    }

    // Try to get pool information
    console.log("🔍 Testing Pool Creation...");
    
    try {
        const clFactory = new ethers.Contract(
            CL_FACTORY,
            [
                "function getPool(address tokenA, address tokenB, int24 tickSpacing) external view returns (address pool)",
                "function createPool(address tokenA, address tokenB, int24 tickSpacing, uint160 sqrtPriceX96) external returns (address pool)"
            ],
            ethers.provider
        );

        // Check if a pool exists between WETH and USDC
        const existingPool = await clFactory.getPool(WETH, USDC, 100);
        console.log(`Existing WETH/USDC pool: ${existingPool}`);
        
        if (existingPool === "0x0000000000000000000000000000000000000000") {
            console.log("No existing pool found - this is expected\n");
        } else {
            console.log("Pool exists - checking its state\n");
            
            // Try to get pool info
            const pool = new ethers.Contract(
                existingPool,
                [
                    "function token0() external view returns (address)",
                    "function token1() external view returns (address)",
                    "function tickSpacing() external view returns (int24)",
                    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)"
                ],
                ethers.provider
            );
            
            const token0 = await pool.token0();
            const token1 = await pool.token1();
            const tickSpacing = await pool.tickSpacing();
            const slot0 = await pool.slot0();
            
            console.log(`Pool token0: ${token0}`);
            console.log(`Pool token1: ${token1}`);
            console.log(`Pool tick spacing: ${tickSpacing}`);
            console.log(`Pool sqrt price: ${slot0[0]}\n`);
        }
        
    } catch (error) {
        console.log(`❌ Error testing pool creation: ${error}\n`);
    }

    // Test position manager mint with a simple call
    console.log("🔍 Testing Position Manager Mint...");
    
    try {
        const positionManager = new ethers.Contract(
            POSITION_MANAGER,
            [
                "function mint((address,address,int24,int24,int24,uint256,uint256,uint256,uint256,address,uint256,uint160)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
            ],
            ethers.provider
        );

        // Create a simple mint params structure
        const mintParams = {
            token0: WETH,
            token1: USDC,
            tickSpacing: 100,
            tickLower: -887220, // MIN_TICK
            tickUpper: 887220,  // MAX_TICK
            amount0Desired: ethers.parseEther("0.001"), // Small amount
            amount1Desired: ethers.parseUnits("1", 6),  // 1 USDC
            amount0Min: 0,
            amount1Min: 0,
            recipient: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat account
            deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
            sqrtPriceX96: 0 // Use existing pool
        };

        console.log("Attempting to call position manager mint...");
        console.log("This will likely fail due to insufficient tokens, but should give us error info");
        
        // This will likely fail, but we want to see the error
        await positionManager.mint(mintParams);
        
    } catch (error) {
        console.log(`❌ Position manager mint error: ${error}`);
        
        // Try to extract more information from the error
        if (error.data) {
            console.log(`Error data: ${error.data}`);
        }
        if (error.reason) {
            console.log(`Error reason: ${error.reason}`);
        }
        console.log();
    }

    // Check if we can call the position manager at all
    console.log("🔍 Testing Basic Position Manager Calls...");
    
    try {
        const positionManager = new ethers.Contract(
            POSITION_MANAGER,
            [
                "function owner() external view returns (address)",
                "function tokenDescriptor() external view returns (address)"
            ],
            ethers.provider
        );

        const owner = await positionManager.owner();
        const tokenDescriptor = await positionManager.tokenDescriptor();
        
        console.log(`Position Manager owner: ${owner}`);
        console.log(`Position Manager token descriptor: ${tokenDescriptor}\n`);
        
    } catch (error) {
        console.log(`❌ Error calling basic position manager functions: ${error}\n`);
    }

    console.log("✅ Investigation complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
