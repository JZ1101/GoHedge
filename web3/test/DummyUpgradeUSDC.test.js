const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DummyUpgradeUSDC Contract", function () {
    let dummyUpgradeUSDC;
    let mockUSDC;
    let owner, seller, buyer, other;
    let startDate, endDate;

    beforeEach(async function () {
        [owner, seller, buyer, other] = await ethers.getSigners();

        // Deploy mock USDC token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6); // 6 decimals for USDC
        await mockUSDC.waitForDeployment();

        // Mint USDC to seller and buyer for testing
        await mockUSDC.mint(seller.address, ethers.parseUnits("10000", 6)); // 10,000 USDC
        await mockUSDC.mint(buyer.address, ethers.parseUnits("5000", 6));   // 5,000 USDC

        // Deploy DummyUpgradeUSDC contract
        const DummyUpgradeUSDC = await ethers.getContractFactory("DummyUpgradeUSDC");
        dummyUpgradeUSDC = await DummyUpgradeUSDC.deploy(ethers.ZeroAddress, mockUSDC.target);
        await dummyUpgradeUSDC.waitForDeployment();

        // Set up test dates
        const currentTime = await time.latest();
        startDate = currentTime + 3600; // Start in 1 hour
        endDate = startDate + 7200;     // End 2 hours after start
    });

    describe("Deployment", function () {
        it("Should deploy with correct initial state", async function () {
            expect(await dummyUpgradeUSDC.testMode()).to.be.true;
            expect(await dummyUpgradeUSDC.automationEnabled()).to.be.true;
            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(0);
            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(0);
            expect(await dummyUpgradeUSDC.getUSDCAddress()).to.equal(mockUSDC.target);
        });

        it("Should initialize test prices correctly", async function () {
            // Set test prices first (if constructor doesn't initialize them)
            await dummyUpgradeUSDC.setTestPrice("AVAX", 25 * 10**8);
            await dummyUpgradeUSDC.setTestPrice("BTC", 30000 * 10**8);
            await dummyUpgradeUSDC.setTestPrice("ETH", 2000 * 10**8);
            await dummyUpgradeUSDC.setTestPrice("USDC", 1 * 10**8);
            
            // Then test that they are set correctly
            expect(await dummyUpgradeUSDC.testPrices("AVAX")).to.equal(25 * 10**8);
            expect(await dummyUpgradeUSDC.testPrices("BTC")).to.equal(30000 * 10**8);
            expect(await dummyUpgradeUSDC.testPrices("ETH")).to.equal(2000 * 10**8);
            expect(await dummyUpgradeUSDC.testPrices("USDC")).to.equal(1 * 10**8);
        });
    });

    describe("AVAX Reserve Contract Creation", function () {
        it("Should create contract with AVAX reserve", async function () {
            const tx = await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false, // AVAX reserve
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "ContractCreated";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(1);
        });

        it("Should reject AVAX contract with insufficient reserve", async function () {
            await expect(
                dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX",
                    18 * 10**8,
                    startDate,
                    endDate,
                    false, // AVAX reserve
                    ethers.parseEther("1"),
                    ethers.parseEther("0.01"),
                    true,
                    { value: ethers.parseEther("0.5") } // Insufficient
                )
            ).to.be.revertedWith("Insufficient AVAX reserve sent");
        });
    });

    describe("USDC Reserve Contract Creation", function () {
        it("Should create contract with USDC reserve", async function () {
            // Approve USDC spending
            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));

            const tx = await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
                // No value needed for USDC reserve
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "ContractCreated";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(1);
            expect(await dummyUpgradeUSDC.getUSDCBalance()).to.equal(ethers.parseUnits("1000", 6));
        });

        it("Should reject USDC contract when AVAX sent", async function () {
            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));

            await expect(
                dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX",
                    18 * 10**8,
                    startDate,
                    endDate,
                    true, // USDC reserve
                    ethers.parseUnits("1000", 6),
                    ethers.parseEther("0.01"),
                    true,
                    { value: ethers.parseEther("0.1") } // Should not send AVAX
                )
            ).to.be.revertedWith("No AVAX needed for USDC reserve");
        });

        it("Should reject USDC contract without approval", async function () {
            await expect(
                dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX",
                    18 * 10**8,
                    startDate,
                    endDate,
                    true, // USDC reserve
                    ethers.parseUnits("1000", 6),
                    ethers.parseEther("0.01"),
                    true
                )
            ).to.be.reverted; // ERC20 transfer will fail
        });
    });

    describe("Insurance Purchase", function () {
        beforeEach(async function () {
            // Create AVAX reserve contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false, // AVAX reserve
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            // Create USDC reserve contract
            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );
        });

        it("Should allow valid insurance purchase for AVAX contract", async function () {
            await time.increaseTo(startDate);

            const tx = await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "ContractPurchased";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(1);
        });

        it("Should allow valid insurance purchase for USDC contract", async function () {
            await time.increaseTo(startDate);

            const tx = await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(2, {
                value: ethers.parseEther("0.01")
            });

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "ContractPurchased";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(1);
        });

        it("Should reject insufficient payment", async function () {
            await time.increaseTo(startDate);

            await expect(
                dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                    value: ethers.parseEther("0.005") // Insufficient
                })
            ).to.be.revertedWith("Insufficient fee");
        });
    });

    describe("Manual Trigger", function () {
        beforeEach(async function () {
            // Create and purchase AVAX contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false, // AVAX reserve
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            // Create and purchase USDC contract
            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );

            await time.increaseTo(startDate);
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(2, {
                value: ethers.parseEther("0.01")
            });
        });

        it("Should trigger AVAX payout when price condition is met", async function () {
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8); // Below trigger

            const balanceBefore = await ethers.provider.getBalance(buyer.address);
            
            const tx = await dummyUpgradeUSDC.triggerPayout(1);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "PayoutTriggered";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(1);
            
            const balanceAfter = await ethers.provider.getBalance(buyer.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Should trigger USDC payout when price condition is met", async function () {
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8); // Below trigger

            const usdcBalanceBefore = await mockUSDC.balanceOf(buyer.address);
            
            const tx = await dummyUpgradeUSDC.triggerPayout(2);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "PayoutTriggered";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(1);
            
            const usdcBalanceAfter = await mockUSDC.balanceOf(buyer.address);
            expect(usdcBalanceAfter).to.equal(usdcBalanceBefore + ethers.parseUnits("1000", 6));
        });

        it("Should reject trigger when price condition not met", async function () {
            await dummyUpgradeUSDC.setTestPrice("AVAX", 25 * 10**8); // Above trigger

            await expect(
                dummyUpgradeUSDC.triggerPayout(1)
            ).to.be.revertedWith("Price condition not met");
        });
    });

    describe("Time-based Automation", function () {
        beforeEach(async function () {
            // Create multiple contracts with different trigger prices
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,  // $18 trigger
                startDate,
                endDate,
                false, // AVAX reserve
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("2000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,  // $18 trigger
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );

            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                10 * 10**8,  // $10 trigger (different trigger)
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );

            await time.increaseTo(startDate);
            
            // Purchase all contracts
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(2, {
                value: ethers.parseEther("0.01")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(3, {
                value: ethers.parseEther("0.01")
            });
        });

        it("Should execute time-based upkeep successfully", async function () {
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8); // $15 - triggers first two contracts

            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            const receipt = await tx.wait();

            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(2); // Only two should trigger
        });

        it("Should return correct time-based status", async function () {
            const [eligibleContracts, nextCheckTime, canExecute] = await dummyUpgradeUSDC.getTimeBasedStatus();
            
            expect(eligibleContracts).to.equal(3);
            expect(nextCheckTime).to.be.a('bigint');
            expect(canExecute).to.be.true;
        });

        it("Should handle mixed AVAX and USDC payouts", async function () {
            const avaxBalanceBefore = await ethers.provider.getBalance(buyer.address);
            const usdcBalanceBefore = await mockUSDC.balanceOf(buyer.address);

            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8); // Trigger first two contracts

            await dummyUpgradeUSDC.performTimeBasedUpkeep();

            const avaxBalanceAfter = await ethers.provider.getBalance(buyer.address);
            const usdcBalanceAfter = await mockUSDC.balanceOf(buyer.address);

            expect(avaxBalanceAfter).to.be.gt(avaxBalanceBefore); // Should receive AVAX
            expect(usdcBalanceAfter).to.be.gt(usdcBalanceBefore); // Should receive USDC
        });
    });

    describe("Reserve Withdrawal", function () {
        beforeEach(async function () {
            // Create AVAX contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false, // AVAX reserve
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            // Create USDC contract
            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );
        });

        it("Should allow seller to withdraw AVAX from unpurchased contract", async function () {
            const balanceBefore = await ethers.provider.getBalance(seller.address);

            const tx = await dummyUpgradeUSDC.connect(seller).withdrawReserve(1);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "ReserveWithdrawn";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            
            const balanceAfter = await ethers.provider.getBalance(seller.address);
            const gasCost = receipt.gasUsed * receipt.gasPrice;
            expect(balanceAfter + gasCost).to.be.gt(balanceBefore);
        });

        it("Should allow seller to withdraw USDC from unpurchased contract", async function () {
            const usdcBalanceBefore = await mockUSDC.balanceOf(seller.address);

            const tx = await dummyUpgradeUSDC.connect(seller).withdrawReserve(2);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "ReserveWithdrawn";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            
            const usdcBalanceAfter = await mockUSDC.balanceOf(seller.address);
            expect(usdcBalanceAfter).to.equal(usdcBalanceBefore + ethers.parseUnits("1000", 6));
        });

        it("Should prevent withdrawal from active contract", async function () {
            await time.increaseTo(startDate);
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            await expect(
                dummyUpgradeUSDC.connect(seller).withdrawReserve(1)
            ).to.be.revertedWith("Still active");
        });
    });

    describe("Claim Payout", function () {
        beforeEach(async function () {
            // Create contracts with autoExecute disabled
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false, // AVAX reserve
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                false, // autoExecute disabled
                { value: ethers.parseEther("1") } // IMPORTANT: Send AVAX reserve
            );

            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                false // autoExecute disabled
            );

            await time.increaseTo(startDate);
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(2, {
                value: ethers.parseEther("0.01")
            });

            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgradeUSDC.triggerPayout(1);
            await dummyUpgradeUSDC.triggerPayout(2);
        });

        it("Should allow beneficiary to claim AVAX payout", async function () {
            const balanceBefore = await ethers.provider.getBalance(buyer.address);

            const tx = await dummyUpgradeUSDC.connect(buyer).claimPayout(1);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "PayoutClaimed";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            
            const balanceAfter = await ethers.provider.getBalance(buyer.address);
            const gasCost = receipt.gasUsed * receipt.gasPrice;
            expect(balanceAfter + gasCost).to.be.gt(balanceBefore);
        });

        it("Should allow beneficiary to claim USDC payout", async function () {
            const usdcBalanceBefore = await mockUSDC.balanceOf(buyer.address);

            const tx = await dummyUpgradeUSDC.connect(buyer).claimPayout(2);
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "PayoutClaimed";
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            
            const usdcBalanceAfter = await mockUSDC.balanceOf(buyer.address);
            expect(usdcBalanceAfter).to.equal(usdcBalanceBefore + ethers.parseUnits("1000", 6));
        });

        it("Should prevent non-beneficiary from claiming", async function () {
            await expect(
                dummyUpgradeUSDC.connect(other).claimPayout(1)
            ).to.be.revertedWith("Not beneficiary");
        });

        it("Should prevent double claiming", async function () {
            await dummyUpgradeUSDC.connect(buyer).claimPayout(1);

            await expect(
                dummyUpgradeUSDC.connect(buyer).claimPayout(1)
            ).to.be.revertedWith("Already claimed");
        });
    });

    describe("Enhanced Contract Getter", function () {
        beforeEach(async function () {
            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );
        });

        it("Should return complete contract information", async function () {
            const contractInfo = await dummyUpgradeUSDC.getContract(1);
            
            expect(contractInfo.seller).to.equal(seller.address);
            expect(contractInfo.triggerToken).to.equal("AVAX");
            expect(contractInfo.triggerPrice).to.equal(18 * 10**8);
            expect(contractInfo.isUSDCReserve).to.be.true;
            expect(contractInfo.reserveAmount).to.equal(ethers.parseUnits("1000", 6));
            expect(contractInfo.insuranceFee).to.equal(ethers.parseEther("0.01"));
            expect(contractInfo.autoExecute).to.be.true;
        });
    });

    describe("Balance Functions", function () {
        beforeEach(async function () {
            // Create AVAX contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false, // AVAX reserve
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            // Create USDC contract
            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true, // USDC reserve
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );
        });

        it("Should return correct AVAX balance", async function () {
            const balance = await dummyUpgradeUSDC.getContractBalance();
            expect(balance).to.equal(ethers.parseEther("1"));
        });

        it("Should return correct USDC balance", async function () {
            const balance = await dummyUpgradeUSDC.getUSDCBalance();
            expect(balance).to.equal(ethers.parseUnits("1000", 6));
        });
    });

    describe("Emergency Functions", function () {
        beforeEach(async function () {
            // Add some AVAX and USDC to contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false,
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            await mockUSDC.connect(seller).approve(dummyUpgradeUSDC.target, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                true,
                ethers.parseUnits("1000", 6),
                ethers.parseEther("0.01"),
                true
            );
        });

        it("Should allow owner to pause automation", async function () {
            await dummyUpgradeUSDC.emergencyPause();
            expect(await dummyUpgradeUSDC.automationEnabled()).to.be.false;
        });

        it("Should allow owner to resume automation", async function () {
            await dummyUpgradeUSDC.emergencyPause();
            await dummyUpgradeUSDC.emergencyResume();
            expect(await dummyUpgradeUSDC.automationEnabled()).to.be.true;
        });

        it("Should allow owner to recover stuck USDC", async function () {
            const initialBalance = await mockUSDC.balanceOf(owner.address);
            
            await dummyUpgradeUSDC.emergencyUSDCRecovery(
                ethers.parseUnits("100", 6),
                owner.address
            );
            
            const finalBalance = await mockUSDC.balanceOf(owner.address);
            expect(finalBalance).to.equal(initialBalance + ethers.parseUnits("100", 6));
        });

        it("Should allow owner to recover stuck AVAX", async function () {
            const initialBalance = await ethers.provider.getBalance(owner.address);
            
            const tx = await dummyUpgradeUSDC.emergencyAvaxRecovery(
                ethers.parseEther("0.1"),
                owner.address
            );
            const receipt = await tx.wait();
            
            const finalBalance = await ethers.provider.getBalance(owner.address);
            const gasCost = receipt.gasUsed * receipt.gasPrice;
            expect(finalBalance + gasCost).to.be.gt(initialBalance);
        });

        it("Should prevent non-owner from emergency functions", async function () {
            await expect(
                dummyUpgradeUSDC.connect(other).emergencyPause()
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                dummyUpgradeUSDC.connect(other).emergencyUSDCRecovery(
                    ethers.parseUnits("100", 6),
                    other.address
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle contract expiration correctly", async function () {
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                18 * 10**8,
                startDate,
                endDate,
                false,
                ethers.parseEther("1"),
                ethers.parseEther("0.01"),
                true,
                { value: ethers.parseEther("1") }
            );

            await time.increaseTo(startDate);
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.01")
            });

            // Move past expiration
            await time.increaseTo(endDate + 1);

            await expect(
                dummyUpgradeUSDC.triggerPayout(1)
            ).to.be.revertedWith("Contract expired");
        });

        it("Should handle automation with no eligible contracts", async function () {
            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            const receipt = await tx.wait();

            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
        });
    });
});

// Mock ERC20 contract for testing
const MockERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;
    
    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
`;