import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Analyzing Failed Transaction...\n");

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    if (network.chainId !== 8453n) {
        console.log("❌ This script should be run on Base mainnet (chain ID 8453)");
        return;
    }

    // The failed transaction hash
    const txHash = "0xe9e601cc8278584d9f8ace60c1b78b12117eb8a1093c9327efbefeb8eef4c2a7";
    const factoryAddress = "0x81c457d9D2f61229E661e13d57bD5f8c45401b42";

    console.log(`Transaction hash: ${txHash}`);
    console.log(`Factory address: ${factoryAddress}`);
    console.log(`BaseScan: https://basescan.org/tx/${txHash}`);

    try {
        // Get transaction details
        const tx = await ethers.provider.getTransaction(txHash);
        console.log("\n📋 Transaction Details:");
        console.log(`   From: ${tx.from}`);
        console.log(`   To: ${tx.to}`);
        console.log(`   Gas Limit: ${tx.gasLimit.toString()}`);
        console.log(`   Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} gwei`);
        console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
        console.log(`   Data: ${tx.data.slice(0, 66)}...`);

        // Get transaction receipt
        const receipt = await ethers.provider.getTransactionReceipt(txHash);
        console.log("\n📋 Transaction Receipt:");
        console.log(`   Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Block: ${receipt.blockNumber}`);
        console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`   Logs: ${receipt.logs.length} events`);

        // Try to decode the function call
        console.log("\n🔍 Function Call Analysis:");
        const functionSig = tx.data.slice(0, 10);
        console.log(`   Function signature: ${functionSig}`);

        // Known function signatures
        const functionSigs = {
            "0x6a761202": "createCreditLine(string,string,address,uint256,uint256,address,uint256)",
            "0x8da5cb5b": "owner()",
            "0x715018a6": "renounceOwnership()",
            "0xf2fde38b": "transferOwnership(address)"
        };

        const functionName = functionSigs[functionSig];
        if (functionName) {
            console.log(`   Function: ${functionName}`);
            
            if (functionSig === "0x6a761202") {
                try {
                    const iface = new ethers.Interface([
                        "function createCreditLine(string name, string symbol, address underlyingAsset, uint256 creditLimit, uint256 apy, address borrower, uint256 initialLiquidity) external returns (address)"
                    ]);
                    
                    const decoded = iface.parseTransaction({ data: tx.data });
                    console.log(`   Decoded parameters:`);
                    console.log(`     Name: ${decoded.args[0]}`);
                    console.log(`     Symbol: ${decoded.args[1]}`);
                    console.log(`     Underlying Asset: ${decoded.args[2]}`);
                    console.log(`     Credit Limit: ${ethers.formatEther(decoded.args[3])}`);
                    console.log(`     APY: ${decoded.args[4]}`);
                    console.log(`     Borrower: ${decoded.args[5]}`);
                    console.log(`     Initial Liquidity: ${ethers.formatEther(decoded.args[6])}`);
                } catch (decodeError) {
                    console.log(`   Could not decode parameters`);
                }
            }
        } else {
            console.log(`   Unknown function signature`);
        }

        // Check factory state
        console.log("\n🏭 Factory State Analysis:");
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        
        try {
            const owner = await factory.owner();
            console.log(`   Factory owner: ${owner}`);
            
            const deployer = "0xAdCB90777D62B55F8B34030A581bDC653116aD26";
            console.log(`   Transaction sender: ${deployer}`);
            console.log(`   Is sender the owner: ${owner.toLowerCase() === deployer.toLowerCase()}`);
            
            const creditLineCount = await factory.getCreditLineCount();
            console.log(`   Current credit lines: ${creditLineCount}`);
            
        } catch (factoryError) {
            console.log(`   Error checking factory state: ${factoryError instanceof Error ? factoryError.message : String(factoryError)}`);
        }

        // Check WETH balance
        console.log("\n💰 WETH Balance Analysis:");
        const WETH = "0x4200000000000000000000000000000000000006";
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        
        try {
            const factoryBalance = await wethContract.balanceOf(factoryAddress);
            console.log(`   Factory WETH balance: ${ethers.formatEther(factoryBalance)} WETH`);
            
            const initialLiquidity = ethers.parseEther("0.001");
            console.log(`   Required liquidity: ${ethers.formatEther(initialLiquidity)} WETH`);
            console.log(`   Has sufficient balance: ${factoryBalance >= initialLiquidity}`);
            
        } catch (wethError) {
            console.log(`   Error checking WETH balance: ${wethError instanceof Error ? wethError.message : String(wethError)}`);
        }

        // Try to simulate the call to get the revert reason
        console.log("\n🔬 Simulating Transaction to Get Revert Reason:");
        try {
            // Simulate the exact same call
            await ethers.provider.call({
                from: tx.from,
                to: tx.to,
                data: tx.data,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice
            }, receipt.blockNumber - 1); // Use block before the failed transaction
            
            console.log("   Simulation succeeded (unexpected)");
            
        } catch (simulationError) {
            console.log(`   Simulation failed with: ${simulationError instanceof Error ? simulationError.message : String(simulationError)}`);
            
            // Try to extract revert reason
            if (simulationError instanceof Error) {
                const errorMatch = simulationError.message.match(/revert (.+)/);
                if (errorMatch) {
                    console.log(`   Revert reason: ${errorMatch[1]}`);
                }
                
                const errorDataMatch = simulationError.message.match(/0x[a-fA-F0-9]+/);
                if (errorDataMatch) {
                    console.log(`   Error data: ${errorDataMatch[0]}`);
                    
                    // Try to decode common errors
                    const commonErrors = [
                        "error InsufficientBalance()",
                        "error TransferFailed()",
                        "error InvalidParameters()",
                        "error Unauthorized()"
                    ];
                    
                    for (const errorSig of commonErrors) {
                        try {
                            const iface = new ethers.Interface([errorSig]);
                            const decoded = iface.parseError(errorDataMatch[0]);
                            console.log(`   Decoded error: ${decoded.name}`);
                            break;
                        } catch (decodeError) {
                            // Continue to next error signature
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.log("❌ Error analyzing transaction:", error instanceof Error ? error.message : String(error));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
