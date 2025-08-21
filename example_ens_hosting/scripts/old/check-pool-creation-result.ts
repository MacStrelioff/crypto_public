import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Pool Creation Result...\n");

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

    // Contract addresses
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const WETH = "0x4200000000000000000000000000000000000006";
    const testTokenAddress = "0xc29CFB6E21eF7cdfEb18C547252E297D6246a284"; // From last test

    console.log(`CL Factory: ${CL_FACTORY}`);
    console.log(`WETH: ${WETH}`);
    console.log(`Test Token: ${testTokenAddress}`);

    try {
        // Sort tokens
        const token0 = WETH < testTokenAddress ? WETH : testTokenAddress;
        const token1 = WETH < testTokenAddress ? testTokenAddress : WETH;
        const tickSpacing = 100;
        
        console.log(`\n📋 Token Configuration:`);
        console.log(`   Token0: ${token0}`);
        console.log(`   Token1: ${token1}`);
        console.log(`   Tick Spacing: ${tickSpacing}`);

        // Check if pool exists now
        console.log("\n🔍 Checking if pool exists...");
        
        const clFactory = await ethers.getContractAt([
            "function getPool(address,address,int24) external view returns (address)",
            "function allPools(uint256) external view returns (address)",
            "function allPoolsLength() external view returns (uint256)"
        ], CL_FACTORY);

        try {
            const poolAddress = await clFactory.getPool(token0, token1, tickSpacing);
            console.log(`   Pool address from getPool: ${poolAddress}`);
            
            if (poolAddress !== "0x0000000000000000000000000000000000000000") {
                console.log(`   ✅ Pool exists!`);
                
                // Check if the pool has code
                const poolCode = await ethers.provider.getCode(poolAddress);
                const hasCode = poolCode !== "0x";
                console.log(`   Pool has code: ${hasCode ? '✅ YES' : '❌ NO'}`);
                
                if (hasCode) {
                    console.log(`   Pool code length: ${poolCode.length} characters`);
                    
                    // Try to get pool info
                    const poolContract = await ethers.getContractAt([
                        "function token0() external view returns (address)",
                        "function token1() external view returns (address)",
                        "function tickSpacing() external view returns (int24)",
                        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
                    ], poolAddress);
                    
                    try {
                        const poolToken0 = await poolContract.token0();
                        const poolToken1 = await poolContract.token1();
                        const poolTickSpacing = await poolContract.tickSpacing();
                        
                        console.log(`   Pool token0: ${poolToken0}`);
                        console.log(`   Pool token1: ${poolToken1}`);
                        console.log(`   Pool tickSpacing: ${poolTickSpacing}`);
                        
                        // Check if tokens match
                        console.log(`   Token0 matches: ${poolToken0 === token0}`);
                        console.log(`   Token1 matches: ${poolToken1 === token1}`);
                        console.log(`   Tick spacing matches: ${poolTickSpacing === tickSpacing}`);
                        
                    } catch (poolInfoError) {
                        console.log(`   ❌ Error getting pool info: ${poolInfoError instanceof Error ? poolInfoError.message : String(poolInfoError)}`);
                    }
                }
            } else {
                console.log(`   ❌ Pool still shows as non-existent`);
            }
            
        } catch (getPoolError) {
            console.log(`   ❌ Error calling getPool: ${getPoolError instanceof Error ? getPoolError.message : String(getPoolError)}`);
        }

        // Check all pools to see if our pool was created
        console.log("\n🔍 Checking all pools...");
        
        try {
            const allPoolsLength = await clFactory.allPoolsLength();
            console.log(`   Total pools: ${allPoolsLength}`);
            
            if (allPoolsLength > 0) {
                // Check the last few pools
                const poolsToCheck = Math.min(5, Number(allPoolsLength));
                console.log(`   Checking last ${poolsToCheck} pools...`);
                
                for (let i = 0; i < poolsToCheck; i++) {
                    const poolIndex = Number(allPoolsLength) - 1 - i;
                    const poolAddress = await clFactory.allPools(poolIndex);
                    console.log(`   Pool ${poolIndex}: ${poolAddress}`);
                    
                    // Check if this pool matches our tokens
                    if (poolAddress !== "0x0000000000000000000000000000000000000000") {
                        try {
                            const poolContract = await ethers.getContractAt([
                                "function token0() external view returns (address)",
                                "function token1() external view returns (address)"
                            ], poolAddress);
                            
                            const poolToken0 = await poolContract.token0();
                            const poolToken1 = await poolContract.token1();
                            
                            if ((poolToken0 === token0 && poolToken1 === token1) || 
                                (poolToken0 === token1 && poolToken1 === token0)) {
                                console.log(`   🎉 FOUND OUR POOL! Index: ${poolIndex}, Address: ${poolAddress}`);
                                console.log(`   Pool token0: ${poolToken0}`);
                                console.log(`   Pool token1: ${poolToken1}`);
                            }
                            
                        } catch (poolCheckError) {
                            // Ignore errors for individual pool checks
                        }
                    }
                }
            }
            
        } catch (allPoolsError) {
            console.log(`   ❌ Error checking all pools: ${allPoolsError instanceof Error ? allPoolsError.message : String(allPoolsError)}`);
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
