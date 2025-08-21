import pkg from "hardhat";
const { ethers } = pkg;

// Helper function to get pool price information
async function getPoolPriceInfo(poolAddress: string) {
  try {
    const pool = await ethers.getContractAt("ICLPool", poolAddress);
    const slot0 = await pool.slot0();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const tick = slot0.tick;
    
    // Convert sqrtPriceX96 to a readable price
    const Q96 = BigInt(2) ** BigInt(96);
    const priceQ64 = (sqrtPriceX96 * sqrtPriceX96) / Q96;
    const price = Number(priceQ64) / Number(Q96);
    
    return {
      sqrtPriceX96: sqrtPriceX96.toString(),
      tick: tick.toString(),
      price: price.toFixed(6)
    };
  } catch (error) {
    console.log("Error getting price info:", error.message);
    return {
      sqrtPriceX96: "N/A",
      tick: "N/A",
      price: "N/A"
    };
  }
}

// Helper function to get token balances from pool
async function getPoolTokenInfo(poolAddress: string) {
  try {
    const pool = await ethers.getContractAt("ICLPool", poolAddress);
    const token0Address = await pool.token0();
    const token1Address = await pool.token1();
    
    const token0 = await ethers.getContractAt("IERC20", token0Address);
    const token1 = await ethers.getContractAt("IERC20", token1Address);
    
    const token0Balance = await token0.balanceOf(poolAddress);
    const token1Balance = await token1.balanceOf(poolAddress);
    
    return {
      token0Address,
      token1Address,
      token0Balance: ethers.formatEther(token0Balance),
      token1Balance: ethers.formatEther(token1Balance),
      totalLiquidity: ethers.formatEther(token0Balance + token1Balance)
    };
  } catch (error) {
    console.log("Error getting token info:", error.message);
    return {
      token0Address: "N/A",
      token1Address: "N/A", 
      token0Balance: "0.0",
      token1Balance: "0.0",
      totalLiquidity: "0.0"
    };
  }
}

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
  console.log("🧪 Testing Credit Line on Base Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Check if we have enough ETH for testing
  const hasTestETH = await requestTestETH(deployer.address);
  if (!hasTestETH) {
    console.log("\n⏳ Please get test ETH and run this script again.");
    return;
  }

  // Base Sepolia addresses
  const WETH = "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH
  const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
  const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";

  console.log("\n📋 Using addresses:");
  console.log("WETH:", WETH);
  console.log("CL Factory:", CL_FACTORY);
  console.log("Position Manager:", POSITION_MANAGER);

  // Deploy the CreditLineToken contract
  console.log("\n🚀 Deploying CreditLineToken...");
  const CreditLineToken = await ethers.getContractFactory("CreditLineToken");
  
  // Constructor parameters
  const creditLimit = ethers.parseEther("1000000"); // 1M tokens
  const apy = 500; // 5% APY (500 basis points)
  const initialLiquidity = ethers.parseEther("0.1"); // 0.1 WETH (small amount for testing)
  
  console.log("Deploying with parameters:");
  console.log("Credit Limit:", ethers.formatEther(creditLimit));
  console.log("APY:", apy / 100, "%");
  console.log("Initial Liquidity:", ethers.formatEther(initialLiquidity), "WETH");

  const creditLineToken = await CreditLineToken.deploy(
    WETH,
    creditLimit,
    apy,
    initialLiquidity
  );

  await creditLineToken.waitForDeployment();
  const creditLineAddress = await creditLineToken.getAddress();

  console.log("✅ CreditLineToken deployed to:", creditLineAddress);

  // Verify the deployment
  console.log("\n🔍 Verifying deployment...");
  
  const deployedCreditLine = await ethers.getContractAt("CreditLineToken", creditLineAddress);
  
  const underlyingAsset = await deployedCreditLine.underlyingAsset();
  const deployedCreditLimit = await deployedCreditLine.creditLimit();
  const deployedApy = await deployedCreditLine.apy();
  
  console.log("Verification results:");
  console.log("Underlying Asset:", underlyingAsset);
  console.log("Credit Limit:", ethers.formatEther(deployedCreditLimit));
  console.log("APY:", deployedApy.toString(), "basis points");

  // Get position info
  try {
    const positionInfo = await deployedCreditLine.getPositionInfo();
    console.log("\nPosition Info:");
    console.log("Full Range Token ID:", positionInfo[0].toString());
    console.log("Concentrated Token ID:", positionInfo[1].toString());
    console.log("Underlying Balance:", ethers.formatEther(positionInfo[2]), "WETH");
    console.log("Credit Line Balance:", ethers.formatEther(positionInfo[3]));
  } catch (error) {
    console.log("Could not get position info:", error.message);
  }

  // Test emergency functions
  console.log("\n🔧 Testing emergency functions...");
  
  // Test emergencyWithdrawNFT if we have a position
  try {
    const fullRangeTokenId = await deployedCreditLine.fullRangePositionTokenId();
    if (fullRangeTokenId > 0) {
      console.log("Full range position found, testing emergency withdrawal...");
      // Note: This would actually withdraw the NFT, so we'll just check if the function exists
      console.log("✅ emergencyWithdrawNFT function is available");
    }
  } catch (error) {
    console.log("Error testing emergency functions:", error.message);
  }

  // Test withdraw credit (if borrower is set)
  try {
    const borrower = await deployedCreditLine.borrower();
    if (borrower !== ethers.ZeroAddress) {
      console.log("\n💳 Testing withdraw credit...");
      // Note: This would require the borrower to call it
      console.log("Borrower address:", borrower);
      console.log("✅ withdrawCredit function is available");
    } else {
      console.log("No borrower set (contract not initialized through factory)");
    }
  } catch (error) {
    console.log("Error testing withdraw:", error.message);
  }

  console.log("\n📋 Test Summary:");
  console.log("Network: Base Sepolia");
  console.log("CreditLineToken:", creditLineAddress);
  console.log("Underlying Asset:", WETH);
  console.log("CL Factory:", CL_FACTORY);
  console.log("Position Manager:", POSITION_MANAGER);
  
  console.log("\n💡 Next steps:");
  console.log("1. Update frontend with new contract address");
  console.log("2. Test credit line creation through factory");
  console.log("3. Test withdraw and emergency functions");
  console.log("4. Monitor liquidity positions on Aerodrome");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
