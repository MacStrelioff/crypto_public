import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🏗️ Deploying Contracts Only...\n");

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

    console.log("🔍 Deploying contracts...\n");

    try {
        // Deploy the AerodromeAdapter
        const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
        const aerodromeAdapter = await AerodromeAdapter.deploy();
        await aerodromeAdapter.waitForDeployment();
        const adapterAddress = await aerodromeAdapter.getAddress();
        console.log(`✅ AerodromeAdapter deployed: ${adapterAddress}`);

        // Deploy the CreditLineFactory
        const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
        const factory = await CreditLineFactory.deploy(adapterAddress);
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log(`✅ CreditLineFactory deployed: ${factoryAddress}`);

        // Authorize the factory to call the adapter
        await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true);
        console.log("✅ Factory authorized to call adapter");

        console.log("\n📋 Deployment Summary:");
        console.log(`   AerodromeAdapter: ${adapterAddress}`);
        console.log(`   CreditLineFactory: ${factoryAddress}`);
        console.log(`   Factory Owner: ${deployer.address}`);
        console.log(`   Adapter Owner: ${deployer.address}`);

        console.log("\n💡 Next Steps:");
        console.log("1. Transfer WETH to the factory");
        console.log("2. Call factory.createCreditLine() to create a credit line");

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
