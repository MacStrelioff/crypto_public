import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to wait for transaction to be mined
async function waitForTransaction(tx: any, description: string) {
    console.log(`⏳ Waiting for ${description} to be mined...`);
    console.log(`   Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ ${description} completed!`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    
    return receipt;
}

// Helper function to get higher gas price
async function getHigherGasPrice(multiplier: number = 2) {
    const feeData = await ethers.provider.getFeeData();
    const higherGasPrice = feeData.gasPrice * BigInt(multiplier);
    
    console.log(`   Current gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
    console.log(`   Using gas price: ${ethers.formatUnits(higherGasPrice, 'gwei')} gwei`);
    
    return higherGasPrice;
}

// Helper function to pause execution
async function pause(ms: number) {
    console.log(`⏸️  Pausing for ${ms / 1000} seconds...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🔍 Testing Pool Creation Step by Step...\n");

    // Pause to let any pending transactions settle
    await pause(15000);

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

    console.log(`CL Factory: ${CL_FACTORY}`);
    console.log(`WETH: ${WETH}`);

    try {
        // Step 1: Deploy a test token
        console.log("\n🔍 Step 1: Deploying test token...");
        const CreditLineToken = await ethers.getContractFactory("CreditLineToken");
        const testToken = await CreditLineToken.deploy("Test Token", "TEST");
        await waitForTransaction(testToken.deploymentTransaction(), "Test token deployment");
        
        const testTokenAddress = await testToken.getAddress();
        console.log(`   Test token deployed: ${testTokenAddress}`);

        // Pause after deployment
        await pause(10000);

        // Initialize the test token
        const higherGasPrice = await getHigherGasPrice(2);
        const initTx = await testToken.initialize(
            WETH,
            ethers.parseEther("1000"),
            500,
            deployer.address,
            ethers.parseEther("0.001"),
            {
                gasPrice: higherGasPrice
            }
        );
        await waitForTransaction(initTx, "Test token initialization");

        // Step 2: Sort tokens properly
        console.log("\n🔍 Step 2: Sorting tokens...");
        const token0 = WETH < testTokenAddress ? WETH : testTokenAddress;
        const token1 = WETH < testTokenAddress ? testTokenAddress : WETH;
        
        console.log(`   Token0 (lower): ${token0}`);
        console.log(`   Token1 (higher): ${token1}`);
        console.log(`   WETH is token0: ${token0 === WETH}`);

        // Step 3: Test getPool call directly
        console.log("\n🔍 Step 3: Testing getPool call...");
        
        const clFactory = await ethers.getContractAt([
            "function getPool(address,address,int24) external view returns (address)",
            "function createPool(address,address,int24,uint160) external returns (address)"
        ], CL_FACTORY);

        const tickSpacing = 100;
        
        try {
            const existingPool = await clFactory.getPool(token0, token1, tickSpacing);
            console.log(`   Existing pool: ${existingPool}`);
            
            if (existingPool !== "0x0000000000000000000000000000000000000000") {
                console.log(`   ✅ Pool already exists: ${existingPool}`);
                return;
            }
            
        } catch (getPoolError) {
            console.log(`   ❌ getPool failed: ${getPoolError instanceof Error ? getPoolError.message : String(getPoolError)}`);
            return;
        }

        // Step 4: Test createPool call directly
        console.log("\n🔍 Step 4: Testing createPool call...");
        
        // Pause before pool creation
        await pause(10000);
        
        const sqrtPriceX96 = "79228162514264337593543950336"; // 1:1 price
        console.log(`   Using sqrtPriceX96: ${sqrtPriceX96}`);
        
        try {
            // First simulate the call
            console.log("   🔄 Simulating createPool...");
            await clFactory.createPool.staticCall(token0, token1, tickSpacing, sqrtPriceX96);
            console.log("   ✅ Simulation successful!");
            
            // Get even higher gas price for pool creation
            const poolGasPrice = await getHigherGasPrice(3);
            
            // If simulation works, try actual call
            console.log("   🔄 Executing createPool...");
            const createTx = await clFactory.createPool(token0, token1, tickSpacing, sqrtPriceX96, {
                gasPrice: poolGasPrice
            });
            await waitForTransaction(createTx, "Pool creation");
            
            // Verify the pool was created
            const newPool = await clFactory.getPool(token0, token1, tickSpacing);
            console.log(`   ✅ New pool address: ${newPool}`);
            
        } catch (createError) {
            console.log(`   ❌ createPool failed: ${createError instanceof Error ? createError.message : String(createError)}`);
            
            // Try to decode the error
            if (createError instanceof Error) {
                const errorMatch = createError.message.match(/revert (.+)/);
                if (errorMatch) {
                    console.log(`     Revert reason: ${errorMatch[1]}`);
                }
                
                const errorDataMatch = createError.message.match(/0x[a-fA-F0-9]+/);
                if (errorDataMatch) {
                    console.log(`     Error data: ${errorDataMatch[0]}`);
                    
                    // Try to decode with common errors
                    const commonErrors = [
                        "error PoolAlreadyExists()",
                        "error InvalidFee()",
                        "error InvalidTickSpacing()",
                        "error InvalidSqrtRatio()",
                        "error Forbidden()",
                        "error Unauthorized()"
                    ];
                    
                    for (const errorSig of commonErrors) {
                        try {
                            const iface = new ethers.Interface([errorSig]);
                            const decoded = iface.parseError(errorDataMatch[0]);
                            console.log(`     ✅ Decoded error: ${decoded.name}`);
                            break;
                        } catch (decodeError) {
                            // Continue to next error signature
                        }
                    }
                }
            }
        }

        // Step 5: Test our adapter's raw call approach
        console.log("\n🔍 Step 5: Testing adapter's raw call approach...");
        
        try {
            // Simulate exactly what our adapter does
            const getPoolCall = ethers.AbiCoder.defaultAbiCoder().encode(
                ["bytes4", "address", "address", "int24"],
                [ethers.id("getPool(address,address,int24)").slice(0, 10), token0, token1, tickSpacing]
            );
            
            console.log("   🔄 Testing raw getPool call...");
            const getPoolCallData = ethers.concat([
                ethers.id("getPool(address,address,int24)").slice(0, 10),
                ethers.AbiCoder.defaultAbiCoder().encode(["address", "address", "int24"], [token0, token1, tickSpacing])
            ]);
            
            const getPoolResult = await ethers.provider.call({
                to: CL_FACTORY,
                data: getPoolCallData
            });
            
            console.log(`   Raw getPool result: ${getPoolResult}`);
            
            if (getPoolResult && getPoolResult !== "0x") {
                const decodedPool = ethers.AbiCoder.defaultAbiCoder().decode(["address"], getPoolResult)[0];
                console.log(`   Decoded pool address: ${decodedPool}`);
            }
            
        } catch (rawCallError) {
            console.log(`   ❌ Raw call failed: ${rawCallError instanceof Error ? rawCallError.message : String(rawCallError)}`);
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
