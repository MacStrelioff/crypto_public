import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🧪 Testing Credit Line Pool Creation (WETH + Credit Line Token)...\n");

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

    // Base Mainnet addresses
    const WETH = "0x4200000000000000000000000000000000000006";
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";

    console.log("🔍 Deploying a credit line token...\n");

    try {
        // Deploy a credit line token (this would be our CreditLineToken contract)
        const CreditLineToken = await ethers.getContractFactory("CreditLineToken");
        const creditLineToken = await CreditLineToken.deploy();
        await creditLineToken.waitForDeployment();
        
        const creditLineTokenAddress = await creditLineToken.getAddress();
        console.log(`✅ Credit line token deployed: ${creditLineTokenAddress}`);

        // Initialize the credit line token
        await creditLineToken.initialize(
            "Test Credit Line",
            "TCL",
            WETH, // underlying asset
            1000000, // credit limit (1M tokens)
            500, // APY (5%)
            deployer.address // borrower
        );
        console.log("✅ Credit line token initialized");

        // Now create a pool between WETH and the credit line token
        console.log("\n🔍 Creating pool between WETH and Credit Line Token...\n");

        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function createPool(address tokenA, address tokenB, int24 tickSpacing, uint160 sqrtPriceX96) external returns (address pool)",
            "function getPool(address tokenA, address tokenB, int24 tickSpacing) external view returns (address pool)"
        ], deployer);

        // Check if pool already exists
        const existingPool = await clFactory.getPool(WETH, creditLineTokenAddress, 100);
        console.log(`Existing WETH/CreditLine pool: ${existingPool}`);
        
        if (existingPool !== "0x0000000000000000000000000000000000000000") {
            console.log("✅ Pool already exists!");
            return;
        }

        // Create the pool
        console.log("🔄 Creating WETH/CreditLine pool...");
        
        // 1:1 price in sqrtPriceX96 (1 WETH = 1 Credit Line Token)
        const sqrtPriceX96 = "79228162514264337593543950336";
        
        const tx = await clFactory.createPool(WETH, creditLineTokenAddress, 100, sqrtPriceX96);
        console.log(`📝 Pool creation transaction: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Pool created successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        
        // Get the pool address
        const poolAddress = await clFactory.getPool(WETH, creditLineTokenAddress, 100);
        console.log(`   Pool address: ${poolAddress}`);
        
        // Verify the pool
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
            console.log("✅ Pool verification successful!");
            
            // Get pool info
            const poolContract = new ethers.Contract(poolAddress, [
                "function token0() external view returns (address)",
                "function token1() external view returns (address)",
                "function tickSpacing() external view returns (int24)"
            ], deployer);
            
            const token0 = await poolContract.token0();
            const token1 = await poolContract.token1();
            const tickSpacing = await poolContract.tickSpacing();
            
            console.log(`Pool details:`);
            console.log(`  Token0: ${token0}`);
            console.log(`  Token1: ${token1}`);
            console.log(`  Tick Spacing: ${tickSpacing}`);
            
            // Determine which token is which
            const wethIsToken0 = token0.toLowerCase() === WETH.toLowerCase();
            const creditLineIsToken0 = token0.toLowerCase() === creditLineTokenAddress.toLowerCase();
            
            console.log(`  WETH is Token${wethIsToken0 ? '0' : '1'}`);
            console.log(`  Credit Line Token is Token${creditLineIsToken0 ? '0' : '1'}`);
            
        } else {
            console.log("❌ Pool creation failed - address is zero");
        }
        
    } catch (error) {
        console.log("❌ Error:", error instanceof Error ? error.message : String(error));
        
        // Try to decode the error
        if (error instanceof Error && error.message.includes("execution reverted")) {
            console.log("\n🔍 Attempting to decode error...");
            try {
                const errorData = error.message.match(/0x[a-fA-F0-9]+/);
                if (errorData) {
                    console.log(`Error data: ${errorData[0]}`);
                }
            } catch (decodeError) {
                console.log("Could not decode error");
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
