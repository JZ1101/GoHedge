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

            // Step 25: Non-buyer helps claim for beneficiary (should succeed)
            console.log("\n--- Step 25: Non-buyer helps claim contract #4 for beneficiary ---");

            // Get User3's balance before claim
            const user3BalanceBeforeClaim = await ethers.provider.getBalance(user3.address);
            const user2BalanceBeforeClaim = await ethers.provider.getBalance(user2.address);

            console.log(`User3 balance before claim: ${ethers.formatEther(user3BalanceBeforeClaim)} AVAX`);
            console.log(`User2 balance before claim: ${ethers.formatEther(user2BalanceBeforeClaim)} AVAX`);

            // User2 calls claimPayout for contract #4, but User3 (beneficiary) gets the money
            const claimTx = await dummyInsurance.connect(user2).claimPayout(4);
            const claimReceipt = await claimTx.wait();
            const gasUsedForClaim = claimReceipt.gasUsed * claimReceipt.gasPrice;

            // Check balances after claim
            const user3BalanceAfterClaim = await ethers.provider.getBalance(user3.address);
            const user2BalanceAfterClaim = await ethers.provider.getBalance(user2.address);
            const contract4AfterClaim = await dummyInsurance.getContract(4);

            // Verify contract state
            expect(contract4AfterClaim.claimed).to.equal(true);

            // Verify User3 received the payout (0.8 AVAX)
            expect(user3BalanceAfterClaim).to.equal(user3BalanceBeforeClaim + pointEightEther);

            // Verify User2 only paid gas (lost gas fees)
            expect(user2BalanceAfterClaim).to.equal(user2BalanceBeforeClaim - gasUsedForClaim);

            console.log(`✓ User2 successfully helped User3 claim payout`);
            console.log(`✓ User3 received: ${ethers.formatEther(pointEightEther)} AVAX (payout)`);
            console.log(`✓ User2 paid: ${ethers.formatEther(gasUsedForClaim)} AVAX (gas only)`);
            console.log(`✓ Contract #4 marked as claimed: ${contract4AfterClaim.claimed}`);

            // Verify the event was emitted correctly
            await expect(claimTx)
                .to.emit(dummyInsurance, "PayoutClaimed")
                .withArgs(4, user2.address, pointEightEther); // msg.sender is user2, amount is 0.8 AVAX

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
            console.log("\n--- Step 34: Verify contract states ---");

            const contract1State = await dummyInsurance.getContract(1);
            const contract2State = await dummyInsurance.getContract(2);
            const contract3State = await dummyInsurance.getContract(3);
            const contract4State = await dummyInsurance.getContract(4);
            const contract5State = await dummyInsurance.getContract(5);

            // Contract #1: triggered=true, claimed=true (User2 claimed)
            expect(contract1State.triggered).to.equal(true);
            expect(contract1State.claimed).to.equal(true);
            console.log("✓ Contract #1: triggered=true, claimed=true (User2 claimed)");

            // Contract #2: triggered=true, claimed=true (User2 claimed)
            expect(contract2State.triggered).to.equal(true);
            expect(contract2State.claimed).to.equal(true);
            console.log("✓ Contract #2: triggered=true, claimed=true (User2 claimed)");

            // Contract #3: triggered=false, claimed=false (expired before trigger)
            expect(contract3State.triggered).to.equal(false);
            expect(contract3State.claimed).to.equal(false);
            console.log("✓ Contract #3: triggered=false, claimed=false (expired before trigger)");

            // Contract #4: triggered=true, claimed=true (User2 helped User3 claim in Step 25)
            expect(contract4State.triggered).to.equal(true);
            expect(contract4State.claimed).to.equal(true); // CHANGED: Should be true, not false
            console.log("✓ Contract #4: triggered=true, claimed=true (User2 helped User3 claim)");

            // Contract #5: triggered=false, claimed=false (expired, never purchased)
            expect(contract5State.triggered).to.equal(false);
            expect(contract5State.claimed).to.equal(false);
            console.log("✓ Contract #5: triggered=false, claimed=false (expired, never purchased)");

            console.log("✓ All contract states verified successfully");

            console.log("\n=== TEST CASE 9: FINAL CLAIMS AND CLEANUP ===");

            // Step 35: Verify contract #4 double claim prevention
            console.log("\n--- Step 35: Verify contract #4 double claim prevention ---");

            // Verify that contract #4 is already claimed from Step 25
            const contract4Status = await dummyInsurance.getContract(4);
            expect(contract4Status.claimed).to.equal(true);
            console.log("✓ Contract #4 confirmed as already claimed in Step 25");

            // Attempt to claim again should fail with "Payout already claimed"
            await expect(
                dummyInsurance.connect(user3).claimPayout(4)
            ).to.be.revertedWith("Payout already claimed");

            console.log("✓ Double claim attempt correctly rejected");
            console.log("✓ Step 35 completed - double claim prevention verified");

            await pause(1);

            // Step 36: User1 withdraws from non-triggered expired contract #5
            console.log("\n--- Step 36: User1 withdraws from non-triggered expired contract #5 ---");

            const user1BalanceBeforeWithdraw = await ethers.provider.getBalance(user1.address);

            // Contract #5 was never purchased and never triggered, so User1 can withdraw reserve
            const withdrawTx = await dummyInsurance.connect(user1).withdrawReserve(5);
            const withdrawReceipt = await withdrawTx.wait();
            const gasUsedWithdraw = withdrawReceipt.gasUsed * withdrawReceipt.gasPrice;

            const user1BalanceAfterWithdraw = await ethers.provider.getBalance(user1.address);

            // User1 should receive 0.1 AVAX back (assuming contract #5 had 0.1 AVAX reserve)
            const expectedBalance = user1BalanceBeforeWithdraw + ethers.parseEther("0.1") - gasUsedWithdraw;
            expect(user1BalanceAfterWithdraw).to.equal(expectedBalance);

            console.log("✓ User1 successfully withdrew 0.1 AVAX from unpurchased expired contract #5");

            console.log("\n=== TEST CASE 10: UNPURCHASED CONTRACT TEST ===");

            // Step 37: Create contract #6 that no one will buy
            console.log("Step 37: Create contract #6 (unpurchased contract test)");
            const currentBlock2 = await ethers.provider.getBlock('latest');
            const currentTime2 = currentBlock2.timestamp;
            const shortEndTime2 = currentTime2 + 60; // 1 minute expiration

            const tx37 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                ethers.parseEther("40"), // High trigger price (won't trigger)
                currentTime2,
                shortEndTime2,
                "AVAX",
                ethers.parseEther("0.3"), // 0.3 AVAX reserve
                ethers.parseEther("0.03"), // 0.03 AVAX fee
                { value: ethers.parseEther("0.3") }
            );
            await tx37.wait();

            expect(await dummyInsurance.contractCounter()).to.equal(6);
            console.log("✓ Contract #6 created (no buyer will purchase this)");

            // Verify contract #6 state (should be inactive - no buyer)
            const contract6Initial = await dummyInsurance.getContract(6);
            expect(contract6Initial.active).to.be.false;
            expect(contract6Initial.buyer).to.equal(ethers.ZeroAddress);
            console.log("✓ Contract #6 state verified: active=false, buyer=0x0");

            await pause(2);

            // Step 38: Fast forward time to expire contract #6
            console.log("Step 38: Fast forward time to expire contract #6 (no buyer)");
            await ethers.provider.send("evm_increaseTime", [120]); // 2 minutes
            await ethers.provider.send("evm_mine");
            console.log("✓ Contract #6 expired without any buyer");

            await pause(1);

            // Step 39: User1 withdraws reserve from unpurchased expired contract #6
            console.log("Step 39: User1 withdraws reserve from unpurchased expired contract #6");
            const user1BalanceBeforeUnpurchased = await ethers.provider.getBalance(user1.address);

            const tx39 = await dummyInsurance.connect(user1).withdrawReserve(6);
            const receipt39 = await tx39.wait();
            const gasUsed39 = receipt39.gasUsed * receipt39.gasPrice;

            const user1BalanceAfterUnpurchased = await ethers.provider.getBalance(user1.address);
            const expectedBalance39 = user1BalanceBeforeUnpurchased + ethers.parseEther("0.3") - gasUsed39;
            expect(user1BalanceAfterUnpurchased).to.equal(expectedBalance39);
            console.log("✓ User1 withdrew 0.3 AVAX reserve from unpurchased expired contract #6");

            // Step 40: Verify final contract #6 state
            console.log("Step 40: Verify final contract #6 state after withdrawal");
            const contract6Final = await dummyInsurance.getContract(6);
            expect(contract6Final.active).to.be.false;
            expect(contract6Final.triggered).to.be.false;
            expect(contract6Final.claimed).to.be.false;
            expect(contract6Final.buyer).to.equal(ethers.ZeroAddress);
            console.log("✓ Contract #6 final state: unpurchased, untriggered, unclaimed");

            console.log("\n=== SELLER PROTECTION VERIFICATION ===");
            console.log("✓ Unpurchased contract test completed successfully");
            console.log("✓ Seller protection confirmed: full reserve recovery from unsold contracts");
            console.log("✓ Only gas fees lost when no buyers participate");

            console.log("\n=== FINAL VERIFICATION ===");
            console.log("✅ All 40 test steps completed successfully!");
            console.log("✅ Unpurchased contract protection verified!");
        });
    });
});