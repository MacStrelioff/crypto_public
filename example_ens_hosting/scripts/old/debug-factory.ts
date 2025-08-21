import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Debugging factory WETH withdrawal...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Debugging with account:", deployer.address);

    // Base Sepolia WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // Factory address with WETH
    const factoryAddress = "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9";
    
    console.log("🔍 Checking factory details...");
    
    // Check WETH balance
    const wethBalance = await wethContract.balanceOf(factoryAddress);
    console.log(`Factory WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(factoryAddress);
    console.log(`Factory ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Try to get the factory contract
    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        console.log("✅ Successfully connected to factory contract");
        
        // Check if deployer is the owner
        const owner = await factory.owner();
        console.log(`Factory owner: ${owner}`);
        console.log(`Deployer is owner: ${owner === deployer.address}`);
        
        if (owner === deployer.address) {
            console.log("🔍 Attempting to call emergencyWithdrawETH...");
            
            try {
                // Estimate gas first
                const gasEstimate = await factory.emergencyWithdrawETH.estimateGas();
                console.log(`Gas estimate: ${gasEstimate.toString()}`);
                
                // Call the function
                const tx = await factory.emergencyWithdrawETH();
                console.log(`Transaction hash: ${tx.hash}`);
                console.log("⏳ Waiting for transaction to be mined...");
                
                const receipt = await tx.wait();
                console.log(`✅ Transaction mined in block ${receipt.blockNumber}`);
                
                // Check balance after
                const newWethBalance = await wethContract.balanceOf(factoryAddress);
                const newEthBalance = await ethers.provider.getBalance(factoryAddress);
                console.log(`New factory WETH balance: ${ethers.formatEther(newWethBalance)} WETH`);
                console.log(`New factory ETH balance: ${ethers.formatEther(newEthBalance)} ETH`);
                
                // Check deployer balance
                const deployerWethBalance = await wethContract.balanceOf(deployer.address);
                console.log(`Deployer WETH balance: ${ethers.formatEther(deployerWethBalance)} WETH`);
                
            } catch (error) {
                console.log("❌ Error calling emergencyWithdrawETH:", error instanceof Error ? error.message : String(error));
            }
        } else {
            console.log("❌ Deployer is not the owner of the factory");
        }
        
    } catch (error) {
        console.log("❌ Error connecting to factory:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
