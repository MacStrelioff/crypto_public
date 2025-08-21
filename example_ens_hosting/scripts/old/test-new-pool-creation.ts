import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🧪 Testing New Pool Creation with WETH/USDbC...\n");

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

    console.log("🔍 Checking if we can create a WETH/USDbC pool...\n");

    try {
        // Create a contract instance for the CL Factory
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function createPool(address tokenA, address tokenB, int24 tickSpacing, uint160 sqrtPriceX96) external returns (address pool)",
            "function getPool(address tokenA, address tokenB, int24 tickSpacing) external view returns (address pool)",
            "function tickSpacingToFee(int24) external view returns (uint24)"
        ], deployer);

        // Check if tick spacing 100 is enabled
        const fee = await clFactory.tickSpacingToFee(100);
        console.log(`Tick spacing 100 fee: ${fee}`);
        
        if (fee === 0) {
            console.log("❌ Tick spacing 100 is not enabled!");
            return;
        }

        // Check if pool already exists
        const existingPool = await clFactory.getPool(WETH, USDbC, 100);
        console.log(`Existing WETH/USDbC pool: ${existingPool}`);
        
        if (existingPool !== "0x0000000000000000000000000000000000000000") {
            console.log("✅ Pool already exists! We can use this pool.");
            return;
        }

        // Try to create the pool
        console.log("🔄 Attempting to create WETH/USDbC pool...");
        
        // 1:1 price in sqrtPriceX96 (same as we used before)
        const sqrtPriceX96 = "79228162514264337593543950336";
        
        const tx = await clFactory.createPool(WETH, USDbC, 100, sqrtPriceX96);
        console.log(`📝 Pool creation transaction: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Pool created successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        
        // Get the pool address
        const newPool = await clFactory.getPool(WETH, USDbC, 100);
        console.log(`   Pool address: ${newPool}`);
        
    } catch (error) {
        console.log("❌ Error creating pool:", error instanceof Error ? error.message : String(error));
        
        // Try to decode the error
        if (error instanceof Error && error.message.includes("execution reverted")) {
            console.log("\n🔍 Attempting to decode error...");
            try {
                // Check if it's a custom error
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
