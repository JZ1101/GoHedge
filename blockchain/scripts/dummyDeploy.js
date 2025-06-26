// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying DummyInsurance contract to Avalanche Fuji...");

  // Get the contract factory
  const DummyInsurance = await hre.ethers.getContractFactory("DummyInsurance");

  // Deploy the contract
  const dummyInsurance = await DummyInsurance.deploy();

  // Wait for deployment
  await dummyInsurance.waitForDeployment();

  const contractAddress = await dummyInsurance.getAddress();
  
  console.log("✅ DummyInsurance deployed to:", contractAddress);
  console.log("🔗 Snowtrace URL:", `https://testnet.snowtrace.io/address/${contractAddress}`);
  
  // Save contract address to file for frontend
  const fs = require('fs');
  const contractInfo = {
    address: contractAddress,
    network: "fuji",
    deployedAt: new Date().toISOString(),
    contractName: "DummyInsurance"
  };
  
  fs.writeFileSync(
    './contract-address.json', 
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log("📝 Contract address saved to contract-address.json");
  
  // Wait a bit before verification
  console.log("⏳ Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Verify the contract
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified on Snowtrace");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
    console.log("🔧 You can verify manually later with:");
    console.log(`npx hardhat verify --network fuji ${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });