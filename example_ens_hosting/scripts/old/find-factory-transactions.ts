import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Finding Factory Test Transactions...\n");

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
        // Get recent blocks to find transactions
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`Latest block: ${latestBlock}`);
        
        // Look through recent blocks for transactions from our address
        console.log("\n🔍 Scanning recent blocks for transactions...");
        
        const startBlock = latestBlock - 1000; // Look back 1000 blocks
        const transactions = [];
        
        for (let blockNum = startBlock; blockNum <= latestBlock; blockNum += 10) { // Check every 10th block to speed up
            try {
                const block = await ethers.provider.getBlock(blockNum, true);
                
                for (const tx of block.transactions) {
                    if (tx.from === deployer.address || tx.to === factoryAddress || tx.to === adapterAddress) {
                        transactions.push({
                            hash: tx.hash,
                            blockNumber: blockNum,
                            from: tx.from,
                            to: tx.to,
                            gasUsed: tx.gasLimit,
                            status: 'unknown'
                        });
                    }
                }
            } catch (blockError) {
                // Skip blocks that can't be fetched
                continue;
            }
        }
        
        console.log(`Found ${transactions.length} relevant transactions in the last 1000 blocks`);
        
        if (transactions.length > 0) {
            console.log("\n📋 Relevant transactions:");
            for (const tx of transactions) {
                console.log(`\n   Hash: ${tx.hash}`);
                console.log(`   Block: ${tx.blockNumber}`);
                console.log(`   From: ${tx.from}`);
                console.log(`   To: ${tx.to}`);
                console.log(`   Gas Limit: ${tx.gasUsed.toString()}`);
                
                // Try to get transaction receipt
                try {
                    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                    if (receipt) {
                        tx.status = receipt.status === 1 ? 'success' : 'failed';
                        console.log(`   Status: ${tx.status}`);
                        console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
                        
                        // Check if it's a contract creation or interaction
                        if (receipt.to === factoryAddress) {
                            console.log(`   🏭 Factory interaction`);
                        } else if (receipt.to === adapterAddress) {
                            console.log(`   🔧 Adapter interaction`);
                        } else if (receipt.to === null) {
                            console.log(`   📄 Contract creation`);
                        }
                        
                        // Check for logs
                        if (receipt.logs.length > 0) {
                            console.log(`   📝 Logs: ${receipt.logs.length} events`);
                        }
                    }
                } catch (receiptError) {
                    console.log(`   Status: unknown (could not get receipt)`);
                }
                
                console.log(`   BaseScan: https://basescan.org/tx/${tx.hash}`);
            }
        }
        
        // Also check for specific failed transactions we know about
        console.log("\n🔍 Checking for known failed transactions...");
        
        // Look for transactions that might have failed
        const failedTransactions = transactions.filter(tx => tx.status === 'failed');
        
        if (failedTransactions.length > 0) {
            console.log(`\n❌ Found ${failedTransactions.length} failed transactions:`);
            for (const tx of failedTransactions) {
                console.log(`\n   Failed Transaction:`);
                console.log(`   Hash: ${tx.hash}`);
                console.log(`   Block: ${tx.blockNumber}`);
                console.log(`   To: ${tx.to}`);
                console.log(`   BaseScan: https://basescan.org/tx/${tx.hash}`);
                
                // Try to get more details about the failure
                try {
                    const txData = await ethers.provider.getTransaction(tx.hash);
                    if (txData && txData.data) {
                        console.log(`   Input Data: ${txData.data.slice(0, 66)}...`);
                        
                        // Try to decode the function call
                        if (txData.to === factoryAddress) {
                            console.log(`   🏭 This was a factory call`);
                        } else if (txData.to === adapterAddress) {
                            console.log(`   🔧 This was an adapter call`);
                        }
                    }
                } catch (txError) {
                    console.log(`   Could not get transaction data`);
                }
            }
        }
        
        // Check for WETH transfer transactions specifically
        console.log("\n🔍 Checking for WETH transfer transactions...");
        const WETH = "0x4200000000000000000000000000000000000006";
        
        for (const tx of transactions) {
            if (tx.to === WETH) {
                console.log(`\n   WETH Transfer:`);
                console.log(`   Hash: ${tx.hash}`);
                console.log(`   Block: ${tx.blockNumber}`);
                console.log(`   Status: ${tx.status}`);
                console.log(`   BaseScan: https://basescan.org/tx/${tx.hash}`);
            }
        }

        // Check if our contracts have any transaction history
        console.log("\n🔍 Checking contract transaction history...");
        
        // Check factory contract
        try {
            const factoryCode = await ethers.provider.getCode(factoryAddress);
            if (factoryCode !== "0x") {
                console.log(`✅ Factory contract exists with code`);
                
                // Try to get factory's transaction count
                const factoryTxCount = await ethers.provider.getTransactionCount(factoryAddress);
                console.log(`   Factory transaction count: ${factoryTxCount}`);
            } else {
                console.log(`❌ Factory contract has no code`);
            }
        } catch (factoryError) {
            console.log(`❌ Error checking factory: ${factoryError instanceof Error ? factoryError.message : String(factoryError)}`);
        }
        
        // Check adapter contract
        try {
            const adapterCode = await ethers.provider.getCode(adapterAddress);
            if (adapterCode !== "0x") {
                console.log(`✅ Adapter contract exists with code`);
                
                // Try to get adapter's transaction count
                const adapterTxCount = await ethers.provider.getTransactionCount(adapterAddress);
                console.log(`   Adapter transaction count: ${adapterTxCount}`);
            } else {
                console.log(`❌ Adapter contract has no code`);
            }
        } catch (adapterError) {
            console.log(`❌ Error checking adapter: ${adapterError instanceof Error ? adapterError.message : String(adapterError)}`);
        }

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
