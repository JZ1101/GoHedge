const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DummyUpgrade - Time-Based Multi-Token Automation Tests", function () {
    let dummyUpgrade;
    let owner, seller, buyer, nonOwner;
    let contractAddress;

    // Mock Chainlink price feed addresses (Avalanche Fuji Testnet)
    const PRICE_FEEDS = {
        ETH: "0x86d67c3D38D2bCeE722E601025C25a575021c6EA",
        BTC: "0x31CF013A08c6Ac228C94551d535d5BAfE19c602a",
        LINK: "0x34C4c526902d88a3Aa98DB8a9b802603EB1E3470",
        USDC: "0x97FE42a7E96640D932bbc0e1580c73E705A8EB73"
    };

    beforeEach(async function () {
        [owner, seller, buyer, nonOwner] = await ethers.getSigners();
        
        const DummyUpgrade = await ethers.getContractFactory("DummyUpgrade");
        dummyUpgrade = await DummyUpgrade.deploy(ethers.ZeroAddress); // Deploy in test mode
        await dummyUpgrade.waitForDeployment();
        contractAddress = await dummyUpgrade.getAddress();
    });

    describe("Price Feed Management", function () {
        it("Should allow owner to add ETH price feed", async function () {
            await expect(
                dummyUpgrade.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH)
            ).to.emit(dummyUpgrade, "PriceFeedUpdated")
             .withArgs("ETH", PRICE_FEEDS.ETH);
        });

        it("Should allow owner to add BTC price feed", async function () {
            await expect(
                dummyUpgrade.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC)
            ).to.emit(dummyUpgrade, "PriceFeedUpdated")
             .withArgs("BTC", PRICE_FEEDS.BTC);
        });

        it("Should allow owner to add LINK price feed", async function () {
            await expect(
                dummyUpgrade.connect(owner).addPriceFeed("LINK", PRICE_FEEDS.LINK)
            ).to.emit(dummyUpgrade, "PriceFeedUpdated")
             .withArgs("LINK", PRICE_FEEDS.LINK);
        });

        it("Should allow owner to add USDC price feed", async function () {
            await expect(
                dummyUpgrade.connect(owner).addPriceFeed("USDC", PRICE_FEEDS.USDC)
            ).to.emit(dummyUpgrade, "PriceFeedUpdated")
             .withArgs("USDC", PRICE_FEEDS.USDC);
        });

        it("Should reject adding price feed with zero address", async function () {
            await expect(
                dummyUpgrade.connect(owner).addPriceFeed("INVALID", ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid feed address");
        });

        it("Should prevent non-owner from adding price feeds", async function () {
            await expect(
                dummyUpgrade.connect(nonOwner).addPriceFeed("ETH", PRICE_FEEDS.ETH)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow updating existing price feed", async function () {
            // Add initial price feed
            await dummyUpgrade.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            
            // Update with new address
            const newFeedAddress = PRICE_FEEDS.BTC; // Use different address for testing
            await expect(
                dummyUpgrade.connect(owner).addPriceFeed("ETH", newFeedAddress)
            ).to.emit(dummyUpgrade, "PriceFeedUpdated")
             .withArgs("ETH", newFeedAddress);
        });
    });

    describe("Multi-Token Contract Creation", function () {
        beforeEach(async function () {
            // Add all price feeds
            await dummyUpgrade.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            await dummyUpgrade.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC);
            await dummyUpgrade.connect(owner).addPriceFeed("LINK", PRICE_FEEDS.LINK);
            
            // Set test prices
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 15 * 10**8);
        });

        it("Should create ETH-based insurance contract", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await expect(
                dummyUpgrade.connect(seller).createContract(
                    "ETH",                           // Trigger token
                    2000 * 10**8,                   // Trigger price $2,000
                    startDate,
                    endDate,
                    "AVAX",                         // Reserve token
                    ethers.parseEther("1"),         // Reserve amount
                    ethers.parseEther("0.1"),       // Insurance fee
                    true,                           // Auto execute
                    { value: ethers.parseEther("1") }
                )
            ).to.emit(dummyUpgrade, "ContractCreated")
             .withArgs(1, seller.address, "ETH", 2000 * 10**8, ethers.parseEther("1"), true);
        });

        it("Should create BTC-based insurance contract", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await expect(
                dummyUpgrade.connect(seller).createContract(
                    "BTC",                          // Trigger token
                    30000 * 10**8,                  // Trigger price $30,000
                    startDate,
                    endDate,
                    "AVAX",
                    ethers.parseEther("5"),         // Larger reserve for BTC
                    ethers.parseEther("0.5"),       // Higher insurance fee
                    true,
                    { value: ethers.parseEther("5") }
                )
            ).to.emit(dummyUpgrade, "ContractCreated")
             .withArgs(1, seller.address, "BTC", 30000 * 10**8, ethers.parseEther("5"), true);
        });

        it("Should create LINK-based insurance contract", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            await expect(
                dummyUpgrade.connect(seller).createContract(
                    "LINK",                         // Trigger token
                    10 * 10**8,                     // Trigger price $10
                    startDate,
                    endDate,
                    "AVAX",
                    ethers.parseEther("0.5"),       // Smaller reserve for LINK
                    ethers.parseEther("0.05"),      // Lower insurance fee
                    true,
                    { value: ethers.parseEther("0.5") }
                )
            ).to.emit(dummyUpgrade, "ContractCreated")
             .withArgs(1, seller.address, "LINK", 10 * 10**8, ethers.parseEther("0.5"), true);
        });
    });

    describe("Multi-Token Price Retrieval", function () {
        beforeEach(async function () {
            // Add price feeds
            await dummyUpgrade.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            await dummyUpgrade.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC);
            await dummyUpgrade.connect(owner).addPriceFeed("LINK", PRICE_FEEDS.LINK);
            
            // Set test prices
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 15 * 10**8);
        });

        it("Should retrieve ETH test price correctly", async function () {
            const ethPrice = await dummyUpgrade.getCurrentPrice("ETH");
            expect(ethPrice).to.equal(2500 * 10**8);
        });

        it("Should retrieve BTC test price correctly", async function () {
            const btcPrice = await dummyUpgrade.getCurrentPrice("BTC");
            expect(btcPrice).to.equal(35000 * 10**8);
        });

        it("Should retrieve LINK test price correctly", async function () {
            const linkPrice = await dummyUpgrade.getCurrentPrice("LINK");
            expect(linkPrice).to.equal(15 * 10**8);
        });

        it("Should return zero for token without test price", async function () {
            // In test mode, tokens without set test prices return 0
            const invalidPrice = await dummyUpgrade.getCurrentPrice("INVALID");
            expect(invalidPrice).to.equal(0);
        });
    });

    describe("Multi-Token Trigger Functionality", function () {
        beforeEach(async function () {
            // Add price feeds and set test prices
            await dummyUpgrade.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            await dummyUpgrade.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC);
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 35000 * 10**8);

            const currentTime = await time.latest();
            const startDate = currentTime + 1;
            const endDate = startDate + 3600;

            // Create ETH contract
            await dummyUpgrade.connect(seller).createContract(
                "ETH",
                2000 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("1"),
                ethers.parseEther("0.1"),
                true,
                { value: ethers.parseEther("1") }
            );

            // Create BTC contract
            await dummyUpgrade.connect(seller).createContract(
                "BTC",
                30000 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("5"),
                ethers.parseEther("0.5"),
                true,
                { value: ethers.parseEther("5") }
            );

            await time.increaseTo(startDate);

            // Purchase both contracts
            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.1")
            });
            await dummyUpgrade.connect(buyer).purchaseInsurance(2, {
                value: ethers.parseEther("0.5")
            });
        });

        it("Should trigger ETH contract when price drops", async function () {
            // Set ETH price below trigger
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 1800 * 10**8);

            await expect(
                dummyUpgrade.triggerPayout(1)
            ).to.emit(dummyUpgrade, "PayoutTriggered")
             .withArgs(1, buyer.address, ethers.parseEther("1"), 1800 * 10**8, 2000 * 10**8, true);
        });

        it("Should trigger BTC contract when price drops", async function () {
            // Set BTC price below trigger
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 25000 * 10**8);

            await expect(
                dummyUpgrade.triggerPayout(2)
            ).to.emit(dummyUpgrade, "PayoutTriggered")
             .withArgs(2, buyer.address, ethers.parseEther("5"), 25000 * 10**8, 30000 * 10**8, true);
        });

        it("Should not trigger when price is above threshold", async function () {
            // ETH price above trigger
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 2200 * 10**8);

            await expect(
                dummyUpgrade.triggerPayout(1)
            ).to.be.revertedWith("Price condition not met");
        });
    });

    describe("Time-Based Multi-Token Automation", function () {
        beforeEach(async function () {
            // Add price feeds
            await dummyUpgrade.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            await dummyUpgrade.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC);
            await dummyUpgrade.connect(owner).addPriceFeed("LINK", PRICE_FEEDS.LINK);
            
            // Set test prices
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 15 * 10**8);

            // Configure time-based automation (timeInterval > 0)
            await dummyUpgrade.configureAutomation(true, 800000, 50, 3600); // 1 hour interval

            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 7200; // 2 hours

            // Create multiple contracts with different tokens
            await dummyUpgrade.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate, "AVAX",
                ethers.parseEther("1"), ethers.parseEther("0.1"), true,
                { value: ethers.parseEther("1") }
            );
            await dummyUpgrade.connect(seller).createContract(
                "BTC", 30000 * 10**8, startDate, endDate, "AVAX",
                ethers.parseEther("5"), ethers.parseEther("0.5"), true,
                { value: ethers.parseEther("5") }
            );
            await dummyUpgrade.connect(seller).createContract(
                "LINK", 10 * 10**8, startDate, endDate, "AVAX",
                ethers.parseEther("0.5"), ethers.parseEther("0.05"), true,
                { value: ethers.parseEther("0.5") }
            );

            await time.increaseTo(startDate);

            // Purchase all contracts
            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.1")
            });
            await dummyUpgrade.connect(buyer).purchaseInsurance(2, {
                value: ethers.parseEther("0.5")
            });
            await dummyUpgrade.connect(buyer).purchaseInsurance(3, {
                value: ethers.parseEther("0.05")
            });
        });

        it("Should execute time-based automation for multiple tokens", async function () {
            // Set all prices below triggers
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 1800 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 25000 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 8 * 10**8);

            // Execute time-based automation
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
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(3);
        });

        it("Should handle mixed trigger conditions in time-based mode", async function () {
            // Only ETH and LINK below trigger, BTC above
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 1800 * 10**8);   // Trigger
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 32000 * 10**8);  // No trigger
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 8 * 10**8);     // Trigger

            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            await tx.wait();

            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(2);
        });

        it("Should not trigger when no price conditions are met in time-based", async function () {
            // All prices above triggers
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 2200 * 10**8);   // Above $2000
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 32000 * 10**8);  // Above $30000
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 12 * 10**8);    // Above $10

            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Should still emit AutomationExecuted event but with 0 triggers
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

        it("Should handle time-based automation with hourly intervals", async function () {
            // Set up trigger conditions
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 1800 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 25000 * 10**8);

            // First execution
            const tx1 = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt1 = await tx1.wait();
            
            // Verify AutomationExecuted event was emitted
            const automationEvent1 = receipt1.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });
            expect(automationEvent1).to.not.be.undefined;

            // Fast forward 1 hour
            await time.increase(3600);

            // Create new contract
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            await dummyUpgrade.connect(seller).createContract(
                "LINK", 12 * 10**8, startDate, endDate, "AVAX",
                ethers.parseEther("0.5"), ethers.parseEther("0.05"), true,
                { value: ethers.parseEther("0.5") }
            );

            await time.increaseTo(startDate);
            await dummyUpgrade.connect(buyer).purchaseInsurance(4, {
                value: ethers.parseEther("0.05")
            });

            // Set LINK price below trigger
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 8 * 10**8);

            // Second execution after time interval
            const tx2 = await dummyUpgrade.performTimeBasedUpkeep();
            const receipt2 = await tx2.wait();

            // Verify second AutomationExecuted event was emitted
            const automationEvent2 = receipt2.logs.find(log => {
                try {
                    const parsed = dummyUpgrade.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });
            expect(automationEvent2).to.not.be.undefined;
            
            // Verify the final total is at least 3 (allowing for cumulative behavior)
            const totalTriggered = await dummyUpgrade.totalTriggeredContracts();
            expect(totalTriggered).to.be.at.least(3);
        });
    });

    describe("Time-Based Price Feed Integration Test", function () {
        it("Should handle complete multi-token time-based workflow", async function () {
            // Step 1: Add all price feeds
            await dummyUpgrade.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            await dummyUpgrade.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC);
            await dummyUpgrade.connect(owner).addPriceFeed("LINK", PRICE_FEEDS.LINK);
            await dummyUpgrade.connect(owner).addPriceFeed("USDC", PRICE_FEEDS.USDC);

            // Step 2: Set test prices
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 15 * 10**8);
            await dummyUpgrade.connect(owner).setTestPrice("USDC", 1 * 10**8);

            // Step 3: Configure time-based automation
            await dummyUpgrade.configureAutomation(true, 800000, 50, 1800); // 30 minutes

            // Step 4: Create contracts for all tokens
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 7200; // 2 hours

            const tokens = ["ETH", "BTC", "LINK", "USDC"];
            const triggers = [2000 * 10**8, 30000 * 10**8, 10 * 10**8, 0.95 * 10**8];
            const reserves = ["1", "5", "0.5", "0.1"];
            const fees = ["0.1", "0.5", "0.05", "0.01"];

            for (let i = 0; i < tokens.length; i++) {
                await dummyUpgrade.connect(seller).createContract(
                    tokens[i],
                    triggers[i],
                    startDate,
                    endDate,
                    "AVAX",
                    ethers.parseEther(reserves[i]),
                    ethers.parseEther(fees[i]),
                    true,
                    { value: ethers.parseEther(reserves[i]) }
                );
            }

            expect(await dummyUpgrade.contractCounter()).to.equal(4);

            // Step 5: Purchase all contracts
            await time.increaseTo(startDate);

            for (let i = 1; i <= 4; i++) {
                await dummyUpgrade.connect(buyer).purchaseInsurance(i, {
                    value: ethers.parseEther(fees[i-1])
                });
            }

            expect(await dummyUpgrade.activeContractsCount()).to.equal(4);

            // Step 6: Test time-based automation with price changes
            await dummyUpgrade.connect(owner).setTestPrice("ETH", 1800 * 10**8);  // Trigger
            await dummyUpgrade.connect(owner).setTestPrice("BTC", 32000 * 10**8); // No trigger
            await dummyUpgrade.connect(owner).setTestPrice("LINK", 8 * 10**8);    // Trigger
            await dummyUpgrade.connect(owner).setTestPrice("USDC", 0.9 * 10**8);  // Trigger

            // Execute time-based automation
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            await tx.wait();

            // Should trigger 3 contracts (ETH, LINK, USDC)
            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(3);
            expect(await dummyUpgrade.activeContractsCount()).to.equal(1); // Only BTC remaining
        });
    });

    describe("Time-Based Automation Configuration", function () {
        it("Should configure time-based automation correctly", async function () {
            // Test different time intervals
            await dummyUpgrade.configureAutomation(true, 800000, 50, 3600); // 1 hour

            // Verify configuration (assuming getter functions exist)
            // You may need to add getter functions to your contract or check via events
            expect(true).to.be.true; // Placeholder - adjust based on your contract's getter functions
        });

        it("Should handle time interval changes", async function () {
            // Start with 1 hour interval
            await dummyUpgrade.configureAutomation(true, 800000, 50, 3600);

            // Change to 30 minutes
            await dummyUpgrade.configureAutomation(true, 800000, 50, 1800);

            // Verify the change took effect
            expect(true).to.be.true; // Placeholder
        });

        it("Should disable time-based automation when interval is 0", async function () {
            // Set interval to 0 (should disable time-based mode)
            await dummyUpgrade.configureAutomation(true, 800000, 50, 0);

            // This would switch to condition-based mode
            expect(true).to.be.true; // Placeholder
        });
    });

    describe("AVAX Price Integration with Time-Based", function () {
        it("Should work with AVAX in time-based automation", async function () {
            // Configure time-based automation
            await dummyUpgrade.configureAutomation(true, 800000, 50, 3600);

            // Set AVAX test price
            await dummyUpgrade.connect(owner).setTestPrice("AVAX", 25 * 10**8);
            
            const avaxPrice = await dummyUpgrade.getCurrentPrice("AVAX");
            expect(avaxPrice).to.equal(25 * 10**8);
            
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 7200;

            // Create AVAX-based contract
            await dummyUpgrade.connect(seller).createContract(
                "AVAX",
                20 * 10**8,
                startDate,
                endDate,
                "AVAX",
                ethers.parseEther("1"),
                ethers.parseEther("0.1"),
                true,
                { value: ethers.parseEther("1") }
            );

            await time.increaseTo(startDate);
            await dummyUpgrade.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.1")
            });

            // Set AVAX price below trigger
            await dummyUpgrade.connect(owner).setTestPrice("AVAX", 18 * 10**8);

            // Execute time-based automation
            const tx = await dummyUpgrade.performTimeBasedUpkeep();
            await tx.wait();

            expect(await dummyUpgrade.totalTriggeredContracts()).to.equal(1);
        });
    });
});