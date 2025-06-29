const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DummyUpgradeUSDC_Whitelist - Time-Based Multi-Token Automation Tests", function () {
    let dummyUpgradeUSDC, mockUSDC;
    let owner, seller, buyer, nonOwner, whitelistedUser, nonWhitelistedUser;
    let contractAddress;

    // Mock Chainlink price feed addresses (Avalanche Fuji Testnet)
    const PRICE_FEEDS = {
        ETH: "0x86d67c3D38D2bCeE722E601025C25a575021c6EA",
        BTC: "0x31CF013A08c6Ac228C94551d535d5BAfE19c602a",
        LINK: "0x34C4c526902d88a3Aa98DB8a9b802603EB1E3470",
        USDC: "0x97FE42a7E96640D932bbc0e1580c73E705A8EB73"
    };

    beforeEach(async function () {
        [owner, seller, buyer, nonOwner, whitelistedUser, nonWhitelistedUser] = await ethers.getSigners();
        
        // Deploy MockERC20 (USDC) token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
        await mockUSDC.waitForDeployment();

        // Deploy main contract
        const DummyUpgradeUSDC = await ethers.getContractFactory("DummyUpgradeUSDC_Whitelist");
        dummyUpgradeUSDC = await DummyUpgradeUSDC.deploy(
            ethers.ZeroAddress, // No price feed for test mode
            await mockUSDC.getAddress()
        );
        await dummyUpgradeUSDC.waitForDeployment();
        contractAddress = await dummyUpgradeUSDC.getAddress();

        // Setup initial USDC balances
        await mockUSDC.mint(seller.address, ethers.parseUnits("100000", 6));
        await mockUSDC.mint(buyer.address, ethers.parseUnits("100000", 6));
        await mockUSDC.mint(whitelistedUser.address, ethers.parseUnits("100000", 6));
    });

    describe("Price Feed Management with USDC Support", function () {
        it("Should allow owner to add ETH price feed", async function () {
            await expect(
                dummyUpgradeUSDC.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH)
            ).to.emit(dummyUpgradeUSDC, "PriceFeedUpdated")
             .withArgs("ETH", PRICE_FEEDS.ETH);
        });

        it("Should allow owner to add BTC price feed", async function () {
            await expect(
                dummyUpgradeUSDC.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC)
            ).to.emit(dummyUpgradeUSDC, "PriceFeedUpdated")
             .withArgs("BTC", PRICE_FEEDS.BTC);
        });

        it("Should allow owner to add USDC price feed", async function () {
            await expect(
                dummyUpgradeUSDC.connect(owner).addPriceFeed("USDC", PRICE_FEEDS.USDC)
            ).to.emit(dummyUpgradeUSDC, "PriceFeedUpdated")
             .withArgs("USDC", PRICE_FEEDS.USDC);
        });

        it("Should prevent non-owner from adding price feeds", async function () {
            await expect(
                dummyUpgradeUSDC.connect(nonOwner).addPriceFeed("ETH", PRICE_FEEDS.ETH)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Multi-Token Contract Creation with USDC and Whitelist", function () {
        beforeEach(async function () {
            // Add all price feeds
            await dummyUpgradeUSDC.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            await dummyUpgradeUSDC.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC);
            await dummyUpgradeUSDC.connect(owner).addPriceFeed("LINK", PRICE_FEEDS.LINK);
            
            // Set test prices
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 15 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 25 * 10**8);
        });

        it("Should create ETH-based insurance contract with AVAX reserve", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            await expect(
                dummyUpgradeUSDC.connect(seller).createContract(
                    "ETH",                           // Trigger token
                    2000 * 10**8,                   // Trigger price $2,000
                    startDate,
                    endDate,
                    false,                          // AVAX reserve
                    ethers.parseEther("1"),         // Reserve amount
                    ethers.parseEther("0.1"),       // Insurance fee
                    true,                           // Auto execute
                    false,                          // No whitelist
                    { value: ethers.parseEther("1") }
                )
            ).to.emit(dummyUpgradeUSDC, "ContractCreated")
             .withArgs(1, seller.address, "ETH", 2000 * 10**8, ethers.parseEther("1"), false, true, false);
        });

        it("Should create BTC-based insurance contract with USDC reserve", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            // Approve USDC for contract creation
            await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits("5000", 6));

            await expect(
                dummyUpgradeUSDC.connect(seller).createContract(
                    "BTC",                          // Trigger token
                    30000 * 10**8,                  // Trigger price $30,000
                    startDate,
                    endDate,
                    true,                           // USDC reserve
                    ethers.parseUnits("5000", 6),   // Reserve amount (5000 USDC)
                    ethers.parseEther("0.5"),       // Insurance fee (AVAX)
                    true,                           // Auto execute
                    true                            // Enable whitelist
                )
            ).to.emit(dummyUpgradeUSDC, "ContractCreated")
             .withArgs(1, seller.address, "BTC", 30000 * 10**8, ethers.parseUnits("5000", 6), true, true, true);
        });

        it("Should create whitelisted contract and manage whitelist", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            // Create contract with whitelist enabled
            await dummyUpgradeUSDC.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate,
                false, ethers.parseEther("1"), ethers.parseEther("0.1"), 
                true, true, // Auto execute + whitelist enabled
                { value: ethers.parseEther("1") }
            );

            // Add user to whitelist
            await expect(
                dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(1, whitelistedUser.address)
            ).to.emit(dummyUpgradeUSDC, "BuyerAddedToWhitelist")
             .withArgs(1, whitelistedUser.address, seller.address);

            // Verify whitelist status
            expect(await dummyUpgradeUSDC.isBuyerWhitelisted(1, whitelistedUser.address)).to.be.true;
            expect(await dummyUpgradeUSDC.isBuyerWhitelisted(1, nonWhitelistedUser.address)).to.be.false;
        });

        it("Should handle batch whitelist operations", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            // Create whitelisted contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate,
                false, ethers.parseEther("1"), ethers.parseEther("0.1"), 
                true, true,
                { value: ethers.parseEther("1") }
            );

            // Batch add multiple users
            const usersToAdd = [whitelistedUser.address, buyer.address, nonOwner.address];
            await expect(
                dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(1, usersToAdd)
            ).to.emit(dummyUpgradeUSDC, "BatchWhitelistUpdate")
             .withArgs(1, 3, 0, seller.address);

            // Verify all users are whitelisted
            for (const user of usersToAdd) {
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(1, user)).to.be.true;
            }

            // Batch remove some users
            const usersToRemove = [buyer.address, nonOwner.address];
            await expect(
                dummyUpgradeUSDC.connect(seller).batchRemoveBuyersFromWhitelist(1, usersToRemove)
            ).to.emit(dummyUpgradeUSDC, "BatchWhitelistUpdate")
             .withArgs(1, 0, 2, seller.address);

            // Verify removal
            expect(await dummyUpgradeUSDC.isBuyerWhitelisted(1, whitelistedUser.address)).to.be.true;
            expect(await dummyUpgradeUSDC.isBuyerWhitelisted(1, buyer.address)).to.be.false;
        });
    });

    describe("Multi-Token Price Retrieval with USDC", function () {
        beforeEach(async function () {
            // Set test prices for all tokens including USDC
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 15 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 25 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("USDC", 1 * 10**8);
        });

        it("Should retrieve all token prices correctly", async function () {
            expect(await dummyUpgradeUSDC.getCurrentPrice("ETH")).to.equal(2500 * 10**8);
            expect(await dummyUpgradeUSDC.getCurrentPrice("BTC")).to.equal(35000 * 10**8);
            expect(await dummyUpgradeUSDC.getCurrentPrice("LINK")).to.equal(15 * 10**8);
            expect(await dummyUpgradeUSDC.getCurrentPrice("AVAX")).to.equal(25 * 10**8);
            expect(await dummyUpgradeUSDC.getCurrentPrice("USDC")).to.equal(1 * 10**8);
        });
    });

    describe("Whitelist Access Control in Purchases", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            // Create whitelisted contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate,
                false, ethers.parseEther("1"), ethers.parseEther("0.1"), 
                true, true, // Auto execute + whitelist
                { value: ethers.parseEther("1") }
            );

            // Create non-whitelisted contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "BTC", 30000 * 10**8, startDate, endDate,
                false, ethers.parseEther("2"), ethers.parseEther("0.2"), 
                true, false, // Auto execute + no whitelist
                { value: ethers.parseEther("2") }
            );

            await time.increaseTo(startDate);
        });

        it("Should allow whitelisted user to purchase", async function () {
            // Add user to whitelist
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(1, whitelistedUser.address);

            // Whitelisted user should be able to purchase
            await expect(
                dummyUpgradeUSDC.connect(whitelistedUser).purchaseInsurance(1, {
                    value: ethers.parseEther("0.1")
                })
            ).to.emit(dummyUpgradeUSDC, "ContractPurchased")
             .withArgs(1, whitelistedUser.address, await time.latest());
        });

        it("Should reject non-whitelisted user from whitelisted contract", async function () {
            await expect(
                dummyUpgradeUSDC.connect(nonWhitelistedUser).purchaseInsurance(1, {
                    value: ethers.parseEther("0.1")
                })
            ).to.be.revertedWith("Not whitelisted for this contract");
        });

        it("Should allow anyone to purchase non-whitelisted contract", async function () {
            await expect(
                dummyUpgradeUSDC.connect(nonWhitelistedUser).purchaseInsurance(2, {
                    value: ethers.parseEther("0.2")
                })
            ).to.emit(dummyUpgradeUSDC, "ContractPurchased")
             .withArgs(2, nonWhitelistedUser.address, await time.latest());
        });
    });

    describe("Multi-Token Trigger Functionality with USDC", function () {
        beforeEach(async function () {
            // Set test prices
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 25 * 10**8);

            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            // Create ETH contract with AVAX reserve
            await dummyUpgradeUSDC.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate,
                false, ethers.parseEther("1"), ethers.parseEther("0.1"), 
                true, false,
                { value: ethers.parseEther("1") }
            );

            // Create BTC contract with USDC reserve
            await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits("5000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "BTC", 30000 * 10**8, startDate, endDate,
                true, ethers.parseUnits("5000", 6), ethers.parseEther("0.5"), 
                true, false
            );

            // Create AVAX contract with USDC reserve
            await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", 20 * 10**8, startDate, endDate,
                true, ethers.parseUnits("1000", 6), ethers.parseEther("0.1"), 
                true, false
            );

            await time.increaseTo(startDate);

            // Purchase all contracts
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.1")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(2, {
                value: ethers.parseEther("0.5")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(3, {
                value: ethers.parseEther("0.1")
            });
        });

        it("Should trigger ETH contract with AVAX payout", async function () {
            // Set ETH price below trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 1800 * 10**8);

            const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

            await expect(
                dummyUpgradeUSDC.triggerPayout(1)
            ).to.emit(dummyUpgradeUSDC, "PayoutTriggered")
             .withArgs(1, buyer.address, ethers.parseEther("1"), 1800 * 10**8, 2000 * 10**8, false, true);

            // Since auto-execute is enabled, payout should be automatic
            const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
            expect(buyerBalanceAfter).to.be.gt(buyerBalanceBefore);
        });

        it("Should trigger BTC contract with USDC payout", async function () {
            // Set BTC price below trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 25000 * 10**8);

            const buyerUSDCBefore = await mockUSDC.balanceOf(buyer.address);

            await expect(
                dummyUpgradeUSDC.triggerPayout(2)
            ).to.emit(dummyUpgradeUSDC, "PayoutTriggered")
             .withArgs(2, buyer.address, ethers.parseUnits("5000", 6), 25000 * 10**8, 30000 * 10**8, true, true);

            // Check USDC balance increased
            const buyerUSDCAfter = await mockUSDC.balanceOf(buyer.address);
            expect(buyerUSDCAfter - buyerUSDCBefore).to.equal(ethers.parseUnits("5000", 6));
        });

        it("Should trigger AVAX contract with USDC payout", async function () {
            // Set AVAX price below trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 18 * 10**8);

            const buyerUSDCBefore = await mockUSDC.balanceOf(buyer.address);

            await expect(
                dummyUpgradeUSDC.triggerPayout(3)
            ).to.emit(dummyUpgradeUSDC, "PayoutTriggered")
             .withArgs(3, buyer.address, ethers.parseUnits("1000", 6), 18 * 10**8, 20 * 10**8, true, true);

            // Check USDC balance increased
            const buyerUSDCAfter = await mockUSDC.balanceOf(buyer.address);
            expect(buyerUSDCAfter - buyerUSDCBefore).to.equal(ethers.parseUnits("1000", 6));
        });
    });

    describe("Time-Based Multi-Token Automation with USDC and Whitelist", function () {
        beforeEach(async function () {
            // Set test prices
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 15 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 25 * 10**8);

            // Configure time-based automation
            await dummyUpgradeUSDC.configureAutomation(true, 800000, 50, 3600); // 1 hour interval

            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 7200; // 2 hours

            // Create multiple contracts with different configurations
            
            // ETH contract with AVAX reserve, no whitelist
            await dummyUpgradeUSDC.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate,
                false, ethers.parseEther("1"), ethers.parseEther("0.1"), 
                true, false,
                { value: ethers.parseEther("1") }
            );

            // BTC contract with USDC reserve, whitelist enabled
            await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits("5000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "BTC", 30000 * 10**8, startDate, endDate,
                true, ethers.parseUnits("5000", 6), ethers.parseEther("0.5"), 
                true, true
            );

            // LINK contract with USDC reserve, no whitelist
            await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits("500", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "LINK", 10 * 10**8, startDate, endDate,
                true, ethers.parseUnits("500", 6), ethers.parseEther("0.05"), 
                true, false
            );

            // AVAX contract with AVAX reserve, whitelist enabled
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", 20 * 10**8, startDate, endDate,
                false, ethers.parseEther("0.5"), ethers.parseEther("0.05"), 
                true, true,
                { value: ethers.parseEther("0.5") }
            );

            await time.increaseTo(startDate);

            // Add users to whitelists for contracts 2 and 4
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(2, whitelistedUser.address);
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(4, whitelistedUser.address);

            // Purchase contracts
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, { // ETH - no whitelist
                value: ethers.parseEther("0.1")
            });
            await dummyUpgradeUSDC.connect(whitelistedUser).purchaseInsurance(2, { // BTC - whitelisted
                value: ethers.parseEther("0.5")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(3, { // LINK - no whitelist
                value: ethers.parseEther("0.05")
            });
            await dummyUpgradeUSDC.connect(whitelistedUser).purchaseInsurance(4, { // AVAX - whitelisted
                value: ethers.parseEther("0.05")
            });
        });

        it("Should execute time-based automation for multiple tokens with mixed reserves", async function () {
            // Set all prices below triggers
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 1800 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 25000 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 8 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 18 * 10**8);

            const buyerAVAXBefore = await ethers.provider.getBalance(buyer.address);
            const buyerUSDCBefore = await mockUSDC.balanceOf(buyer.address);
            const whitelistedUSDCBefore = await mockUSDC.balanceOf(whitelistedUser.address);
            const whitelistedAVAXBefore = await ethers.provider.getBalance(whitelistedUser.address);

            // Execute time-based automation
            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Find the AutomationExecuted event
            const automationEvent = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });

            expect(automationEvent).to.not.be.undefined;
            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(4);

            // Verify payouts
            const buyerAVAXAfter = await ethers.provider.getBalance(buyer.address);
            const buyerUSDCAfter = await mockUSDC.balanceOf(buyer.address);
            const whitelistedUSDCAfter = await mockUSDC.balanceOf(whitelistedUser.address);
            const whitelistedAVAXAfter = await ethers.provider.getBalance(whitelistedUser.address);

            // Buyer should receive AVAX from ETH contract and USDC from LINK contract
            expect(buyerAVAXAfter).to.be.gt(buyerAVAXBefore);
            expect(buyerUSDCAfter - buyerUSDCBefore).to.equal(ethers.parseUnits("500", 6));

            // Whitelisted user should receive USDC from BTC contract and AVAX from AVAX contract
            expect(whitelistedUSDCAfter - whitelistedUSDCBefore).to.equal(ethers.parseUnits("5000", 6));
            expect(whitelistedAVAXAfter).to.be.gt(whitelistedAVAXBefore);
        });

        it("Should handle mixed trigger conditions with whitelist", async function () {
            // Only ETH and LINK trigger (no whitelist), BTC and AVAX don't trigger (whitelist)
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 1800 * 10**8);   // Trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 32000 * 10**8);  // No trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 8 * 10**8);     // Trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 22 * 10**8);    // No trigger

            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            await tx.wait();

            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(2);
        });

        it("Should handle whitelist-only triggers", async function () {
            // Only whitelisted contracts trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 2200 * 10**8);   // No trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 25000 * 10**8);  // Trigger (whitelist)
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 12 * 10**8);    // No trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 18 * 10**8);    // Trigger (whitelist)

            const whitelistedUSDCBefore = await mockUSDC.balanceOf(whitelistedUser.address);
            const whitelistedAVAXBefore = await ethers.provider.getBalance(whitelistedUser.address);

            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            await tx.wait();

            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(2);

            // Verify only whitelisted user received payouts
            const whitelistedUSDCAfter = await mockUSDC.balanceOf(whitelistedUser.address);
            const whitelistedAVAXAfter = await ethers.provider.getBalance(whitelistedUser.address);

            expect(whitelistedUSDCAfter - whitelistedUSDCBefore).to.equal(ethers.parseUnits("5000", 6));
            expect(whitelistedAVAXAfter).to.be.gt(whitelistedAVAXBefore);
        });
    });

    describe("Complete Workflow Integration Test", function () {
        it("Should handle complete multi-token USDC whitelist time-based workflow", async function () {
            // Step 1: Add all price feeds
            await dummyUpgradeUSDC.connect(owner).addPriceFeed("ETH", PRICE_FEEDS.ETH);
            await dummyUpgradeUSDC.connect(owner).addPriceFeed("BTC", PRICE_FEEDS.BTC);
            await dummyUpgradeUSDC.connect(owner).addPriceFeed("LINK", PRICE_FEEDS.LINK);

            // Step 2: Set test prices
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 2500 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 35000 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 15 * 10**8);
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 25 * 10**8);

            // Step 3: Configure time-based automation
            await dummyUpgradeUSDC.configureAutomation(true, 800000, 50, 1800); // 30 minutes

            // Step 4: Create contracts with mixed configurations
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 7200;

            const contracts = [
                { token: "ETH", trigger: 2000 * 10**8, isUSDC: false, reserve: "1", fee: "0.1", whitelist: false },
                { token: "BTC", trigger: 30000 * 10**8, isUSDC: true, reserve: "5000", fee: "0.5", whitelist: true },
                { token: "LINK", trigger: 10 * 10**8, isUSDC: true, reserve: "500", fee: "0.05", whitelist: false },
                { token: "AVAX", trigger: 20 * 10**8, isUSDC: false, reserve: "0.5", fee: "0.05", whitelist: true }
            ];

            // Create all contracts
            for (let i = 0; i < contracts.length; i++) {
                const contract = contracts[i];
                
                if (contract.isUSDC) {
                    await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits(contract.reserve, 6));
                    await dummyUpgradeUSDC.connect(seller).createContract(
                        contract.token, contract.trigger, startDate, endDate,
                        true, ethers.parseUnits(contract.reserve, 6), ethers.parseEther(contract.fee),
                        true, contract.whitelist
                    );
                } else {
                    await dummyUpgradeUSDC.connect(seller).createContract(
                        contract.token, contract.trigger, startDate, endDate,
                        false, ethers.parseEther(contract.reserve), ethers.parseEther(contract.fee),
                        true, contract.whitelist,
                        { value: ethers.parseEther(contract.reserve) }
                    );
                }
            }

            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(4);

            // Step 5: Setup whitelist for contracts 2 and 4
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(2, whitelistedUser.address);
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(4, whitelistedUser.address);

            // Step 6: Purchase contracts
            await time.increaseTo(startDate);

            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, {
                value: ethers.parseEther("0.1")
            });
            await dummyUpgradeUSDC.connect(whitelistedUser).purchaseInsurance(2, {
                value: ethers.parseEther("0.5")
            });
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(3, {
                value: ethers.parseEther("0.05")
            });
            await dummyUpgradeUSDC.connect(whitelistedUser).purchaseInsurance(4, {
                value: ethers.parseEther("0.05")
            });

            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(4);

            // Step 7: Test time-based automation with selective triggers
            await dummyUpgradeUSDC.connect(owner).setTestPrice("ETH", 1800 * 10**8);  // Trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("BTC", 32000 * 10**8); // No trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("LINK", 8 * 10**8);    // Trigger
            await dummyUpgradeUSDC.connect(owner).setTestPrice("AVAX", 18 * 10**8);   // Trigger

            // Execute time-based automation
            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            await tx.wait();

            // Should trigger 3 contracts (ETH, LINK, AVAX)
            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(3);
            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(1); // Only BTC remaining

            // Step 8: Verify contract balances
            const contractAVAXBalance = await ethers.provider.getBalance(contractAddress);
            const contractUSDCBalance = await mockUSDC.balanceOf(contractAddress);
            
            // Should have remaining reserves from BTC contract only
            expect(contractUSDCBalance).to.equal(ethers.parseUnits("5000", 6));
            expect(contractAVAXBalance).to.equal(0); // All AVAX reserves should be paid out
        });
    });

    describe("Reserve Withdrawal with USDC Support", function () {
        beforeEach(async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            // Create AVAX reserve contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate,
                false, ethers.parseEther("1"), ethers.parseEther("0.1"), 
                false, false,
                { value: ethers.parseEther("1") }
            );

            // Create USDC reserve contract
            await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "BTC", 30000 * 10**8, startDate, endDate,
                true, ethers.parseUnits("1000", 6), ethers.parseEther("0.1"), 
                false, false
            );
        });

        it("Should allow seller to withdraw AVAX reserve after expiry", async function () {
            // Fast forward past end date
            await time.increase(4000);

            const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

            await expect(
                dummyUpgradeUSDC.connect(seller).withdrawReserve(1)
            ).to.emit(dummyUpgradeUSDC, "ReserveWithdrawn")
             .withArgs(1, seller.address, ethers.parseEther("1"), false);

            const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
            expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
        });

        it("Should allow seller to withdraw USDC reserve after expiry", async function () {
            // Fast forward past end date
            await time.increase(4000);

            const sellerUSDCBefore = await mockUSDC.balanceOf(seller.address);

            await expect(
                dummyUpgradeUSDC.connect(seller).withdrawReserve(2)
            ).to.emit(dummyUpgradeUSDC, "ReserveWithdrawn")
             .withArgs(2, seller.address, ethers.parseUnits("1000", 6), true);

            const sellerUSDCAfter = await mockUSDC.balanceOf(seller.address);
            expect(sellerUSDCAfter - sellerUSDCBefore).to.equal(ethers.parseUnits("1000", 6));
        });
    });

    describe("Emergency Functions with USDC", function () {
        beforeEach(async function () {
            // Create some contracts to have funds in the contract
            const currentTime = await time.latest();
            const startDate = currentTime + 100;
            const endDate = startDate + 3600;

            await mockUSDC.connect(seller).approve(contractAddress, ethers.parseUnits("1000", 6));
            await dummyUpgradeUSDC.connect(seller).createContract(
                "ETH", 2000 * 10**8, startDate, endDate,
                true, ethers.parseUnits("1000", 6), ethers.parseEther("0.1"), 
                false, false
            );
        });

        it("Should allow owner to recover USDC in emergency", async function () {
            const ownerUSDCBefore = await mockUSDC.balanceOf(owner.address);
            const contractUSDCBefore = await mockUSDC.balanceOf(contractAddress);

            await dummyUpgradeUSDC.connect(owner).emergencyUSDCRecovery(
                ethers.parseUnits("500", 6),
                owner.address
            );

            const ownerUSDCAfter = await mockUSDC.balanceOf(owner.address);
            const contractUSDCAfter = await mockUSDC.balanceOf(contractAddress);

            expect(ownerUSDCAfter - ownerUSDCBefore).to.equal(ethers.parseUnits("500", 6));
            expect(contractUSDCBefore - contractUSDCAfter).to.equal(ethers.parseUnits("500", 6));
        });

        it("Should prevent non-owner from emergency USDC recovery", async function () {
            await expect(
                dummyUpgradeUSDC.connect(nonOwner).emergencyUSDCRecovery(
                    ethers.parseUnits("100", 6),
                    nonOwner.address
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});