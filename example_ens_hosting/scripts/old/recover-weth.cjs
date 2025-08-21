const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking all deployed contracts for WETH...\n");

    const [deployer] = await ethers.getSigners();
    const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    
    console.log("Deployer address:", deployer.address);
    
    // List of all contract addresses from recent testing
    const contractAddresses = [
        // Latest successful deployment
        {
            name: "Simplified Aerodrome Adapter (Latest)",
            address: "0xb29fbBFBB1fa5D5e6E834eB726eBD3846Be100c2"
        },
        {
            name: "Credit Line Factory (Latest)",
            address: "0x7881D458FBDA24dF6BF9586DA646D5d3BBd3aBe8"
        },
        {
            name: "Credit Line Token (Latest)",
            address: "0x3e53adeEd0730967b472Eb56Fd65c74cc2613C7b"
        },
        // Previous deployments
        {
            name: "Simplified Aerodrome Adapter (Previous)",
            address: "0x0048AF481853269aE5aAc076444c2FADCb1f3735"
        },
        {
            name: "Credit Line Factory (Previous)",
            address: "0x24553F1C4E51DFAf4322984FA39d783b7c370477"
        },
        {
            name: "Simplified Aerodrome Adapter (Earlier)",
            address: "0x1995EF23a8Fd3976E2311dA3A21cb5b5ed939F66"
        },
        {
            name: "Credit Line Factory (Earlier)",
            address: "0x39400911559A849E7D87200b4baA23D8Afb2C8F9"
        },
        {
            name: "Simplified Aerodrome Adapter (Much Earlier)",
            address: "0x111941f257EcE6a80134aeB75e87A29F78E94F1e"
        },
        {
            name: "Credit Line Factory (Much Earlier)",
            address: "0x27cEF71011194760f2ac7Fd2aDC1C9761793550A"
        }
    ];

    let totalWETHFound = ethers.parseEther("0");
    const contractsWithWETH = [];

    // Check WETH balance for each contract
    for (const contract of contractAddresses) {
        try {
            const balance = await weth.balanceOf(contract.address);
            console.log(`${contract.name}: ${ethers.formatEther(balance)} WETH`);
            
            if (balance > 0) {
                totalWETHFound += balance;
                contractsWithWETH.push({
                    ...contract,
                    balance: balance
                });
            }
        } catch (error) {
            console.log(`${contract.name}: Error checking balance - ${error.message}`);
        }
    }

    console.log(`\n💰 Total WETH found: ${ethers.formatEther(totalWETHFound)} WETH`);

    if (contractsWithWETH.length === 0) {
        console.log("❌ No WETH found in any contracts.");
        return;
    }

    console.log(`\n🔧 Attempting to recover WETH from ${contractsWithWETH.length} contracts...`);

    // Try to recover WETH from each contract
    for (const contract of contractsWithWETH) {
        console.log(`\n📦 Recovering from ${contract.name}...`);
        
        try {
            // Try to call emergencyWithdraw on the adapter contracts
            if (contract.name.includes("Adapter")) {
                const adapter = await ethers.getContractAt("SimplifiedAerodromeAdapter", contract.address);
                
                // Check if we're the owner
                const owner = await adapter.owner();
                if (owner === deployer.address) {
                    console.log("  ✅ We are the owner, calling emergencyWithdraw...");
                    
                    const tx = await adapter.emergencyWithdraw(WETH_ADDRESS, contract.balance);
                    await tx.wait();
                    console.log(`  ✅ Recovered ${ethers.formatEther(contract.balance)} WETH`);
                } else {
                    console.log(`  ❌ Not the owner. Owner is: ${owner}`);
                }
            }
            // Try to call emergencyWithdraw on the factory contracts
            else if (contract.name.includes("Factory")) {
                const factory = await ethers.getContractAt("CreditLineFactory", contract.address);
                
                // Check if we're the owner
                const owner = await factory.owner();
                if (owner === deployer.address) {
                    console.log("  ✅ We are the owner, calling emergencyWithdraw...");
                    
                    const tx = await factory.emergencyWithdraw(WETH_ADDRESS, contract.balance);
                    await tx.wait();
                    console.log(`  ✅ Recovered ${ethers.formatEther(contract.balance)} WETH`);
                } else {
                    console.log(`  ❌ Not the owner. Owner is: ${owner}`);
                }
            }
            // For credit line tokens, try to call emergencyWithdraw on the factory that created them
            else if (contract.name.includes("Token")) {
                console.log("  ⚠️  Credit line tokens don't have emergencyWithdraw. WETH may be locked.");
            }
            
        } catch (error) {
            console.log(`  ❌ Error recovering: ${error.message}`);
        }
    }

    // Check final WETH balance
    const finalBalance = await weth.balanceOf(deployer.address);
    console.log(`\n💰 Final WETH balance: ${ethers.formatEther(finalBalance)} WETH`);
    
    if (finalBalance > 0) {
        console.log("✅ Successfully recovered WETH!");
    } else {
        console.log("❌ No WETH was recovered.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
