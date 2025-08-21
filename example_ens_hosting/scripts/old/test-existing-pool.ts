import pkg from 'hardhat';
const { ethers } = pkg;

// Helper function to pause between transactions
function pause(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("🧪 Testing with Existing Aerodrome Pool...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Check which network we're on
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

    if (network.chainId !== 8453n) {
        console.log("❌ This script should be run on Base mainnet (chain ID 8453)");
        return;
    }

    // Base Mainnet addresses
    const WETH = "0x4200000000000000000000000000000000000006";
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const CL_FACTORY = "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A";
    const POSITION_MANAGER = "0x827922686190790b37229fd06084350E74485b72";

    // Existing WETH/USDC pool
    const EXISTING_POOL = "0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59";

    console.log("📋 Using Existing Pool:");
    console.log("Pool Address:", EXISTING_POOL);
    console.log("Token0 (WETH):", WETH);
    console.log("Token1 (USDC):", USDC);

    // Check pool status
    console.log("\n🔍 Checking Pool Status:");
    try {
        const pool = new ethers.Contract(EXISTING_POOL, [
            "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
            "function token0() external view returns (address)",
            "function token1() external view returns (address)",
            "function fee() external view returns (uint24)"
        ], ethers.provider);
        
        const slot0 = await pool.slot0();
        const token0 = await pool.token0();
        const token1 = await pool.token1();
        const fee = await pool.fee();
        
        console.log("✅ Pool is accessible!");
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        console.log("Fee:", fee);
        console.log("Current tick:", slot0[1].toString());
        console.log("Unlocked:", slot0[6]);
        
    } catch (error) {
        console.log("❌ Error accessing pool:", error instanceof Error ? error.message : String(error));
        return;
    }

    // Test position manager with existing pool
    console.log("\n🔍 Testing Position Manager:");
    try {
        const positionManager = new ethers.Contract(POSITION_MANAGER, [
            "function factory() external view returns (address)",
            "function WETH9() external view returns (address)"
        ], ethers.provider);
        
        const pmFactory = await positionManager.factory();
        const pmWeth = await positionManager.WETH9();
        
        console.log("✅ Position Manager is accessible!");
        console.log("PM Factory:", pmFactory);
        console.log("PM WETH:", pmWeth);
        console.log("Factory matches:", pmFactory === CL_FACTORY);
        console.log("WETH matches:", pmWeth === WETH);
        
    } catch (error) {
        console.log("❌ Error accessing position manager:", error instanceof Error ? error.message : String(error));
        return;
    }

    // Test adding liquidity to existing pool (small amount)
    console.log("\n🔍 Testing Liquidity Addition to Existing Pool:");
    
    // Get some USDC for testing (we'll need to get this from a faucet or swap)
    const usdcContract = await ethers.getContractAt("IERC20", USDC);
    const usdcBalance = await usdcContract.balanceOf(deployer.address);
    console.log("USDC balance:", ethers.formatUnits(usdcBalance, 6));
    
    if (usdcBalance < 1000000) { // Less than 1 USDC
        console.log("❌ Need USDC for testing. Getting some from a faucet...");
        
        // Try to get USDC from a faucet or swap
        // For now, let's just test with WETH only
        console.log("⚠️  Skipping USDC test, will test with WETH only");
    }

    // Test WETH liquidity addition
    const wethContract = await ethers.getContractAt("IERC20", WETH);
    const wethBalance = await wethContract.balanceOf(deployer.address);
    console.log("WETH balance:", ethers.formatEther(wethBalance));

    if (wethBalance < ethers.parseEther("0.001")) {
        console.log("❌ Insufficient WETH for testing");
        return;
    }

    // Try to add liquidity to existing pool
    console.log("\n📦 Testing Liquidity Addition:");
    try {
        // Approve position manager to spend WETH
        await wethContract.approve(POSITION_MANAGER, ethers.parseEther("0.001"));
        console.log("✅ WETH approved for position manager");

        // Create mint parameters for existing pool
        const mintParams = {
            token0: WETH,
            token1: USDC,
            fee: 3000, // 0.3% fee tier
            tickLower: -276325, // Wide range
            tickUpper: 276325,
            amount0Desired: ethers.parseEther("0.001"),
            amount1Desired: 0, // No USDC
            amount0Min: 0,
            amount1Min: 0,
            recipient: deployer.address,
            deadline: Math.floor(Date.now() / 1000) + 300
        };

        const positionManager = new ethers.Contract(POSITION_MANAGER, [
            "function mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
        ], deployer);

        console.log("📋 Mint Parameters:");
        console.log("- Token0:", mintParams.token0);
        console.log("- Token1:", mintParams.token1);
        console.log("- Fee:", mintParams.fee);
        console.log("- Tick Lower:", mintParams.tickLower);
        console.log("- Tick Upper:", mintParams.tickUpper);
        console.log("- Amount0 Desired:", ethers.formatEther(mintParams.amount0Desired));

        const tx = await positionManager.mint(mintParams);
        console.log("✅ Mint transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Mint successful! Block:", receipt.blockNumber);
        console.log("💰 Gas used:", receipt.gasUsed.toString());
        
        console.log("\n🎉 SUCCESS: Liquidity addition to existing pool works!");
        console.log("This proves we can interact with Aerodrome pools!");
        
    } catch (error) {
        console.log("❌ Error adding liquidity:", error instanceof Error ? error.message : String(error));
        
        if (error.data) {
            console.log("Error data:", error.data);
        }
        if (error.reason) {
            console.log("Error reason:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
