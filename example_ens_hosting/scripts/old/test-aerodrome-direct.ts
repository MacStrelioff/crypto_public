import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Testing Aerodrome Contracts Directly...\n");

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

    // Aerodrome contract addresses
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`CL Factory: ${CL_FACTORY}`);
    console.log(`Position Manager: ${POSITION_MANAGER}`);
    console.log(`WETH: ${WETH}`);

    try {
        // Test 1: Check if the CL Factory exists and is callable
        console.log("\n🔍 Test 1: Checking CL Factory...");
        
        const clFactory = await ethers.getContractAt([
            "function getPool(address,address,int24) external view returns (address)",
            "function createPool(address,address,int24,uint160) external returns (address)",
            "function enabledTickSpacings(int24) external view returns (bool)"
        ], CL_FACTORY);

        // Check if tick spacing 100 is enabled
        const tickSpacing = 100;
        const isTickSpacingEnabled = await clFactory.enabledTickSpacings(tickSpacing);
        console.log(`   Tick spacing ${tickSpacing} enabled: ${isTickSpacingEnabled}`);

        // Test 2: Try to get an existing pool (should return 0 address if doesn't exist)
        console.log("\n🔍 Test 2: Checking for existing WETH pool...");
        
        // Create a mock token address for testing
        const mockToken = "0x1234567890123456789012345678901234567890";
        
        try {
            const existingPool = await clFactory.getPool(WETH, mockToken, tickSpacing);
            console.log(`   Existing pool address: ${existingPool}`);
        } catch (getPoolError) {
            console.log(`   Error getting pool: ${getPoolError instanceof Error ? getPoolError.message : String(getPoolError)}`);
        }

        // Test 3: Check Position Manager
        console.log("\n🔍 Test 3: Checking Position Manager...");
        
        const positionManager = await ethers.getContractAt([
            "function factory() external view returns (address)",
            "function WETH9() external view returns (address)"
        ], POSITION_MANAGER);

        try {
            const factoryFromPM = await positionManager.factory();
            console.log(`   Factory from Position Manager: ${factoryFromPM}`);
            
            const wethFromPM = await positionManager.WETH9();
            console.log(`   WETH from Position Manager: ${wethFromPM}`);
        } catch (pmError) {
            console.log(`   Error checking Position Manager: ${pmError instanceof Error ? pmError.message : String(pmError)}`);
        }

        // Test 4: Try to create a pool with real tokens (WETH and a deployed test token)
        console.log("\n🔍 Test 4: Deploying test token for pool creation...");
        
        const CreditLineToken = await ethers.getContractFactory("CreditLineToken");
        const testToken = await CreditLineToken.deploy("Test Token", "TEST");
        await testToken.waitForDeployment();
        
        const testTokenAddress = await testToken.getAddress();
        console.log(`   Test token deployed: ${testTokenAddress}`);

        // Initialize the test token
        await testToken.initialize(
            WETH,
            ethers.parseEther("1000"),
            500,
            deployer.address,
            ethers.parseEther("0.001")
        );
        console.log(`   Test token initialized`);

        // Test 5: Try to create a pool directly with CL Factory
        console.log("\n🔍 Test 5: Testing direct pool creation...");
        
        // Sort tokens (token0 should be < token1)
        const token0 = WETH < testTokenAddress ? WETH : testTokenAddress;
        const token1 = WETH < testTokenAddress ? testTokenAddress : WETH;
        
        console.log(`   Token0 (lower): ${token0}`);
        console.log(`   Token1 (higher): ${token1}`);

        try {
            // Check if pool already exists
            const existingPool = await clFactory.getPool(token0, token1, tickSpacing);
            console.log(`   Existing pool: ${existingPool}`);
            
            if (existingPool === "0x0000000000000000000000000000000000000000") {
                console.log("   Pool doesn't exist, attempting to create...");
                
                // Try to simulate pool creation
                const sqrtPriceX96 = "79228162514264337593543950336"; // 1:1 price
                
                try {
                    await clFactory.createPool.staticCall(token0, token1, tickSpacing, sqrtPriceX96);
                    console.log("   ✅ Pool creation simulation successful!");
                    
                    // If simulation works, try actual creation
                    const createTx = await clFactory.createPool(token0, token1, tickSpacing, sqrtPriceX96);
                    const receipt = await createTx.wait();
                    console.log(`   ✅ Pool created! Gas used: ${receipt.gasUsed}`);
                    
                    // Get the created pool address
                    const newPool = await clFactory.getPool(token0, token1, tickSpacing);
                    console.log(`   ✅ New pool address: ${newPool}`);
                    
                } catch (createError) {
                    console.log(`   ❌ Pool creation failed: ${createError instanceof Error ? createError.message : String(createError)}`);
                    
                    // Try to decode the error
                    if (createError instanceof Error) {
                        const errorMatch = createError.message.match(/revert (.+)/);
                        if (errorMatch) {
                            console.log(`     Revert reason: ${errorMatch[1]}`);
                        }
                        
                        const errorDataMatch = createError.message.match(/0x[a-fA-F0-9]+/);
                        if (errorDataMatch) {
                            console.log(`     Error data: ${errorDataMatch[0]}`);
                        }
                    }
                }
            } else {
                console.log("   Pool already exists!");
            }
            
        } catch (poolTestError) {
            console.log(`   Error in pool test: ${poolTestError instanceof Error ? poolTestError.message : String(poolTestError)}`);
        }

        // Test 6: Check our deployed adapter's constants
        console.log("\n🔍 Test 6: Checking our adapter's configuration...");
        
        const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";
        const adapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);
        
        try {
            // Check if our adapter has the right addresses
            const CL_FACTORY_FROM_ADAPTER = await adapter.CL_FACTORY();
            const POSITION_MANAGER_FROM_ADAPTER = await adapter.POSITION_MANAGER();
            
            console.log(`   CL Factory from adapter: ${CL_FACTORY_FROM_ADAPTER}`);
            console.log(`   Position Manager from adapter: ${POSITION_MANAGER_FROM_ADAPTER}`);
            console.log(`   CL Factory matches: ${CL_FACTORY_FROM_ADAPTER === CL_FACTORY}`);
            console.log(`   Position Manager matches: ${POSITION_MANAGER_FROM_ADAPTER === POSITION_MANAGER}`);
            
        } catch (adapterError) {
            console.log(`   Error checking adapter: ${adapterError instanceof Error ? adapterError.message : String(adapterError)}`);
        }

    } catch (error) {
        console.log("❌ Error:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
