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

// Helper function to pause execution
async function pause(ms: number) {
    console.log(`⏸️  Pausing for ${ms / 1000} seconds...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🔍 Debugging Pool Creation with Detailed Traces...\n");

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

    // Contract addresses from our deployment
    const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Adapter address: ${adapterAddress}`);
    console.log(`WETH address: ${WETH}`);

    try {
        const adapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);

        // Check if deployer is authorized
        const isAuthorized = await adapter.authorizedCallers(deployer.address);
        console.log(`Deployer authorized to call adapter: ${isAuthorized}`);

        if (!isAuthorized) {
            console.log("❌ Deployer is not authorized to call adapter.");
            return;
        }

        // Deploy a test credit line token
        console.log("\n🔍 Deploying test credit line token...");
        const CreditLineToken = await ethers.getContractFactory("CreditLineToken");
        const testToken = await CreditLineToken.deploy("Test Token", "TEST");
        await waitForTransaction(testToken.deploymentTransaction(), "Test token deployment");
        
        const testTokenAddress = await testToken.getAddress();
        console.log(`Test token address: ${testTokenAddress}`);

        // Pause after deployment to let transaction settle
        await pause(10000);

        // Initialize the test token
        const initTx = await testToken.initialize(
            WETH, // underlying asset
            ethers.parseEther("1000"), // credit limit
            500, // APY
            deployer.address, // borrower
            ethers.parseEther("0.001") // initial liquidity
        );
        await waitForTransaction(initTx, "Test token initialization");

        // Pause after initialization
        await pause(5000);

        // Transfer WETH to the test token
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const wethAmount = ethers.parseEther("0.001");
        
        const transferTx = await wethContract.transfer(testTokenAddress, wethAmount);
        await waitForTransaction(transferTx, "WETH transfer to test token");

        // Pause after WETH transfer
        await pause(5000);

        // Approve the adapter to spend tokens from the test token
        const approveTx = await testToken.approveAdapter(adapterAddress, wethAmount);
        await waitForTransaction(approveTx, "Adapter approval");

        // Pause after approval
        await pause(5000);

        // Check balances before pool creation
        console.log("\n💰 Checking balances before pool creation...");
        const testTokenBalance = await testToken.balanceOf(testTokenAddress);
        const wethBalance = await wethContract.balanceOf(testTokenAddress);
        console.log(`   Test token balance: ${ethers.formatEther(testTokenBalance)}`);
        console.log(`   WETH balance: ${ethers.formatEther(wethBalance)}`);

        // Check allowance
        const allowance = await testToken.allowance(testTokenAddress, adapterAddress);
        console.log(`   Adapter allowance: ${ethers.formatEther(allowance)}`);

        // Try to simulate the transaction first to get better error info
        console.log("\n🔄 Simulating adapter.createPoolAndAddLiquidity...");
        
        try {
            // Use staticCall to simulate the transaction and get more detailed error info
            await adapter.createPoolAndAddLiquidity.staticCall(
                testTokenAddress, // credit line token
                WETH, // underlying asset
                wethAmount, // amount of credit line tokens
                wethAmount  // amount of underlying asset
            );
            
            console.log("✅ Simulation successful! Proceeding with actual transaction...");
            
        } catch (simError) {
            console.log("❌ Simulation failed:", simError instanceof Error ? simError.message : String(simError));
            
            // Try to decode the simulation error
            if (simError instanceof Error) {
                console.log("\n🔍 Analyzing simulation error...");
                
                // Check if it contains revert data
                const errorMatch = simError.message.match(/revert (.+)/);
                if (errorMatch) {
                    console.log(`Revert reason: ${errorMatch[1]}`);
                }
                
                // Check for custom error data
                const errorDataMatch = simError.message.match(/0x[a-fA-F0-9]+/);
                if (errorDataMatch) {
                    console.log(`Error data: ${errorDataMatch[0]}`);
                    
                    // Try to decode with common Aerodrome/Uniswap errors
                    const commonErrors = [
                        "error InsufficientBalance()",
                        "error TransferFailed()",
                        "error MintFailed()",
                        "error PoolCreationFailed()",
                        "error InvalidParameters()",
                        "error TickLowerGreaterThanTickUpper()",
                        "error TickLowerTooSmall()",
                        "error TickUpperTooLarge()",
                        "error LiquidityZero()",
                        "error Amount0Zero()",
                        "error Amount1Zero()",
                        "error PoolAlreadyInitialized()",
                        "error PoolNotInitialized()",
                        "error InvalidFee()",
                        "error InvalidTickSpacing()",
                        "error SwapAmountCannotBeZero()",
                        "error InvalidSqrtRatio()"
                    ];
                    
                    for (const errorSig of commonErrors) {
                        try {
                            const iface = new ethers.Interface([errorSig]);
                            const decoded = iface.parseError(errorDataMatch[0]);
                            console.log(`✅ Decoded error: ${decoded.name}`);
                            if (decoded.args && decoded.args.length > 0) {
                                console.log(`   Arguments: ${decoded.args.join(', ')}`);
                            }
                            break;
                        } catch (decodeError) {
                            // Continue to next error signature
                        }
                    }
                }
            }
            
            // Don't proceed with actual transaction if simulation failed
            console.log("\n⚠️  Skipping actual transaction due to simulation failure.");
            return;
        }

        // If simulation succeeded, try the actual transaction
        console.log("\n🔄 Executing actual adapter.createPoolAndAddLiquidity...");
        
        try {
            const createTx = await adapter.createPoolAndAddLiquidity(
                testTokenAddress, // credit line token
                WETH, // underlying asset
                wethAmount, // amount of credit line tokens
                wethAmount  // amount of underlying asset
            );
            
            const receipt = await waitForTransaction(createTx, "Pool creation and liquidity addition");

            // Analyze the transaction logs
            console.log("\n📋 Transaction Logs:");
            for (let i = 0; i < receipt.logs.length; i++) {
                const log = receipt.logs[i];
                console.log(`   Log ${i}: Address: ${log.address}, Topics: ${log.topics.length}`);
                
                // Try to decode common events
                try {
                    // Check for Transfer events
                    if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
                        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                            ['uint256'], 
                            log.data
                        );
                        console.log(`     Transfer: ${decoded[0].toString()} tokens`);
                    }
                    
                    // Check for Pool creation events
                    if (log.topics[0] === ethers.id("PoolCreated(address,address,uint24,address)")) {
                        console.log(`     Pool Created Event Found!`);
                    }
                    
                } catch (decodeError) {
                    // Ignore decode errors for logs
                }
            }

            // Get the position info
            const position = await adapter.getPosition(testTokenAddress);
            console.log(`\n📊 Position Info:`);
            console.log(`   Pool: ${position.pool}`);
            console.log(`   Full Range Token ID: ${position.fullRangeTokenId}`);
            console.log(`   Concentrated Token ID: ${position.concentratedTokenId}`);
            console.log(`   Position Exists: ${position.exists}`);

            if (position.pool !== "0x0000000000000000000000000000000000000000") {
                console.log(`\n✅ SUCCESS: Pool created successfully: ${position.pool}`);
            } else {
                console.log(`\n❌ Pool creation failed - no pool address returned`);
            }

        } catch (txError) {
            console.log("❌ Transaction execution error:", txError instanceof Error ? txError.message : String(txError));
            
            // Get transaction hash if available for further analysis
            if (txError instanceof Error && 'transactionHash' in txError) {
                console.log(`Transaction hash for analysis: ${(txError as any).transactionHash}`);
            }
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
