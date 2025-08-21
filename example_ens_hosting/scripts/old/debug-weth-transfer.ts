import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Debugging WETH Transfer...\n");

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

    // Contract addresses from our deployment
    const factoryAddress = "0x3627E21a934102bF2390C721954d91aa453C5f79";
    const WETH = "0x4200000000000000000000000000000000000006";

    console.log(`Factory address: ${factoryAddress}`);
    console.log(`WETH address: ${WETH}`);

    try {
        const wethContract = await ethers.getContractAt("IERC20", WETH);

        // Check balances
        const deployerBalance = await wethContract.balanceOf(deployer.address);
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        
        console.log(`\n💰 Balances:`);
        console.log(`   Deployer WETH: ${ethers.formatEther(deployerBalance)} WETH`);
        console.log(`   Factory WETH: ${ethers.formatEther(factoryBalance)} WETH`);

        // Check recent WETH transfers
        console.log(`\n🔍 Checking recent WETH transfers...`);
        
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`Latest block: ${latestBlock}`);
        
        // Check last 5 blocks for WETH transfers
        for (let i = 0; i < 5; i++) {
            const blockNumber = latestBlock - i;
            const block = await ethers.provider.getBlock(blockNumber, true);
            
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.from === deployer.address && tx.to === WETH) {
                        console.log(`\n📝 WETH transaction in block ${blockNumber}:`);
                        console.log(`   Hash: ${tx.hash}`);
                        console.log(`   Nonce: ${tx.nonce}`);
                        console.log(`   Data: ${tx.data}`);
                        
                        // Try to decode the transaction
                        try {
                            const iface = new ethers.Interface([
                                "function transfer(address to, uint256 amount)"
                            ]);
                            const decoded = iface.parseTransaction({ data: tx.data });
                            console.log(`   Decoded: transfer(${decoded.args[0]}, ${ethers.formatEther(decoded.args[1])} WETH)`);
                        } catch (error) {
                            console.log(`   Could not decode transaction data`);
                        }
                    }
                }
            }
        }

        // Check if factory has any ETH (not WETH)
        const factoryEthBalance = await ethers.provider.getBalance(factoryAddress);
        console.log(`\n💰 Factory ETH balance: ${ethers.formatEther(factoryEthBalance)} ETH`);

        // Check if we need to transfer WETH again
        if (factoryBalance === 0n) {
            console.log(`\n⚠️ Factory has no WETH. Need to transfer again.`);
            
            const transferAmount = ethers.parseEther("0.001");
            if (deployerBalance >= transferAmount) {
                console.log(`✅ Deployer has enough WETH to transfer`);
            } else {
                console.log(`❌ Deployer doesn't have enough WETH`);
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
