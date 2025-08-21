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
    // sqrtPriceX96 = sqrt(price) * 2^96
    // price = (sqrtPriceX96 / 2^96)^2
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

async function main() {
  console.log("Testing Credit Line with Mock Tokens...");

  const [deployer, borrower] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Borrower:", borrower.address);

  // Deploy mock tokens
  const MockToken = await ethers.getContractFactory("MockToken");
  
  const mockWETH = await MockToken.deploy("Mock WETH", "mWETH", 18);
  await mockWETH.waitForDeployment();
  console.log("Mock WETH deployed to:", await mockWETH.getAddress());

  // Deploy factory
  const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
  const factory = await CreditLineFactory.deploy();
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // Give borrower some mock WETH
  await mockWETH.mint(borrower.address, ethers.parseEther("100"));
  console.log("Minted 100 mWETH to borrower");

  // Create credit line parameters
  const params = {
    underlyingAsset: await mockWETH.getAddress(),
    creditLimit: ethers.parseEther("10"), // 10 mWETH
    apy: 500, // 5% APY
    initialLiquidity: ethers.parseEther("1") // 1 mWETH
  };

  // Approve tokens for the credit line creation
  await mockWETH.connect(borrower).approve(await factory.getAddress(), ethers.parseEther("100"));

  // Create credit line (borrower calls this)
  console.log("\nCreating credit line...");
  const tx = await factory.connect(borrower).createCreditLine(params);
  const receipt = await tx.wait();
  
  // Get the created credit line address from events
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed.name === "CreditLineCreated";
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = factory.interface.parseLog(event);
    const creditLineAddress = parsed.args.creditLineToken;
    console.log("Credit line created at:", creditLineAddress);
    
    // Test the credit line
    const creditLine = await ethers.getContractAt("CreditLineToken", creditLineAddress);
    
    // Parse and display debug events
    console.log("\n=== LIQUIDITY DEBUG EVENTS ===");
    for (const log of receipt!.logs) {
      try {
        const parsedLog = creditLine.interface.parseLog(log as any);
        if (parsedLog && (parsedLog.name.includes('Liquidity') || parsedLog.name.includes('Debug'))) {
          console.log(`Event: ${parsedLog.name}`);
          console.log(`  Args:`, parsedLog.args);
        }
      } catch (e) {
        // Ignore logs that can't be parsed
      }
    }
    console.log("=== END DEBUG EVENTS ===\n");
    
    console.log("\nCredit Line Details:");
    console.log("- Underlying Asset:", await creditLine.getUnderlyingAsset());
    console.log("- Credit Limit:", ethers.formatEther(await creditLine.getCreditLimit()), "mWETH");
    console.log("- APY:", Number(await creditLine.getApy()) / 100, "%");
    console.log("- Borrower:", await creditLine.getBorrower());
    
    const fullRangePool = await creditLine.getFullRangePool();
    const concentratedPool = await creditLine.getConcentratedPool();
    console.log("- Pool Address:", fullRangePool);
    
    // Get price and balance information for the pool
    console.log("\nPool Information:");
    const priceInfo = await getPoolPriceInfo(fullRangePool);
    console.log("- Current Price (sqrtPriceX96):", priceInfo.sqrtPriceX96);
    console.log("- Current Tick:", priceInfo.tick);
    console.log("- Price Ratio (Token1/Token0):", priceInfo.price);
    
    const tokenInfo = await getPoolTokenInfo(fullRangePool);
    console.log("- Token0 Address:", tokenInfo.token0Address);
    console.log("- Token1 Address:", tokenInfo.token1Address);
    console.log("- Token0 Balance in Pool:", tokenInfo.token0Balance);
    console.log("- Token1 Balance in Pool:", tokenInfo.token1Balance);
    console.log("- Total Liquidity Value:", tokenInfo.totalLiquidity);
    
    // Check NFT position IDs stored in contract
    const fullRangeTokenId = await creditLine.fullRangePositionTokenId();
    const concentratedTokenId = await creditLine.concentratedPositionTokenId();
    console.log("- Full Range Position Token ID:", fullRangeTokenId.toString());
    console.log("- Concentrated Position Token ID:", concentratedTokenId.toString());
    
    // Test withdrawing credit
    console.log("\nTesting withdraw credit...");
    await creditLine.connect(borrower).withdrawCredit(ethers.parseEther("0.5"));
    console.log("Successfully withdrew 0.5 mWETH");
    
    // Get updated balance information after withdrawal
    console.log("\nUpdated Pool Information (after withdrawal):");
    const updatedPriceInfo = await getPoolPriceInfo(fullRangePool);
    console.log("- Current Price (sqrtPriceX96):", updatedPriceInfo.sqrtPriceX96);
    console.log("- Current Tick:", updatedPriceInfo.tick);
    console.log("- Price Ratio (Token1/Token0):", updatedPriceInfo.price);
    
    const updatedTokenInfo = await getPoolTokenInfo(fullRangePool);
    console.log("- Token0 Balance in Pool:", updatedTokenInfo.token0Balance);
    console.log("- Token1 Balance in Pool:", updatedTokenInfo.token1Balance);
    console.log("- Total Liquidity Value:", updatedTokenInfo.totalLiquidity);
    
    // Test interest accrual
    console.log("\nTesting interest accrual...");
    await creditLine.connect(borrower).accrueInterest();
    console.log("Interest accrued successfully");
    
    // Get final balance information after interest accrual
    console.log("\nFinal Pool Information (after interest accrual):");
    const finalPriceInfo = await getPoolPriceInfo(fullRangePool);
    console.log("- Current Price (sqrtPriceX96):", finalPriceInfo.sqrtPriceX96);
    console.log("- Current Tick:", finalPriceInfo.tick);
    console.log("- Price Ratio (Token1/Token0):", finalPriceInfo.price);
    
    const finalTokenInfo = await getPoolTokenInfo(fullRangePool);
    console.log("- Token0 Balance in Pool:", finalTokenInfo.token0Balance);
    console.log("- Token1 Balance in Pool:", finalTokenInfo.token1Balance);
    console.log("- Total Liquidity Value:", finalTokenInfo.totalLiquidity);
    
  } else {
    console.log("Failed to find CreditLineCreated event");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
