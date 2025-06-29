const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x[Your Contract Address]"; // Replace with actual address
    
    console.log("Verifying contract address:", contractAddress);
    
    try {
        const dummyUpgrade = await ethers.getContractAt("DummyUpgrade", contractAddress);
        
        // Check all key states
        const contractCounter = await dummyUpgrade.contractCounter();
        const testMode = await dummyUpgrade.testMode();
        const automationEnabled = await dummyUpgrade.automationEnabled();
        const activeContractsCount = await dummyUpgrade.activeContractsCount();
        const totalTriggeredContracts = await dummyUpgrade.totalTriggeredContracts();
        const balance = await ethers.provider.getBalance(contractAddress);
        const lastGlobalCheck = await dummyUpgrade.lastGlobalCheck();
        
        console.log("Contract verification successful!");
        console.log("Contract status:");
        console.log("  Contract counter:", contractCounter.toString());
        console.log("  Active contracts:", activeContractsCount.toString());
        console.log("  Triggered contracts:", totalTriggeredContracts.toString());
        console.log("  Test mode:", testMode);
        console.log("  Automation enabled:", automationEnabled);
        console.log("  Contract balance:", ethers.formatEther(balance), "AVAX");
        console.log("  Last check time:", new Date(Number(lastGlobalCheck) * 1000).toLocaleString());
        
        // Check test prices
        const avaxPrice = await dummyUpgrade.testPrices("AVAX");
        const btcPrice = await dummyUpgrade.testPrices("BTC");
        const ethPrice = await dummyUpgrade.testPrices("ETH");
        
        console.log("Test price settings:");
        console.log("  AVAX:", ethers.formatUnits(avaxPrice, 8), "USD");
        console.log("  BTC:", ethers.formatUnits(btcPrice, 8), "USD");
        console.log("  ETH:", ethers.formatUnits(ethPrice, 8), "USD");
        
        console.log("Snowtrace:", `https://testnet.snowtrace.io/address/${contractAddress}`);
        
        return contractAddress;
    } catch (error) {
        console.error("Contract verification failed:", error.message);
        console.log("Please confirm the address is correct or the contract is deployed");
    }
}

main().catch(console.error);