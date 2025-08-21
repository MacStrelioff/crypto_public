import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Transaction Status...\n");

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

    try {
        // Get current nonce
        const nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");
        const pendingNonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
        
        console.log(`Current nonce: ${nonce}`);
        console.log(`Pending nonce: ${pendingNonce}`);
        
        if (pendingNonce > nonce) {
            console.log(`⚠️ There are ${pendingNonce - nonce} pending transactions`);
        } else {
            console.log("✅ No pending transactions");
        }

        // Get latest block
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`Latest block: ${latestBlock}`);

        // Check recent blocks for transactions from this address
        console.log("\n🔍 Checking recent blocks for transactions...");
        for (let i = 0; i < 5; i++) {
            const blockNumber = latestBlock - i;
            const block = await ethers.provider.getBlock(blockNumber, true);
            
            if (block && block.transactions) {
                const myTxs = block.transactions.filter((tx: any) => tx.from === deployer.address);
                if (myTxs.length > 0) {
                    console.log(`\n📝 Block ${blockNumber}:`);
                    for (const tx of myTxs) {
                        console.log(`   Hash: ${tx.hash}`);
                        console.log(`   Nonce: ${tx.nonce}`);
                        console.log(`   To: ${tx.to}`);
                        console.log(`   Status: ${tx.confirmations > 0 ? 'Confirmed' : 'Pending'}`);
                    }
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
