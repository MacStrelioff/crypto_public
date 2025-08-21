import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Recovering Found WETH...\n");

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

    // Addresses with WETH
    const addressesWithWeth = [
        { name: "Credit Line 2", address: "0xd04E10D6601873cb28fDDC04839DFd3C0C95fDDD" },
        { name: "Unknown Address", address: "0xA4224D97b9e7fAdd8E8f8b02470C2341195d7b61" }
    ];

    for (const addr of addressesWithWeth) {
        console.log(`\n🔍 Checking ${addr.name} (${addr.address}):`);
        
        try {
            const wethBalance = await wethContract.balanceOf(addr.address);
            console.log(`  WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
            
            if (wethBalance > 0) {
                console.log(`  💰 Found WETH! Attempting to recover...`);
                
                // Try to determine what type of contract this is
                try {
                    // Check if it's a credit line by trying to call credit line functions
                    const creditLineContract = new ethers.Contract(addr.address, [
                        "function owner() external view returns (address)",
                        "function borrower() external view returns (address)",
                        "function emergencyWithdraw(address,uint256) external",
                        "function emergencyWithdrawETH() external"
                    ], deployer);
                    
                    const owner = await creditLineContract.owner();
                    console.log(`  Owner: ${owner}`);
                    
                    if (owner === deployer.address) {
                        console.log(`  ✅ We own this contract! Attempting emergency withdraw...`);
                        
                        try {
                            const tx = await creditLineContract.emergencyWithdraw(WETH, wethBalance);
                            console.log(`  📝 Emergency withdraw transaction: ${tx.hash}`);
                            await tx.wait();
                            console.log(`  ✅ WETH recovered!`);
                        } catch (error) {
                            console.log(`  ❌ Emergency withdraw failed:`, error instanceof Error ? error.message : String(error));
                        }
                    } else {
                        console.log(`  ❌ We don't own this contract (owner: ${owner})`);
                    }
                    
                } catch (error) {
                    console.log(`  ❌ Not a credit line contract or error getting owner:`, error instanceof Error ? error.message : String(error));
                    
                    // Try to check if it's a factory
                    try {
                        const factoryContract = new ethers.Contract(addr.address, [
                            "function owner() external view returns (address)",
                            "function emergencyWithdraw(address,uint256) external",
                            "function emergencyWithdrawETH() external"
                        ], deployer);
                        
                        const owner = await factoryContract.owner();
                        console.log(`  Factory owner: ${owner}`);
                        
                        if (owner === deployer.address) {
                            console.log(`  ✅ We own this factory! Attempting emergency withdraw...`);
                            
                            try {
                                const tx = await factoryContract.emergencyWithdraw(WETH, wethBalance);
                                console.log(`  📝 Emergency withdraw transaction: ${tx.hash}`);
                                await tx.wait();
                                console.log(`  ✅ WETH recovered!`);
                            } catch (error) {
                                console.log(`  ❌ Emergency withdraw failed:`, error instanceof Error ? error.message : String(error));
                            }
                        }
                    } catch (factoryError) {
                        console.log(`  ❌ Not a factory contract either:`, factoryError instanceof Error ? factoryError.message : String(factoryError));
                        console.log(`  💡 This might be an unrecoverable address or a different type of contract`);
                    }
                }
            }
            
        } catch (error) {
            console.log(`  ❌ Error checking ${addr.name}:`, error instanceof Error ? error.message : String(error));
        }
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
