import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    console.log("🧪 Testing deployed CreditLineToken contract...\n");

    const [deployer] = await ethers.getSigners();
    const address = deployer.address;
    
    console.log("Your address:", address);
    
    // Contract address from the last deployment
    const contractAddress = "0xd04E10D6601873cb28fDDC04839DFd3C0C95fDDD";
    const WETH = "0x4200000000000000000000000000000000000006";
    
    console.log("Contract address:", contractAddress);
    
    // Get the contract instance
    const creditLineToken = await ethers.getContractAt("CreditLineToken", contractAddress);
    
    // Check if contract is initialized
    try {
        const underlyingAsset = await creditLineToken.underlyingAsset();
        console.log("Underlying asset:", underlyingAsset);
        
        const creditLimit = await creditLineToken.creditLimit();
        console.log("Credit limit:", ethers.formatEther(creditLimit));
        
        const apy = await creditLineToken.apy();
        console.log("APY:", apy.toString(), "basis points");
        
        const borrower = await creditLineToken.borrower();
        console.log("Borrower:", borrower);
        
        console.log("✅ Contract is initialized!");
        
        // Check WETH balance in the contract
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const contractWethBalance = await wethContract.balanceOf(contractAddress);
        console.log("WETH balance in contract:", ethers.formatEther(contractWethBalance), "WETH");
        
    } catch (error) {
        console.log("❌ Contract is not initialized yet");
        console.log("Error:", error instanceof Error ? error.message : String(error));
        
        // Check WETH balance in the contract
        const wethContract = await ethers.getContractAt("IERC20", WETH);
        const contractWethBalance = await wethContract.balanceOf(contractAddress);
        console.log("WETH balance in contract:", ethers.formatEther(contractWethBalance), "WETH");
        
        // Try to initialize manually
        console.log("\n🔧 Attempting to initialize manually...");
        
        const params = {
            underlyingAsset: WETH,
            creditLimit: ethers.parseEther("1000000"),
            apy: 500,
            initialLiquidity: ethers.parseEther("0.05")
        };
        
        try {
            const initTx = await creditLineToken.initialize(params, address);
            console.log("Initialization transaction hash:", initTx.hash);
            await initTx.wait();
            console.log("✅ Contract initialized successfully!");
        } catch (initError) {
            console.log("❌ Initialization failed:", initError instanceof Error ? initError.message : String(initError));
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
