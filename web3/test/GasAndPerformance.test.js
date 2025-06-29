const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Gas Limit and Performance Tests - Time-Based Automation", function () {
    let dummyUpgrade;
    let accounts;

    beforeEach(async function () {
        accounts = await ethers.getSigners();
        const DummyUpgrade = await ethers.getContractFactory("DummyUpgrade");
        dummyUpgrade = await DummyUpgrade.deploy(ethers.ZeroAddress);
        await dummyUpgrade.waitForDeployment();
    });

    describe("Gas Limit Handling", function () {
        it("Should handle gas limit exhaustion gracefully", async function () {
            // Create many contracts to test gas limits
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            // Create 100 contracts
            for (let i = 0; i < 100; i++) {
                await dummyUpgrade.connect(accounts[0]).createContract(
                    "AVAX", 18 * 10**8, startDate, endDate, "AVAX",
                    ethers.parseEther("0.01"), ethers.parseEther("0.001"), true,
                    { value: ethers.parseEther("0.01") }
                );
            }

            await time.increase(11);

            // Purchase insurance for all
            for (let i = 0; i < 100; i++) {
                await dummyUpgrade.connect(accounts[1]).purchaseInsurance(i + 1, {
                    value: ethers.parseEther("0.001")
                });
            }

            // Set time-based automation to process only 10 contracts per batch
            await dummyUpgrade.configureAutomation(true, 500000, 10, 3600); // 1 hour interval
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            // Test that time-based automation respects batch limits
            const statusBefore = await dummyUpgrade.getTimeBasedStatus();
            expect(statusBefore.eligibleContracts).to.equal(100);
            expect(statusBefore.canExecute).to.be.true;

            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            console.log(`Gas used for time-based automation (max 10 contracts): ${receipt.gasUsed}`);
            expect(Number(receipt.gasUsed)).to.be.lessThan(500000);

            // Verify that contracts were processed
            const totalTriggered = await dummyUpgrade.totalTriggeredContracts();
            expect(totalTriggered).to.be.greaterThan(0);
            expect(totalTriggered).to.be.lessThanOrEqual(10); // Should respect maxContractsPerCheck
        });

        it("Should handle automation with insufficient gas gracefully", async function () {
            // Set very low gas limit and small batch size
            await dummyUpgrade.configureAutomation(true, 50000, 5, 3600); // Very low limits

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            await dummyUpgrade.connect(accounts[0]).createContract(
                "AVAX", 18 * 10**8, startDate, endDate, "AVAX",
                ethers.parseEther("0.01"), ethers.parseEther("0.001"), true,
                { value: ethers.parseEther("0.01") }
            );

            await time.increase(11);
            await dummyUpgrade.connect(accounts[1]).purchaseInsurance(1, {
                value: ethers.parseEther("0.001")
            });

            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            // Should still work but process fewer contracts
            const statusBefore = await dummyUpgrade.getTimeBasedStatus();
            expect(statusBefore.eligibleContracts).to.equal(1);
            expect(statusBefore.canExecute).to.be.true;

            // Execute time-based automation
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            console.log(`Gas used with low limits: ${receipt.gasUsed}`);
            
            // Should complete without throwing errors
            expect(receipt.status).to.equal(1);
        });

        it("Should handle time-based automation with many contracts", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            // Create 50 contracts
            for (let i = 0; i < 50; i++) {
                await dummyUpgrade.connect(accounts[i % 10]).createContract(
                    "AVAX", 18 * 10**8, startDate, endDate, "AVAX",
                    ethers.parseEther("0.01"), ethers.parseEther("0.001"), true,
                    { value: ethers.parseEther("0.01") }
                );
            }

            await time.increase(11);

            // Purchase insurance for all
            for (let i = 0; i < 50; i++) {
                await dummyUpgrade.connect(accounts[(i + 1) % 10]).purchaseInsurance(i + 1, {
                    value: ethers.parseEther("0.001")
                });
            }

            // Configure reasonable limits
            await dummyUpgrade.configureAutomation(true, 800000, 20, 3600);
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8); // Trigger all contracts

            const statusBefore = await dummyUpgrade.getTimeBasedStatus();
            console.log(`Eligible contracts before: ${statusBefore.eligibleContracts}`);

            // Execute time-based automation
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            console.log(`Gas used for 50 contracts (max 20 per batch): ${receipt.gasUsed}`);
            
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
            
            const totalTriggered = await dummyUpgrade.totalTriggeredContracts();
            console.log(`Total contracts triggered: ${totalTriggered}`);
            
            // Should process up to maxContractsPerCheck (20) contracts
            expect(totalTriggered).to.be.greaterThan(0);
            expect(totalTriggered).to.be.lessThanOrEqual(20);
        });
    });

    describe("Large Scale Operations", function () {
        it("Should handle 200+ contracts efficiently", async function () {
            this.timeout(120000); // 2 minute timeout

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            console.log("Creating 200 contracts...");
            
            // Create contracts in batches to avoid timeout
            const batchSize = 50;
            for (let batch = 0; batch < 4; batch++) {
                for (let i = 0; i < batchSize; i++) {
                    const contractId = batch * batchSize + i;
                    await dummyUpgrade.connect(accounts[contractId % 10]).createContract(
                        "AVAX", 18 * 10**8, startDate, endDate, "AVAX",
                        ethers.parseEther("0.001"), ethers.parseEther("0.0001"), true,
                        { value: ethers.parseEther("0.001") }
                    );
                }
                console.log(`Batch ${batch + 1}/4 completed`);
            }

            expect(await dummyUpgrade.contractCounter()).to.equal(200);

            // Test view functions performance
            const start = Date.now();
            const allContracts = await dummyUpgrade.getAllContracts();
            const end = Date.now();
            
            console.log(`getAllContracts() took ${end - start}ms for 200 contracts`);
            expect(end - start).to.be.lessThan(5000); // Should complete within 5 seconds
            expect(allContracts.length).to.equal(200);

            // Test getActiveContracts performance
            const activeStart = Date.now();
            const activeContracts = await dummyUpgrade.getActiveContracts();
            const activeEnd = Date.now();
            
            console.log(`getActiveContracts() took ${activeEnd - activeStart}ms for 200 contracts`);
            expect(activeEnd - activeStart).to.be.lessThan(5000);
            expect(activeContracts.length).to.equal(0); // None purchased yet
        });

        it("Should handle time-based automation with purchased contracts", async function () {
            this.timeout(180000); // 3 minute timeout

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            console.log("Creating 100 contracts...");
            
            // Create 100 contracts
            for (let i = 0; i < 100; i++) {
                await dummyUpgrade.connect(accounts[i % 10]).createContract(
                    "AVAX", 18 * 10**8, startDate, endDate, "AVAX",
                    ethers.parseEther("0.001"), ethers.parseEther("0.0001"), true,
                    { value: ethers.parseEther("0.001") }
                );
            }

            await time.increase(11);

            console.log("Purchasing 100 contracts...");
            
            // Purchase all contracts
            for (let i = 0; i < 100; i++) {
                await dummyUpgrade.connect(accounts[(i + 5) % 10]).purchaseInsurance(i + 1, {
                    value: ethers.parseEther("0.0001")
                });
            }

            expect(await dummyUpgrade.activeContractsCount()).to.equal(100);

            // Configure automation with more realistic limits based on gas usage
            // Each contract trigger uses ~40-50K gas, so 15 contracts = ~750K gas
            await dummyUpgrade.configureAutomation(true, 1500000, 15, 3600); // Increased gas limit
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8); // Trigger all

            const statusBefore = await dummyUpgrade.getTimeBasedStatus();
            console.log(`Eligible contracts for automation: ${statusBefore.eligibleContracts}`);
            expect(statusBefore.eligibleContracts).to.equal(100);

            // Execute time-based automation
            console.log("Executing time-based automation...");
            const gasStart = Date.now();
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            const gasEnd = Date.now();
            
            console.log(`Time-based automation took ${gasEnd - gasStart}ms`);
            console.log(`Gas used: ${receipt.gasUsed}`);
            
            const totalTriggered = await dummyUpgrade.totalTriggeredContracts();
            console.log(`Contracts triggered: ${totalTriggered}`);
            
            // Should process contracts efficiently
            expect(totalTriggered).to.be.greaterThan(0);
            expect(totalTriggered).to.be.lessThanOrEqual(15); // Respects maxContractsPerCheck
            expect(Number(receipt.gasUsed)).to.be.lessThan(1500000); // Respects updated gas limit
            
            // Verify gas efficiency per contract
            const gasPerContract = Number(receipt.gasUsed) / Number(totalTriggered);
            console.log(`Gas per contract: ${Math.round(gasPerContract)}`);
            expect(gasPerContract).to.be.lessThan(100000); // Each contract should use less than 100K gas
        });

        it("Should handle multiple time-based automation cycles", async function () {
            this.timeout(120000);

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 7200; // 2 hours

            // Create 60 contracts
            for (let i = 0; i < 60; i++) {
                await dummyUpgrade.connect(accounts[i % 10]).createContract(
                    "AVAX", 18 * 10**8, startDate, endDate, "AVAX",
                    ethers.parseEther("0.001"), ethers.parseEther("0.0001"), true,
                    { value: ethers.parseEther("0.001") }
                );
            }

            await time.increase(11);

            // Purchase all
            for (let i = 0; i < 60; i++) {
                await dummyUpgrade.connect(accounts[(i + 5) % 10]).purchaseInsurance(i + 1, {
                    value: ethers.parseEther("0.0001")
                });
            }

            // Configure to process 20 contracts per cycle
            await dummyUpgrade.configureAutomation(true, 600000, 20, 3600);
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            let totalProcessed = 0;
            let cycle = 1;

            // Execute multiple cycles until all are processed
            while (totalProcessed < 60 && cycle <= 4) {
                console.log(`Executing automation cycle ${cycle}...`);
                
                const tx = await dummyUpgrade.performTimeBasedUpkeep();
                const receipt = await tx.wait();
                
                const newTotal = await dummyUpgrade.totalTriggeredContracts();
                const processedThisCycle = Number(newTotal) - totalProcessed;
                totalProcessed = Number(newTotal);
                
                console.log(`Cycle ${cycle}: Processed ${processedThisCycle} contracts (Total: ${totalProcessed})`);
                console.log(`Gas used: ${receipt.gasUsed}`);
                
                expect(processedThisCycle).to.be.lessThanOrEqual(20);
                
                cycle++;
                
                // Fast forward time for next cycle if needed
                if (totalProcessed < 60) {
                    await time.increase(3600); // 1 hour
                }
            }

            console.log(`Total automation cycles: ${cycle - 1}`);
            console.log(`Total contracts processed: ${totalProcessed}`);
            
            expect(totalProcessed).to.be.greaterThan(0);
        });
    });

    describe("Time-Based Status Monitoring", function () {
        it("Should provide accurate status information", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            // Initially no contracts
            let status = await dummyUpgrade.getTimeBasedStatus();
            expect(status.eligibleContracts).to.equal(0);
            expect(status.canExecute).to.be.false;

            // Create and purchase a contract
            await dummyUpgrade.connect(accounts[0]).createContract(
                "AVAX", 18 * 10**8, startDate, endDate, "AVAX",
                ethers.parseEther("0.01"), ethers.parseEther("0.001"), true,
                { value: ethers.parseEther("0.01") }
            );

            await time.increase(11);
            await dummyUpgrade.connect(accounts[1]).purchaseInsurance(1, {
                value: ethers.parseEther("0.001")
            });

            // Should show eligible contract
            status = await dummyUpgrade.getTimeBasedStatus();
            expect(status.eligibleContracts).to.equal(1);
            expect(status.canExecute).to.be.true;

            // Set trigger price and execute
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgrade.performTimeBasedUpkeep();

            // Should show no eligible contracts after trigger
            status = await dummyUpgrade.getTimeBasedStatus();
            expect(status.eligibleContracts).to.equal(0);
            expect(status.canExecute).to.be.false;
        });
    });
});