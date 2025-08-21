import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🧪 Testing Credit Line Creation Step...\n");

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
    const factoryAddress = "0x3627E21a934102bF2390C721954d91aa453C5f79";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`WETH address: ${WETH}`);

    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        const wethContract = await ethers.getContractAt("IERC20", WETH);

        // Check factory WETH balance
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);

        // Check factory owner
        const factoryOwner = await factory.owner();
        console.log(`Factory owner: ${factoryOwner}`);
        console.log(`Deployer address: ${deployer.address}`);
        
        if (factoryOwner !== deployer.address) {
            console.log("❌ Deployer is not the factory owner.");
            return;
        }

        // Check if factory is authorized to call adapter
        const adapterAddress = await factory.aerodromeAdapter();
        console.log(`Adapter address: ${adapterAddress}`);
        
        const adapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);
        const isAuthorized = await adapter.authorizedCallers(factoryAddress);
        console.log(`Factory authorized to call adapter: ${isAuthorized}`);

        if (!isAuthorized) {
            console.log("❌ Factory is not authorized to call adapter.");
            return;
        }

        // Transfer WETH to factory if needed
        const initialLiquidity = ethers.parseEther("0.001");
        if (factoryBalance < initialLiquidity) {
            console.log("\n💰 Transferring WETH to factory...");
            
            const deployerBalance = await wethContract.balanceOf(deployer.address);
            console.log(`Deployer WETH balance: ${ethers.formatEther(deployerBalance)} WETH`);
            
            if (deployerBalance < initialLiquidity) {
                console.log("❌ Deployer doesn't have enough WETH.");
                return;
            }
            
            const transferTx = await wethContract.transfer(factoryAddress, initialLiquidity);
            console.log(`📝 WETH transfer transaction: ${transferTx.hash}`);
            
            const transferReceipt = await transferTx.wait();
            console.log(`✅ WETH transferred to factory!`);
            console.log(`   Gas used: ${transferReceipt.gasUsed.toString()}`);
            
            // Check factory balance after transfer
            const newFactoryBalance = await wethContract.balanceOf(factoryAddress);
            console.log(`   Factory WETH balance: ${ethers.formatEther(newFactoryBalance)} WETH`);
        }

        // Try to create credit line
        console.log("\n🔄 Attempting to create credit line...");
        
        const createTx = await factory.createCreditLine(
            "Test Credit Line",           // name
            "TCL",                       // symbol
            WETH,                        // underlying asset
            ethers.parseEther("1000"),   // credit limit (1000 tokens)
            500,                         // APY (5% = 500 basis points)
            deployer.address,            // borrower
            initialLiquidity             // initial liquidity
        );
        
        console.log(`📝 Credit line creation transaction: ${createTx.hash}`);
        
        const receipt = await createTx.wait();
        console.log(`✅ Credit line created successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);

        // Get the created credit line address
        const creditLines = await factory.getAllCreditLines();
        const creditLineAddress = creditLines[creditLines.length - 1];
        console.log(`   Credit line address: ${creditLineAddress}`);

        // Get credit line info
        const creditLineInfo = await factory.getCreditLineInfo(creditLineAddress);
        console.log(`\n📊 Credit Line Info:`);
        console.log(`   Underlying Asset: ${creditLineInfo.status.underlyingAsset}`);
        console.log(`   Credit Limit: ${ethers.formatEther(creditLineInfo.status.creditLimit)} tokens`);
        console.log(`   APY: ${creditLineInfo.status.apy} basis points (${creditLineInfo.status.apy / 100}%)`);
        console.log(`   Borrower: ${creditLineInfo.status.borrower}`);
        console.log(`   Total Provided: ${ethers.formatEther(creditLineInfo.status.totalProvided)}`);
        console.log(`   Total Withdrawn: ${ethers.formatEther(creditLineInfo.status.totalWithdrawn)}`);
        console.log(`   Available Liquidity: ${ethers.formatEther(creditLineInfo.status.availableLiquidity)}`);

        // Get Aerodrome position info
        console.log(`\n🏊 Aerodrome Position Info:`);
        console.log(`   Pool: ${creditLineInfo.position.pool}`);
        console.log(`   Full Range Token ID: ${creditLineInfo.position.fullRangeTokenId}`);
        console.log(`   Concentrated Token ID: ${creditLineInfo.position.concentratedTokenId}`);
        console.log(`   Position Exists: ${creditLineInfo.position.exists}`);

        // Check if pool was created
        if (creditLineInfo.position.pool !== "0x0000000000000000000000000000000000000000") {
            console.log(`\n✅ SUCCESS: Pool created successfully: ${creditLineInfo.position.pool}`);
            console.log(`\n🎉 Credit line system is working!`);
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
                    
                    // Try to decode the error
                    const iface = new ethers.Interface([
                        "error InvalidParameters()",
                        "error InsufficientBalance()",
                        "error TransferFailed()"
                    ]);
                    
                    try {
                        const decoded = iface.parseError(errorData[0]);
                        console.log(`Decoded error: ${decoded.name}`);
                    } catch (decodeError) {
                        console.log(`Could not decode error: ${decodeError}`);
                    }
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
