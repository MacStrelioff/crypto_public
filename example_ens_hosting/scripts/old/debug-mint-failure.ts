import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to pause between transactions
function pause(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🔍 Debugging Mint Failure on Base Mainnet...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    if (network.chainId !== 8453n) {
        console.log("❌ This script should be run on Base mainnet (chain ID 8453)");
        return;
    }

    // Base Mainnet addresses
    const WETH = "0x4200000000000000000000000000000000000006";
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";

    // Check balances
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    const wethContract = await ethers.getContractAt("IERC20", WETH);
    const wethBalance = await wethContract.balanceOf(deployer.address);

    console.log("Current balances:");
    console.log("- ETH:", ethers.formatEther(ethBalance), "ETH");
    console.log("- WETH:", ethers.formatEther(wethBalance), "WETH");

    // Need more WETH for testing
    const requiredWeth = ethers.parseEther("0.05"); // 0.05 WETH for testing
    if (wethBalance < requiredWeth) {
        console.log("Wrapping more ETH to WETH...");
        const wethWithDeposit = new ethers.Contract(WETH, [
            "function deposit() external payable",
            "function balanceOf(address) external view returns (uint256)"
        ], deployer);
        
        await wethWithDeposit.deposit({ value: requiredWeth });
        console.log("✅ Wrapped 0.05 ETH to WETH");
    }

    // Deploy contracts
    console.log("\n📦 Deploying contracts...");
    const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
    const aerodromeAdapter = await AerodromeAdapter.deploy();
    await aerodromeAdapter.waitForDeployment();
    const aerodromeAdapterAddress = await aerodromeAdapter.getAddress();
    console.log("✅ AerodromeAdapter deployed to:", aerodromeAdapterAddress);

    console.log("⏳ Pausing 5 seconds...");
    await pause(5000);

    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const creditLineFactory = await CreditLineFactory.deploy(aerodromeAdapterAddress);
    await creditLineFactory.waitForDeployment();
    const factoryAddress = await creditLineFactory.getAddress();
    console.log("✅ CreditLineFactory deployed to:", factoryAddress);

    console.log("⏳ Pausing 5 seconds...");
    await pause(5000);

    // Authorize factory
    await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true);
    console.log("✅ Factory authorized");

    console.log("⏳ Pausing 5 seconds...");
    await pause(5000);

    // Transfer WETH to factory
    await wethContract.transfer(factoryAddress, requiredWeth);
    console.log("✅ Transferred 0.05 WETH to factory");

    console.log("⏳ Pausing 5 seconds...");
    await pause(5000);

    // Test with larger amounts
    console.log("\n🎯 Testing with larger amounts...");
    const creditLimit = ethers.parseEther("100000");
    const apy = 500; // 5% APY
    const initialLiquidity = ethers.parseEther("0.05"); // 0.05 WETH

    console.log("📊 Test Parameters:");
    console.log("- Credit Limit:", ethers.formatEther(creditLimit), "tokens");
    console.log("- APY:", apy / 100, "%");
    console.log("- Initial Liquidity:", ethers.formatEther(initialLiquidity), "WETH");

    try {
        const createTx = await creditLineFactory.createCreditLine(
            "Debug Test Credit Line",
            "DTCL",
            WETH,
            creditLimit,
            apy,
            deployer.address,
            initialLiquidity
        );
        
        console.log("✅ Credit line creation transaction sent:", createTx.hash);
        console.log("⏳ Waiting for transaction to be mined...");
        
        const receipt = await createTx.wait();
        console.log("✅ Credit line creation successful! Block:", receipt.blockNumber);
        console.log("💰 Gas used:", receipt.gasUsed.toString());
        
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
            
            // Check token balances
            const creditLineToken = await ethers.getContractAt("CreditLineToken", creditLineAddress);
            const creditLineWethBalance = await wethContract.balanceOf(creditLineAddress);
            const creditLineTokenBalance = await creditLineToken.balanceOf(creditLineAddress);
            
            console.log("\n📊 Token Balances:");
            console.log("- Credit Line WETH balance:", ethers.formatEther(creditLineWethBalance));
            console.log("- Credit Line token balance:", ethers.formatEther(creditLineTokenBalance));
            
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
        
        // Check if it's a revert with reason
        if (error.message && error.message.includes("execution reverted")) {
            console.log("\n🔍 This appears to be a revert. Common causes:");
            console.log("1. Token approval issues");
            console.log("2. Pool creation/initialization issues");
            console.log("3. Insufficient liquidity for position creation");
            console.log("4. Invalid tick ranges");
            console.log("5. Gas limit exceeded");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
