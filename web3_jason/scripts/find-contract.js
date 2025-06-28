const { ethers } = require("hardhat");

async function main() {
    console.log("Searching for DummyUpgrade contract address...");
    
    // Read from file
    try {
        const fs = require('fs');
        const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info.json', 'utf8'));
        console.log("Found from deployment record file:");
        console.log("Contract address:", deploymentInfo.contractAddress);
        console.log("Deployment time:", deploymentInfo.timestamp);
        console.log("Deployer:", deploymentInfo.deployer);
        
        // Verify contract is valid
        const dummyUpgrade = await ethers.getContractAt("DummyUpgrade", deploymentInfo.contractAddress);
        const contractCounter = await dummyUpgrade.contractCounter();
        console.log("Contract verification successful - Counter:", contractCounter.toString());
        
        return deploymentInfo.contractAddress;
    } catch (error) {
        console.log("Deployment record file not found, searching blockchain...");
    }
    
    // Search from blockchain
    const [deployer] = await ethers.getSigners();
    console.log("Searching deployer's transactions:", deployer.address);
    
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("Current block:", currentBlock);
    
    // Search recent 1000 blocks
    for (let i = currentBlock; i > Math.max(0, currentBlock - 1000); i--) {
        try {
            const block = await ethers.provider.getBlock(i, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.from && tx.from.toLowerCase() === deployer.address.toLowerCase() && tx.to === null) {
                        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                        if (receipt && receipt.contractAddress) {
                            try {
                                const contract = await ethers.getContractAt("DummyUpgrade", receipt.contractAddress);
                                await contract.contractCounter();
                                
                                console.log("Found DummyUpgrade contract:");
                                console.log("Contract address:", receipt.contractAddress);
                                console.log("Transaction hash:", tx.hash);
                                console.log("Block number:", receipt.blockNumber);
                                console.log("Snowtrace:", `https://testnet.snowtrace.io/address/${receipt.contractAddress}`);
                                
                                return receipt.contractAddress;
                            } catch (error) {
                                // Not a DummyUpgrade contract, continue searching
                                continue;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            continue;
        }
    }
    
    console.log("DummyUpgrade contract address not found");
}

main().catch(console.error);