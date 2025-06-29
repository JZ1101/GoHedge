const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x[YOUR_NEW_CONTRACT_ADDRESS]"; // Replace with actual address
    
    console.log("Configuring Time-based DummyUpgrade contract...");
    
    const dummyUpgrade = await ethers.getContractAt("DummyUpgrade", contractAddress);
    const [owner] = await ethers.getSigners();
    
    console.log("Admin address:", owner.address);
    
    // 1. Configure automation for time-based execution
    console.log("\n1. Configuring Time-based Automation...");
    await dummyUpgrade.configureAutomation(
        true,      // Enable automation
        800000,    // Gas limit (slightly lower for time-based)
        15,        // Max contracts per check (conservative for time-based)
        300        // Check interval (5 minutes)
    );
    console.log("Automation configuration completed");
    
    // 2. Set test prices
    console.log("\n2. Setting test prices...");
    await dummyUpgrade.setTestPrice("AVAX", ethers.parseUnits("25", 8)); // $25
    await dummyUpgrade.setTestPrice("BTC", ethers.parseUnits("30000", 8)); // $30,000
    await dummyUpgrade.setTestPrice("ETH", ethers.parseUnits("2000", 8)); // $2,000
    console.log("Test prices configured");
    
    // 3. Verify configuration
    console.log("\n3. Verifying configuration...");
    const stats = await dummyUpgrade.getAutomationStats();
    const timeBasedStatus = await dummyUpgrade.getTimeBasedStatus();
    
    console.log("Automation enabled:", stats.enabled);
    console.log("Eligible contracts:", timeBasedStatus.eligibleContracts.toString());
    console.log("Can execute:", timeBasedStatus.canExecute);
    
    // 4. Test time-based function
    console.log("\n4. Testing time-based function...");
    try {
        await dummyUpgrade.performTimeBasedUpkeep();
        console.log("Time-based function test successful");
    } catch (error) {
        console.log("Time-based function test result:", error.message);
    }
    
    console.log("\nConfiguration complete!");
    console.log("Contract address:", contractAddress);
    console.log("Snowtrace:", `https://testnet.snowtrace.io/address/${contractAddress}`);
    
    return contractAddress;
}

main().catch(console.error);