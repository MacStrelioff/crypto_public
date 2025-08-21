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

async function main() {
    console.log("🧪 Testing Aerodrome Adapter Pool Creation...\n");

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

        // Initialize the test token
        const higherGasPrice = await getHigherGasPrice(2);
        const initTx = await testToken.initialize(
            WETH, // underlying asset
            ethers.parseEther("1000"), // credit limit
            500, // APY
            deployer.address, // borrower
            ethers.parseEther("0.001") // initial liquidity
        );
        await waitForTransaction(initTx, "Test token initialization");

        // Transfer WETH to the test token
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const wethAmount = ethers.parseEther("0.001");
        
        const transferTx = await wethContract.transfer(testTokenAddress, wethAmount, {
            gasPrice: higherGasPrice
        });
        await waitForTransaction(transferTx, "WETH transfer to test token");

        // Approve the adapter to spend tokens from the test token
        const approveTx = await testToken.approveAdapter(adapterAddress, wethAmount, {
            gasPrice: higherGasPrice
        });
        await waitForTransaction(approveTx, "Adapter approval");

        // Try to create pool and add liquidity
        console.log("\n🔄 Testing adapter.createPoolAndAddLiquidity...");
        
        const createTx = await adapter.createPoolAndAddLiquidity(
            testTokenAddress, // credit line token
            WETH, // underlying asset
            wethAmount, // amount of credit line tokens
            wethAmount,  // amount of underlying asset
            {
                gasPrice: higherGasPrice
            }
        );
        
        await waitForTransaction(createTx, "Pool creation and liquidity addition");

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
            console.log(`\n❌ Pool creation failed`);
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
