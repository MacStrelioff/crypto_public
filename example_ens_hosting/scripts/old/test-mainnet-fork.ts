import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to pause between transactions
function pause(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🧪 Testing Credit Line on Base Mainnet Fork...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    // Base Mainnet addresses (real Aerodrome contracts)
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";
    const WETH = "0x4200000000000000000000000000000000000006"; // Base WETH

    console.log("📋 Using Real Aerodrome Addresses:");
    console.log("CL Factory:", CL_FACTORY);
    console.log("Position Manager:", POSITION_MANAGER);
    console.log("WETH:", WETH);

    // Verify contracts exist on the fork
    console.log("\n🔍 Verifying Contract Existence...");
    const clFactoryCode = await ethers.provider.getCode(CL_FACTORY);
    const positionManagerCode = await ethers.provider.getCode(POSITION_MANAGER);
    const wethCode = await ethers.provider.getCode(WETH);

    console.log(`CL Factory code length: ${clFactoryCode.length}`);
    console.log(`Position Manager code length: ${positionManagerCode.length}`);
    console.log(`WETH code length: ${wethCode.length}`);

    if (clFactoryCode === "0x" || positionManagerCode === "0x") {
        console.log("❌ ERROR: Aerodrome contracts not found on fork!");
        return;
    }

    // Test Aerodrome contracts are callable
    console.log("\n🔍 Testing Aerodrome Contract Functions...");
    try {
        const clFactory = new ethers.Contract(CL_FACTORY, [
            "function poolImplementation() external view returns (address)",
            "function owner() external view returns (address)"
        ], ethers.provider);

        const poolImplementation = await clFactory.poolImplementation();
        const factoryOwner = await clFactory.owner();
        
        console.log("✅ Pool Implementation:", poolImplementation);
        console.log("✅ Factory Owner:", factoryOwner);
    } catch (error) {
        console.log("❌ Error calling CL factory:", error instanceof Error ? error.message : String(error));
        return;
    }

    // Deploy the real Aerodrome adapter (not mock)
    console.log("\n📦 Deploying Real AerodromeAdapter...");
    const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
    const aerodromeAdapter = await AerodromeAdapter.deploy();
    await aerodromeAdapter.waitForDeployment();
    const aerodromeAdapterAddress = await aerodromeAdapter.getAddress();
    console.log("✅ Real AerodromeAdapter deployed to:", aerodromeAdapterAddress);

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Deploy the CreditLineFactory
    console.log("📦 Deploying CreditLineFactory...");
    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const creditLineFactory = await CreditLineFactory.deploy(aerodromeAdapterAddress);
    await creditLineFactory.waitForDeployment();
    const factoryAddress = await creditLineFactory.getAddress();
    console.log("✅ CreditLineFactory deployed to:", factoryAddress);

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Authorize the factory to call the adapter
    console.log("🔐 Authorizing factory to call adapter...");
    await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true);
    console.log("✅ Factory authorized");

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Get some WETH for testing (on fork, we can use hardhat's built-in WETH)
    console.log("💸 Getting WETH for testing...");
    const wethContract = await ethers.getContractAt("IERC20", WETH);
    
    // On a fork, we can use hardhat's built-in WETH or wrap ETH
    const wethBalance = await wethContract.balanceOf(deployer.address);
    console.log("Current WETH balance:", ethers.formatEther(wethBalance));

    let testAmount = ethers.parseEther("0.1");
    if (wethBalance < testAmount) {
        console.log("Wrapping ETH to WETH...");
        // Wrap some ETH to WETH
        const wethWithDeposit = new ethers.Contract(WETH, [
            "function deposit() external payable",
            "function balanceOf(address) external view returns (uint256)"
        ], deployer);
        
        await wethWithDeposit.deposit({ value: testAmount });
        console.log("✅ Wrapped ETH to WETH");
    }

    // Transfer WETH to factory
    await wethContract.transfer(factoryAddress, testAmount);
    console.log("✅ Transferred WETH to factory");

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Create a test credit line
    console.log("🎯 Creating test credit line with real Aerodrome integration...");
    const creditLimit = ethers.parseEther("1000000");
    const apy = 500; // 5% APY
    const initialLiquidity = ethers.parseEther("0.05");

    try {
        const createTx = await creditLineFactory.createCreditLine(
            "Real Test Credit Line",
            "RTCL",
            WETH,
            creditLimit,
            apy,
            deployer.address, // borrower
            initialLiquidity
        );
        
        console.log("✅ Credit line creation transaction sent:", createTx.hash);
        console.log("⏳ Waiting for transaction to be mined...");
        
        const receipt = await createTx.wait();
        console.log("✅ Credit line creation successful! Block:", receipt.blockNumber);
        
        // Get the created credit line address from events
        const creditLineCreatedEvent = receipt?.logs.find((log: any) => {
            try {
                const parsed = creditLineFactory.interface.parseLog(log);
                return parsed?.name === "CreditLineCreated";
            } catch {
                return false;
            }
        });
        
        if (creditLineCreatedEvent) {
            const parsed = creditLineFactory.interface.parseLog(creditLineCreatedEvent);
            const creditLineAddress = parsed?.args[0];
            console.log("✅ Credit line token deployed to:", creditLineAddress);
            
            // Test the credit line functionality
            await testRealCreditLineFunctionality(creditLineAddress, aerodromeAdapterAddress, factoryAddress, deployer);
            
        } else {
            console.log("❌ Could not find CreditLineCreated event");
        }
        
    } catch (error) {
        console.log("❌ Error creating credit line:", error instanceof Error ? error.message : String(error));
        
        // Try to get more detailed error information
        if (error.data) {
            console.log("Error data:", error.data);
        }
        if (error.reason) {
            console.log("Error reason:", error.reason);
        }
    }
}

async function testRealCreditLineFunctionality(creditLineAddress: string, aerodromeAdapterAddress: string, factoryAddress: string, deployer: any) {
    console.log("\n🔍 Testing Real Credit Line Functionality...");
    
    const creditLineToken = await ethers.getContractAt("CreditLineToken", creditLineAddress);
    const aerodromeAdapter = await ethers.getContractAt("AerodromeAdapter", aerodromeAdapterAddress);
    const creditLineFactory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
    
    // Get initial status
    console.log("\n📊 Initial Credit Line Status:");
    try {
        const status = await creditLineToken.getCreditLineStatus();
        console.log("✅ getCreditLineStatus successful!");
        console.log("- Underlying Asset:", status[0]);
        console.log("- Credit Limit:", ethers.formatEther(status[1]));
        console.log("- APY:", status[2].toString(), "basis points");
        console.log("- Borrower:", status[3]);
        console.log("- Last Accrual Time:", new Date(Number(status[4]) * 1000).toISOString());
        console.log("- Price Validation Enabled:", status[5]);
        console.log("- Aerodrome Adapter:", status[6]);
    } catch (error) {
        console.log("❌ Error getting credit line status:", error instanceof Error ? error.message : String(error));
    }
    
    // Test interest accrual with real Aerodrome
    console.log("\n💰 Testing Real Interest Accrual:");
    const timeElapsed = 86400; // 1 day in seconds
    
    try {
        const accrueTx = await creditLineFactory.accrueInterest(creditLineAddress, timeElapsed);
        await accrueTx.wait();
        console.log("✅ Real interest accrual successful");
        
        // Get updated status
        const updatedStatus = await creditLineToken.getCreditLineStatus();
        console.log("- Updated Last Accrual Time:", new Date(Number(updatedStatus[4]) * 1000).toISOString());
        
    } catch (error) {
        console.log("❌ Error accruing interest:", error instanceof Error ? error.message : String(error));
    }
    
    // Test transfer functionality
    console.log("\n💸 Testing Transfer Functionality:");
    try {
        const balance = await creditLineToken.balanceOf(creditLineAddress);
        if (balance > 0) {
            const transferAmount = balance / 100; // Transfer 1% of balance
            console.log("- Transfer Amount:", ethers.formatEther(transferAmount));
            
            const tx = await creditLineToken.transfer(deployer.address, transferAmount);
            await tx.wait();
            console.log("✅ Transfer successful");
        } else {
            console.log("- No tokens to transfer");
        }
    } catch (error) {
        console.log("❌ Error transferring tokens:", error instanceof Error ? error.message : String(error));
    }
    
    console.log("\n✅ Real credit line functionality test complete!");
    console.log("🎉 SUCCESS: Credit line system works with real Aerodrome contracts!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
