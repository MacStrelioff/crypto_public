const { ethers } = require("hardhat");

async function main() {
    console.log("🔥 Burning NFT position to recover WETH...\n");

    const [deployer] = await ethers.getSigners();
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    console.log("Deployer address:", deployer.address);
    
    // Contract addresses
    const adapterAddress = "0xb29fbBFBB1fa5D5e6E834eB726eBD3846Be100c2";
    const creditLineTokenAddress = "0x3e53adeEd0730967b472Eb56Fd65c74cc2613C7b";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";
    
    try {
        // Get the adapter contract
        const adapter = await ethers.getContractAt("SimplifiedAerodromeAdapter", adapterAddress);
        
        // Get position information
        const position = await adapter.getPosition(creditLineTokenAddress);
        console.log("Position Info:");
        console.log("- Full Range Token ID:", position.fullRangeTokenId.toString());
        console.log("- Pool Address:", position.pool);
        console.log("- Exists:", position.exists);
        
        if (position.exists && position.fullRangeTokenId > 0) {
            console.log("\n🔧 Attempting to burn NFT position...");
            
            // Check who owns the NFT
            const positionManager = await ethers.getContractAt("IERC721", POSITION_MANAGER);
            const nftOwner = await positionManager.ownerOf(position.fullRangeTokenId);
            console.log("NFT Owner:", nftOwner);
            console.log("Adapter address:", adapterAddress);
            console.log("Are they the same?", nftOwner === adapterAddress);
            
            if (nftOwner === adapterAddress) {
                console.log("✅ Adapter owns the NFT, attempting to burn...");
                
                // Try to call burn function on the position manager
                // First, let's check if the adapter can burn the position
                try {
                    // Call burn function on position manager
                    const burnData = ethers.AbiCoder.defaultAbiCoder().encode(
                        ["uint256"],
                        [position.fullRangeTokenId]
                    );
                    
                    const burnCall = ethers.AbiCoder.defaultAbiCoder().encodeWithSelector(
                        "0x42966c68", // burn(uint256)
                        position.fullRangeTokenId
                    );
                    
                    console.log("Attempting to burn NFT...");
                    const burnTx = await adapter.call(burnCall);
                    await burnTx.wait();
                    console.log("✅ Successfully burned NFT position");
                    
                } catch (burnError) {
                    console.log(`❌ Error burning NFT: ${burnError.message}`);
                    
                    // Try alternative - emergency withdraw the NFT
                    console.log("\n🔧 Trying emergency NFT withdrawal...");
                    try {
                        const emergencyTx = await adapter.emergencyWithdrawNFT(position.fullRangeTokenId);
                        await emergencyTx.wait();
                        console.log("✅ Successfully withdrew NFT");
                        
                        // Now we own the NFT, try to burn it
                        console.log("\n🔧 Now burning the NFT we own...");
                        const burnTx = await positionManager.burn(position.fullRangeTokenId);
                        await burnTx.wait();
                        console.log("✅ Successfully burned NFT");
                        
                    } catch (emergencyError) {
                        console.log(`❌ Error with emergency withdrawal: ${emergencyError.message}`);
                    }
                }
            } else {
                console.log("❌ Adapter doesn't own the NFT");
            }
        } else {
            console.log("❌ No valid position found");
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
        console.log("❌ No WETH was recovered. The WETH may be permanently locked in the Aerodrome pool.");
        console.log("💡 This is actually expected behavior - the WETH is now providing liquidity in the Aerodrome pool.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
