import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Last Factory Test Result...\n");

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

    // Contract addresses from our factory test
    const factoryAddress = "0x3627E21a934102bF2390C721954d91aa453C5f79";
    const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`Adapter address: ${adapterAddress}`);
    console.log(`WETH address: ${WETH}`);

    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        const adapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);

        // Check if any credit lines were created
        console.log("\n🔍 Checking for created credit lines...");
        
        try {
            const creditLines = await factory.getAllCreditLines();
            console.log(`Total credit lines created: ${creditLines.length}`);
            
            if (creditLines.length > 0) {
                console.log("📋 Created credit lines:");
                for (let i = 0; i < creditLines.length; i++) {
                    const creditLineAddress = creditLines[i];
                    console.log(`  ${i + 1}. ${creditLineAddress}`);
                    
                    // Check if the credit line has code
                    const code = await ethers.provider.getCode(creditLineAddress);
                    const hasCode = code !== "0x";
                    console.log(`     Has code: ${hasCode ? '✅ YES' : '❌ NO'}`);
                    
                    if (hasCode) {
                        try {
                            const creditLine = await ethers.getContractAt("CreditLineToken", creditLineAddress);
                            const name = await creditLine.name();
                            const symbol = await creditLine.symbol();
                            console.log(`     Name: ${name}`);
                            console.log(`     Symbol: ${symbol}`);
                            
                            // Check if it has a pool
                            const position = await adapter.getPosition(creditLineAddress);
                            console.log(`     Pool: ${position.pool}`);
                            console.log(`     Position exists: ${position.exists}`);
                            
                            if (position.pool !== "0x0000000000000000000000000000000000000000") {
                                console.log(`     ✅ Pool created successfully!`);
                            } else {
                                console.log(`     ❌ No pool created`);
                            }
                            
                        } catch (creditLineError) {
                            console.log(`     ❌ Error checking credit line: ${creditLineError instanceof Error ? creditLineError.message : String(creditLineError)}`);
                        }
                    }
                }
            } else {
                console.log("❌ No credit lines were created");
            }
            
        } catch (getCreditLinesError) {
            console.log(`❌ Error getting credit lines: ${getCreditLinesError instanceof Error ? getCreditLinesError.message : String(getCreditLinesError)}`);
        }

        // Check factory WETH balance
        console.log("\n💰 Checking factory WETH balance...");
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const factoryWethBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`Factory WETH balance: ${ethers.formatEther(factoryWethBalance)} WETH`);

        // Check if factory is authorized to call adapter
        console.log("\n🔐 Checking factory authorization...");
        const isAuthorized = await adapter.authorizedCallers(factoryAddress);
        console.log(`Factory authorized to call adapter: ${isAuthorized}`);

        // Check adapter owner
        const adapterOwner = await adapter.owner();
        console.log(`Adapter owner: ${adapterOwner}`);
        console.log(`Deployer address: ${deployer.address}`);

        // Check factory owner
        const factoryOwner = await factory.owner();
        console.log(`Factory owner: ${factoryOwner}`);

        // Test if we can create a credit line now
        console.log("\n🧪 Testing credit line creation now...");
        
        if (factoryWethBalance > 0) {
            console.log("✅ Factory has WETH, attempting to create credit line...");
            
            try {
                // Try to create a credit line
                const createTx = await factory.createCreditLine(
                    "Test Credit Line",           // name
                    "TCL",                       // symbol
                    WETH,                        // underlying asset
                    ethers.parseEther("1000"),   // credit limit (1000 tokens)
                    500,                         // APY (5% = 500 basis points)
                    deployer.address,            // borrower
                    ethers.parseEther("0.001")   // initial liquidity
                );
                
                console.log(`📝 Credit line creation transaction: ${createTx.hash}`);
                
                const receipt = await createTx.wait();
                console.log(`✅ Credit line created successfully!`);
                console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
                console.log(`   Block: ${receipt.blockNumber}`);
                
                // Check the new credit line
                const newCreditLines = await factory.getAllCreditLines();
                const newCreditLineAddress = newCreditLines[newCreditLines.length - 1];
                console.log(`   New credit line address: ${newCreditLineAddress}`);
                
            } catch (createError) {
                console.log(`❌ Credit line creation failed: ${createError instanceof Error ? createError.message : String(createError)}`);
                
                // Try to decode the error
                if (createError instanceof Error && createError.message.includes("execution reverted")) {
                    console.log("\n🔍 Attempting to decode error...");
                    try {
                        const errorData = createError.message.match(/0x[a-fA-F0-9]+/);
                        if (errorData) {
                            console.log(`Error data: ${errorData[0]}`);
                        }
                    } catch (decodeError) {
                        console.log("Could not decode error");
                    }
                }
            }
        } else {
            console.log("❌ Factory has no WETH, cannot test credit line creation");
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
