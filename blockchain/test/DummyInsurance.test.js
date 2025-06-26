const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DummyInsurance", function () {
    let dummyInsurance;
    let owner, user1, user2, user3;
    let contractAddress;

    beforeEach(async function () {
        // Get signers
        [owner, user1, user2, user3] = await ethers.getSigners();
        
        // Deploy contract
        const DummyInsurance = await ethers.getContractFactory("DummyInsurance");

        dummyInsurance = await DummyInsurance.deploy(ethers.ZeroAddress); // No price feed for test mode
        await dummyInsurance.waitForDeployment();
        contractAddress = await dummyInsurance.getAddress();
        
        console.log("DummyInsurance deployed to:", contractAddress);
        console.log("Contract in TEST MODE with default price of 25 AVAX");
    });

    describe("Complete Test Suite - 36 Steps", function () {
        it("Should execute comprehensive test scenario from testDummy.txt", async function () {
            // Helper function to add pauses
            const pause = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));
            
            // Constants
            const oneEther = ethers.parseEther("1");
            const twoEther = ethers.parseEther("2");
            const pointFiveEther = ethers.parseEther("0.5");
            const pointEightEther = ethers.parseEther("0.8");
            const pointOneEther = ethers.parseEther("0.1");
            const pointTwoEther = ethers.parseEther("0.2");
            const pointZeroFiveEther = ethers.parseEther("0.05");
            const pointZeroEightEther = ethers.parseEther("0.08");
            const tenEther = ethers.parseEther("10");
            const fifteenEther = ethers.parseEther("15");
            const eighteenEther = ethers.parseEther("18");
            const twentyEther = ethers.parseEther("20");
            const twentyFiveEther = ethers.parseEther("25");
            const thirtyEther = ethers.parseEther("30");
            const thirtyTwoEther = ethers.parseEther("32");
            const thirtyFiveEther = ethers.parseEther("35");
            const fourteenEther = ethers.parseEther("14");
            const sixteenEther = ethers.parseEther("16");

            // Get current timestamp
            const currentTime = Math.floor(Date.now() / 1000);
            const endTime = currentTime + 7 * 24 * 60 * 60; // 7 days
            const shortEndTime = currentTime + 60; // 1 minute

            console.log("\n=== TEST CASE 1: CONTRACT CREATION ===");
            
            // Step 1: User1 creates contract #1 (High trigger price - should trigger)
            console.log("Step 1: User1 creates contract #1 (trigger=30 AVAX, reserve=1 AVAX, fee=0.1 AVAX)");
            const tx1 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                thirtyEther,     // trigger price = 30 AVAX
                currentTime,
                endTime,
                "AVAX",
                oneEther,        // reserve = 1 AVAX
                pointOneEther,   // fee = 0.1 AVAX
                { value: oneEther }
            );
            await tx1.wait();
            
            expect(await dummyInsurance.contractCounter()).to.equal(1);
            console.log("✓ Contract #1 created, contractCounter = 1");
            
            await pause(1); // 1 second pause between steps

            // Step 2: User1 creates contract #2 (Low trigger price - should NOT trigger initially)
            console.log("Step 2: User1 creates contract #2 (trigger=20 AVAX, reserve=2 AVAX, fee=0.2 AVAX)");
            const tx2 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                twentyEther,     // trigger price = 20 AVAX
                currentTime,
                endTime,
                "AVAX",
                twoEther,        // reserve = 2 AVAX
                pointTwoEther,   // fee = 0.2 AVAX
                { value: twoEther }
            );
            await tx2.wait();
            
            expect(await dummyInsurance.contractCounter()).to.equal(2);
            console.log("✓ Contract #2 created, contractCounter = 2");
            
            await pause(1);

            // Step 3: User1 creates contract #3 (Short expiration for testing)
            console.log("Step 3: User1 creates contract #3 (trigger=35 AVAX, expires in 60 seconds)");
            const tx3 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                thirtyFiveEther, // trigger price = 35 AVAX
                currentTime,
                shortEndTime,    // expires in 60 seconds
                "AVAX",
                pointFiveEther,  // reserve = 0.5 AVAX
                pointZeroFiveEther, // fee = 0.05 AVAX
                { value: pointFiveEther }
            );
            await tx3.wait();
            
            expect(await dummyInsurance.contractCounter()).to.equal(3);
            console.log("✓ Contract #3 created, contractCounter = 3");
            
            await pause(2); // Longer pause before next test case

            console.log("\n=== TEST CASE 2: INSURANCE PURCHASE ===");
            
            // Step 4: User2 buys contract #1
            console.log("Step 4: User2 buys contract #1");
            const tx4 = await dummyInsurance.connect(user2).purchaseInsurance(1, {
                value: pointOneEther
            });
            await tx4.wait();
            
            const contract1After = await dummyInsurance.getContract(1);
            expect(contract1After.buyer).to.equal(user2.address);
            expect(contract1After.active).to.be.true;
            console.log("✓ User2 bought contract #1, contracts[1].active = true");
            
            await pause(1);

            // Step 5: User2 buys contract #2
            console.log("Step 5: User2 buys contract #2");
            const tx5 = await dummyInsurance.connect(user2).purchaseInsurance(2, {
                value: pointTwoEther
            });
            await tx5.wait();
            
            const contract2After = await dummyInsurance.getContract(2);
            expect(contract2After.buyer).to.equal(user2.address);
            expect(contract2After.active).to.be.true;
            console.log("✓ User2 bought contract #2, contracts[2].active = true");

            // Step 6: User3 buys contract #3
            console.log("Step 6: User3 buys contract #3");
            const tx6 = await dummyInsurance.connect(user3).purchaseInsurance(3, {
                value: pointZeroFiveEther
            });
            await tx6.wait();
            
            const contract3After = await dummyInsurance.getContract(3);
            expect(contract3After.buyer).to.equal(user3.address);
            expect(contract3After.active).to.be.true;
            console.log("✓ User3 bought contract #3, contracts[3].active = true");

            console.log("\n=== TEST CASE 3: PRICE TRIGGERING SCENARIOS ===");
            
            // Step 7: Set test price to trigger contract #1 (price drops below 30 AVAX)
            console.log("Step 7: Set test price to 25 AVAX (below 30 AVAX trigger for contract #1)");
            await dummyInsurance.setTestPrice(twentyFiveEther);
            expect(await dummyInsurance.getCurrentPrice()).to.equal(twentyFiveEther);
            console.log("✓ Test price updated to 25 AVAX, getCurrentPrice() = 25 AVAX");

            // Step 8: Trigger contract #1 (should succeed - price condition met)
            console.log("Step 8: Trigger contract #1 (should succeed - price condition met)");
            const tx8 = await dummyInsurance.triggerPayout(1);
            await tx8.wait();
            
            const contract1Triggered = await dummyInsurance.getContract(1);
            expect(contract1Triggered.triggered).to.be.true;
            console.log("✓ Contract #1 triggered successfully, contracts[1].triggered = true");

            // Step 9: Attempt to trigger contract #2 (should fail - price condition not met)
            console.log("Step 9: Attempt to trigger contract #2 (should fail - 25 AVAX > 20 AVAX trigger)");
            await expect(
                dummyInsurance.triggerPayout(2)
            ).to.be.revertedWith("Price condition not met - current price too high");
            console.log("✓ Trigger correctly blocked: 'Price condition not met - current price too high'");

            // Step 10: Set test price to trigger contract #2 (price drops below 20 AVAX)
            console.log("Step 10: Set test price to 18 AVAX (below 20 AVAX trigger for contract #2)");
            await dummyInsurance.setTestPrice(eighteenEther);
            expect(await dummyInsurance.getCurrentPrice()).to.equal(eighteenEther);
            console.log("✓ Test price updated to 18 AVAX, getCurrentPrice() = 18 AVAX");

            // Step 11: Trigger contract #2 (should succeed - price condition now met)
            console.log("Step 11: Trigger contract #2 (should succeed - price condition now met)");
            const tx11 = await dummyInsurance.triggerPayout(2);
            await tx11.wait();
            
            const contract2Triggered = await dummyInsurance.getContract(2);
            expect(contract2Triggered.triggered).to.be.true;
            console.log("✓ Contract #2 triggered successfully, contracts[2].triggered = true");

            console.log("\n=== TEST CASE 4: PAYOUT CLAIMS ===");
            
            // Step 12: User2 claims payout from triggered contract #1
            console.log("Step 12: User2 claims payout from triggered contract #1");
            const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
            
            const tx12 = await dummyInsurance.connect(user2).claimPayout(1);
            const receipt12 = await tx12.wait();
            const gasUsed12 = receipt12.gasUsed * receipt12.gasPrice;
            
            const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
            const expectedBalance12 = user2BalanceBefore + oneEther - gasUsed12;
            expect(user2BalanceAfter).to.equal(expectedBalance12);
            
            const contract1Claimed = await dummyInsurance.getContract(1);
            expect(contract1Claimed.claimed).to.be.true;
            console.log("✓ User2 claimed 1 AVAX payout, contracts[1].claimed = true");

            // Step 13: User2 claims payout from triggered contract #2
            console.log("Step 13: User2 claims payout from triggered contract #2");
            const user2BalanceBefore2 = await ethers.provider.getBalance(user2.address);
            
            const tx13 = await dummyInsurance.connect(user2).claimPayout(2);
            const receipt13 = await tx13.wait();
            const gasUsed13 = receipt13.gasUsed * receipt13.gasPrice;
            
            const user2BalanceAfter2 = await ethers.provider.getBalance(user2.address);
            const expectedBalance13 = user2BalanceBefore2 + twoEther - gasUsed13;
            expect(user2BalanceAfter2).to.equal(expectedBalance13);
            
            const contract2Claimed = await dummyInsurance.getContract(2);
            expect(contract2Claimed.claimed).to.be.true;
            console.log("✓ User2 claimed 2 AVAX payout, contracts[2].claimed = true");

            console.log("\n=== TEST CASE 5: EXPIRATION TESTING ===");
            
            // Step 14: Set test price to trigger contract #3 (price drops below 35 AVAX)
            console.log("Step 14: Set test price to 32 AVAX (below 35 AVAX trigger for contract #3)");
            await dummyInsurance.setTestPrice(thirtyTwoEther);
            expect(await dummyInsurance.getCurrentPrice()).to.equal(thirtyTwoEther);
            console.log("✓ Test price updated to 32 AVAX");
            
            await pause(2);

            // Step 15: Fast forward time to expire contract #3 (before triggering)
            console.log("Step 15: Fast forward time to expire contract #3 (before triggering)");
            await ethers.provider.send("evm_increaseTime", [120]); // 2 minutes
            await ethers.provider.send("evm_mine");
            console.log("✓ Time advanced, contract #3 expired before triggering");
            
            await pause(2); // Pause after time manipulation

            // Step 16: Attempt to trigger expired contract #3 (should fail - expired)
            console.log("Step 16: Attempt to trigger expired contract #3 (should fail - expired)");
            await expect(
                dummyInsurance.triggerPayout(3)
            ).to.be.revertedWith("Contract has expired");
            console.log("✓ Trigger correctly blocked: 'Contract has expired'");

            // Step 17: User1 withdraws reserve from expired untriggered contract #3
            console.log("Step 17: User1 withdraws reserve from expired untriggered contract #3");
            const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
            
            const tx17 = await dummyInsurance.connect(user1).withdrawReserve(3);
            const receipt17 = await tx17.wait();
            const gasUsed17 = receipt17.gasUsed * receipt17.gasPrice;
            
            const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
            const expectedBalance17 = user1BalanceBefore + pointFiveEther - gasUsed17;
            expect(user1BalanceAfter).to.equal(expectedBalance17);
            console.log("✓ User1 withdrew 0.5 AVAX reserve from expired contract #3");

            console.log("\n=== TEST CASE 6: PRICE CONDITION TESTING ===");
            
            // Step 18: Create contract #4 for additional price testing
            console.log("Step 18: Create contract #4 (trigger=15 AVAX, reserve=0.8 AVAX, fee=0.08 AVAX)");
            const tx18 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                fifteenEther,    // trigger price = 15 AVAX
                currentTime,     // start now (changed from currentTime + 200)
                endTime,
                "AVAX",
                pointEightEther, // reserve = 0.8 AVAX
                pointZeroEightEther, // fee = 0.08 AVAX
                { value: pointEightEther }
            );
            await tx18.wait();
            
            expect(await dummyInsurance.contractCounter()).to.equal(4);
            console.log("✓ Contract #4 created, contractCounter = 4");

            // Step 19: User3 buys contract #4
            console.log("Step 19: User3 buys contract #4");
            const tx19 = await dummyInsurance.connect(user3).purchaseInsurance(4, {
                value: pointZeroEightEther
            });
            await tx19.wait();
            
            const contract4After = await dummyInsurance.getContract(4);
            expect(contract4After.buyer).to.equal(user3.address);
            expect(contract4After.active).to.be.true;
            console.log("✓ User3 bought contract #4, contracts[4].active = true");

            // Step 20: Set test price above trigger (should not trigger)
            console.log("Step 20: Set test price to 16 AVAX (above 15 AVAX trigger for contract #4)");
            await dummyInsurance.setTestPrice(sixteenEther);
            expect(await dummyInsurance.getCurrentPrice()).to.equal(sixteenEther);
            console.log("✓ Test price updated to 16 AVAX");

            // Step 21: Attempt to trigger contract #4 (should fail - price too high)
            console.log("Step 21: Attempt to trigger contract #4 (should fail - price too high)");
            await expect(
                dummyInsurance.triggerPayout(4)
            ).to.be.revertedWith("Price condition not met - current price too high");
            
            const contract4NotTriggered = await dummyInsurance.getContract(4);
            expect(contract4NotTriggered.triggered).to.be.false;
            console.log("✓ Trigger correctly blocked, contracts[4].triggered = false");

            // Step 22: Set test price below trigger (should trigger)
            console.log("Step 22: Set test price to 14 AVAX (below 15 AVAX trigger for contract #4)");
            await dummyInsurance.setTestPrice(fourteenEther);
            expect(await dummyInsurance.getCurrentPrice()).to.equal(fourteenEther);
            console.log("✓ Test price updated to 14 AVAX");

            // Step 23: Trigger contract #4 (should succeed)
            console.log("Step 23: Trigger contract #4 (should succeed)");
            const tx23 = await dummyInsurance.triggerPayout(4);
            await tx23.wait();
            
            const contract4Triggered = await dummyInsurance.getContract(4);
            expect(contract4Triggered.triggered).to.be.true;
            console.log("✓ Contract #4 triggered successfully, contracts[4].triggered = true");

            console.log("\n=== TEST CASE 7: ERROR CONDITIONS ===");
            
            // Step 24: Double claim attempt on contract #1
            console.log("Step 24: Double claim attempt on contract #1");
            await expect(
                dummyInsurance.connect(user2).claimPayout(1)
            ).to.be.revertedWith("Payout already claimed");
            console.log("✓ Double claim correctly blocked: 'Payout already claimed'");

            await pause(1);

            // Step 25: Non-buyer tries to claim contract #4
            console.log("Step 25: Non-buyer (User2) tries to claim contract #4 (User3 is buyer)");
            await expect(
                dummyInsurance.connect(user2).claimPayout(4)
            ).to.be.revertedWith("Only buyer can claim payout");
            console.log("✓ Non-buyer claim correctly blocked: 'Only buyer can claim payout'");

            await pause(1);

            // Step 26: Fast forward time to expire remaining contracts FIRST
            console.log("Step 26: Fast forward time to expire remaining contracts");
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 3600]); // 7 days + 1 hour
            await ethers.provider.send("evm_mine");
            console.log("✓ Time advanced, contracts #1, #2, #4 are now expired");

            await pause(2);

            // Step 27: Attempt to withdraw reserve from triggered contract #1 (now expired)
            console.log("Step 27: Attempt to withdraw reserve from triggered contract #1 (now expired)");
            await expect(
                dummyInsurance.connect(user1).withdrawReserve(1)
            ).to.be.revertedWith("Cannot withdraw reserve - contract was triggered");
            console.log("✓ Withdrawal correctly blocked: 'Cannot withdraw reserve - contract was triggered'");

            await pause(1);

            // Step 28: Create expired contract for testing (past timestamps)
            console.log("Step 28: Create contract #5 with past timestamps (already expired)");
            const pastStartTime = currentTime - 1000;
            const pastEndTime = currentTime - 500;
            
            const tx28 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                tenEther,
                pastStartTime,
                pastEndTime,
                "AVAX",
                pointOneEther,
                ethers.parseEther("0.01"),
                { value: pointOneEther }
            );
            await tx28.wait();
            
            expect(await dummyInsurance.contractCounter()).to.equal(5);
            console.log("✓ Contract #5 created with past timestamps (already expired)");

            await pause(1);

            // Step 29: Attempt to purchase expired contract
            console.log("Step 29: Attempt to purchase expired contract #5");
            await expect(
                dummyInsurance.connect(user3).purchaseInsurance(5, { value: ethers.parseEther("0.01") })
            ).to.be.revertedWith("Contract has expired");
            console.log("✓ Purchase correctly blocked: 'Contract has expired'");

            await pause(2);

            // Need to add these steps:

            // Step 30: Get all contracts
            console.log("Step 30: Get all contracts");
            const allContracts = await dummyInsurance.getAllContracts();
            expect(allContracts.length).to.equal(5);
            console.log("✓ getAllContracts() returns [1, 2, 3, 4, 5]");
            
            // Step 31: Get User1's contracts (as seller)
            console.log("Step 31: Get User1's contracts (as seller)");
            const user1Contracts = await dummyInsurance.getContractsByUser(user1.address);
            expect(user1Contracts.length).to.equal(5);
            console.log("✓ User1 has 5 contracts as seller");
            
            // Step 32: Get User2's contracts (as buyer)
            console.log("Step 32: Get User2's contracts (as buyer)");
            const user2Contracts = await dummyInsurance.getContractsByUser(user2.address);
            expect(user2Contracts.length).to.equal(2);
            console.log("✓ User2 has 2 contracts as buyer: [1, 2]");
            
            // Step 33: Get User3's contracts (as buyer)
            console.log("Step 33: Get User3's contracts (as buyer)");
            const user3Contracts = await dummyInsurance.getContractsByUser(user3.address);
            expect(user3Contracts.length).to.equal(2);
            console.log("✓ User3 has 2 contracts as buyer: [3, 4]");
            
            // Step 34: Verify contract states
            console.log("Step 34: Verify contract states");
            const finalContract1 = await dummyInsurance.getContract(1);
            const finalContract2 = await dummyInsurance.getContract(2);
            const finalContract3 = await dummyInsurance.getContract(3);
            const finalContract4 = await dummyInsurance.getContract(4);
            const finalContract5 = await dummyInsurance.getContract(5);

            expect(finalContract1.triggered).to.be.true;
            expect(finalContract1.claimed).to.be.true;
            expect(finalContract2.triggered).to.be.true;
            expect(finalContract2.claimed).to.be.true;
            expect(finalContract3.triggered).to.be.false;
            expect(finalContract3.claimed).to.be.false;
            expect(finalContract4.triggered).to.be.true;
            expect(finalContract4.claimed).to.be.false; // User3 hasn't claimed yet
            expect(finalContract5.triggered).to.be.false;
            expect(finalContract5.claimed).to.be.false;

            console.log("✓ All contract states verified");

            console.log("\n=== TEST CASE 9: FINAL CLAIMS AND CLEANUP ===");

            // Step 35: User3 claims payout from contract #4
            console.log("Step 35: User3 claims payout from contract #4");
            const user3BalanceBefore = await ethers.provider.getBalance(user3.address);

            const tx35 = await dummyInsurance.connect(user3).claimPayout(4);
            const receipt35 = await tx35.wait();
            const gasUsed35 = receipt35.gasUsed * receipt35.gasPrice;

            const user3BalanceAfter = await ethers.provider.getBalance(user3.address);
            const expectedBalance35 = user3BalanceBefore + pointEightEther - gasUsed35;
            expect(user3BalanceAfter).to.equal(expectedBalance35);

            const contract4FinalClaimed = await dummyInsurance.getContract(4);
            expect(contract4FinalClaimed.claimed).to.be.true;
            console.log("✓ User3 claimed 0.8 AVAX payout, contracts[4].claimed = true");

            // Step 36: User1 attempts to withdraw from non-triggered expired contract #5
            console.log("Step 36: User1 withdraws reserve from non-triggered expired contract #5");
            const user1BalanceBeforeFinal = await ethers.provider.getBalance(user1.address);

            const tx36 = await dummyInsurance.connect(user1).withdrawReserve(5);
            const receipt36 = await tx36.wait();
            const gasUsed36 = receipt36.gasUsed * receipt36.gasPrice;

            const user1BalanceAfterFinal = await ethers.provider.getBalance(user1.address);
            const expectedBalance36 = user1BalanceBeforeFinal + pointOneEther - gasUsed36;
            expect(user1BalanceAfterFinal).to.equal(expectedBalance36);
            console.log("✓ User1 withdrew 0.1 AVAX reserve from expired contract #5");

            console.log("\n=== FINAL VERIFICATION ===");
            console.log("✅ All 36 test steps completed successfully!");
        });
    });
});