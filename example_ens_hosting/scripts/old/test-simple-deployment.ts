import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to pause between transactions
function pause(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🧪 Testing Simple Contract Deployment...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    // Base Sepolia WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    console.log("Using WETH:", WETH);

    // Deploy just the AerodromeAdapter first
    console.log("📦 Deploying AerodromeAdapter...");
    const AerodromeAdapter = await ethers.getContractFactory("AerodromeAdapter");
    const aerodromeAdapter = await AerodromeAdapter.deploy();
    await aerodromeAdapter.waitForDeployment();
    const aerodromeAdapterAddress = await aerodromeAdapter.getAddress();
    console.log("✅ AerodromeAdapter deployed to:", aerodromeAdapterAddress);

    // Deploy the CreditLineFactory
    console.log("📦 Deploying CreditLineFactory...");
    console.log("⏳ Pausing 3 seconds before deployment...");
    await pause(3000);
    const CreditLineFactory = await ethers.getContractFactory("CreditLineFactory");
    const creditLineFactory = await CreditLineFactory.deploy(aerodromeAdapterAddress);
    await creditLineFactory.waitForDeployment();
    const factoryAddress = await creditLineFactory.getAddress();
    console.log("✅ CreditLineFactory deployed to:", factoryAddress);

    // Authorize the factory to call the adapter
    console.log("🔐 Authorizing factory to call adapter...");
    console.log("⏳ Pausing 3 seconds before authorization...");
    await pause(3000);
    await aerodromeAdapter.setAuthorizedCaller(factoryAddress, true);
    console.log("✅ Factory authorized");

    // Test basic contract functions
    console.log("\n🔍 Testing basic contract functions...");
    
    // Test adapter functions
    const adapterOwner = await aerodromeAdapter.owner();
    console.log("Adapter owner:", adapterOwner);
    console.log("Deployer is adapter owner:", adapterOwner === deployer.address);
    
    const isAuthorized = await aerodromeAdapter.authorizedCallers(factoryAddress);
    console.log("Factory authorized in adapter:", isAuthorized);
    
    // Test factory functions
    const factoryOwner = await creditLineFactory.owner();
    console.log("Factory owner:", factoryOwner);
    console.log("Deployer is factory owner:", factoryOwner === deployer.address);
    
    const adapterAddress = await creditLineFactory.aerodromeAdapter();
    console.log("Factory adapter address:", adapterAddress);
    console.log("Adapter addresses match:", adapterAddress === aerodromeAdapterAddress);

    console.log("\n✅ Basic deployment and authorization successful!");
    console.log("The issue is likely in the Aerodrome integration part.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
