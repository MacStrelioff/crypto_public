import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Ownership of Credit Line Token...\n");

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

    try {
        // Use the latest deployed contracts
        const factoryAddress = "0x81c457d9D2f61229E661e13d57bD5f8c45401b42";
        const adapterAddress = "0x8E7F800edBf46e825a99D7464558618B2B885CD8";
        
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        
        console.log("🔍 Step 1: Checking factory ownership...");
        const factoryOwner = await factory.owner();
        console.log(`   Factory owner: ${factoryOwner}`);
        console.log(`   Deployer address: ${deployer.address}`);
        console.log(`   Is deployer factory owner: ${factoryOwner === deployer.address}`);
        
        console.log("\n🔍 Step 2: Testing token deployment and ownership...");
        
        // Try to deploy a test token to see what happens
        const CreditLineToken = await ethers.getContractFactory("CreditLineToken");
        const testToken = await CreditLineToken.deploy("Test Token", "TEST");
        await testToken.waitForDeployment();
        
        const testTokenAddress = await testToken.getAddress();
        console.log(`   Test token deployed at: ${testTokenAddress}`);
        
        const testTokenOwner = await testToken.owner();
        console.log(`   Test token owner: ${testTokenOwner}`);
        console.log(`   Deployer address: ${deployer.address}`);
        console.log(`   Is deployer test token owner: ${testTokenOwner === deployer.address}`);
        
        console.log("\n🔍 Step 3: Testing mint function on test token...");
        
        try {
            const mintAmount = ethers.parseEther("1.0");
            console.log(`   Attempting to mint ${ethers.formatEther(mintAmount)} tokens to deployer...`);
            
            const mintTx = await testToken.mint(deployer.address, mintAmount);
            await mintTx.wait();
            
            console.log("   ✅ Mint successful!");
            
            const balance = await testToken.balanceOf(deployer.address);
            console.log(`   Deployer balance: ${ethers.formatEther(balance)} tokens`);
            
            const totalSupply = await testToken.totalSupply();
            console.log(`   Total supply: ${ethers.formatEther(totalSupply)} tokens`);
            
        } catch (mintError) {
            console.log("   ❌ Mint failed:");
            console.log(mintError instanceof Error ? mintError.message : String(mintError));
        }
        
        console.log("\n🔍 Step 4: Testing mint to contract address...");
        
        try {
            const mintAmount = ethers.parseEther("0.001");
            console.log(`   Attempting to mint ${ethers.formatEther(mintAmount)} tokens to test token contract...`);
            
            const mintTx = await testToken.mint(testTokenAddress, mintAmount);
            await mintTx.wait();
            
            console.log("   ✅ Mint to contract successful!");
            
            const contractBalance = await testToken.balanceOf(testTokenAddress);
            console.log(`   Contract balance: ${ethers.formatEther(contractBalance)} tokens`);
            
        } catch (mintError) {
            console.log("   ❌ Mint to contract failed:");
            console.log(mintError instanceof Error ? mintError.message : String(mintError));
        }

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
