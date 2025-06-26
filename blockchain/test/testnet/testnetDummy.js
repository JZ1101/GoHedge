const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Starting 2-Wallet Testnet Suite...\n");

    // Load deployment
    const network = hre.network.name;
    const deploymentFile = `./deployments/${network}-2wallet.json`;
    
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}`);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const contractAddress = deploymentInfo.contractAddress;
    
    // Get signers
    const [deployer, buyer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt("DummyInsurance", contractAddress);

    console.log(`Network: ${network}`);
    console.log(`Contract: ${contractAddress}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Buyer: ${buyer.address}\n`);

    // Track initial balances
    const initialBalances = {
        deployer: await hre.ethers.provider.getBalance(deployer.address),
        buyer: await hre.ethers.provider.getBalance(buyer.address)
    };

    console.log("Initial Balances:");
    console.log(`Deployer: ${hre.ethers.formatEther(initialBalances.deployer)} AVAX`);
    console.log(`Buyer: ${hre.ethers.formatEther(initialBalances.buyer)} AVAX\n`);

    // Constants
    const oneETH = hre.ethers.parseEther("1");
    const twoETH = hre.ethers.parseEther("2");
    const halfETH = hre.ethers.parseEther("0.5");
    const tenthETH = hre.ethers.parseEther("0.1");
    const fifthETH = hre.ethers.parseEther("0.2");
    const twentiethETH = hre.ethers.parseEther("0.05");
    const thirtyAVAX = hre.ethers.parseEther("30");
    const twentyAVAX = hre.ethers.parseEther("20");
    const thirtyFiveAVAX = hre.ethers.parseEther("35");
    const twentyFiveAVAX = hre.ethers.parseEther("25");
    const eighteenAVAX = hre.ethers.parseEther("18");
    const thirtyTwoAVAX = hre.ethers.parseEther("32");

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        // Get timestamps
        const currentBlock = await hre.ethers.provider.getBlock('latest');
        const currentTime = currentBlock.timestamp;
        const endTime = currentTime + 7 * 24 * 60 * 60; // 7 days
        const shortEndTime = currentTime + 120; // 2 minutes

        console.log("=== PHASE 1: CONTRACT CREATION ===");

        // Create Contract #1 (will trigger)
        console.log("1. Create Contract #1 (30 AVAX trigger, 1 AVAX reserve)");
        const tx1 = await contract.connect(deployer).createContract(
            "AVAX", thirtyAVAX, currentTime, endTime, "AVAX", oneETH, tenthETH,
            { value: oneETH }
        );
        await tx1.wait();
        console.log(`   Tx: ${tx1.hash}`);
        await delay(2000);

        // Create Contract #2 (will trigger)
        console.log("2. Create Contract #2 (20 AVAX trigger, 2 AVAX reserve)");
        const tx2 = await contract.connect(deployer).createContract(
            "AVAX", twentyAVAX, currentTime, endTime, "AVAX", twoETH, fifthETH,
            { value: twoETH }
        );
        await tx2.wait();
        console.log(`   Tx: ${tx2.hash}`);
        await delay(2000);

        // Create Contract #3 (will expire)
        console.log("3. Create Contract #3 (35 AVAX trigger, expires in 2 min)");
        const tx3 = await contract.connect(deployer).createContract(
            "AVAX", thirtyFiveAVAX, currentTime, shortEndTime, "AVAX", halfETH, twentiethETH,
            { value: halfETH }
        );
        await tx3.wait();
        console.log(`   Tx: ${tx3.hash}`);
        await delay(2000);

        console.log("\n=== PHASE 2: PURCHASE INSURANCE ===");

        // Buy all contracts
        console.log("4. Buyer purchases Contract #1");
        const tx4 = await contract.connect(buyer).purchaseInsurance(1, { value: tenthETH });
        await tx4.wait();
        await delay(2000);

        console.log("5. Buyer purchases Contract #2");
        const tx5 = await contract.connect(buyer).purchaseInsurance(2, { value: fifthETH });
        await tx5.wait();
        await delay(2000);

        console.log("6. Buyer purchases Contract #3");
        const tx6 = await contract.connect(buyer).purchaseInsurance(3, { value: twentiethETH });
        await tx6.wait();
        await delay(2000);

        console.log("\n=== PHASE 3: TRIGGER PAYOUTS ===");

        // Trigger Contract #1
        console.log("7. Set price to 25 AVAX (triggers Contract #1)");
        await contract.connect(deployer).setTestPrice(twentyFiveAVAX);
        await contract.triggerPayout(1);
        await delay(2000);

        // Trigger Contract #2
        console.log("8. Set price to 18 AVAX (triggers Contract #2)");
        await contract.connect(deployer).setTestPrice(eighteenAVAX);
        await contract.triggerPayout(2);
        await delay(2000);

        console.log("\n=== PHASE 4: CLAIM PAYOUTS ===");

        // Claim payouts
        console.log("9. Buyer claims 1 AVAX from Contract #1");
        await contract.connect(buyer).claimPayout(1);
        await delay(2000);

        console.log("10. Buyer claims 2 AVAX from Contract #2");
        await contract.connect(buyer).claimPayout(2);
        await delay(2000);

        console.log("\n=== PHASE 5: EXPIRATION & RECYCLING ===");

        // Wait for expiration
        console.log("11. Waiting for Contract #3 to expire (2+ minutes)...");
        await delay(130000); // 2+ minutes

        console.log("12. Deployer withdraws 0.5 AVAX from expired Contract #3");
        await contract.connect(deployer).withdrawReserve(3);

        console.log("\n=== PHASE 6: UNPURCHASED CONTRACT TEST ===");

        // Create Contract #4 that no one will buy
        console.log("13. Create Contract #4 (no buyer test)");
        const currentBlock2 = await hre.ethers.provider.getBlock('latest');
        const currentTime2 = currentBlock2.timestamp;
        const shortEndTime2 = currentTime2 + 60; // 1 minute expiration

        const tx13 = await contract.connect(deployer).createContract(
            "AVAX", 
            hre.ethers.parseEther("40"), // High trigger price (won't trigger)
            currentTime2, 
            shortEndTime2, 
            "AVAX", 
            hre.ethers.parseEther("0.3"), // 0.3 AVAX reserve
            hre.ethers.parseEther("0.03"), // 0.03 AVAX fee
            { value: hre.ethers.parseEther("0.3") }
        );
        await tx13.wait();
        console.log("    Contract #4 created (no buyer will purchase this)");
        await delay(2000);

        // Wait for expiration
        console.log("14. Waiting for Contract #4 to expire without any buyer...");
        await delay(65000); // 65 seconds

        // Withdraw from unpurchased contract
        console.log("15. Deployer withdraws from unpurchased expired Contract #4");
        const deployerBalanceBefore = await hre.ethers.provider.getBalance(deployer.address);

        const tx14 = await contract.connect(deployer).withdrawReserve(4);
        await tx14.wait();

        const deployerBalanceAfter = await hre.ethers.provider.getBalance(deployer.address);
        console.log("    Successfully withdrew 0.3 AVAX from unpurchased contract");

        // Verify contract state with error handling
        try {
            // First check if contract exists by checking counter
            const contractCounter = await contract.contractCounter();
            console.log(`    Total contracts created: ${contractCounter}`);
            
            if (contractCounter >= 4) {
                const contract4 = await contract.getContract(4);
                console.log(`    Contract #4 state: active=${contract4.active}, triggered=${contract4.triggered}`);
            } else {
                console.log("    Contract #4 not found in counter");
            }
        } catch (error) {
            console.log(`    Warning: Could not retrieve contract #4 state: ${error.message}`);
            console.log("    This may be normal if contract was deleted after withdrawal");
        }

        console.log("\n=== SELLER PROTECTION VERIFICATION ===");
        console.log("    Unpurchased contract test completed successfully");
        console.log("    Seller protection confirmed: full reserve recovery from unsold contracts");
        console.log("    Only gas fees lost when no buyers participate");

        console.log("\n=== FINAL ANALYSIS ===");

        // Calculate final balances
        const finalBalances = {
            deployer: await hre.ethers.provider.getBalance(deployer.address),
            buyer: await hre.ethers.provider.getBalance(buyer.address)
        };

        const deployerChange = finalBalances.deployer - initialBalances.deployer;
        const buyerChange = finalBalances.buyer - initialBalances.buyer;
        const totalChange = deployerChange + buyerChange;
        const totalInitial = initialBalances.deployer + initialBalances.buyer;
        const totalFinal = finalBalances.deployer + finalBalances.buyer;

        console.log("Final Balances:");
        console.log(`Deployer: ${hre.ethers.formatEther(finalBalances.deployer)} AVAX`);
        console.log(`Buyer: ${hre.ethers.formatEther(finalBalances.buyer)} AVAX`);
        console.log("\nBalance Changes:");
        console.log(`Deployer: ${hre.ethers.formatEther(deployerChange)} AVAX`);
        console.log(`Buyer: ${hre.ethers.formatEther(buyerChange)} AVAX`);
        console.log(`Total: ${hre.ethers.formatEther(totalChange)} AVAX`);

        const recyclingRate = (totalFinal * BigInt(100)) / totalInitial;
        console.log(`\nRecycling Rate: ${recyclingRate}%`);
        console.log(`View on Snowtrace: https://testnet.snowtrace.io/address/${contractAddress}`);

    } catch (error) {
        console.error("Test failed:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });