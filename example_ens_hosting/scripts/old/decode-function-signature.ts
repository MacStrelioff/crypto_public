import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Decoding Function Signature...\n");

    // The function signature from the failed transaction
    const functionSig = "0x5c16eee6";
    
    console.log(`Function signature: ${functionSig}`);
    
    // Known function signatures for comparison
    const knownSigs = {
        "0x6a761202": "createCreditLine(string,string,address,uint256,uint256,address,uint256)",
        "0x783cca1c": "createPool(address,address,int24,uint160)",
        "0x8da5cb5b": "owner()",
        "0x715018a6": "renounceOwnership()",
        "0xf2fde38b": "transferOwnership(address)",
        "0x40c10f19": "mint(address,uint256)",
        "0xa9059cbb": "transfer(address,uint256)",
        "0x23b872dd": "transferFrom(address,address,uint256)",
        "0x095ea7b3": "approve(address,uint256)"
    };
    
    console.log("\n📋 Known function signatures:");
    for (const [sig, name] of Object.entries(knownSigs)) {
        console.log(`   ${sig}: ${name}`);
    }
    
    // Check if our signature matches any known ones
    if (knownSigs[functionSig]) {
        console.log(`\n✅ Found match: ${knownSigs[functionSig]}`);
    } else {
        console.log(`\n❌ Unknown function signature: ${functionSig}`);
        
        // Try to reverse engineer what it might be
        console.log("\n🔍 Attempting to reverse engineer...");
        
        // Common function name patterns
        const commonFunctions = [
            "createPool",
            "createCreditLine", 
            "initialize",
            "mint",
            "transfer",
            "approve",
            "setAuthorizedCaller",
            "createPoolAndAddLiquidity"
        ];
        
        for (const funcName of commonFunctions) {
            const calculatedSig = ethers.id(funcName).slice(0, 10);
            console.log(`   ${funcName}: ${calculatedSig}`);
            
            if (calculatedSig === functionSig) {
                console.log(`   🎯 MATCH FOUND: ${funcName}`);
                break;
            }
        }
    }
    
    // Let's also check what the actual input data looks like
    console.log("\n🔍 Analyzing input data from BaseScan...");
    console.log("From BaseScan, the input data shows:");
    console.log("Function: 0x5c16eee6");
    console.log("This suggests it's calling a different function than expected.");
    
    // The issue might be that we're calling the wrong function
    // Let me check what function we should be calling
    console.log("\n🔍 Checking what function we should be calling...");
    
    // Our adapter calls createPool, but maybe the factory is calling something else
    const createPoolSig = ethers.id("createPool(address,address,int24,uint160)").slice(0, 10);
    const createCreditLineSig = ethers.id("createCreditLine(string,string,address,uint256,uint256,address,uint256)").slice(0, 10);
    
    console.log(`Expected createPool signature: ${createPoolSig}`);
    console.log(`Expected createCreditLine signature: ${createCreditLineSig}`);
    console.log(`Actual function called: ${functionSig}`);
    
    if (functionSig === createPoolSig) {
        console.log("✅ Function signature matches createPool");
    } else if (functionSig === createCreditLineSig) {
        console.log("✅ Function signature matches createCreditLine");
    } else {
        console.log("❌ Function signature doesn't match expected functions");
        
        // Maybe it's a different function entirely
        console.log("\n🔍 Maybe it's calling a different function...");
        
        // Check if it's calling the factory's createCreditLine function
        // But the factory's createCreditLine should call the adapter's createPoolAndAddLiquidity
        const createPoolAndAddLiquiditySig = ethers.id("createPoolAndAddLiquidity(address,address,uint256,uint256)").slice(0, 10);
        console.log(`createPoolAndAddLiquidity signature: ${createPoolAndAddLiquiditySig}`);
        
        if (functionSig === createPoolAndAddLiquiditySig) {
            console.log("✅ Function signature matches createPoolAndAddLiquidity");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
