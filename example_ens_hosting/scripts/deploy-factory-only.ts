import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🏗️ Deploying Factory Only...\n");

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

    // The AerodromeAdapter address from the previous deployment
    const adapterAddress = "0x84D92E50459Dca53861F11bDB919BDF033006B39";
    console.log(`Using AerodromeAdapter: ${adapterAddress}`);

    console.log("🔍 Deploying CreditLineFactory...\n");

    try {
        // Get current gas price and increase it
        const feeData = await ethers.provider.getFeeData();
        const higherGasPrice = feeData.gasPrice * 2n; // Double the gas price
        
        console.log(`Current gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
        console.log(`Using gas price: ${ethers.formatUnits(higherGasPrice, 'gwei')} gwei`);

        // Deploy the CreditLineFactory with higher gas price
        const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
        const factory = await CreditLineFactory.deploy(adapterAddress, {
            gasPrice: higherGasPrice
        });
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log(`✅ CreditLineFactory deployed: ${factoryAddress}`);

        // Authorize the factory to call the adapter
        const aerodromeAdapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);
        await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true, {
            gasPrice: higherGasPrice
        });
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
