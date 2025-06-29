const { ethers } = require("hardhat");

async function main() {
    console.log("Starting DummyUpgrade contract deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "AVAX");

    // Deploy contract
    const DummyUpgrade = await ethers.getContractFactory("DummyUpgrade");
    
    // Use zero address as price oracle address (test mode)
    console.log("Deploying contract...");
    const dummyUpgrade = await DummyUpgrade.deploy(ethers.ZeroAddress);
    
    await dummyUpgrade.waitForDeployment();
    const contractAddress = await dummyUpgrade.getAddress();
    
    console.log("DummyUpgrade deployed successfully!");
    console.log("Contract address:", contractAddress);
    console.log("Snowtrace:", `https://testnet.snowtrace.io/address/${contractAddress}`);
    
    // Verify deployment
    console.log("\nVerifying contract state...");
    const testMode = await dummyUpgrade.testMode();
    const automationEnabled = await dummyUpgrade.automationEnabled();
    const contractCounter = await dummyUpgrade.contractCounter();
    
    console.log("Test mode:", testMode);
    console.log("Automation enabled:", automationEnabled);
    console.log("Contract counter:", contractCounter.toString());
    
    // Save deployment information
    const fs = require('fs');
    const deploymentInfo = {
        network: "fuji",
        contractAddress: contractAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber(),
        gasUsed: "To be retrieved"
    };
    
    fs.writeFileSync(
        'deployment-info.json', 
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to deployment-info.json");
    return contractAddress;
}

main()
    .then((address) => {
        console.log("\nDeployment completed! Contract address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });