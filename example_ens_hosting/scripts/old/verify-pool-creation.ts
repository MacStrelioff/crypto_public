import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Verifying Pool Creation...\n");

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
    const USDbC = "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"; // Base USDbC
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";

    console.log("🔍 Checking if the WETH/USDbC pool was created...\n");

    try {
        // Create a contract instance for the CL Factory
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function getPool(address tokenA, address tokenB, int24 tickSpacing) external view returns (address pool)",
            "function allPools(uint256) external view returns (address)",
            "function allPoolsLength() external view returns (uint256)"
        ], deployer);

        // Check if pool exists now
        const poolAddress = await clFactory.getPool(WETH, USDbC, 100);
        console.log(`WETH/USDbC pool address: ${poolAddress}`);
        
        if (poolAddress !== "0x0000000000000000000000000000000000000000") {
            console.log("✅ Pool was created successfully!");
            
            // Get pool info
            const poolContract = new ethers.Contract(poolAddress, [
                "function token0() external view returns (address)",
                "function token1() external view returns (address)",
                "function tickSpacing() external view returns (int24)",
                "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
            ], deployer);
            
            const token0 = await poolContract.token0();
            const token1 = await poolContract.token1();
            const tickSpacing = await poolContract.tickSpacing();
            const slot0 = await poolContract.slot0();
            
            console.log(`Pool details:`);
            console.log(`  Token0: ${token0}`);
            console.log(`  Token1: ${token1}`);
            console.log(`  Tick Spacing: ${tickSpacing}`);
            console.log(`  Sqrt Price X96: ${slot0.sqrtPriceX96}`);
            console.log(`  Tick: ${slot0.tick}`);
            
        } else {
            console.log("❌ Pool was not created or address is zero");
        }

        // Check the latest pools
        const totalPools = await clFactory.allPoolsLength();
        console.log(`\nTotal pools in factory: ${totalPools}`);
        
        if (totalPools > 0) {
            console.log("Latest pools:");
            const startIndex = Math.max(0, totalPools - 5); // Show last 5 pools
            for (let i = startIndex; i < totalPools; i++) {
                const pool = await clFactory.allPools(i);
                console.log(`  Pool ${i}: ${pool}`);
            }
        }
        
    } catch (error) {
        console.log("❌ Error checking pool:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
