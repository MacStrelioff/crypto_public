import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to request test ETH from faucet
async function requestTestETH(address: string) {
    console.log(`\n💰 Checking ETH balance for address: ${address}`);
    
    // Check current balance
    const balance = await ethers.provider.getBalance(address);
    console.log(`Current balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance > ethers.parseEther("0.01")) {
        console.log("✅ Sufficient balance for testing!");
        return true;
    } else {
        console.log("❌ Insufficient balance. Requesting test ETH from faucet...");
        
        try {
            // Try to get test ETH from Alchemy faucet (this often fails without API key)
            const response = await fetch("https://base-sepolia.g.alchemy.com/v2/demo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "eth_sendTransaction",
                    params: [{
                        from: "0x0000000000000000000000000000000000000000",
                        to: address,
                        value: "0x2386f26fc10000" // 0.01 ETH in hex
                    }]
                })
            });
            
            if (response.ok) {
                console.log("✅ Test ETH request sent to Alchemy faucet!");
                console.log("⏳ Waiting for transaction to be processed...");
                
                // Wait a bit and check balance again
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                
                const newBalance = await ethers.provider.getBalance(address);
                console.log(`New balance: ${ethers.formatEther(newBalance)} ETH`);
                
                if (newBalance > ethers.parseEther("0.005")) {
                    console.log("✅ Test ETH received!");
                    return true;
                }
            }
        } catch (error) {
            console.log("❌ Automatic faucet request failed:", error instanceof Error ? error.message : String(error));
        }
        
        // Fallback to manual faucet instructions
        console.log("\n📋 Manual faucet options:");
        console.log("1. Coinbase Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
        console.log("2. Base Sepolia Faucet: https://bridge.base.org/deposit");
        console.log("3. Alchemy Base Sepolia Faucet: https://www.alchemy.com/faucets/base-sepolia-faucet");
        console.log("4. QuickNode Base Sepolia Faucet: https://faucet.quicknode.com/base-sepolia");
        
        return false;
    }
}

async function main() {
    console.log("🚀 Deploying Improved Credit Line Architecture to Base Sepolia...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Check if we have enough ETH for deployment
    const hasTestETH = await requestTestETH(deployer.address);
    if (!hasTestETH) {
        console.log("\n⏳ Please get test ETH and run this script again.");
        return;
    }

    // Base Sepolia addresses
    const WETH = "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH
    
    console.log("Using addresses:");
    console.log("WETH:", WETH);
    console.log("");

    // Deploy the AerodromeAdapter first
    console.log("📦 Deploying AerodromeAdapter...");
    const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
    const aerodromeAdapter = await AerodromeAdapter.deploy();
    await aerodromeAdapter.waitForDeployment();
    const aerodromeAdapterAddress = await aerodromeAdapter.getAddress();
    console.log("✅ AerodromeAdapter deployed to:", aerodromeAdapterAddress);

    // Deploy the CreditLineFactory
    console.log("\n🏭 Deploying CreditLineFactory...");
    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const creditLineFactory = await CreditLineFactory.deploy(aerodromeAdapterAddress);
    await creditLineFactory.waitForDeployment();
    const factoryAddress = await creditLineFactory.getAddress();
    console.log("✅ CreditLineFactory deployed to:", factoryAddress);

    // Transfer WETH to the factory for testing
    console.log("\n💸 Transferring WETH to factory for testing...");
    const wethContract = await ethers.getContractAt("IERC20", WETH);
    const testAmount = ethers.parseEther("0.1"); // 0.1 WETH for testing
    
    const wethBalance = await wethContract.balanceOf(deployer.address);
    if (wethBalance < testAmount) {
        console.log("❌ Insufficient WETH balance. Please wrap some ETH to WETH first.");
        console.log("Current WETH balance:", ethers.formatEther(wethBalance));
        console.log("Required WETH:", ethers.formatEther(testAmount));
        return;
    }
    
    await wethContract.transfer(factoryAddress, testAmount);
    console.log("✅ Transferred WETH to factory");

    // Create a test credit line
    console.log("\n🎯 Creating test credit line...");
    
    const creditLimit = ethers.parseEther("1000000"); // 1M tokens
    const apy = 500; // 5% APY (500 basis points)
    const initialLiquidity = ethers.parseEther("0.05"); // 0.05 WETH
    
    console.log("Creating credit line with parameters:");
    console.log("Credit Limit:", ethers.formatEther(creditLimit));
    console.log("APY:", apy / 100, "%");
    console.log("Initial Liquidity:", ethers.formatEther(initialLiquidity), "WETH");
    console.log("Borrower:", deployer.address);
    
    const createTx = await creditLineFactory.createCreditLine(
        "Test Credit Line Token",
        "TCLT",
        WETH,
        creditLimit,
        apy,
        deployer.address, // borrower
        initialLiquidity
    );
    
    const receipt = await createTx.wait();
    console.log("✅ Credit line creation transaction:", createTx.hash);
    
    // Get the created credit line address from events
    const creditLineCreatedEvent = receipt?.logs.find(log => {
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
        
        // Verify the deployment
        console.log("\n🔍 Verifying deployment...");
        
        const creditLineToken = await ethers.getContractAt("CreditLineToken", creditLineAddress);
        
        const status = await creditLineToken.getCreditLineStatus();
        console.log("Credit Line Status:");
        console.log("- Underlying Asset:", status.underlyingAsset);
        console.log("- Credit Limit:", ethers.formatEther(status.creditLimit));
        console.log("- APY:", status.apy.toString(), "basis points");
        console.log("- Borrower:", status.borrower);
        console.log("- Total Provided:", ethers.formatEther(status.totalProvided));
        console.log("- Total Withdrawn:", ethers.formatEther(status.totalWithdrawn));
        console.log("- Available Liquidity:", ethers.formatEther(status.availableLiquidity));
        
        // Get Aerodrome position info
        const position = await aerodromeAdapter.getPosition(creditLineAddress);
        console.log("\nAerodrome Position Info:");
        console.log("- Pool Address:", position.pool);
        console.log("- Full Range Token ID:", position.fullRangeTokenId.toString());
        console.log("- Concentrated Token ID:", position.concentratedTokenId.toString());
        console.log("- Position Exists:", position.exists);
        
        console.log("\n📋 Deployment Summary:");
        console.log("Network: Base Sepolia");
        console.log("AerodromeAdapter:", aerodromeAdapterAddress);
        console.log("CreditLineFactory:", factoryAddress);
        console.log("CreditLineToken:", creditLineAddress);
        console.log("Underlying Asset:", WETH);
        
        console.log("\n💡 Next steps:");
        console.log("1. Test credit withdrawal: creditLineToken.withdrawCredit(amount)");
        console.log("2. Test liquidity management: aerodromeAdapter.removeLiquidity()");
        console.log("3. Update frontend with new contract addresses");
        console.log("4. Test the complete credit line flow");
        
    } else {
        console.log("❌ Could not find CreditLineCreated event");
    }
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});
