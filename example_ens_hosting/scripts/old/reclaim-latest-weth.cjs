const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Reclaiming WETH from latest deployed contracts...\n");

    const [deployer] = await ethers.getSigners();
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    console.log("Deployer address:", deployer.address);
    
    // Latest contract addresses from our successful test
    const contracts = [
        {
            name: "Simplified Aerodrome Adapter",
            address: "0xb29fbBFBB1fa5D5e6E834eB726eBD3846Be100c2",
            type: "adapter"
        },
        {
            name: "Credit Line Factory", 
            address: "0x7881D458FBDA24dF6BF9586DA646D5d3BBd3aBe8",
            type: "factory"
        },
        {
            name: "Credit Line Token",
            address: "0x3e53adeEd0730967b472Eb56Fd65c74cc2613C7b", 
            type: "token"
        }
    ];

    console.log("🔍 Checking WETH balances in latest contracts...\n");

    let totalWethFound = ethers.parseEther("0");
    const contractsWithWeth = [];

    // Check WETH balance for each contract
    for (const contract of contracts) {
        try {
            const balance = await weth.balanceOf(contract.address);
            console.log(`${contract.name} (${contract.address}):`);
            console.log(`  WETH: ${ethers.formatEther(balance)} WETH`);
            
            if (balance > 0) {
                console.log(`  💰 HAS WETH!`);
                totalWethFound += balance;
                contractsWithWeth.push({ ...contract, balance: balance });
            }
            console.log("");
            
        } catch (error) {
            console.log(`${contract.name} (${contract.address}):`);
            console.log(`  ❌ Error checking balance: ${error.message}`);
            console.log("");
        }
    }

    console.log(`💰 Total WETH found: ${ethers.formatEther(totalWethFound)} WETH`);
    
    if (contractsWithWeth.length > 0) {
        console.log("\n📍 Contracts with WETH:");
        for (const contract of contractsWithWeth) {
            console.log(`  ${contract.name}: ${ethers.formatEther(contract.balance)} WETH`);
        }

        // Now reclaim WETH from each contract
        console.log("\n🔄 Reclaiming WETH from contracts...");
        
        const deployerBalanceBefore = await weth.balanceOf(deployer.address);
        console.log(`Deployer WETH balance before: ${ethers.formatEther(deployerBalanceBefore)} WETH`);

        for (const contract of contractsWithWeth) {
            console.log(`\n🔄 Reclaiming from ${contract.name}...`);
            
            try {
                if (contract.type === "factory") {
                    // Factory has emergencyWithdraw function
                    const factory = await ethers.getContractAt("CreditLineFactory", contract.address);
                    const factoryOwner = await factory.owner();
                    
                    if (factoryOwner === deployer.address) {
                        const reclaimTx = await factory.emergencyWithdraw(WETH_ADDRESS, contract.balance);
                        await reclaimTx.wait();
                        console.log(`  ✅ Reclaimed ${ethers.formatEther(contract.balance)} WETH from Factory`);
                    } else {
                        console.log(`  ❌ Not the factory owner. Owner is: ${factoryOwner}`);
                    }
                    
                } else if (contract.type === "token") {
                    // Credit line tokens have emergencyWithdraw function
                    const token = await ethers.getContractAt("CreditLineToken", contract.address);
                    const tokenOwner = await token.owner();
                    
                    if (tokenOwner === deployer.address) {
                        const reclaimTx = await token.emergencyWithdraw(WETH_ADDRESS, contract.balance);
                        await reclaimTx.wait();
                        console.log(`  ✅ Reclaimed ${ethers.formatEther(contract.balance)} WETH from Credit Line Token`);
                    } else {
                        console.log(`  ❌ Not the token owner. Owner is: ${tokenOwner}`);
                    }
                    
                } else if (contract.type === "adapter") {
                    // Adapter has emergencyWithdraw function
                    const adapter = await ethers.getContractAt("SimplifiedAerodromeAdapter", contract.address);
                    const adapterOwner = await adapter.owner();
                    
                    if (adapterOwner === deployer.address) {
                        const reclaimTx = await adapter.emergencyWithdraw(WETH_ADDRESS, contract.balance);
                        await reclaimTx.wait();
                        console.log(`  ✅ Reclaimed ${ethers.formatEther(contract.balance)} WETH from Adapter`);
                    } else {
                        console.log(`  ❌ Not the adapter owner. Owner is: ${adapterOwner}`);
                    }
                }
                
            } catch (reclaimError) {
                console.log(`  ❌ Error reclaiming from ${contract.name}: ${reclaimError.message}`);
            }
        }

        // Check final balance
        const deployerBalanceAfter = await weth.balanceOf(deployer.address);
        console.log(`\n💰 Final balances:`);
        console.log(`   Deployer WETH: ${ethers.formatEther(deployerBalanceAfter)} WETH`);
        
        const reclaimed = deployerBalanceAfter - deployerBalanceBefore;
        console.log(`   Total reclaimed: ${ethers.formatEther(reclaimed)} WETH`);
        
    } else {
        console.log("❌ No WETH found in any of our latest contracts.");
        console.log("💡 The WETH is likely locked in the Aerodrome pool as liquidity.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
