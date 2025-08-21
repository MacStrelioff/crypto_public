import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Reclaiming WETH from deployed factories...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Recovering with account:", deployer.address);

    // Base Sepolia WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // Factory addresses from our recent tests
    const factoryAddresses = [
        "0x6Fc250732bA7b0755AD480c16668a02d5daD57ee", // Latest test (canceled)
        "0xaA7280808D5829715F5288633908685c5fc7C692", // Latest adapter
        "0xF707cf2D5d1f504DfBd7C926ac8ef0b59f910C4e", // Latest mock test
        "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8", // Previous step-by-step test
        "0x292e93171bf4B51b7186f083C33678bCAa2246b0", // Previous test
        "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9", // Earlier test
        "0xa5b2E851F0f233237B0Be3881AD4dFe002f8f5d2", // Earlier test
        "0x123FB0cC8e8FB9c0375Dd21DdaCFD797E9F8008A"  // Earlier test
    ];

    console.log("🔍 Checking WETH balances in factories...\n");

    for (let i = 0; i < factoryAddresses.length; i++) {
        const factoryAddress = factoryAddresses[i];
        
        try {
            const balance = await wethContract.balanceOf(factoryAddress);
            console.log(`Factory ${i + 1} (${factoryAddress}):`);
            console.log(`  WETH Balance: ${ethers.formatEther(balance)} WETH`);
            
            if (balance > 0) {
                console.log(`  💸 Attempting to reclaim ${ethers.formatEther(balance)} WETH...`);
                
                // Try to call emergencyWithdraw on the factory to withdraw WETH
                try {
                    const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
                    const tx = await factory.emergencyWithdraw(WETH, balance);
                    await tx.wait();
                    console.log(`  ✅ Successfully reclaimed WETH from factory ${i + 1}`);
                } catch (error) {
                    console.log(`  ❌ Failed to reclaim from factory ${i + 1}:`, error instanceof Error ? error.message : String(error));
                }
            } else {
                console.log(`  ℹ️  No WETH to reclaim`);
            }
            console.log("");
            
        } catch (error) {
            console.log(`Factory ${i + 1} (${factoryAddress}):`);
            console.log(`  ❌ Error checking balance:`, error instanceof Error ? error.message : String(error));
            console.log("");
        }
    }

    // Check deployer's final WETH balance
    const finalBalance = await wethContract.balanceOf(deployer.address);
    console.log(`💰 Final WETH balance: ${ethers.formatEther(finalBalance)} WETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
