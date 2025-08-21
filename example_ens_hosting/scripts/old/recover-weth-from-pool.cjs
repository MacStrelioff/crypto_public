const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Recovering WETH from Aerodrome pool...\n");

    const [deployer] = await ethers.getSigners();
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    console.log("Deployer address:", deployer.address);
    
    // Contract addresses
    const adapterAddress = "0xb29fbBFBB1fa5D5e6E834eB726eBD3846Be100c2";
    const creditLineTokenAddress = "0x3e53adeEd0730967b472Eb56Fd65c74cc2613C7b";
    
    try {
        // Get the adapter contract
        const adapter = await ethers.getContractAt("SimplifiedAerodromeAdapter", adapterAddress);
        
        console.log("Adapter address:", adapterAddress);
        
        // Check if we're the owner of the adapter
        const adapterOwner = await adapter.owner();
        console.log("Adapter Owner:", adapterOwner);
        console.log("Are we the adapter owner?", adapterOwner === deployer.address);
        
        if (adapterOwner === deployer.address) {
            // Step 1: Authorize ourselves to call the adapter
            console.log("\n🔐 Authorizing ourselves to call adapter...");
            const authTx = await adapter.setAuthorizedCaller(deployer.address, true);
            await authTx.wait();
            console.log("✅ Authorized ourselves to call adapter");
            
            // Step 2: Get position information
            console.log("\n📊 Getting position information...");
            const position = await adapter.getPosition(creditLineTokenAddress);
            console.log("Position Info:");
            console.log("- Full Range Token ID:", position.fullRangeTokenId.toString());
            console.log("- Pool Address:", position.pool);
            console.log("- Exists:", position.exists);
            
            if (position.exists && position.fullRangeTokenId > 0) {
                // Step 3: Remove all liquidity
                console.log("\n🔧 Removing liquidity from Aerodrome position...");
                
                // We need to get the liquidity amount from the position
                // For now, let's try to remove a small amount first
                const smallLiquidity = ethers.parseEther("0.0001");
                
                try {
                    const removeTx = await adapter.removeLiquidity(creditLineTokenAddress, smallLiquidity);
                    await removeTx.wait();
                    console.log("✅ Successfully removed small amount of liquidity");
                    
                    // Check if we received any WETH
                    const wethBalance = await weth.balanceOf(deployer.address);
                    console.log("WETH balance after removal:", ethers.formatEther(wethBalance));
                    
                } catch (error) {
                    console.log(`❌ Error removing liquidity: ${error.message}`);
                    
                    // Try alternative approach - collect fees first
                    console.log("\n🔧 Trying to collect fees...");
                    try {
                        const collectTx = await adapter.collectFees(creditLineTokenAddress, deployer.address);
                        await collectTx.wait();
                        console.log("✅ Successfully collected fees");
                        
                        const wethBalanceAfterFees = await weth.balanceOf(deployer.address);
                        console.log("WETH balance after collecting fees:", ethers.formatEther(wethBalanceAfterFees));
                        
                    } catch (collectError) {
                        console.log(`❌ Error collecting fees: ${collectError.message}`);
                    }
                }
            } else {
                console.log("❌ No valid position found");
            }
        } else {
            console.log("❌ We are not the owner of the adapter");
        }
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
    
    // Check final WETH balance
    const finalBalance = await weth.balanceOf(deployer.address);
    console.log(`\n💰 Final WETH balance: ${ethers.formatEther(finalBalance)} WETH`);
    
    if (finalBalance > 0) {
        console.log("✅ Successfully recovered WETH!");
    } else {
        console.log("❌ No WETH was recovered. It may be locked in the Aerodrome pool.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
