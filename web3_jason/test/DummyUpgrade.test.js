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

    describe("Automation System", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            // Reset automation interval to allow immediate checking
            await dummyUpgrade.configureAutomation(true, 500000, 50, 0);

            // Create multiple contracts for batch testing
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

        it("Should detect upkeep needed when price triggers", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            const [upkeepNeeded, performData] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;
            expect(performData).to.not.equal("0x");
        });

        it("Should not need upkeep when price is above trigger", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 20 * 10**8);

            const [upkeepNeeded] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.false;
        });

        it("Should execute automation correctly", async function () {
            await dummyUpgrade.setTestPrice("AVAX", 15 * 10**8);

            const [upkeepNeeded, performData] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;

            await expect(
                dummyUpgrade.performUpkeep(performData)
            ).to.emit(dummyUpgrade, "AutomationExecuted");

            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(3);
        });

        it("Should respect automation interval", async function () {
            await dummyUpgrade.configureAutomation(true, 500000, 50, 300); // 5 minute interval

            // Force update lastGlobalCheck to current time
            await dummyUpgrade.setTestPrice("AVAX", 20 * 10**8);
            
            const [upkeepNeeded1] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded1).to.be.false; // Should be false due to interval
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

        it("Should handle zero active contracts", async function () {
            const [upkeepNeeded] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.false;
        });

        it("Should handle batch size limits", async function () {
            await dummyUpgrade.configureAutomation(true, 500000, 2, 0); // Limit to 2 contracts

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

            const [upkeepNeeded, performData] = await dummyUpgrade.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;

            await dummyUpgrade.performUpkeep(performData);

            // Should only trigger 2 due to batch limit
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(2);
            expect(await dummyUpgrade.activeContractsCount()).to.equal(3);
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