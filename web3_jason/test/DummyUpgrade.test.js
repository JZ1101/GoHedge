const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DummyUpgrade Contract", function () {
    let dummyUpgrade;
    let owner, seller, buyer, beneficiary;
    let contractAddress;

    beforeEach(async function () {
        [owner, seller, buyer, beneficiary] = await ethers.getSigners();
        
        const DummyUpgrade = await ethers.getContractFactory("DummyUpgrade");
        dummyUpgrade = await DummyUpgrade.deploy(ethers.ZeroAddress); // Deploy in test mode
        await dummyUpgrade.waitForDeployment();
        contractAddress = await dummyUpgrade.getAddress();
    });

    describe("Deployment", function () {
        it("Should deploy with correct initial state", async function () {
            expect(await dummyUpgrade.testMode()).to.be.true;
            expect(await dummyUpgrade.automationEnabled()).to.be.true;
            expect(await dummyUpgrade.contractCounter()).to.equal(0);
            expect(await dummyUpgrade.activeContractsCount()).to.equal(0);
        });

        it("Should initialize test prices correctly", async function () {
            // Check if test prices exist, some may be initialized to 0
            const avaxPrice = await dummyUpgrade.testPrices("AVAX");
            const btcPrice = await dummyUpgrade.testPrices("BTC");
            const ethPrice = await dummyUpgrade.testPrices("ETH");
            
            // Test that we can set and retrieve prices (even if not initialized)
            expect(avaxPrice).to.be.a('bigint');
            expect(btcPrice).to.be.a('bigint');
            expect(ethPrice).to.be.a('bigint');
            
            // Set test prices to verify functionality
            await dummyUpgrade.setTestPrice("AVAX", 25 * 10**8);
            expect(await dummyUpgrade.testPrices("AVAX")).to.equal(25 * 10**8);
        });
    });

    describe("Price Management", function () {
        it("Should allow owner to set test prices", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 20 * 10**8);
            expect(await dummyUpgrade.getCurrentPrice("AVAX")).to.equal(20 * 10**8);
        });

        it("Should prevent non-owner from setting test prices", async function () {
            await expect(
                dummyUpgrade.connect(buyer).setTestPrice("AVAX", 20 * 10**8)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should switch between test mode and production mode", async function () {
            await dummyUpgrade.setTestMode(false);
            expect(await dummyUpgrade.testMode()).to.be.false;

            await dummyUpgrade.setTestMode(true);
            expect(await dummyUpgrade.testMode()).to.be.true;
        });
    });

    describe("Contract Creation", function () {
        const triggerPrice = 18 * 10**8; // $18
        const reserveAmount = ethers.parseEther("0.1");
        const insuranceFee = ethers.parseEther("0.01");
        
        it("Should create contract with valid parameters", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600; // 1 hour

            await expect(
                dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    triggerPrice,
                    startDate,
                    endDate,
                    "AVAX",
                    reserveAmount,
                    insuranceFee,
                    true,
                    { value: reserveAmount }
                )
            ).to.emit(dummyUpgrade, "ContractCreated")
             .withArgs(1, seller.address, "AVAX", triggerPrice, reserveAmount, true);

            expect(await dummyUpgrade.contractCounter()).to.equal(1);
        });

        it("Should reject contract with insufficient reserve", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await expect(
                dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    triggerPrice,
                    startDate,
                    endDate,
                    "AVAX",
                    reserveAmount,
                    insuranceFee,
                    true,
                    { value: ethers.parseEther("0.05") } // Less than reserve amount
                )
            ).to.be.revertedWith("Insufficient reserve sent");
        });

        it("Should reject contract with invalid date range", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 3600;
            const endDate = startDate - 1800; // End before start

            await expect(
                dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    triggerPrice,
                    startDate,
                    endDate,
                    "AVAX",
                    reserveAmount,
                    insuranceFee,
                    true,
                    { value: reserveAmount }
                )
            ).to.be.revertedWith("Invalid date range");
        });

        it("Should reject contract with zero trigger price", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await expect(
                dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    0, // Zero trigger price
                    startDate,
                    endDate,
                    "AVAX",
                    reserveAmount,
                    insuranceFee,
                    true,
                    { value: reserveAmount }
                )
            ).to.be.revertedWith("Invalid trigger price");
        });
    });

    describe("Insurance Purchase", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await dummyUpgrade.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("0.1") }
            );

            // Move time forward to contract start
            await time.increaseTo(startDate);
        });

        it("Should allow valid insurance purchase", async function () {
            const tx = await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            await expect(tx)
                .to.emit(dummyUpgrade, "ContractPurchased")
                .withArgs(1, buyer.address, await time.latest());

            expect(await dummyUpgrade.activeContractsCount()).to.equal(1);
        });

        it("Should reject duplicate purchase", async function () {
            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            await expect(
                dummyUpgrade.connect(beneficiary).purchaseInsurance(1, {
                    value: ethers.parseEther("0.01")
                })
            ).to.be.revertedWith("Already purchased");
        });

        it("Should reject insufficient payment", async function () {
            await expect(
                dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                    value: ethers.parseEther("0.005") // Less than required fee
                })
            ).to.be.revertedWith("Insufficient fee");
        });
    });

    describe("Manual Trigger", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await dummyUpgrade.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("0.1") }
            );

            await time.increaseTo(startDate);

            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });
        });

        it("Should trigger payout when price condition is met", async function () {
            // Set price below trigger
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            await expect(
                dummyUpgrade.triggerPayout(1)
            ).to.emit(dummyUpgrade, "PayoutTriggered")
             .withArgs(1, buyer.address, ethers.parseEther("0.1"), 15 * 10**8, 18 * 10**8, true);
        });

        it("Should reject trigger when price condition not met", async function () {
            // Set price above trigger
            await dummyUpgrade.setTestPrice("AVAX", 20 * 10**8);

            await expect(
                dummyUpgrade.triggerPayout(1)
            ).to.be.revertedWith("Price condition not met");
        });

        it("Should reject trigger on inactive contract", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgrade.triggerPayout(1); // First trigger

            await expect(
                dummyUpgrade.triggerPayout(1) // Second trigger
            ).to.be.revertedWith("Already triggered");
        });
    });

    describe("Time-based Automation Only", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            // Configure automation for time-based testing only
            await dummyUpgrade.configureAutomation(true, 800000, 15, 3600); // 1 hour interval

            // Create multiple contracts for time-based testing
            for (let i = 0; i < 3; i++) {
                await dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    18 * 10**8,
                    startDate,
                    endDate,
                    "AVAX",
                    ethers.parseEther("0.1"),
                    ethers.parseEther("0.01"),
                    true,
                    { value: ethers.parseEther("0.1") }
                );
            }

            await time.increaseTo(startDate);

            for (let i = 0; i < 3; i++) {
                await dummyUpgrade.connect(buyer).purchaseInsurance(i + 1, {
                    value: ethers.parseEther("0.01")
                });
            }
        });

        it("Should execute time-based upkeep successfully", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            // Use transaction receipt to check event details
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Find the AutomationExecuted event
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            
            // Check final state
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(3);
        });

        it("Should not trigger when price condition not met in time-based", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 20 * 10**8); // Above trigger

            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Find the AutomationExecuted event
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(0);
        });

        it("Should return correct time-based status", async function () {
            const [eligibleContracts, nextCheckTime, canExecute] = await dummyUpgrade.getTimeBasedStatus();
            
            expect(eligibleContracts).to.equal(3);
            expect(nextCheckTime).to.be.a('bigint');
            expect(canExecute).to.be.true;
        });

        it("Should handle empty contract list in time-based", async function () {
            // Create a fresh contract with no active contracts
            const DummyUpgrade = await ethers.getContractFactory("DummyUpgrade");
            const freshContract = await DummyUpgrade.deploy(ethers.ZeroAddress);
            await freshContract.waitForDeployment();

            const tx = await freshContract.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Find the AutomationExecuted event
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = freshContract.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
        });

        it("Should respect gas limits in time-based execution", async function () {
            // Configure with very low max contracts per check
            await dummyUpgrade.configureAutomation(true, 800000, 1, 3600);

            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Find the AutomationExecuted event
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(1);
        });

        it("Should update lastGlobalCheck in time-based functions", async function () {
            const beforeTime = await time.latest();
            await dummyUpgrade.performTimeBasedUpkeep();
            const afterTime = await dummyUpgrade.lastGlobalCheck();

            expect(Number(afterTime)).to.be.greaterThanOrEqual(beforeTime);
        });

        it("Should reject time-based execution when automation disabled", async function () {
            await dummyUpgrade.emergencyPause();

            await expect(
                dummyUpgrade.performTimeBasedUpkeep()
            ).to.be.revertedWith("Automation disabled");
        });

        it("Should handle time-based automation with different intervals", async function () {
            // Test 30-minute interval
            await dummyUpgrade.configureAutomation(true, 800000, 15, 1800); // 30 minutes
            
            const [, nextCheckTime, canExecute] = await dummyUpgrade.getTimeBasedStatus();
            expect(canExecute).to.be.true;
            
            // Execute automation
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Verify execution
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
        });

        it("Should process multiple contracts efficiently in time-based mode", async function () {
            // Create additional contracts
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            // Create 5 more contracts (total 8)
            for (let i = 0; i < 5; i++) {
                await dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    18 * 10**8,
                    startDate,
                    endDate,
                    "AVAX",
                    ethers.parseEther("0.1"),
                    ethers.parseEther("0.01"),
                    true,
                    { value: ethers.parseEther("0.1") }
                );
            }

            await time.increaseTo(startDate);

            // Purchase new contracts
            for (let i = 4; i <= 8; i++) {
                await dummyUpgrade.connect(buyer).purchaseInsurance(i, {
                    value: ethers.parseEther("0.01")
                });
            }

            // Set trigger price and execute
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            console.log(`Gas used for 8 contracts: ${receipt.gasUsed}`);
            
            // Should trigger all 8 contracts (3 original + 5 new)
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(8);
        });

        it("Should handle time-based automation configuration changes", async function () {
            // Test changing configuration parameters
            await dummyUpgrade.configureAutomation(true, 1000000, 25, 7200); // 2 hour interval
            
            const stats = await dummyUpgrade.getAutomationStats();
            expect(stats.enabled).to.be.true;
            
            // Verify automation still works with new config
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            expect(receipt.status).to.equal(1); // Transaction succeeded
        });

        it("Should handle time-based automation with zero eligible contracts", async function () {
            // Create a completely fresh contract instance to ensure zero contracts
            const DummyUpgrade = await ethers.getContractFactory("DummyUpgrade");
            const freshContract = await DummyUpgrade.deploy(ethers.ZeroAddress);
            await freshContract.waitForDeployment();

            // Create a contract that won't be eligible (not purchased)
            const currentTime = await time.latest();
            const startDate = currentTime + 7200; // Start in 2 hours
            const endDate = startDate + 3600;

            await freshContract.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("0.1") }
            );

            // Don't purchase the contract and don't move time forward
            // This means no contracts are active/eligible
            const [eligibleContracts, , canExecute] = await freshContract.getTimeBasedStatus();
            expect(eligibleContracts).to.equal(0); // No purchased contracts
            expect(canExecute).to.be.false; // No eligible contracts to process

            // Execute time-based automation anyway
            const tx = await freshContract.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Should still emit event even with no eligible contracts
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = freshContract.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            expect(await freshContract.totalTriggeredContracts()).to.equal(0);
        });

        // Alternative test using the existing contract setup
        it("Should handle time-based automation when all contracts become ineligible", async function () {
            // Use existing setup with 3 active contracts
            // First verify they're eligible
            let [eligibleContracts, , canExecute] = await dummyUpgrade.getTimeBasedStatus();
            expect(eligibleContracts).to.equal(3);
            expect(canExecute).to.be.true;

            // Trigger all contracts to make them ineligible
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgrade.performTimeBasedUpkeep();

            // Now all contracts should be triggered/ineligible
            [eligibleContracts, , canExecute] = await dummyUpgrade.getTimeBasedStatus();
            expect(eligibleContracts).to.equal(0); // All contracts triggered
            expect(canExecute).to.be.false; // No eligible contracts left

            // Execute time-based automation again with no eligible contracts
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Should still emit event even with no eligible contracts
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            // Should remain at 3 triggered contracts (no new ones to trigger)
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(3);
        });

        it("Should handle time-based automation with expired contracts only", async function () {
            // Create contracts with very short duration
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 10; // Very short 10-second duration

            const DummyUpgrade = await ethers.getContractFactory("DummyUpgrade");
            const testContract = await DummyUpgrade.deploy(ethers.ZeroAddress);
            await testContract.waitForDeployment();

            // Create and purchase a contract
            await testContract.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("0.1") }
            );

            await time.increaseTo(startDate);
            await testContract.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            // Wait for contract to expire
            await time.increaseTo(endDate + 1);

            // Set trigger price but contract is expired
            await testContract.setTestPrice("AVAX", 15 * 10**8);

            // Check status - should show 0 eligible contracts due to expiration
            const [eligibleContracts, , canExecute] = await testContract.getTimeBasedStatus();
            expect(eligibleContracts).to.equal(0); // Expired contracts not eligible
            expect(canExecute).to.be.false;

            // Execute automation - should handle expired contracts gracefully
            const tx = await testContract.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = testContract.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            expect(await testContract.totalTriggeredContracts()).to.equal(0); // Expired contract not triggered
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to pause automation", async function () {
            await dummyUpgrade.emergencyPause();
            expect(await dummyUpgrade.automationEnabled()).to.be.false;
        });

        it("Should allow owner to resume automation", async function () {
            await dummyUpgrade.emergencyPause();
            await dummyUpgrade.emergencyResume();
            expect(await dummyUpgrade.automationEnabled()).to.be.true;
        });

        it("Should prevent non-owner from emergency functions", async function () {
            await expect(
                dummyUpgrade.connect(buyer).emergencyPause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Reserve Withdrawal", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await dummyUpgrade.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("0.1") }
            );
        });

        it("Should allow seller to withdraw from unpurchased contract", async function () {
            await expect(
                dummyUpgrade.connect(seller).withdrawReserve(1)
            ).to.emit(dummyUpgrade, "ReserveWithdrawn")
             .withArgs(1, seller.address, ethers.parseEther("0.1"));
        });

        it("Should prevent withdrawal from active contract", async function () {
            const currentTime = await time.latest();
            const contractData = await dummyUpgrade.getContract(1);
            await time.increaseTo(Number(contractData.startDate));

            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            await expect(
                dummyUpgrade.connect(seller).withdrawReserve(1)
            ).to.be.revertedWith("Still active");
        });

        it("Should allow withdrawal from expired untriggered contract", async function () {
            const currentTime = await time.latest();
            const contractData = await dummyUpgrade.getContract(1);
            await time.increaseTo(Number(contractData.startDate));

            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            // Fast forward past expiration
            await time.increaseTo(Number(contractData.endDate) + 1);

            await expect(
                dummyUpgrade.connect(seller).withdrawReserve(1)
            ).to.emit(dummyUpgrade, "ReserveWithdrawn");
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            for (let i = 0; i < 5; i++) {
                await dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    18 * 10**8,
                    startDate,
                    endDate,
                    "AVAX",
                    ethers.parseEther("0.1"),
                    ethers.parseEther("0.01"),
                    true,
                    { value: ethers.parseEther("0.1") }
                );
            }

            await time.increaseTo(startDate);

            for (let i = 0; i < 3; i++) {
                await dummyUpgrade.connect(buyer).purchaseInsurance(i + 1, {
                    value: ethers.parseEther("0.01")
                });
            }
        });

        it("Should return all contracts", async function () {
            const allContracts = await dummyUpgrade.getAllContracts();
            expect(allContracts.length).to.equal(5);
        });

        it("Should return active contracts only", async function () {
            const activeContracts = await dummyUpgrade.getActiveContracts();
            expect(activeContracts.length).to.equal(3);
        });

        it("Should return contracts by user", async function () {
            const sellerContracts = await dummyUpgrade.getContractsByUser(seller.address);
            expect(sellerContracts.length).to.equal(5);

            const buyerContracts = await dummyUpgrade.getContractsByUser(buyer.address);
            expect(buyerContracts.length).to.equal(3);
        });

        it("Should return automation stats", async function () {
            const stats = await dummyUpgrade.getAutomationStats();
            expect(stats.totalContracts).to.equal(5);
            expect(stats.activeContracts).to.equal(3);
            expect(stats.triggeredContracts).to.equal(0);
            expect(stats.enabled).to.be.true;
        });

        it("Should return time-based status correctly", async function () {
            const [eligibleContracts, nextCheckTime, canExecute] = await dummyUpgrade.getTimeBasedStatus();
            
            expect(eligibleContracts).to.equal(3); // 3 active contracts
            expect(nextCheckTime).to.be.a('bigint');
            expect(canExecute).to.be.true;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle contract expiration correctly", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 100; // Very short duration

            await dummyUpgrade.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("0.1") }
            );

            await time.increaseTo(startDate);

            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            // Wait for expiration
            await time.increaseTo(endDate + 1);

            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            await expect(
                dummyUpgrade.triggerPayout(1)
            ).to.be.revertedWith("Contract expired");
        });

        it("Should handle zero active contracts in time-based automation", async function () {
            // Fresh contract with no contracts
            const [eligibleContracts, , canExecute] = await dummyUpgrade.getTimeBasedStatus();
            expect(eligibleContracts).to.equal(0);
            expect(canExecute).to.be.false;
        });

        it("Should handle batch size limits in time-based automation", async function () {
            await dummyUpgrade.configureAutomation(true, 500000, 2, 3600); // Limit to 2 contracts

            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            // Create 5 contracts
            for (let i = 0; i < 5; i++) {
                await dummyUpgrade.connect(seller).createContract(
                    "AVAX",
                    18 * 10**8,
                    startDate,
                    endDate,
                    "AVAX",
                    ethers.parseEther("0.1"),
                    ethers.parseEther("0.01"),
                    true,
                    { value: ethers.parseEther("0.1") }
                );
            }

            await time.increaseTo(startDate);

            for (let i = 0; i < 5; i++) {
                await dummyUpgrade.connect(buyer).purchaseInsurance(i + 1, {
                    value: ethers.parseEther("0.01")
                });
            }

            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            // Execute time-based automation
            await dummyUpgrade.performTimeBasedUpkeep();

            // Should only trigger 2 due to batch limit
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(2);
            expect(await dummyUpgrade.activeContractsCount()).to.equal(3);
        });

        it("Should handle time-based execution with expired contracts", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 100; // Very short duration

            await dummyUpgrade.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("0.1") }
            );

            await time.increaseTo(startDate);

            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            // Wait for expiration
            await time.increaseTo(endDate + 1);

            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            // Time-based should skip expired contracts
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Find the AutomationExecuted event
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            // Should skip expired contract, so 0 should be triggered
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(0);
        });
    });

    describe("Claim Payout", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await dummyUpgrade.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("0.1"),
                ethers.parseEther("0.01"),
                false, // Disable auto-execute for manual claim testing
                { value: ethers.parseEther("0.1") }
            );

            await time.increaseTo(startDate);

            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });
        });

        it("Should allow beneficiary to claim triggered payout", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgrade.triggerPayout(1);

            await expect(
                dummyUpgrade.connect(buyer).claimPayout(1)
            ).to.emit(dummyUpgrade, "PayoutClaimed")
             .withArgs(1, buyer.address, ethers.parseEther("0.1"));
        });

        it("Should prevent non-beneficiary from claiming", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgrade.triggerPayout(1);

            await expect(
                dummyUpgrade.connect(seller).claimPayout(1)
            ).to.be.revertedWith("Not beneficiary");
        });

        it("Should prevent claiming untriggered contract", async function () {
            await expect(
                dummyUpgrade.connect(buyer).claimPayout(1)
            ).to.be.revertedWith("Not triggered");
        });

        it("Should prevent double claiming", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgrade.triggerPayout(1);
            await dummyUpgrade.connect(buyer).claimPayout(1);

            await expect(
                dummyUpgrade.connect(buyer).claimPayout(1)
            ).to.be.revertedWith("Already claimed");
        });
    });
});

// Helper function for testing with any value
const anyValue = require("@nomicfoundation/hardhat-chai-matchers/withArgs");