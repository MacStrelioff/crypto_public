import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log("🔍 Checking Aerodrome Contract Addresses...\n");

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

    // Aerodrome contract addresses
    const addresses = {
        "CL Factory": "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A",
        "Position Manager": "0x827922686190790b37229fd06084350E74485b72",
        "WETH": "0x4200000000000000000000000000000000000006"
    };

    console.log("📋 Checking contract addresses...\n");

    for (const [name, address] of Object.entries(addresses)) {
        console.log(`🔍 ${name}: ${address}`);
        
        try {
            // Check if there's code at this address
            const code = await ethers.provider.getCode(address);
            const hasCode = code !== "0x";
            console.log(`   Has code: ${hasCode ? '✅ YES' : '❌ NO'}`);
            
            if (hasCode) {
                console.log(`   Code length: ${code.length} characters`);
                
                // Try to get basic info
                const balance = await ethers.provider.getBalance(address);
                console.log(`   ETH balance: ${ethers.formatEther(balance)} ETH`);
                
                // Try a simple call to see if it responds
                try {
                    // For contracts, try to call a view function that should exist
                    if (name === "WETH") {
                        const wethContract = await ethers.getContractAt([
                            "function name() external view returns (string)",
                            "function symbol() external view returns (string)",
                            "function decimals() external view returns (uint8)"
                        ], address);
                        
                        const wethName = await wethContract.name();
                        const wethSymbol = await wethContract.symbol();
                        const wethDecimals = await wethContract.decimals();
                        
                        console.log(`   Name: ${wethName}`);
                        console.log(`   Symbol: ${wethSymbol}`);
                        console.log(`   Decimals: ${wethDecimals}`);
                        console.log(`   ✅ WETH contract is working`);
                        
                    } else if (name === "Position Manager") {
                        // Try minimal interface for Position Manager
                        const pmContract = await ethers.getContractAt([
                            "function factory() external view returns (address)"
                        ], address);
                        
                        try {
                            const factory = await pmContract.factory();
                            console.log(`   Factory: ${factory}`);
                            console.log(`   ✅ Position Manager is responding`);
                        } catch (pmError) {
                            console.log(`   ❌ Position Manager call failed: ${pmError instanceof Error ? pmError.message : String(pmError)}`);
                        }
                        
                    } else if (name === "CL Factory") {
                        // Try minimal interface for CL Factory
                        const factoryContract = await ethers.getContractAt([
                            "function owner() external view returns (address)"
                        ], address);
                        
                        try {
                            const owner = await factoryContract.owner();
                            console.log(`   Owner: ${owner}`);
                            console.log(`   ✅ CL Factory is responding`);
                        } catch (factoryError) {
                            console.log(`   ❌ CL Factory call failed: ${factoryError instanceof Error ? factoryError.message : String(factoryError)}`);
                            
                            // Try a different method
                            console.log(`   🔄 Trying alternative CL Factory interface...`);
                            
                            const altFactoryContract = await ethers.getContractAt([
                                "function poolImplementation() external view returns (address)"
                            ], address);
                            
                            try {
                                const poolImpl = await altFactoryContract.poolImplementation();
                                console.log(`   Pool Implementation: ${poolImpl}`);
                                console.log(`   ✅ CL Factory responding with alternative interface`);
                            } catch (altError) {
                                console.log(`   ❌ Alternative CL Factory call also failed: ${altError instanceof Error ? altError.message : String(altError)}`);
                            }
                        }
                    }
                    
                } catch (callError) {
                    console.log(`   ❌ Function call failed: ${callError instanceof Error ? callError.message : String(callError)}`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Error checking ${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        console.log(""); // Empty line for readability
    }

    // Check if these addresses match what we have in our adapter
    console.log("🔍 Checking our adapter's stored addresses...");
    
    const adapterAddress = "0xeaA5451D5FC39B22A0FbDda2e5d3a7B7c1FfE7F8";
    
    try {
        const code = await ethers.provider.getCode(adapterAddress);
        const hasCode = code !== "0x";
        console.log(`Adapter has code: ${hasCode ? '✅ YES' : '❌ NO'}`);
        
        if (hasCode) {
            // Read the stored addresses from our adapter
            console.log(`\n📋 Addresses stored in our adapter:`);
            
            // The addresses are stored as constants, so we need to read the bytecode
            // or use a different approach. Let's try to call the adapter directly.
            
            // Actually, let's check if our adapter contract is working at all
            const adapter = await ethers.getContractAt([
                "function owner() external view returns (address)"
            ], adapterAddress);
            
            try {
                const adapterOwner = await adapter.owner();
                console.log(`   Adapter owner: ${adapterOwner}`);
                console.log(`   ✅ Our adapter is responding`);
            } catch (adapterError) {
                console.log(`   ❌ Our adapter call failed: ${adapterError instanceof Error ? adapterError.message : String(adapterError)}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ Error checking adapter: ${error instanceof Error ? error.message : String(error)}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
