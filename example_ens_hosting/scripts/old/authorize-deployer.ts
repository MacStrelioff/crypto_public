import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔐 Authorizing Deployer to Call Adapter...\n");

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

    // Contract addresses from our deployment
    const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";

    console.log(`Adapter address: ${adapterAddress}`);

    try {
        const adapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);

        // Check adapter owner
        const adapterOwner = await adapter.owner();
        console.log(`Adapter owner: ${adapterOwner}`);
        console.log(`Deployer address: ${deployer.address}`);
        
        if (adapterOwner !== deployer.address) {
            console.log("❌ Deployer is not the adapter owner. Cannot authorize.");
            return;
        }

        // Check current authorization
        const isAuthorized = await adapter.authorizedCallers(deployer.address);
        console.log(`Deployer currently authorized: ${isAuthorized}`);

        if (isAuthorized) {
            console.log("✅ Deployer is already authorized.");
            return;
        }

        // Authorize the deployer
        console.log("\n🔄 Authorizing deployer to call adapter...");
        
        const authTx = await adapter.setAuthorizedCaller(deployer.address, true);
        console.log(`📝 Authorization transaction: ${authTx.hash}`);
        
        const receipt = await authTx.wait();
        console.log(`✅ Deployer authorized successfully!`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`   Block: ${receipt.blockNumber}`);

        // Verify authorization
        const isAuthorizedAfter = await adapter.authorizedCallers(deployer.address);
        console.log(`Deployer authorized after: ${isAuthorizedAfter}`);

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
