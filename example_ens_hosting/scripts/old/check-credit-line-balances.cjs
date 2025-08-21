const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking credit line token balances...\n");

    const [deployer] = await ethers.getSigners();
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    console.log("Deployer address:", deployer.address);
    
    // Credit line token from our successful test
    const creditLineTokenAddress = "0x3e53adeEd0730967b472Eb56Fd65c74cc2613C7b";
    
    try {
        // Get the credit line token contract
        const creditLineToken = await ethers.getContractAt("CreditLineToken", creditLineTokenAddress);
        
        console.log("Credit Line Token:", creditLineTokenAddress);
        
        // Check if we're the owner
        const owner = await creditLineToken.owner();
        console.log("Owner:", owner);
        console.log("Are we the owner?", owner === deployer.address);
        
        // Get credit line status
        try {
            const status = await creditLineToken.getCreditLineStatus();
            console.log("\n📊 Credit Line Status:");
            console.log("- Underlying Asset:", status.underlyingAsset);
            console.log("- Credit Limit:", ethers.formatEther(status.creditLimit));
            console.log("- APY:", status.apy.toString());
            console.log("- Borrower:", status.borrower);
            console.log("- Initial Liquidity:", ethers.formatEther(status.initialLiquidity));
            console.log("- Last Accrual Time:", status.lastAccrualTime.toString());
            console.log("- Price Validation Enabled:", status.priceValidationEnabled);
        } catch (error) {
            console.log("❌ Error getting credit line status:", error.message);
        }
        
        // Check WETH balance of the credit line token
        const wethBalance = await weth.balanceOf(creditLineTokenAddress);
        console.log("\n💰 WETH Balance in Credit Line Token:", ethers.formatEther(wethBalance));
        
        // Check credit line token balance
        const tokenBalance = await creditLineToken.balanceOf(creditLineTokenAddress);
        console.log("Credit Line Token Balance:", ethers.formatEther(tokenBalance));
        
        // Check total supply
        const totalSupply = await creditLineToken.totalSupply();
        console.log("Total Supply:", ethers.formatEther(totalSupply));
        
        // Check if we can withdraw credit
        if (wethBalance > 0) {
            console.log("\n🔧 Attempting to withdraw credit...");
            
            // Check if we're the borrower
            if (status.borrower === deployer.address) {
                console.log("✅ We are the borrower, attempting to withdraw credit...");
                
                try {
                    const withdrawAmount = wethBalance;
                    const tx = await creditLineToken.withdrawCredit(withdrawAmount);
                    await tx.wait();
                    console.log(`✅ Successfully withdrew ${ethers.formatEther(withdrawAmount)} WETH`);
                } catch (error) {
                    console.log(`❌ Error withdrawing credit: ${error.message}`);
                }
            } else {
                console.log(`❌ We are not the borrower. Borrower is: ${status.borrower}`);
            }
        }
        
        // Check if we can recover through the factory
        console.log("\n🔧 Checking factory for WETH recovery...");
        const factoryAddress = "0x7881D458FBDA24dF6BF9586DA646D5d3BBd3aBe8";
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        
        const factoryOwner = await factory.owner();
        console.log("Factory Owner:", factoryOwner);
        console.log("Are we the factory owner?", factoryOwner === deployer.address);
        
        if (factoryOwner === deployer.address) {
            const factoryWethBalance = await weth.balanceOf(factoryAddress);
            console.log("Factory WETH Balance:", ethers.formatEther(factoryWethBalance));
            
            if (factoryWethBalance > 0) {
                console.log("✅ Attempting to recover WETH from factory...");
                try {
                    const tx = await factory.emergencyWithdraw(WETH_ADDRESS, factoryWethBalance);
                    await tx.wait();
                    console.log(`✅ Successfully recovered ${ethers.formatEther(factoryWethBalance)} WETH from factory`);
                } catch (error) {
                    console.log(`❌ Error recovering from factory: ${error.message}`);
                }
            }
        }
        
        // Check Aerodrome adapter position
        console.log("\n🔍 Checking Aerodrome position...");
        const aerodromeAdapterAddress = "0xb29fbBFBB1fa5D5e6E834eB726eBD3846Be100c2";
        const adapter = await ethers.getContractAt("SimplifiedAerodromeAdapter", aerodromeAdapterAddress);
        
        const position = await adapter.getPosition(creditLineTokenAddress);
        console.log("Position Info:");
        console.log("- Full Range Token ID:", position.fullRangeTokenId.toString());
        console.log("- Pool Address:", position.pool);
        console.log("- Exists:", position.exists);
        
        if (position.exists && position.fullRangeTokenId > 0) {
            console.log("\n🔧 Attempting to remove liquidity...");
            
            // Check if we're authorized to call the adapter
            const isAuthorized = await adapter.authorizedCallers(deployer.address);
            console.log("Are we authorized to call adapter?", isAuthorized);
            
            if (isAuthorized) {
                try {
                    // Try to remove a small amount of liquidity
                    const liquidityToRemove = ethers.parseEther("0.0001"); // Very small amount
                    const tx = await adapter.removeLiquidity(creditLineTokenAddress, liquidityToRemove);
                    await tx.wait();
                    console.log("✅ Successfully removed liquidity");
                } catch (error) {
                    console.log(`❌ Error removing liquidity: ${error.message}`);
                }
            } else {
                console.log("❌ Not authorized to call adapter");
            }
        }
        
    } catch (error) {
        console.log("❌ Error checking credit line:", error.message);
    }
    
    // Check final WETH balance
    const finalBalance = await weth.balanceOf(deployer.address);
    console.log(`\n💰 Final WETH balance: ${ethers.formatEther(finalBalance)} WETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
