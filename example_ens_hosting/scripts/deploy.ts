import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("Deploying Credit Line contracts...");

  // Deploy the factory
  const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
  const factory = await CreditLineFactory.deploy();
  await factory.waitForDeployment();

  console.log("CreditLineFactory deployed to:", await factory.getAddress());

  // Example deployment of a credit line
  // This would typically be done through the frontend
  const [deployer] = await ethers.getSigners();
  
  // Example parameters (these would come from the frontend)
  const params = {
    underlyingAsset: "0x4200000000000000000000000000000000000006", // WETH on Base
    creditLimit: ethers.parseEther("10"), // 10 ETH
    apy: 500, // 5% APY
    initialLiquidity: ethers.parseEther("1") // 1 ETH initial liquidity
  };

  console.log("Example credit line parameters:");
  console.log("- Underlying Asset:", params.underlyingAsset);
  console.log("- Credit Limit:", ethers.formatEther(params.creditLimit), "ETH");
  console.log("- APY:", params.apy / 100, "%");
  console.log("- Initial Liquidity:", ethers.formatEther(params.initialLiquidity), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
