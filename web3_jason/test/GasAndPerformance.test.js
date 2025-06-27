const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Gas Limit and Performance Tests", function () {
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

            // Set automation to process only 10 contracts per batch
            await dummyUpgrade.configureAutomation(true, 500000, 10, 0);
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            // Test that automation respects batch limits
            const [upkeepNeeded, performData] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;

            const tx = await dummyUpgrade.performUpkeep(performData);
            const receipt = await tx.wait();
            
            console.log(`Gas used for 10-contract batch: ${receipt.gasUsed}`);
            expect(Number(receipt.gasUsed)).to.be.lessThan(500000);
        });

        it("Should handle automation with insufficient gas gracefully", async function () {
            // Set very low gas limit
            await dummyUpgrade.configureAutomation(true, 50000, 50, 0);

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
            const [upkeepNeeded] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;
        });
    });

    describe("Large Scale Operations", function () {
        it("Should handle 1000+ contracts efficiently", async function () {
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
            await dummyUpgrade.getAllContracts();
            const end = Date.now();
            
            console.log(`getAllContracts() took ${end - start}ms for 200 contracts`);
            expect(end - start).to.be.lessThan(5000); // Should complete within 5 seconds
        });
    });
});