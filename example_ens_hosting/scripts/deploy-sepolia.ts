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
            // Try to get test ETH from Alchemy faucet
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
    console.log("🚀 Deploying CreditLineToken to Base Sepolia...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Check if we have enough ETH for deployment
    const hasTestETH = await requestTestETH(deployer.address);
    if (!hasTestETH) {
        console.log("\n⏳ Please get test ETH and run this script again.");
        return;
    }

    // Base Sepolia Aerodrome addresses (these are the real deployed addresses)
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";
    
    // For testing, we'll use WETH as the underlying asset
    const UNDERLYING_ASSET = "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH
    
    console.log("Using addresses:");
    console.log("CL Factory:", CL_FACTORY);
    console.log("Position Manager:", POSITION_MANAGER);
    console.log("Underlying Asset (WETH):", UNDERLYING_ASSET);
    console.log("");

    // Deploy the CreditLineToken contract
    const CreditLineToken = await ethers.getContractFactory("CreditLineToken");
    
    // Constructor parameters
    const creditLimit = ethers.parseEther("1000000"); // 1M tokens
    const apy = 500; // 5% APY (500 basis points)
    const initialLiquidity = ethers.parseEther("0.05"); // 0.05 WETH (small amount for testing)
    
    console.log("Deploying with parameters:");
    console.log("Credit Limit:", ethers.formatEther(creditLimit));
    console.log("APY:", apy / 100, "%");
    console.log("Initial Liquidity:", ethers.formatEther(initialLiquidity), "WETH");
    console.log("");

    const creditLineToken = await CreditLineToken.deploy();
    await creditLineToken.waitForDeployment();
    const creditLineAddress = await creditLineToken.getAddress();

    console.log("✅ CreditLineToken deployed to:", creditLineAddress);

    // Initialize the credit line
    console.log("\n🔧 Initializing credit line...");
    
    const params = {
        underlyingAsset: UNDERLYING_ASSET,
        creditLimit: creditLimit,
        apy: apy,
        initialLiquidity: initialLiquidity
    };
    
    const borrower = deployer.address; // For testing, deployer is also the borrower
    
    // Transfer WETH to the credit line contract
    const wethContract = await ethers.getContractAt("IERC20", UNDERLYING_ASSET);
    await wethContract.transfer(creditLineAddress, initialLiquidity);
    console.log("✅ Transferred WETH to credit line contract");
    
    // Initialize the credit line
    const initTx = await creditLineToken.initialize(params, borrower);
    await initTx.wait();
    console.log("✅ Credit line initialized!");
    console.log("");

    // Verify the deployment
    console.log("🔍 Verifying deployment...");
    
    const deployedCreditLine = await ethers.getContractAt("CreditLineToken", creditLineAddress);
    
    const underlyingAsset = await deployedCreditLine.underlyingAsset();
    const deployedCreditLimit = await deployedCreditLine.creditLimit();
    const deployedApy = await deployedCreditLine.apy();
    
    console.log("Verification results:");
    console.log("Underlying Asset:", underlyingAsset);
    console.log("Credit Limit:", ethers.formatEther(deployedCreditLimit));
    console.log("APY:", deployedApy.toString(), "basis points");
    console.log("");

    // Get position info
    try {
        const positionInfo = await deployedCreditLine.getPositionInfo();
        console.log("Position Info:");
        console.log("Full Range Token ID:", positionInfo[0].toString());
        console.log("Concentrated Token ID:", positionInfo[1].toString());
        console.log("Underlying Balance:", ethers.formatEther(positionInfo[2]), "WETH");
        console.log("Credit Line Balance:", ethers.formatEther(positionInfo[3]));
    } catch (error) {
        console.log("Could not get position info (function may not exist):", error);
    }

    console.log("\n📋 Deployment Summary:");
    console.log("Network: Base Sepolia");
    console.log("CreditLineToken:", creditLineAddress);
    console.log("Underlying Asset:", UNDERLYING_ASSET);
    console.log("CL Factory:", CL_FACTORY);
    console.log("Position Manager:", POSITION_MANAGER);
    
    console.log("\n💡 Next steps:");
    console.log("1. Update frontend with new contract address");
    console.log("2. Test credit line creation on testnet");
    console.log("3. Test withdraw and emergency functions");
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});
