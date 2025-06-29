const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Starting 2-Wallet DummyInsurance deployment...\n");

    const network = hre.network.name;
    const [deployer, buyer] = await hre.ethers.getSigners();
    
    if (!buyer) {
        throw new Error("Need at least 2 funded accounts");
    }

    // Check balances
    const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
    const buyerBalance = await hre.ethers.provider.getBalance(buyer.address);
    
    console.log(`Network: ${network}`);
    console.log(`Deployer: ${deployer.address} | ${hre.ethers.formatEther(deployerBalance)} AVAX`);
    console.log(`Buyer: ${buyer.address} | ${hre.ethers.formatEther(buyerBalance)} AVAX\n`);

    // Verify minimum balances
    if (deployerBalance < hre.ethers.parseEther("3")) {
        throw new Error("Deployer needs at least 3 AVAX");
    }
    if (buyerBalance < hre.ethers.parseEther("2")) {
        throw new Error("Buyer needs at least 2 AVAX");
    }

    // Deploy contract
    console.log("Deploying DummyInsurance...");
    const DummyInsurance = await hre.ethers.getContractFactory("DummyInsurance");
    const dummyInsurance = await DummyInsurance.deploy(hre.ethers.ZeroAddress);
    await dummyInsurance.waitForDeployment();
    
    const contractAddress = await dummyInsurance.getAddress();
    console.log(`Contract deployed: ${contractAddress}\n`);

    // Save deployment info
    const deploymentInfo = {
        network,
        contractAddress,
        deployer: deployer.address,
        buyer: buyer.address,
        deploymentTime: new Date().toISOString(),
        initialBalances: {
            deployer: hre.ethers.formatEther(deployerBalance),
            buyer: hre.ethers.formatEther(buyerBalance)
        }
    };

    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }

    fs.writeFileSync(
        `./deployments/${network}-2wallet.json`, 
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("Next steps:");
    console.log("1. Run tests: npx hardhat run scripts/testnet-2wallet.js --network fuji");
    console.log("2. Expected return: 5.5 AVAX (110% recovery)");
    
    return contractAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });