import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Decoding Error Data...\n");

    // The error data from the failed transaction
    const errorData = "0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000b4d696e74206661696c6564000000000000000000000000000000000000000000000";

    console.log("Error Data:", errorData);
    console.log("Error Data Length:", errorData.length);

    // This is a standard Solidity revert with reason string
    // Format: 0x08c379a0 + offset + length + reason string
    if (errorData.startsWith("0x08c379a0")) {
        console.log("\n✅ This is a standard Solidity revert with reason string");
        
        // Extract the reason string
        // Skip the function selector (4 bytes) and offset (32 bytes)
        const reasonStart = 2 + 8 + 64; // 0x + 4 bytes + 32 bytes
        const lengthHex = errorData.slice(reasonStart, reasonStart + 64);
        const length = parseInt(lengthHex, 16);
        
        console.log("Reason string length:", length);
        
        // Extract the reason string
        const reasonStartPos = reasonStart + 64;
        const reasonHex = errorData.slice(reasonStartPos, reasonStartPos + length * 2);
        
        // Convert hex to string
        const reason = ethers.toUtf8String("0x" + reasonHex);
        
        console.log("\n📋 Decoded Error Message:");
        console.log("Reason:", reason);
        
        console.log("\n🔍 Analysis:");
        if (reason === "Mint failed") {
            console.log("This error comes from the Aerodrome Position Manager's mint function");
            console.log("Common causes:");
            console.log("1. Pool doesn't exist or isn't initialized");
            console.log("2. Invalid tick range (tickLower >= tickUpper)");
            console.log("3. Insufficient liquidity for the specified amounts");
            console.log("4. Token approval issues");
            console.log("5. Invalid sqrtPriceX96 for pool initialization");
            console.log("6. Gas limit exceeded during mint operation");
        }
    } else {
        console.log("❌ Unknown error format");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
