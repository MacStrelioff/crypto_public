import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Finding Factory Transaction (Nonce 0)...\n");

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

    // Contract addresses
    const factoryAddress = "0x3627E21a934102bF2390C721954d91aa453C5f79";

    console.log(`Factory address: ${factoryAddress}`);

    try {
        // Get the factory's current nonce
        const factoryNonce = await ethers.provider.getTransactionCount(factoryAddress);
        console.log(`Factory nonce: ${factoryNonce}`);
        
        if (factoryNonce === 0) {
            console.log("❌ Factory has no transactions yet");
            return;
        }
        
        console.log(`\n🔍 Looking for factory transaction with nonce 0...`);
        
        // Get recent blocks to find the transaction
        const latestBlock = await ethers.provider.getBlockNumber();
        const startBlock = latestBlock - 50000; // Look back 50000 blocks
        
        console.log(`Scanning blocks ${startBlock} to ${latestBlock}...`);
        
        let found = false;
        
        for (let blockNum = startBlock; blockNum <= latestBlock; blockNum += 10) { // Check every 10th block
            try {
                const block = await ethers.provider.getBlock(blockNum, true);
                
                for (const tx of block.transactions) {
                    if (tx.from === factoryAddress && tx.nonce === 0) {
                        console.log(`\n✅ Found factory transaction with nonce 0!`);
                        console.log(`   Hash: ${tx.hash}`);
                        console.log(`   Block: ${blockNum}`);
                        console.log(`   Nonce: ${tx.nonce}`);
                        console.log(`   To: ${tx.to}`);
                        console.log(`   Gas Limit: ${tx.gasLimit.toString()}`);
                        console.log(`   BaseScan: https://basescan.org/tx/${tx.hash}`);
                        
                        // Get transaction receipt
                        try {
                            const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                            if (receipt) {
                                console.log(`   Status: ${receipt.status === 1 ? 'success' : 'failed'}`);
                                console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
                                console.log(`   Block Hash: ${receipt.blockHash}`);
                                
                                if (receipt.status === 0) {
                                    console.log(`   ❌ This transaction FAILED!`);
                                    
                                    // Try to get the transaction data
                                    const txData = await ethers.provider.getTransaction(tx.hash);
                                    if (txData && txData.data) {
                                        console.log(`   Input Data: ${txData.data.slice(0, 66)}...`);
                                        
                                        // Try to decode the function call
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
                                        
                                        // If it's createCreditLine, try to decode the parameters
                                        if (functionSig === "0x6a761202") {
                                            console.log(`   🏭 This was a createCreditLine call!`);
                                            
                                            // Try to decode the parameters
                                            try {
                                                const iface = new ethers.Interface([
                                                    "function createCreditLine(string name, string symbol, address underlyingAsset, uint256 creditLimit, uint256 apy, address borrower, uint256 initialLiquidity) external returns (address)"
                                                ]);
                                                
                                                const decoded = iface.parseTransaction({ data: txData.data });
                                                console.log(`   Decoded parameters:`);
                                                console.log(`     Name: ${decoded.args[0]}`);
                                                console.log(`     Symbol: ${decoded.args[1]}`);
                                                console.log(`     Underlying Asset: ${decoded.args[2]}`);
                                                console.log(`     Credit Limit: ${ethers.formatEther(decoded.args[3])}`);
                                                console.log(`     APY: ${decoded.args[4]}`);
                                                console.log(`     Borrower: ${decoded.args[5]}`);
                                                console.log(`     Initial Liquidity: ${ethers.formatEther(decoded.args[6])}`);
                                            } catch (decodeError) {
                                                console.log(`   Could not decode parameters: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
                                            }
                                        }
                                        
                                        // Check for logs that might give us more info
                                        if (receipt.logs.length > 0) {
                                            console.log(`   📝 Logs: ${receipt.logs.length} events`);
                                            
                                            // Look for specific error logs
                                            for (let i = 0; i < receipt.logs.length; i++) {
                                                const log = receipt.logs[i];
                                                console.log(`     Log ${i}: ${log.topics[0]}`);
                                                
                                                // Check for common error signatures
                                                const errorSigs = {
                                                    "0x08c379a0": "Error(string)",
                                                    "0x4e487b71": "Panic(uint256)",
                                                    "0x8f4eb604": "Custom error"
                                                };
                                                
                                                const errorSig = log.topics[0];
                                                const errorName = errorSigs[errorSig];
                                                if (errorName) {
                                                    console.log(`       Error type: ${errorName}`);
                                                    
                                                    // Try to decode the error
                                                    try {
                                                        if (errorSig === "0x08c379a0") {
                                                            // Error(string)
                                                            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], log.data);
                                                            console.log(`       Error message: ${decoded[0]}`);
                                                        } else if (errorSig === "0x4e487b71") {
                                                            // Panic(uint256)
                                                            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], log.data);
                                                            console.log(`       Panic code: ${decoded[0]}`);
                                                        }
                                                    } catch (decodeError) {
                                                        console.log(`       Could not decode error data`);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    console.log(`   ✅ This transaction succeeded!`);
                                }
                            }
                        } catch (receiptError) {
                            console.log(`   Could not get receipt: ${receiptError instanceof Error ? receiptError.message : String(receiptError)}`);
                        }
                        
                        found = true;
                        break;
                    }
                }
                
                if (found) break;
                
            } catch (blockError) {
                // Skip blocks that can't be fetched
                continue;
            }
        }
        
        if (!found) {
            console.log(`❌ Could not find factory transaction with nonce 0 in the last 50000 blocks`);
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
