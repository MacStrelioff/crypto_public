import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to pause between transactions
function pause(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🧪 Testing Credit Line with Mock Aerodrome Adapter...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    let WETH: string;
    let mockToken: any = null;
    
    if (network.chainId === 84532n) { // Base Sepolia
        WETH = "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH
        console.log("Using real WETH on Base Sepolia:", WETH);
    } else {
        // Deploy a mock token for local testing
        console.log("📦 Deploying mock token for local testing...");
        const MockToken = await ethers.getContractFactory("contracts/test/MockToken.sol:MockToken");
        mockToken = await MockToken.deploy("Mock WETH", "MWETH", 18);
        await mockToken.waitForDeployment();
        WETH = await mockToken.getAddress();
        console.log("✅ Mock token deployed to:", WETH);
        
        const balance = await mockToken.balanceOf(deployer.address);
        console.log("✅ Deployer balance:", ethers.formatEther(balance), "mock tokens");
    }

    // Deploy the mock Aerodrome adapter
    console.log("📦 Deploying MockAerodromeAdapter...");
    const MockAerodromeAdapter = await ethers.getContractFactory("contracts/test/MockAerodromeAdapter.sol:MockAerodromeAdapter");
    const mockAerodromeAdapter = await MockAerodromeAdapter.deploy();
    await mockAerodromeAdapter.waitForDeployment();
    const mockAdapterAddress = await mockAerodromeAdapter.getAddress();
    console.log("✅ MockAerodromeAdapter deployed to:", mockAdapterAddress);

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Deploy the CreditLineFactory with the mock adapter
    console.log("📦 Deploying CreditLineFactory...");
    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const creditLineFactory = await CreditLineFactory.deploy(mockAdapterAddress);
    await creditLineFactory.waitForDeployment();
    const factoryAddress = await creditLineFactory.getAddress();
    console.log("✅ CreditLineFactory deployed to:", factoryAddress);

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Authorize the factory to call the mock adapter
    console.log("🔐 Authorizing factory to call mock adapter...");
    await mockAerodromeAdapter.setAuthorizedCaller(factoryAddress, true);
    console.log("✅ Factory authorized");

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Transfer tokens to factory for testing
    const testAmount = ethers.parseEther("0.05");
    if (mockToken) {
        await mockToken.transfer(factoryAddress, testAmount);
        console.log("✅ Transferred mock tokens to factory");
    } else {
        // On testnet, we need WETH
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const wethBalance = await wethContract.balanceOf(deployer.address);
        console.log("WETH balance:", ethers.formatEther(wethBalance));
        
        if (wethBalance >= testAmount) {
            await wethContract.transfer(factoryAddress, testAmount);
            console.log("✅ Transferred WETH to factory");
        } else {
            console.log("⚠️  Insufficient WETH for testing. Please wrap some ETH to WETH first.");
            return;
        }
    }

    console.log("⏳ Pausing 3 seconds...");
    await pause(3000);

    // Create a test credit line
    console.log("🎯 Creating test credit line...");
    const creditLimit = ethers.parseEther("1000000");
    const apy = 500; // 5% APY
    const initialLiquidity = ethers.parseEther("0.05");

    try {
        const createTx = await creditLineFactory.createCreditLine(
            "Test Credit Line Token",
            "TCLT",
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
            await testCreditLineFunctionality(creditLineAddress, mockAdapterAddress, factoryAddress, deployer);
            
        } else {
            console.log("❌ Could not find CreditLineCreated event");
        }
        
    } catch (error) {
        console.log("❌ Error creating credit line:", error instanceof Error ? error.message : String(error));
    }
}

async function testCreditLineFunctionality(creditLineAddress: string, mockAdapterAddress: string, factoryAddress: string, deployer: any) {
    console.log("\n🔍 Testing Credit Line Functionality...");
    
    const creditLineToken = await ethers.getContractAt("CreditLineToken", creditLineAddress);
    const mockAerodromeAdapter = await ethers.getContractAt("contracts/test/MockAerodromeAdapter.sol:MockAerodromeAdapter", mockAdapterAddress);
    const creditLineFactory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
    
    // Get initial status
    console.log("\n📊 Initial Credit Line Status:");
    const initialStatus = await creditLineToken.getCreditLineStatus();
    console.log("- Underlying Asset:", initialStatus.underlyingAsset);
    console.log("- Credit Limit:", ethers.formatEther(initialStatus.creditLimit));
    console.log("- APY:", initialStatus.apy.toString(), "basis points");
    console.log("- Last Accrual Time:", new Date(Number(initialStatus.lastAccrualTime) * 1000).toISOString());
    
    // Test interest accrual
    console.log("\n💰 Testing Interest Accrual:");
    const timeElapsed = 86400; // 1 day in seconds
    const apy = initialStatus.apy;
    
    try {
        const accrueTx = await creditLineFactory.accrueInterest(creditLineAddress, timeElapsed);
        await accrueTx.wait();
        console.log("✅ Interest accrual successful");
        
        // Get updated status
        const updatedStatus = await creditLineToken.getCreditLineStatus();
        console.log("- Updated Last Accrual Time:", new Date(Number(updatedStatus.lastAccrualTime) * 1000).toISOString());
        
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
    
    console.log("\n✅ Credit line functionality test complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
