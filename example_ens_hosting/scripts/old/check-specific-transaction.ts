import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Specific Transaction...\n");

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
    const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`Adapter address: ${adapterAddress}`);

    // Let's try to find the transaction by looking at the factory's nonce
    console.log("\n🔍 Checking factory nonce and recent transactions...");
    
    try {
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        
        // Get the factory's current nonce
        const factoryNonce = await ethers.provider.getTransactionCount(factoryAddress);
        console.log(`Factory nonce: ${factoryNonce}`);
        
        // Check if there are any pending transactions
        const pendingNonce = await ethers.provider.getTransactionCount(factoryAddress, "pending");
        console.log(`Factory pending nonce: ${pendingNonce}`);
        
        if (pendingNonce > factoryNonce) {
            console.log(`⚠️  There are ${pendingNonce - factoryNonce} pending transactions`);
        }
        
        // Try to get the transaction by nonce
        if (factoryNonce > 0) {
            console.log(`\n🔍 Looking for transaction with nonce ${factoryNonce - 1}...`);
            
            // Get recent blocks to find the transaction
            const latestBlock = await ethers.provider.getBlockNumber();
            const startBlock = latestBlock - 10000; // Look back 10000 blocks
            
            for (let blockNum = startBlock; blockNum <= latestBlock; blockNum += 100) {
                try {
                    const block = await ethers.provider.getBlock(blockNum, true);
                    
                    for (const tx of block.transactions) {
                        if (tx.from === factoryAddress) {
                            console.log(`\n   🔄 Factory transaction found:`);
                            console.log(`   Hash: ${tx.hash}`);
                            console.log(`   Block: ${blockNum}`);
                            console.log(`   Nonce: ${tx.nonce}`);
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
                                        }
                                    }
                                }
                            } catch (receiptError) {
                                console.log(`   Could not get receipt`);
                            }
                        }
                    }
                } catch (blockError) {
                    // Skip blocks that can't be fetched
                    continue;
                }
            }
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
