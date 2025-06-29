const { ethers } = require("hardhat");

async function main() {
    console.log("Starting DummyUpgradeUSDC contract deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "AVAX");

    // Deploy MockERC20 (USDC) first for testing
    console.log("\nDeploying MockERC20 (USDC) token...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6); // 6 decimals for USDC
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    
    console.log("MockERC20 (USDC) deployed at:", usdcAddress);
    
    // Mint some USDC tokens to deployer for testing
    const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
    await mockUSDC.mint(deployer.address, mintAmount);
    console.log("Minted 10,000 USDC to deployer");

    // Deploy DummyUpgradeUSDC contract
    console.log("\nDeploying DummyUpgradeUSDC contract...");
    const DummyUpgradeUSDC = await ethers.getContractFactory("DummyUpgradeUSDC");
    
    // Constructor parameters:
    // - _avaxPriceFeed: Use zero address for test mode
    // - _usdcToken: Address of the USDC token contract
    const dummyUpgradeUSDC = await DummyUpgradeUSDC.deploy(
        ethers.ZeroAddress, // AVAX price feed (zero address for test mode)
        usdcAddress         // USDC token address
    );
    
    await dummyUpgradeUSDC.waitForDeployment();
    const contractAddress = await dummyUpgradeUSDC.getAddress();
    
    console.log("DummyUpgradeUSDC deployed successfully!");
    console.log("Contract address:", contractAddress);
    console.log("Snowtrace:", `https://testnet.snowtrace.io/address/${contractAddress}`);
    
    // Verify deployment and initial state
    console.log("\nVerifying contract state...");
    const testMode = await dummyUpgradeUSDC.testMode();
    const automationEnabled = await dummyUpgradeUSDC.automationEnabled();
    const contractCounter = await dummyUpgradeUSDC.contractCounter();
    const activeContractsCount = await dummyUpgradeUSDC.activeContractsCount();
    const usdcTokenAddress = await dummyUpgradeUSDC.getUSDCAddress();
    
    console.log("Test mode:", testMode);
    console.log("Automation enabled:", automationEnabled);
    console.log("Contract counter:", contractCounter.toString());
    console.log("Active contracts count:", activeContractsCount.toString());
    console.log("USDC token address:", usdcTokenAddress);
    
    // Check test prices
    console.log("\nChecking test prices...");
    const avaxPrice = await dummyUpgradeUSDC.testPrices("AVAX");
    const btcPrice = await dummyUpgradeUSDC.testPrices("BTC");
    const ethPrice = await dummyUpgradeUSDC.testPrices("ETH");
    const usdcPrice = await dummyUpgradeUSDC.testPrices("USDC");
    
    console.log("AVAX test price:", ethers.formatUnits(avaxPrice, 8), "USD");
    console.log("BTC test price:", ethers.formatUnits(btcPrice, 8), "USD");
    console.log("ETH test price:", ethers.formatUnits(ethPrice, 8), "USD");
    console.log("USDC test price:", ethers.formatUnits(usdcPrice, 8), "USD");
    
    // Check deployer USDC balance
    const deployerUSDCBalance = await mockUSDC.balanceOf(deployer.address);
    console.log("Deployer USDC balance:", ethers.formatUnits(deployerUSDCBalance, 6), "USDC");
    
    // Get automation stats
    console.log("\nAutomation statistics...");
    const [totalContracts, activeContracts, triggeredContracts, lastCheck, enabled] = 
        await dummyUpgradeUSDC.getAutomationStats();
    
    console.log("Total contracts:", totalContracts.toString());
    console.log("Active contracts:", activeContracts.toString());
    console.log("Triggered contracts:", triggeredContracts.toString());
    console.log("Last check:", new Date(Number(lastCheck) * 1000).toISOString());
    console.log("Automation enabled:", enabled);
    
    // Save deployment information
    const fs = require('fs');
    const deploymentInfo = {
        network: "fuji",
        contractAddress: contractAddress,
        usdcTokenAddress: usdcAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber(),
        contractType: "DummyUpgradeUSDC",
        features: [
            "USDC Support",
            "Time-based Automation",
            "Dual Reserve System",
            "Test Mode Enabled"
        ],
        testPrices: {
            AVAX: ethers.formatUnits(avaxPrice, 8),
            BTC: ethers.formatUnits(btcPrice, 8),
            ETH: ethers.formatUnits(ethPrice, 8),
            USDC: ethers.formatUnits(usdcPrice, 8)
        },
        deployerUSDCBalance: ethers.formatUnits(deployerUSDCBalance, 6)
    };
    
    fs.writeFileSync(
        'deployment-usdc-info.json', 
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\nDeployment information saved to deployment-usdc-info.json");
    
    // Example usage instructions
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE - USAGE INSTRUCTIONS");
    console.log("=".repeat(60));
    console.log("\n1. Contract Addresses:");
    console.log("   - DummyUpgradeUSDC:", contractAddress);
    console.log("   - MockUSDC Token:", usdcAddress);
    
    console.log("\n2. To create AVAX reserve contract:");
    console.log(`   await contract.createContract("AVAX", ${ethers.parseUnits("18", 8)}, startDate, endDate, false, ethers.parseEther("1"), ethers.parseEther("0.01"), true, { value: ethers.parseEther("1") })`);
    
    console.log("\n3. To create USDC reserve contract:");
    console.log("   - First approve: await usdcToken.approve(contractAddress, amount)");
    console.log(`   - Then create: await contract.createContract("AVAX", ${ethers.parseUnits("18", 8)}, startDate, endDate, true, ethers.parseUnits("1000", 6), ethers.parseEther("0.01"), true)`);
    
    console.log("\n4. Purchase insurance:");
    console.log("   await contract.purchaseInsurance(contractId, { value: ethers.parseEther('0.01') })");
    
    console.log("\n5. Check automation status:");
    console.log("   await contract.getTimeBasedStatus()");
    
    return {
        contractAddress,
        usdcAddress
    };
}

main()
    .then((addresses) => {
        console.log("\n" + "=".repeat(60));
        console.log("DEPLOYMENT COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(60));
        console.log("DummyUpgradeUSDC address:", addresses.contractAddress);
        console.log("MockUSDC address:", addresses.usdcAddress);
        console.log("\nReady for testing with dual AVAX/USDC reserves!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\nDeployment failed:", error);
        process.exit(1);
    });