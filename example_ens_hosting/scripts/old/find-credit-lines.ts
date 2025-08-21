import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Finding Credit Line Tokens...\n");

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

    // Base Mainnet WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // Our factory addresses
    const factories = [
        { name: "Latest Factory", address: "0x6Fc250732bA7b0755AD480c16668a02d5daD57ee" },
        { name: "Mock Test Factory", address: "0xF707cf2D5d1f504DfBd7C926ac8ef0b59f910C4e" },
        { name: "Step-by-step Factory", address: "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8" },
        { name: "Previous Test Factory", address: "0x292e93171bf4B51b7186f083C33678bCAa2246b0" },
        { name: "Earlier Test Factory", address: "0x1De76abe3df3742cAf5ecBD3763Cd6d3c0FDD9a9" },
        { name: "Earlier Test Factory 2", address: "0xa5b2E851F0f233237B0Be3881AD4dFe002f8f5d2" },
        { name: "Earlier Test Factory 3", address: "0x123FB0cC8e8FB9c0375Dd21DdaCFD797E9F8008A" }
    ];

    console.log("🔍 Checking factories for credit lines...\n");

    for (const factory of factories) {
        try {
            console.log(`Checking ${factory.name} (${factory.address}):`);
            
            // Try to call getAllCreditLines() on the factory
            const factoryContract = new ethers.Contract(factory.address, [
                "function getAllCreditLines() external view returns (address[] memory)",
                "function getCreditLineCount() external view returns (uint256)"
            ], ethers.provider);
            
            const creditLineCount = await factoryContract.getCreditLineCount();
            console.log(`  Credit line count: ${creditLineCount}`);
            
            if (creditLineCount > 0) {
                const creditLines = await factoryContract.getAllCreditLines();
                console.log(`  Credit lines: ${creditLines}`);
                
                // Check each credit line for WETH
                for (let i = 0; i < creditLines.length; i++) {
                    const creditLineAddress = creditLines[i];
                    const wethBalance = await wethContract.balanceOf(creditLineAddress);
                    console.log(`    Credit line ${i}: ${creditLineAddress}`);
                    console.log(`    WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
                    
                    if (wethBalance > 0) {
                        console.log(`    💰 FOUND OUR WETH!`);
                        
                        // Try to get credit line info
                        try {
                            const creditLineContract = new ethers.Contract(creditLineAddress, [
                                "function name() external view returns (string memory)",
                                "function symbol() external view returns (string memory)",
                                "function borrower() external view returns (address)",
                                "function underlyingAsset() external view returns (address)"
                            ], ethers.provider);
                            
                            const name = await creditLineContract.name();
                            const symbol = await creditLineContract.symbol();
                            const borrower = await creditLineContract.borrower();
                            const underlyingAsset = await creditLineContract.underlyingAsset();
                            
                            console.log(`    Name: ${name}`);
                            console.log(`    Symbol: ${symbol}`);
                            console.log(`    Borrower: ${borrower}`);
                            console.log(`    Underlying Asset: ${underlyingAsset}`);
                        } catch (error) {
                            console.log(`    ❌ Error getting credit line info:`, error instanceof Error ? error.message : String(error));
                        }
                    }
                }
            }
            console.log("");
            
        } catch (error) {
            console.log(`❌ Error checking ${factory.name}:`, error instanceof Error ? error.message : String(error));
            console.log("");
        }
    }

    // Also check if any credit lines were created directly (not through factory)
    console.log("🔍 Checking for direct credit line deployments...\n");
    
    // Get recent transactions to see if any credit lines were created
    try {
        const latestBlock = await ethers.provider.getBlockNumber();
        console.log(`Latest block: ${latestBlock}`);
        
        // Check last 20 blocks for contract creations
        for (let i = 0; i < 20; i++) {
            const blockNumber = latestBlock - i;
            const block = await ethers.provider.getBlock(blockNumber, true);
            
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.from === deployer.address && tx.to === null) {
                        // This is a contract creation
                        console.log(`\nBlock ${blockNumber}: Contract creation`);
                        console.log(`  Hash: ${tx.hash}`);
                        console.log(`  From: ${tx.from}`);
                        console.log(`  Contract address: ${tx.contractAddress || 'Unknown'}`);
                        
                        // Check if this contract has WETH
                        if (tx.contractAddress) {
                            try {
                                const wethBalance = await wethContract.balanceOf(tx.contractAddress);
                                if (wethBalance > 0) {
                                    console.log(`  💰 WETH found: ${ethers.formatEther(wethBalance)} WETH`);
                                }
                            } catch (error) {
                                // Ignore errors
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log("❌ Error checking recent transactions:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
