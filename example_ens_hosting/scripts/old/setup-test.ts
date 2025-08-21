import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("Setting up test environment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy mock tokens
  const MockToken = await ethers.getContractFactory("MockToken");
  
  const mockWETH = await MockToken.deploy("Mock WETH", "mWETH", 18);
  await mockWETH.waitForDeployment();
  console.log("Mock WETH deployed to:", await mockWETH.getAddress());

  const mockUSDC = await MockToken.deploy("Mock USDC", "mUSDC", 6);
  await mockUSDC.waitForDeployment();
  console.log("Mock USDC deployed to:", await mockUSDC.getAddress());

  // Deploy factory
  const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
  const factory = await CreditLineFactory.deploy();
  await factory.waitForDeployment();
  console.log("CreditLineFactory deployed to:", await factory.getAddress());

  // Log addresses for frontend
  console.log("\n=== Test Environment Setup Complete ===");
  console.log("Mock WETH:", await mockWETH.getAddress());
  console.log("Mock USDC:", await mockUSDC.getAddress());
  console.log("Factory:", await factory.getAddress());
  
  console.log("\nUpdate your frontend with these addresses for local testing!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
