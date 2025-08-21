import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("💰 Reclaiming ALL WETH from Our Contracts...\n");

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

    // All the contracts we've deployed
    const contracts = [
        { name: "Factory", address: "0x3627E21a934102bF2390C721954d91aa453C5f79" },
        { name: "Adapter", address: "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8" },
        { name: "Test Token 1", address: "0x2e40bd43E5dAbDBA0Ff57977366Ba4d6EE9C9dFE" },
        { name: "Test Token 2", address: "0x50F359E885960B72A428Da9B598cac58bF944720" },
        { name: "Test Token 3", address: "0x1d0EDC136fDfd1F9280CA9838AB25bdc58c339F9" },
        { name: "Test Token 4", address: "0x36D8FcA21607bA22DEEdE8522A89B0AAC1AE48dB" },
        { name: "Test Token 5", address: "0x7F804A1c7dc7bAF14f6e04d6a0ED9E9F68B51a00" },
        { name: "Test Token 6", address: "0x1d9e1a7F9101C97B7370bc162D3CF3cCd36f4a1e" },
        { name: "Test Token 7", address: "0x9C5c1ABb62600F9E70d3cE294d8b059ec0d0b3a9" },
        { name: "Test Token 8", address: "0x7F804A1c7dc7bAF14f6e04d6a0ED9E9F68B51a00" },
        { name: "Test Token 9", address: "0xc29CFB6E21eF7cdfEb18C547252E297D6246a284" }
    ];

    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    console.log("🔍 Checking WETH balances in all our contracts...\n");

    let totalWethFound = 0n;
    const contractsWithWeth = [];

    for (const contract of contracts) {
        try {
            const wethBalance = await wethContract.balanceOf(contract.address);
            console.log(`${contract.name} (${contract.address}):`);
            console.log(`  WETH: ${ethers.formatEther(wethBalance)} WETH`);
            
            if (wethBalance > 0) {
                console.log(`  💰 HAS WETH!`);
                totalWethFound += wethBalance;
                contractsWithWeth.push({ ...contract, balance: wethBalance });
            }
            console.log("");
            
        } catch (error) {
            console.log(`${contract.name} (${contract.address}):`);
            console.log(`  ❌ Error checking balance:`, error instanceof Error ? error.message : String(error));
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
        
        const deployerBalanceBefore = await wethContract.balanceOf(deployer.address);
        console.log(`Deployer WETH balance before: ${ethers.formatEther(deployerBalanceBefore)} WETH`);

        for (const contract of contractsWithWeth) {
            console.log(`\n🔄 Reclaiming from ${contract.name}...`);
            
            try {
                if (contract.name === "Factory") {
                    // Factory has emergencyWithdraw function
                    const factory = await ethers.getContractAt("CreditLineFactory", contract.address);
                    const factoryOwner = await factory.owner();
                    
                    if (factoryOwner === deployer.address) {
                        const reclaimTx = await factory.emergencyWithdraw(WETH, contract.balance);
                        await reclaimTx.wait();
                        console.log(`  ✅ Reclaimed ${ethers.formatEther(contract.balance)} WETH from Factory`);
                    } else {
                        console.log(`  ❌ Not the factory owner`);
                    }
                    
                } else if (contract.name.startsWith("Test Token")) {
                    // Test tokens have emergencyWithdraw function
                    const testToken = await ethers.getContractAt("CreditLineToken", contract.address);
                    const tokenOwner = await testToken.owner();
                    
                    if (tokenOwner === deployer.address) {
                        const reclaimTx = await testToken.emergencyWithdraw(WETH, contract.balance);
                        await reclaimTx.wait();
                        console.log(`  ✅ Reclaimed ${ethers.formatEther(contract.balance)} WETH from ${contract.name}`);
                    } else {
                        console.log(`  ❌ Not the token owner`);
                    }
                    
                } else if (contract.name === "Adapter") {
                    // Adapter has emergencyWithdraw function
                    const adapter = await ethers.getContractAt("AerodromeAdapter", contract.address);
                    const adapterOwner = await adapter.owner();
                    
                    if (adapterOwner === deployer.address) {
                        const reclaimTx = await adapter.emergencyWithdraw(WETH, contract.balance);
                        await reclaimTx.wait();
                        console.log(`  ✅ Reclaimed ${ethers.formatEther(contract.balance)} WETH from Adapter`);
                    } else {
                        console.log(`  ❌ Not the adapter owner`);
                    }
                }
                
            } catch (reclaimError) {
                console.log(`  ❌ Error reclaiming from ${contract.name}: ${reclaimError instanceof Error ? reclaimError.message : String(reclaimError)}`);
            }
        }

        // Check final balance
        const deployerBalanceAfter = await wethContract.balanceOf(deployer.address);
        console.log(`\n💰 Final balances:`);
        console.log(`   Deployer WETH: ${ethers.formatEther(deployerBalanceAfter)} WETH`);
        
        const reclaimed = deployerBalanceAfter - deployerBalanceBefore;
        console.log(`   Total reclaimed: ${ethers.formatEther(reclaimed)} WETH`);
        
    } else {
        console.log("❌ No WETH found in any of our contracts.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
