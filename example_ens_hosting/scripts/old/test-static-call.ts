import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Testing with Static Call to Get Revert Reason...\n");

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
        // Use the latest deployed contracts
        const factoryAddress = "0x81c457d9D2f61229E661e13d57bD5f8c45401b42";
        const adapterAddress = "0x8E7F800edBf46e825a99D7464558618B2B885CD8";
        
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        const WETH = "0x4200000000000000000000000000000000000006";
        const initialLiquidity = ethers.parseEther("0.001");

        console.log("🔍 Step 1: Testing static call to createCreditLine...");
        
        try {
            // Try to simulate the createCreditLine call
            await factory.createCreditLine.staticCall(
                "Static Test Credit Line",  // name
                "STCL",                     // symbol
                WETH,                       // underlying asset
                ethers.parseEther("1000"),  // credit limit
                500,                        // APY
                deployer.address,           // borrower
                initialLiquidity,           // initial liquidity
                {
                    gasLimit: 12000000
                }
            );
            
            console.log("✅ Static call succeeded! The transaction should work.");
            
        } catch (staticCallError) {
            console.log("❌ Static call failed with error:");
            console.log(staticCallError instanceof Error ? staticCallError.message : String(staticCallError));
            
            // Try to decode the error
            if (staticCallError instanceof Error) {
                const errorMatch = staticCallError.message.match(/revert (.+)/);
                if (errorMatch) {
                    console.log(`\n🔍 Revert reason: ${errorMatch[1]}`);
                }
                
                const errorDataMatch = staticCallError.message.match(/0x[a-fA-F0-9]+/);
                if (errorDataMatch) {
                    console.log(`\n🔍 Error data: ${errorDataMatch[0]}`);
                    
                    // Try to decode with common errors
                    const commonErrors = [
                        "error CreditLineAlreadyInitialized()",
                        "error InsufficientBalance()",
                        "error InvalidParameters()",
                        "error ZeroAmount()",
                        "error ERC20InvalidReceiver(address)",
                        "error ERC20InsufficientBalance(address,uint256,uint256)"
                    ];
                    
                    for (const errorSig of commonErrors) {
                        try {
                            const iface = new ethers.Interface([errorSig]);
                            const decoded = iface.parseError(errorDataMatch[0]);
                            console.log(`\n✅ Decoded error: ${decoded.name}`);
                            if (decoded.args && decoded.args.length > 0) {
                                console.log(`   Args:`, decoded.args);
                            }
                            break;
                        } catch (decodeError) {
                            // Continue to next error signature
                        }
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
