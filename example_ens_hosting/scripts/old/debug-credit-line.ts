import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Debugging Credit Line Contract...\n");

    // Credit line address from the successful test
    const creditLineAddress = "0xe392b80CE5c4c72324233a9334E353E0F07a070B";
    
    console.log("Credit Line Address:", creditLineAddress);

    // Check if the contract exists
    const code = await ethers.provider.getCode(creditLineAddress);
    console.log("Contract code length:", code.length);
    
    if (code === "0x") {
        console.log("❌ Contract does not exist!");
        return;
    }

    // Try to get basic ERC20 information
    console.log("\n📋 Basic ERC20 Information:");
    try {
        const creditLine = new ethers.Contract(creditLineAddress, [
            "function name() external view returns (string)",
            "function symbol() external view returns (string)",
            "function decimals() external view returns (uint8)",
            "function totalSupply() external view returns (uint256)",
            "function balanceOf(address account) external view returns (uint256)"
        ], ethers.provider);

        const name = await creditLine.name();
        const symbol = await creditLine.symbol();
        const decimals = await creditLine.decimals();
        const totalSupply = await creditLine.totalSupply();
        const balance = await creditLine.balanceOf(creditLineAddress);

        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Decimals:", decimals);
        console.log("Total Supply:", ethers.formatEther(totalSupply));
        console.log("Contract Balance:", ethers.formatEther(balance));
    } catch (error) {
        console.log("❌ Error getting ERC20 info:", error instanceof Error ? error.message : String(error));
    }

    // Try to get credit line specific information
    console.log("\n📋 Credit Line Specific Information:");
    try {
        const creditLine = new ethers.Contract(creditLineAddress, [
            "function underlyingAsset() external view returns (address)",
            "function creditLimit() external view returns (uint256)",
            "function apy() external view returns (uint256)",
            "function borrower() external view returns (address)",
            "function lastAccrualTime() external view returns (uint256)",
            "function priceValidationEnabled() external view returns (bool)",
            "function aerodromeAdapter() external view returns (address)"
        ], ethers.provider);

        const underlyingAsset = await creditLine.underlyingAsset();
        const creditLimit = await creditLine.creditLimit();
        const apy = await creditLine.apy();
        const borrower = await creditLine.borrower();
        const lastAccrualTime = await creditLine.lastAccrualTime();
        const priceValidationEnabled = await creditLine.priceValidationEnabled();
        const aerodromeAdapter = await creditLine.aerodromeAdapter();

        console.log("Underlying Asset:", underlyingAsset);
        console.log("Credit Limit:", ethers.formatEther(creditLimit));
        console.log("APY:", apy.toString(), "basis points");
        console.log("Borrower:", borrower);
        console.log("Last Accrual Time:", new Date(Number(lastAccrualTime) * 1000).toISOString());
        console.log("Price Validation Enabled:", priceValidationEnabled);
        console.log("Aerodrome Adapter:", aerodromeAdapter);
    } catch (error) {
        console.log("❌ Error getting credit line info:", error instanceof Error ? error.message : String(error));
    }

    // Try to call getCreditLineStatus with a different approach
    console.log("\n📋 Testing getCreditLineStatus Function:");
    try {
        const creditLine = new ethers.Contract(creditLineAddress, [
            "function getCreditLineStatus() external view returns (tuple(address underlyingAsset, uint256 creditLimit, uint256 apy, address borrower, uint256 lastAccrualTime, bool priceValidationEnabled, address aerodromeAdapter))"
        ], ethers.provider);

        const status = await creditLine.getCreditLineStatus();
        console.log("✅ getCreditLineStatus successful!");
        console.log("Status:", status);
    } catch (error) {
        console.log("❌ Error calling getCreditLineStatus:", error instanceof Error ? error.message : String(error));
        
        // Try to get the function signature
        console.log("\n🔍 Checking function signature...");
        try {
            const creditLine = new ethers.Contract(creditLineAddress, [
                "function getCreditLineStatus() external view returns (tuple(address, uint256, uint256, address, uint256, bool, address))"
            ], ethers.provider);

            const status = await creditLine.getCreditLineStatus();
            console.log("✅ getCreditLineStatus with simplified signature successful!");
            console.log("Status:", status);
        } catch (error2) {
            console.log("❌ Error with simplified signature:", error2 instanceof Error ? error2.message : String(error2));
        }
    }

    console.log("\n✅ Debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
