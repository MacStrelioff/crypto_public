import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Contract Transactions...\n");

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

    // Contract addresses from our factory test
    const factoryAddress = "0x3627E21a934102bF2390C721954d91aa453C5f79";
    const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`Adapter address: ${adapterAddress}`);

    try {
        // Check factory transactions
        console.log("\n🔍 Checking Factory transactions...");
        
        try {
            const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
            
            // Get factory info
            const factoryOwner = await factory.owner();
            console.log(`   Factory owner: ${factoryOwner}`);
            
            // Get credit lines
            const creditLines = await factory.getAllCreditLines();
            console.log(`   Credit lines created: ${creditLines.length}`);
            
            if (creditLines.length > 0) {
                console.log("   Credit line addresses:");
                for (let i = 0; i < creditLines.length; i++) {
                    console.log(`     ${i + 1}. ${creditLines[i]}`);
                }
            }
            
        } catch (factoryError) {
            console.log(`   ❌ Error checking factory: ${factoryError instanceof Error ? factoryError.message : String(factoryError)}`);
        }
        
        // Check adapter transactions
        console.log("\n🔍 Checking Adapter transactions...");
        
        try {
            const adapter = await ethers.getContractAt("AerodromeAdapter", adapterAddress);
            
            // Get adapter info
            const adapterOwner = await adapter.owner();
            console.log(`   Adapter owner: ${adapterOwner}`);
            
            // Check if factory is authorized
            const isAuthorized = await adapter.authorizedCallers(factoryAddress);
            console.log(`   Factory authorized: ${isAuthorized}`);
            
        } catch (adapterError) {
            console.log(`   ❌ Error checking adapter: ${adapterError instanceof Error ? adapterError.message : String(adapterError)}`);
        }
        
        // Look for deployment transactions
        console.log("\n🔍 Looking for deployment transactions...");
        
        const latestBlock = await ethers.provider.getBlockNumber();
        const startBlock = latestBlock - 5000; // Look back 5000 blocks
        
        console.log(`   Scanning blocks ${startBlock} to ${latestBlock}...`);
        
        let foundDeployments = 0;
        
        for (let blockNum = startBlock; blockNum <= latestBlock; blockNum += 50) { // Check every 50th block
            try {
                const block = await ethers.provider.getBlock(blockNum, true);
                
                for (const tx of block.transactions) {
                    // Check for contract creation transactions (to is null)
                    if (tx.to === null && tx.from === deployer.address) {
                        console.log(`\n   📄 Contract creation found:`);
                        console.log(`   Hash: ${tx.hash}`);
                        console.log(`   Block: ${blockNum}`);
                        console.log(`   BaseScan: https://basescan.org/tx/${tx.hash}`);
                        
                        // Get transaction receipt
                        try {
                            const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                            if (receipt) {
                                console.log(`   Status: ${receipt.status === 1 ? 'success' : 'failed'}`);
                                console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
                                
                                // Check if this created our contracts
                                if (receipt.contractAddress === factoryAddress) {
                                    console.log(`   🏭 This created the Factory!`);
                                } else if (receipt.contractAddress === adapterAddress) {
                                    console.log(`   🔧 This created the Adapter!`);
                                } else {
                                    console.log(`   📄 Created contract: ${receipt.contractAddress}`);
                                }
                            }
                        } catch (receiptError) {
                            console.log(`   Could not get receipt`);
                        }
                        
                        foundDeployments++;
                    }
                }
            } catch (blockError) {
                // Skip blocks that can't be fetched
                continue;
            }
        }
        
        console.log(`\n   Found ${foundDeployments} contract creation transactions`);
        
        // Look for transactions TO our contracts
        console.log("\n🔍 Looking for transactions TO our contracts...");
        
        let foundInteractions = 0;
        
        for (let blockNum = startBlock; blockNum <= latestBlock; blockNum += 50) {
            try {
                const block = await ethers.provider.getBlock(blockNum, true);
                
                for (const tx of block.transactions) {
                    if (tx.to === factoryAddress || tx.to === adapterAddress) {
                        console.log(`\n   🔄 Contract interaction found:`);
                        console.log(`   Hash: ${tx.hash}`);
                        console.log(`   Block: ${blockNum}`);
                        console.log(`   From: ${tx.from}`);
                        console.log(`   To: ${tx.to}`);
                        console.log(`   BaseScan: https://basescan.org/tx/${tx.hash}`);
                        
                        // Get transaction receipt
                        try {
                            const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                            if (receipt) {
                                console.log(`   Status: ${receipt.status === 1 ? 'success' : 'failed'}`);
                                console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
                                
                                if (receipt.status === 0) {
                                    console.log(`   ❌ This transaction FAILED!`);
                                    
                                    // Try to get the transaction data
                                    const txData = await ethers.provider.getTransaction(tx.hash);
                                    if (txData && txData.data) {
                                        console.log(`   Input Data: ${txData.data.slice(0, 66)}...`);
                                        
                                        // Try to decode common function calls
                                        const functionSigs = {
                                            "0x6a761202": "createCreditLine",
                                            "0x8da5cb5b": "owner",
                                            "0x715018a6": "renounceOwnership",
                                            "0xf2fde38b": "transferOwnership",
                                            "0x40c10f19": "mint",
                                            "0xa9059cbb": "transfer",
                                            "0x23b872dd": "transferFrom",
                                            "0x095ea7b3": "approve"
                                        };
                                        
                                        const functionSig = txData.data.slice(0, 10);
                                        const functionName = functionSigs[functionSig];
                                        if (functionName) {
                                            console.log(`   Function: ${functionName}`);
                                        }
                                    }
                                }
                            }
                        } catch (receiptError) {
                            console.log(`   Could not get receipt`);
                        }
                        
                        foundInteractions++;
                    }
                }
            } catch (blockError) {
                // Skip blocks that can't be fetched
                continue;
            }
        }
        
        console.log(`\n   Found ${foundInteractions} contract interaction transactions`);

    } catch (error) {
        console.log("❌ Error:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
