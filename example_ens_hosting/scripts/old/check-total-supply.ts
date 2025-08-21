import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Total Supply of Credit Line Tokens...\n");

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
        // Check the factory for any existing credit lines
        const factoryAddress = "0x81c457d9D2f61229E661e13d57bD5f8c45401b42";
        const factory = await ethers.getContractAt("CreditLineFactory", factoryAddress);
        
        console.log("🔍 Step 1: Checking existing credit lines...");
        const creditLines = await factory.getAllCreditLines();
        console.log(`   Found ${creditLines.length} credit lines`);
        
        for (let i = 0; i < creditLines.length; i++) {
            const creditLineAddress = creditLines[i];
            console.log(`\n📊 Credit Line ${i + 1}: ${creditLineAddress}`);
            
            try {
                const creditLine = await ethers.getContractAt("CreditLineToken", creditLineAddress);
                
                // Check total supply
                const totalSupply = await creditLine.totalSupply();
                console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} tokens`);
                
                // Check if it's initialized
                const borrower = await creditLine.borrower();
                if (borrower !== "0x0000000000000000000000000000000000000000") {
                    console.log(`   ✅ Initialized - Borrower: ${borrower}`);
                    
                    // Check underlying asset balance
                    const underlyingAsset = await creditLine.underlyingAsset();
                    const underlyingBalance = await ethers.provider.getBalance(creditLineAddress);
                    console.log(`   Underlying Asset: ${underlyingAsset}`);
                    console.log(`   ETH Balance: ${ethers.formatEther(underlyingBalance)} ETH`);
                    
                    // Check WETH balance if it's WETH
                    if (underlyingAsset === "0x4200000000000000000000000000000000000006") {
                        const wethContract = await ethers.getContractAt("IERC20", underlyingAsset);
                        const wethBalance = await wethContract.balanceOf(creditLineAddress);
                        console.log(`   WETH Balance: ${ethers.formatEther(wethBalance)} WETH`);
                    }
                } else {
                    console.log(`   ❌ Not initialized`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error reading credit line: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        
        // Check if we can create a new credit line
        console.log("\n🔍 Step 2: Testing if we can create a new credit line...");
        
        const WETH = "0x4200000000000000000000000000000000000006";
        const initialLiquidity = ethers.parseEther("0.001");
        
        console.log(`   Initial Liquidity: ${ethers.formatEther(initialLiquidity)} WETH`);
        console.log(`   Initial Liquidity (raw): ${initialLiquidity.toString()}`);
        
        // Check if this would cause overflow
        const maxUint256 = ethers.MaxUint256;
        console.log(`   Max uint256: ${maxUint256.toString()}`);
        
        if (initialLiquidity > maxUint256) {
            console.log(`   ❌ OVERFLOW: Initial liquidity exceeds max uint256`);
        } else {
            console.log(`   ✅ No overflow: Initial liquidity is within uint256 range`);
        }
        
        // Check factory WETH balance
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const factoryBalance = await wethContract.balanceOf(factoryAddress);
        console.log(`   Factory WETH Balance: ${ethers.formatEther(factoryBalance)} WETH`);
        
        if (factoryBalance < initialLiquidity) {
            console.log(`   ❌ INSUFFICIENT BALANCE: Factory needs ${ethers.formatEther(initialLiquidity)} WETH but has ${ethers.formatEther(factoryBalance)} WETH`);
        } else {
            console.log(`   ✅ SUFFICIENT BALANCE: Factory has enough WETH`);
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
