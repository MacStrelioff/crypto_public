import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Recovering Remaining WETH...\n");

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

    // Base Mainnet WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // The unknown address that still has WETH
    const unknownAddress = "0xA4224D97b9e7fAdd8E8f8b02470C2341195d7b61";
    
    console.log(`🔍 Checking unknown address (${unknownAddress}):`);
    
    try {
        const wethBalance = await wethContract.balanceOf(unknownAddress);
        console.log(`  WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
        
        if (wethBalance > 0) {
            console.log(`  💰 Found WETH! Attempting to recover with higher gas price...`);
            
            // Try to check if it's a factory
            try {
                const factoryContract = new ethers.Contract(unknownAddress, [
                    "function owner() external view returns (address)",
                    "function emergencyWithdraw(address,uint256) external"
                ], deployer);
                
                const owner = await factoryContract.owner();
                console.log(`  Owner: ${owner}`);
                
                if (owner === deployer.address) {
                    console.log(`  ✅ We own this factory! Attempting emergency withdraw with higher gas...`);
                    
                    // Get current gas price and increase it
                    const currentGasPrice = await ethers.provider.getFeeData();
                    const higherGasPrice = currentGasPrice.gasPrice * 2n; // Double the gas price
                    
                    console.log(`  Current gas price: ${ethers.formatUnits(currentGasPrice.gasPrice, 'gwei')} gwei`);
                    console.log(`  Using gas price: ${ethers.formatUnits(higherGasPrice, 'gwei')} gwei`);
                    
                    try {
                        const tx = await factoryContract.emergencyWithdraw(WETH, wethBalance, {
                            gasPrice: higherGasPrice
                        });
                        console.log(`  📝 Emergency withdraw transaction: ${tx.hash}`);
                        await tx.wait();
                        console.log(`  ✅ WETH recovered!`);
                    } catch (error) {
                        console.log(`  ❌ Emergency withdraw failed:`, error instanceof Error ? error.message : String(error));
                    }
                } else {
                    console.log(`  ❌ We don't own this contract (owner: ${owner})`);
                }
            } catch (factoryError) {
                console.log(`  ❌ Not a factory contract:`, factoryError instanceof Error ? factoryError.message : String(factoryError));
            }
        }
        
    } catch (error) {
        console.log(`  ❌ Error checking address:`, error instanceof Error ? error.message : String(error));
    }

    // Check our final WETH balance
    const finalBalance = await wethContract.balanceOf(deployer.address);
    console.log(`\n💰 Final WETH balance: ${ethers.formatEther(finalBalance)} WETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
