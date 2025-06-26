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
        dummyInsurance = await DummyInsurance.deploy();
        await dummyInsurance.waitForDeployment(); // Fixed: changed from deployed() to waitForDeployment()
        contractAddress = await dummyInsurance.getAddress(); // Fixed: changed from .address to getAddress()
        
        console.log("DummyInsurance deployed to:", contractAddress);
    });

    describe("Complete Test Suite", function () {
        it("Should execute full test scenario", async function () {
            const oneEther = ethers.parseEther("1"); // Fixed: removed utils
            const twoEther = ethers.parseEther("2");
            const pointOneEther = ethers.parseEther("0.1");
            const pointTwoEther = ethers.parseEther("0.2");
            const tenEther = ethers.parseEther("10");
            const fiveEther = ethers.parseEther("5");
            const eightEther = ethers.parseEther("8");
            const sixEther = ethers.parseEther("6");
            const twelveEther = ethers.parseEther("12");

            // Get current timestamp
            const currentTime = Math.floor(Date.now() / 1000);
            const endTime = currentTime + 7 * 24 * 60 * 60; // 7 days

            console.log("=== TEST CASE 1: CONTRACT CREATION ===");
            
            // Step 1: User1 creates contract #1
            console.log("Step 1: User1 creates contract #1");
            const tx1 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                tenEther,        // trigger price = 10 AVAX
                currentTime,     // start now
                endTime,         // end in 7 days
                "AVAX",
                oneEther,        // reserve = 1 AVAX
                pointOneEther,   // fee = 0.1 AVAX
                { value: oneEther }
            );
            await tx1.wait();
            
            expect(await dummyInsurance.contractCounter()).to.equal(1);
            console.log("✓ Contract #1 created");

            // Step 2: User1 creates contract #2
            console.log("Step 2: User1 creates contract #2");
            const tx2 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                fiveEther,       // trigger price = 5 AVAX
                currentTime,
                endTime,
                "AVAX",
                twoEther,        // reserve = 2 AVAX
                pointTwoEther,   // fee = 0.2 AVAX
                { value: twoEther }
            );
            await tx2.wait();
            
            expect(await dummyInsurance.contractCounter()).to.equal(2);
            console.log("✓ Contract #2 created");

            console.log("\n=== TEST CASE 2: INSURANCE PURCHASE ===");
            
            // Step 3: User2 buys contract #1
            console.log("Step 3: User2 buys contract #1");
            const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
            
            const tx3 = await dummyInsurance.connect(user2).purchaseInsurance(1, {
                value: pointOneEther
            });
            await tx3.wait();
            
            const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
            expect(user1BalanceAfter - user1BalanceBefore).to.equal(pointOneEther); // Fixed: using BigInt arithmetic
            console.log("✓ User2 bought contract #1, User1 received fee");

            // Step 4: User2 buys contract #2
            console.log("Step 4: User2 buys contract #2");
            const user1BalanceBefore2 = await ethers.provider.getBalance(user1.address);
            
            const tx4 = await dummyInsurance.connect(user2).purchaseInsurance(2, {
                value: pointTwoEther
            });
            await tx4.wait();
            
            const user1BalanceAfter2 = await ethers.provider.getBalance(user1.address);
            expect(user1BalanceAfter2 - user1BalanceBefore2).to.equal(pointTwoEther);
            console.log("✓ User2 bought contract #2, User1 received fee");

            console.log("\n=== TEST CASE 3: PAYOUT TRIGGERING ===");
            
            // Step 5: Trigger contract #1 (price drops to 8 AVAX)
            console.log("Step 5: Trigger contract #1 (price drops to 8 AVAX)");
            const tx5 = await dummyInsurance.triggerPayout(1, eightEther);
            await tx5.wait();
            
            const contract1 = await dummyInsurance.getContract(1);
            expect(contract1.triggered).to.be.true;
            console.log("✓ Contract #1 triggered");

            // Step 6: User2 claims payout
            console.log("Step 6: User2 claims payout");
            const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
            
            const tx6 = await dummyInsurance.connect(user2).claimPayout(1);
            const receipt6 = await tx6.wait();
            const gasUsed6 = receipt6.gasUsed * receipt6.gasPrice; // Fixed: BigInt arithmetic
            
            const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
            const expectedBalance = user2BalanceBefore + oneEther - gasUsed6;
            expect(user2BalanceAfter).to.equal(expectedBalance);
            console.log("✓ User2 claimed 1 AVAX payout");

            // Step 7: Contract #2 stays untriggered
            console.log("Step 7: Contract #2 stays untriggered (price at 6 AVAX)");
            const contract2 = await dummyInsurance.getContract(2);
            expect(contract2.triggered).to.be.false;
            console.log("✓ Contract #2 remains untriggered");

            console.log("\n=== TEST CASE 4: CONTRACT EXPIRATION ===");
            
            // Step 8: Fast forward time (simulate expiration)
            console.log("Step 8: Fast forward time (contracts expire)");
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
            await ethers.provider.send("evm_mine");
            console.log("✓ Time advanced, contracts expired");

            // Step 9: User1 withdraws reserve from contract #2
            console.log("Step 9: User1 withdraws reserve from untriggered contract #2");
            const user1BalanceBefore3 = await ethers.provider.getBalance(user1.address);
            
            const tx9 = await dummyInsurance.connect(user1).withdrawReserve(2);
            const receipt9 = await tx9.wait();
            const gasUsed9 = receipt9.gasUsed * receipt9.gasPrice;
            
            const user1BalanceAfter3 = await ethers.provider.getBalance(user1.address);
            const expectedBalance3 = user1BalanceBefore3 + twoEther - gasUsed9;
            expect(user1BalanceAfter3).to.equal(expectedBalance3);
            console.log("✓ User1 withdrew 2 AVAX reserve");

            // Step 10: User1 cannot withdraw from triggered contract #1
            console.log("Step 10: User1 attempts to withdraw from triggered contract #1");
            await expect(
                dummyInsurance.connect(user1).withdrawReserve(1)
            ).to.be.revertedWith("Cannot withdraw reserve - contract was triggered");
            console.log("✓ Withdrawal correctly blocked for triggered contract");

            console.log("\n=== TEST CASE 5: ERROR CONDITIONS ===");
            
            // Step 11: Create an expired contract for testing
            console.log("Step 11: Create expired contract for testing");
            const pastTime = currentTime - 1000; // Past start time
            const expiredEndTime = currentTime - 500; // Already expired end time
            
            const tx11 = await dummyInsurance.connect(user1).createContract(
                "AVAX",
                tenEther,
                pastTime,        // start in the past
                expiredEndTime,  // end in the past (expired)
                "AVAX",
                oneEther,
                pointOneEther,
                { value: oneEther }
            );
            await tx11.wait();
            console.log("✓ Expired contract #3 created");

            // Step 11b: User3 tries to buy expired contract
            console.log("Step 11b: User3 tries to buy expired contract");
            await expect(
                dummyInsurance.connect(user3).purchaseInsurance(3, { value: pointOneEther })
            ).to.be.revertedWith("Contract has expired");
            console.log("✓ Purchase correctly blocked for expired contract");

            // Step 11c: Test buying already purchased contract
            console.log("Step 11c: User3 tries to buy already purchased contract");
            await expect(
                dummyInsurance.connect(user3).purchaseInsurance(1, { value: pointOneEther })
            ).to.be.revertedWith("Contract already purchased");
            console.log("✓ Purchase correctly blocked for already purchased contract");

            // Step 12: User2 tries to claim untriggered contract
            console.log("Step 12: User2 tries to claim untriggered contract");
            await expect(
                dummyInsurance.connect(user2).claimPayout(2)
            ).to.be.revertedWith("Payout not triggered yet");
            console.log("✓ Claim correctly blocked for untriggered contract");

            // Step 13: Attempt to trigger with insufficient price drop
            console.log("Step 13: Attempt to trigger with wrong price");
            await expect(
                dummyInsurance.triggerPayout(2, twelveEther)
            ).to.be.revertedWith("Price condition not met - current price too high");
            console.log("✓ Trigger correctly blocked for insufficient price drop");

            // Step 14: Double claim attempt
            console.log("Step 14: Double claim attempt");
            await expect(
                dummyInsurance.connect(user2).claimPayout(1)
            ).to.be.revertedWith("Payout already claimed");
            console.log("✓ Double claim correctly blocked");

            console.log("\n=== TEST CASE 6: VIEW FUNCTIONS ===");
            
            // Step 15: Get all contracts (now we have 3 contracts)
            console.log("Step 15: Get all contracts");
            const allContracts = await dummyInsurance.getAllContracts();
            expect(allContracts.length).to.equal(3);
            expect(allContracts[0]).to.equal(1);
            expect(allContracts[1]).to.equal(2);
            expect(allContracts[2]).to.equal(3);
            console.log("✓ getAllContracts() returns [1, 2, 3]");

            // Step 16: Get User1's contracts (User1 created all 3)
            console.log("Step 16: Get User1's contracts (as seller)");
            const user1Contracts = await dummyInsurance.getContractsByUser(user1.address);
            expect(user1Contracts.length).to.equal(3);
            console.log("✓ User1 has 3 contracts as seller");

            // Step 17: Get User2's contracts (User2 bought contracts 1 and 2)
            console.log("Step 17: Get User2's contracts (as buyer)");
            const user2Contracts = await dummyInsurance.getContractsByUser(user2.address);
            expect(user2Contracts.length).to.equal(2);
            console.log("✓ User2 has 2 contracts as buyer");

            // Step 18: Get contract #1 details
            console.log("Step 18: Get contract #1 details");
            const contract1Details = await dummyInsurance.getContract(1);
            expect(contract1Details.seller).to.equal(user1.address);
            expect(contract1Details.buyer).to.equal(user2.address);
            expect(contract1Details.triggered).to.be.true;
            expect(contract1Details.claimed).to.be.true;
            console.log("✓ Contract #1 details correct");

            // Step 19: Get contract #2 details
            console.log("Step 19: Get contract #2 details");
            const contract2Details = await dummyInsurance.getContract(2);
            expect(contract2Details.triggered).to.be.false;
            expect(contract2Details.claimed).to.be.false;
            console.log("✓ Contract #2 details correct");

            // Step 20: Check contract balance (now includes contract #3's reserve)
            console.log("Step 20: Check contract balance");
            const contractBalance = await dummyInsurance.getContractBalance();
            expect(contractBalance).to.equal(oneEther); // Contract #3's reserve is still there
            console.log("✓ Contract balance shows remaining reserve from contract #3");

            console.log("\n=== TEST COMPLETED SUCCESSFULLY ===");
            console.log("All test steps passed!");
        });
    });
});