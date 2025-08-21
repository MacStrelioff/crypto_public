const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking recent WETH transfer recipients...\n");

    const [deployer] = await ethers.getSigners();
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    console.log("Deployer address:", deployer.address);
    
    // Recent WETH transfer recipients from the trace
    const recentRecipients = [
        {
            name: "Recipient 1",
            address: "0x208AF20aeb6448AC0C20132D74e1c03c75CD61b8",
            amount: "0.001 WETH"
        },
        {
            name: "Recipient 2", 
            address: "0x2d65b6AE838E1cD93dde80DcAcD06bf73B6552DF",
            amount: "0.001 WETH"
        },
        {
            name: "Recipient 3",
            address: "0x95b85971022eC042E4774ef3964E4f6268f9E539", 
            amount: "0.001 WETH"
        },
        {
            name: "Recipient 4",
            address: "0x24553F1C4E51DFAf4322984FA39d783b7c370477",
            amount: "0.001 WETH"
        },
        {
            name: "Recipient 5",
            address: "0x547EBC8E362C94B7CD30ee87dF3669B12a48E67b",
            amount: "0.001 WETH"
        },
        {
            name: "Latest Factory",
            address: "0x7881D458FBDA24dF6BF9586DA646D5d3BBd3aBe8",
            amount: "0.001 WETH"
        }
    ];

    console.log("🔍 Checking WETH balances in recent recipients...\n");

    let totalWethFound = ethers.parseEther("0");
    const recipientsWithWeth = [];

    for (const recipient of recentRecipients) {
        try {
            const balance = await weth.balanceOf(recipient.address);
            console.log(`${recipient.name} (${recipient.address}):`);
            console.log(`  WETH: ${ethers.formatEther(balance)} WETH`);
            console.log(`  Expected: ${recipient.amount}`);
            
            if (balance > 0) {
                console.log(`  💰 HAS WETH!`);
                totalWethFound += balance;
                recipientsWithWeth.push({ ...recipient, balance: balance });
            }
            console.log("");
            
        } catch (error) {
            console.log(`${recipient.name} (${recipient.address}):`);
            console.log(`  ❌ Error checking balance: ${error.message}`);
            console.log("");
        }
    }

    console.log(`💰 Total WETH found: ${ethers.formatEther(totalWethFound)} WETH`);
    
    if (recipientsWithWeth.length > 0) {
        console.log("\n📍 Recipients with WETH:");
        for (const recipient of recipientsWithWeth) {
            console.log(`  ${recipient.name}: ${ethers.formatEther(recipient.balance)} WETH`);
        }

        // Now try to recover WETH from each recipient
        console.log("\n🔄 Attempting to recover WETH from recipients...");
        
        const deployerBalanceBefore = await weth.balanceOf(deployer.address);
        console.log(`Deployer WETH balance before: ${ethers.formatEther(deployerBalanceBefore)} WETH`);

        for (const recipient of recipientsWithWeth) {
            console.log(`\n🔄 Recovering from ${recipient.name}...`);
            
            try {
                // Try to determine what type of contract this is and recover WETH
                
                // First, try as a factory
                try {
                    const factory = await ethers.getContractAt("CreditLineFactory", recipient.address);
                    const factoryOwner = await factory.owner();
                    
                    if (factoryOwner === deployer.address) {
                        console.log(`  ✅ We own this factory! Attempting emergency withdraw...`);
                        const tx = await factory.emergencyWithdraw(WETH_ADDRESS, recipient.balance);
                        await tx.wait();
                        console.log(`  ✅ Recovered ${ethers.formatEther(recipient.balance)} WETH from factory`);
                        continue;
                    } else {
                        console.log(`  ❌ Not the factory owner. Owner is: ${factoryOwner}`);
                    }
                } catch (factoryError) {
                    // Not a factory, continue to next attempt
                }
                
                // Try as an adapter
                try {
                    const adapter = await ethers.getContractAt("SimplifiedAerodromeAdapter", recipient.address);
                    const adapterOwner = await adapter.owner();
                    
                    if (adapterOwner === deployer.address) {
                        console.log(`  ✅ We own this adapter! Attempting emergency withdraw...`);
                        const tx = await adapter.emergencyWithdraw(WETH_ADDRESS, recipient.balance);
                        await tx.wait();
                        console.log(`  ✅ Recovered ${ethers.formatEther(recipient.balance)} WETH from adapter`);
                        continue;
                    } else {
                        console.log(`  ❌ Not the adapter owner. Owner is: ${adapterOwner}`);
                    }
                } catch (adapterError) {
                    // Not an adapter, continue to next attempt
                }
                
                // Try as a credit line token
                try {
                    const token = await ethers.getContractAt("CreditLineToken", recipient.address);
                    const tokenOwner = await token.owner();
                    
                    if (tokenOwner === deployer.address) {
                        console.log(`  ✅ We own this token! Attempting emergency withdraw...`);
                        const tx = await token.emergencyWithdraw(WETH_ADDRESS, recipient.balance);
                        await tx.wait();
                        console.log(`  ✅ Recovered ${ethers.formatEther(recipient.balance)} WETH from token`);
                        continue;
                    } else {
                        console.log(`  ❌ Not the token owner. Owner is: ${tokenOwner}`);
                    }
                } catch (tokenError) {
                    // Not a token, continue to next attempt
                }
                
                console.log(`  ❌ Could not determine contract type or we don't own it`);
                
            } catch (reclaimError) {
                console.log(`  ❌ Error recovering from ${recipient.name}: ${reclaimError.message}`);
            }
        }

        // Check final balance
        const deployerBalanceAfter = await weth.balanceOf(deployer.address);
        console.log(`\n💰 Final balances:`);
        console.log(`   Deployer WETH: ${ethers.formatEther(deployerBalanceAfter)} WETH`);
        
        const reclaimed = deployerBalanceAfter - deployerBalanceBefore;
        console.log(`   Total reclaimed: ${ethers.formatEther(reclaimed)} WETH`);
        
    } else {
        console.log("❌ No WETH found in any recent recipients.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
