import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking WETH Balance in Credit Line...\n");

    // Base Sepolia WETH address
    const WETH = "0x4200000000000000000000000000000000000006";
    const wethContract = await ethers.getContractAt("IERC20", WETH);

    // Credit line address
    const creditLineAddress = "0xe392b80CE5c4c72324233a9334E353E0F07a070B";
    
    console.log("Credit Line Address:", creditLineAddress);

    // Check WETH balance in the credit line
    const wethBalance = await wethContract.balanceOf(creditLineAddress);
    console.log("WETH balance in credit line:", ethers.formatEther(wethBalance));

    // Check deployer's WETH balance
    const [deployer] = await ethers.getSigners();
    const deployerWethBalance = await wethContract.balanceOf(deployer.address);
    console.log("Deployer WETH balance:", ethers.formatEther(deployerWethBalance));

    // Check credit line token balance
    const creditLine = new ethers.Contract(creditLineAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function totalSupply() external view returns (uint256)"
    ], ethers.provider);

    const creditLineTokenBalance = await creditLine.balanceOf(creditLineAddress);
    const totalSupply = await creditLine.totalSupply();
    
    console.log("Credit Line Token Balance (self):", ethers.formatEther(creditLineTokenBalance));
    console.log("Total Supply:", ethers.formatEther(totalSupply));

    console.log("\n✅ Check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
