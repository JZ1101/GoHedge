const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DummyUpgradeUSDC_Whitelist Contract Tests", function () {
    let dummyUpgradeUSDC, mockUSDC;
    let owner, seller, buyer, buyer2, buyer3, nonWhitelisted;
    let contractId;
    
    // Test configuration
    const INITIAL_USDC_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC
    const CONTRACT_RESERVE_USDC = ethers.parseUnits("1000", 6);  // 1000 USDC
    const CONTRACT_RESERVE_AVAX = ethers.parseEther("1");        // 1 AVAX
    const INSURANCE_FEE = ethers.parseEther("0.01");             // 0.01 AVAX
    const TRIGGER_PRICE = 18 * 10**8;                           // $18 (scaled by 10^8)
    
    beforeEach(async function () {
        [owner, seller, buyer, buyer2, buyer3, nonWhitelisted] = await ethers.getSigners();
        
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
        
        // Mint USDC tokens to accounts
        await mockUSDC.mint(seller.address, INITIAL_USDC_SUPPLY);
        await mockUSDC.mint(buyer.address, INITIAL_USDC_SUPPLY);
        await mockUSDC.mint(buyer2.address, INITIAL_USDC_SUPPLY);
        await mockUSDC.mint(buyer3.address, INITIAL_USDC_SUPPLY);
        
        // Set test prices
        await dummyUpgradeUSDC.setTestPrice("AVAX", 25 * 10**8); // $25
        await dummyUpgradeUSDC.setTestPrice("BTC", 30000 * 10**8); // $30,000
        await dummyUpgradeUSDC.setTestPrice("ETH", 2000 * 10**8); // $2,000
        await dummyUpgradeUSDC.setTestPrice("USDC", 1 * 10**8); // $1
        
        // Calculate dates
        const currentTime = Math.floor(Date.now() / 1000);
        this.startDate = currentTime + 100;
        this.endDate = currentTime + 86400; // 1 day later
    });

    describe("Contract Deployment and Initial State", function () {
        it("Should deploy with correct initial state", async function () {
            expect(await dummyUpgradeUSDC.testMode()).to.be.true;
            expect(await dummyUpgradeUSDC.automationEnabled()).to.be.true;
            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(0);
            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(0);
            expect(await dummyUpgradeUSDC.getUSDCAddress()).to.equal(await mockUSDC.getAddress());
        });

        it("Should initialize test prices correctly", async function () {
            expect(await dummyUpgradeUSDC.testPrices("AVAX")).to.equal(25 * 10**8);
            expect(await dummyUpgradeUSDC.testPrices("BTC")).to.equal(30000 * 10**8);
            expect(await dummyUpgradeUSDC.testPrices("ETH")).to.equal(2000 * 10**8);
            expect(await dummyUpgradeUSDC.testPrices("USDC")).to.equal(1 * 10**8);
        });
    });

    describe("Contract Creation", function () {
        describe("AVAX Reserve Contracts", function () {
            it("Should create AVAX contract without whitelist", async function () {
                await expect(
                    dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX",
                        TRIGGER_PRICE,
                        this.startDate,
                        this.endDate,
                        false, // AVAX reserve
                        CONTRACT_RESERVE_AVAX,
                        INSURANCE_FEE,
                        true,  // autoExecute
                        false, // whitelist disabled
                        { value: CONTRACT_RESERVE_AVAX }
                    )
                ).to.emit(dummyUpgradeUSDC, "ContractCreated")
                .withArgs(1, seller.address, "AVAX", TRIGGER_PRICE, CONTRACT_RESERVE_AVAX, false, true, false);
                
                expect(await dummyUpgradeUSDC.contractCounter()).to.equal(1);
                
                // Check contract details
                const contract = await dummyUpgradeUSDC.getContract(1);
                expect(contract.seller).to.equal(seller.address);
                expect(contract.whitelistEnabled).to.be.false;
            });

            it("Should create AVAX contract with whitelist enabled", async function () {
                await expect(
                    dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX",
                        TRIGGER_PRICE,
                        this.startDate,
                        this.endDate,
                        false,
                        CONTRACT_RESERVE_AVAX,
                        INSURANCE_FEE,
                        true,
                        true, // whitelist enabled
                        { value: CONTRACT_RESERVE_AVAX }
                    )
                ).to.emit(dummyUpgradeUSDC, "ContractCreated")
                .withArgs(1, seller.address, "AVAX", TRIGGER_PRICE, CONTRACT_RESERVE_AVAX, false, true, true);
                
                const contract = await dummyUpgradeUSDC.getContract(1);
                expect(contract.whitelistEnabled).to.be.true;
            });
        });

        describe("USDC Reserve Contracts", function () {
            it("Should create USDC contract with whitelist", async function () {
                await mockUSDC.connect(seller).approve(await dummyUpgradeUSDC.getAddress(), CONTRACT_RESERVE_USDC);
                
                await expect(
                    dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX",
                        TRIGGER_PRICE,
                        this.startDate,
                        this.endDate,
                        true, // USDC reserve
                        CONTRACT_RESERVE_USDC,
                        INSURANCE_FEE,
                        true,
                        true // whitelist enabled
                    )
                ).to.emit(dummyUpgradeUSDC, "ContractCreated")
                .withArgs(1, seller.address, "AVAX", TRIGGER_PRICE, CONTRACT_RESERVE_USDC, true, true, true);
                
                expect(await dummyUpgradeUSDC.getUSDCBalance()).to.equal(CONTRACT_RESERVE_USDC);
            });

            it("Should prevent USDC contract without approval", async function () {
                await expect(
                    dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX",
                        TRIGGER_PRICE,
                        this.startDate,
                        this.endDate,
                        true,
                        CONTRACT_RESERVE_USDC,
                        INSURANCE_FEE,
                        true,
                        false
                    )
                ).to.be.reverted; // ERC20 transfer will fail
            });
        });
    });

    describe("Whitelist Management", function () {
        beforeEach(async function () {
            // Create a whitelisted contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX",
                TRIGGER_PRICE,
                this.startDate,
                this.endDate,
                false,
                CONTRACT_RESERVE_AVAX,
                INSURANCE_FEE,
                true,
                true, // whitelist enabled
                { value: CONTRACT_RESERVE_AVAX }
            );
            contractId = 1;
        });

        describe("Add Buyers to Whitelist", function () {
            it("Should allow seller to add buyer to whitelist", async function () {
                await expect(
                    dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(contractId, buyer.address)
                ).to.emit(dummyUpgradeUSDC, "BuyerAddedToWhitelist")
                .withArgs(contractId, buyer.address, seller.address);
                
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer.address)).to.be.true;
            });

            it("Should prevent non-seller from adding to whitelist", async function () {
                await expect(
                    dummyUpgradeUSDC.connect(buyer).addBuyerToWhitelist(contractId, buyer2.address)
                ).to.be.revertedWith("Only contract seller");
            });

            it("Should prevent adding already whitelisted buyer", async function () {
                await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(contractId, buyer.address);
                
                await expect(
                    dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(contractId, buyer.address)
                ).to.be.revertedWith("Already whitelisted");
            });

            it("Should prevent adding to whitelist when whitelist disabled", async function () {
                // Create contract without whitelist
                await dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                    false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false,
                    { value: CONTRACT_RESERVE_AVAX }
                );
                
                await expect(
                    dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(2, buyer.address)
                ).to.be.revertedWith("Whitelist not enabled for this contract");
            });
        });

        describe("Remove Buyers from Whitelist", function () {
            beforeEach(async function () {
                await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(contractId, buyer.address);
            });

            it("Should allow seller to remove buyer from whitelist", async function () {
                await expect(
                    dummyUpgradeUSDC.connect(seller).removeBuyerFromWhitelist(contractId, buyer.address)
                ).to.emit(dummyUpgradeUSDC, "BuyerRemovedFromWhitelist")
                .withArgs(contractId, buyer.address, seller.address);
                
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer.address)).to.be.false;
            });

            it("Should prevent removing non-whitelisted buyer", async function () {
                await expect(
                    dummyUpgradeUSDC.connect(seller).removeBuyerFromWhitelist(contractId, buyer2.address)
                ).to.be.revertedWith("Not whitelisted");
            });
        });

        describe("Batch Whitelist Operations", function () {
            it("Should allow batch adding buyers", async function () {
                const buyers = [buyer.address, buyer2.address, buyer3.address];
                
                await expect(
                    dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(contractId, buyers)
                ).to.emit(dummyUpgradeUSDC, "BatchWhitelistUpdate")
                .withArgs(contractId, 3, 0, seller.address);
                
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer.address)).to.be.true;
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer2.address)).to.be.true;
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer3.address)).to.be.true;
            });

            it("Should allow batch removing buyers", async function () {
                const buyers = [buyer.address, buyer2.address, buyer3.address];
                await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(contractId, buyers);
                
                await expect(
                    dummyUpgradeUSDC.connect(seller).batchRemoveBuyersFromWhitelist(contractId, buyers)
                ).to.emit(dummyUpgradeUSDC, "BatchWhitelistUpdate")
                .withArgs(contractId, 0, 3, seller.address);
                
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer.address)).to.be.false;
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer2.address)).to.be.false;
                expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer3.address)).to.be.false;
            });
        });

        describe("Whitelist Status Management", function () {
            it("Should allow seller to disable whitelist before purchase", async function () {
                await dummyUpgradeUSDC.connect(seller).setContractWhitelistStatus(contractId, false);
                
                const contract = await dummyUpgradeUSDC.getContract(contractId);
                expect(contract.whitelistEnabled).to.be.false;
            });

            it("Should prevent changing whitelist status after purchase", async function () {
                // Add buyer to whitelist and purchase
                await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(contractId, buyer.address);
                
                await ethers.provider.send("evm_setNextBlockTimestamp", [this.startDate]);
                await ethers.provider.send("evm_mine");
                
                await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(contractId, { value: INSURANCE_FEE });
                
                await expect(
                    dummyUpgradeUSDC.connect(seller).setContractWhitelistStatus(contractId, false)
                ).to.be.revertedWith("Cannot change whitelist status after purchase");
            });
        });
    });

    describe("Insurance Purchase with Whitelist", function () {
        beforeEach(async function () {
            // Create whitelisted contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );
            contractId = 1;
        });

        it("Should allow whitelisted buyer to purchase insurance", async function () {
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(contractId, buyer.address);
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [this.startDate]);
            await ethers.provider.send("evm_mine");
            
            await expect(
                dummyUpgradeUSDC.connect(buyer).purchaseInsurance(contractId, { value: INSURANCE_FEE })
            ).to.emit(dummyUpgradeUSDC, "ContractPurchased")
            .withArgs(contractId, buyer.address, this.startDate);
            
            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(1);
        });

        it("Should prevent non-whitelisted buyer from purchasing", async function () {
            await ethers.provider.send("evm_setNextBlockTimestamp", [this.startDate]);
            await ethers.provider.send("evm_mine");
            
            await expect(
                dummyUpgradeUSDC.connect(nonWhitelisted).purchaseInsurance(contractId, { value: INSURANCE_FEE })
            ).to.be.revertedWith("Not whitelisted for this contract");
        });

        it("Should allow anyone to purchase when whitelist disabled", async function () {
            // Create contract without whitelist
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false,
                { value: CONTRACT_RESERVE_AVAX }
            );
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [this.startDate]);
            await ethers.provider.send("evm_mine");
            
            await expect(
                dummyUpgradeUSDC.connect(nonWhitelisted).purchaseInsurance(2, { value: INSURANCE_FEE })
            ).to.emit(dummyUpgradeUSDC, "ContractPurchased");
        });
    });

    describe("Whitelist Query Functions", function () {
        beforeEach(async function () {
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );
            contractId = 1;
            
            // Add buyers to whitelist
            const buyers = [buyer.address, buyer2.address, buyer3.address];
            await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(contractId, buyers);
        });

        it("Should return correct whitelist status", async function () {
            expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, buyer.address)).to.be.true;
            expect(await dummyUpgradeUSDC.isBuyerWhitelisted(contractId, nonWhitelisted.address)).to.be.false;
        });

        it("Should return whitelisted buyers (paginated)", async function () {
            const [buyers, hasMore] = await dummyUpgradeUSDC.getContractWhitelistedBuyers(contractId, 0, 2);
            
            expect(buyers.length).to.equal(2);
            expect(hasMore).to.be.true;
            expect(buyers).to.include(buyer.address);
        });

        it("Should return contract whitelist statistics", async function () {
            const [totalWhitelisted, whitelistEnabled, contractSeller] = 
                await dummyUpgradeUSDC.getContractWhitelistStats(contractId);
            
            expect(totalWhitelisted).to.equal(3);
            expect(whitelistEnabled).to.be.true;
            expect(contractSeller).to.equal(seller.address);
        });
    });

    describe("Payout and Claims", function () {
        beforeEach(async function () {
            // Create and setup contract
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, false, true, // Manual execution
                { value: CONTRACT_RESERVE_AVAX }
            );
            
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(1, buyer.address);
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [this.startDate]);
            await ethers.provider.send("evm_mine");
            
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, { value: INSURANCE_FEE });
            contractId = 1;
        });

        it("Should trigger payout when price condition is met", async function () {
            // Set price below trigger
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8); // $15 < $18 trigger
            
            await expect(dummyUpgradeUSDC.triggerPayout(contractId))
                .to.emit(dummyUpgradeUSDC, "PayoutTriggered")
                .withArgs(contractId, buyer.address, CONTRACT_RESERVE_AVAX, 15 * 10**8, TRIGGER_PRICE, false, false);
        });

        it("Should allow beneficiary to claim payout", async function () {
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8);
            await dummyUpgradeUSDC.triggerPayout(contractId);
            
            const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
            
            await expect(dummyUpgradeUSDC.connect(buyer).claimPayout(contractId))
                .to.emit(dummyUpgradeUSDC, "PayoutClaimed")
                .withArgs(contractId, buyer.address, CONTRACT_RESERVE_AVAX, false);
            
            const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
            expect(buyerBalanceAfter).to.be.gt(buyerBalanceBefore);
        });
    });

    describe("USDC Payout Integration", function () {
        beforeEach(async function () {
            // Create USDC contract with whitelist
            await mockUSDC.connect(seller).approve(await dummyUpgradeUSDC.getAddress(), CONTRACT_RESERVE_USDC);
            
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                true, CONTRACT_RESERVE_USDC, INSURANCE_FEE, true, true, // Auto-execute, whitelist enabled
            );
            
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(1, buyer.address);
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [this.startDate]);
            await ethers.provider.send("evm_mine");
            
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, { value: INSURANCE_FEE });
            contractId = 1;
        });

        it("Should auto-execute USDC payout when triggered", async function () {
            const buyerUSDCBefore = await mockUSDC.balanceOf(buyer.address);
            
            // Set price to trigger condition
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8);
            
            await expect(dummyUpgradeUSDC.triggerPayout(contractId))
                .to.emit(dummyUpgradeUSDC, "PayoutTriggered")
                .withArgs(contractId, buyer.address, CONTRACT_RESERVE_USDC, 15 * 10**8, TRIGGER_PRICE, true, true)
                .and.to.emit(dummyUpgradeUSDC, "PayoutClaimed")
                .withArgs(contractId, buyer.address, CONTRACT_RESERVE_USDC, true);
            
            const buyerUSDCAfter = await mockUSDC.balanceOf(buyer.address);
            expect(buyerUSDCAfter - buyerUSDCBefore).to.equal(CONTRACT_RESERVE_USDC);
        });
    });

    describe("Time-based Automation with Whitelist", function () {
        beforeEach(async function () {
            // Create multiple contracts with different whitelist settings
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );
            
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false, // No whitelist
                { value: CONTRACT_RESERVE_AVAX }
            );
            
            // Setup whitelists and purchases
            await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(1, buyer.address);
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [this.startDate]);
            await ethers.provider.send("evm_mine");
            
            await dummyUpgradeUSDC.connect(buyer).purchaseInsurance(1, { value: INSURANCE_FEE });
            await dummyUpgradeUSDC.connect(buyer2).purchaseInsurance(2, { value: INSURANCE_FEE });
        });

        it("Should execute automation for all eligible contracts", async function () {
            // Set trigger price
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8);
            
            await expect(dummyUpgradeUSDC.performTimeBasedUpkeep())
                .to.emit(dummyUpgradeUSDC, "AutomationExecuted");
            
            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(0);
            expect(await dummyUpgradeUSDC.totalTriggeredContracts()).to.equal(2);
        });
    });

    describe("Reserve Withdrawal", function () {
        it("Should allow seller to withdraw AVAX reserve", async function () {
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false,
                { value: CONTRACT_RESERVE_AVAX }
            );
            
            const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
            
            await expect(dummyUpgradeUSDC.connect(seller).withdrawReserve(1))
                .to.emit(dummyUpgradeUSDC, "ReserveWithdrawn")
                .withArgs(1, seller.address, CONTRACT_RESERVE_AVAX, false);
            
            const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
            expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
        });

        it("Should allow seller to withdraw USDC reserve", async function () {
            await mockUSDC.connect(seller).approve(await dummyUpgradeUSDC.getAddress(), CONTRACT_RESERVE_USDC);
            
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                true, CONTRACT_RESERVE_USDC, INSURANCE_FEE, true, false
            );
            
            const sellerUSDCBefore = await mockUSDC.balanceOf(seller.address);
            
            await expect(dummyUpgradeUSDC.connect(seller).withdrawReserve(1))
                .to.emit(dummyUpgradeUSDC, "ReserveWithdrawn")
                .withArgs(1, seller.address, CONTRACT_RESERVE_USDC, true);
            
            const sellerUSDCAfter = await mockUSDC.balanceOf(seller.address);
            expect(sellerUSDCAfter).to.be.gt(sellerUSDCBefore);
        });
    });

    describe("Emergency Functions", function () {
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
            // Send some USDC to contract
            await mockUSDC.mint(await dummyUpgradeUSDC.getAddress(), ethers.parseUnits("100", 6));
            
            const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
            
            await dummyUpgradeUSDC.emergencyUSDCRecovery(
                ethers.parseUnits("50", 6),
                owner.address
            );
            
            const ownerBalanceAfter = await mockUSDC.balanceOf(owner.address);
            expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(ethers.parseUnits("50", 6));
        });

        it("Should allow owner to recover stuck AVAX", async function () {
            // Get contract address
            const contractAddress = await dummyUpgradeUSDC.getAddress();
            
            // Send some AVAX directly to contract (using low-level call)
            await owner.sendTransaction({
                to: contractAddress,
                value: ethers.parseEther("1"),
                data: "0x" // Empty data to bypass any function calls
            });
            
            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
            
            await dummyUpgradeUSDC.emergencyAvaxRecovery(
                ethers.parseEther("0.5"),
                owner.address
            );
            
            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle empty whitelist queries gracefully", async function () {
            const [buyers, hasMore] = await dummyUpgradeUSDC.getContractWhitelistedBuyers(999, 0, 10);
            expect(buyers.length).to.equal(0);
            expect(hasMore).to.be.false;
        });

        it("Should handle automation with no active contracts", async function () {
            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            // Find the AutomationExecuted event
            const event = receipt.logs.find(log => {
                try {
                    const parsed = dummyUpgradeUSDC.interface.parseLog(log);
                    return parsed.name === "AutomationExecuted";
                } catch {
                    return false;
                }
            });
            
            expect(event).to.exist;
            const parsedEvent = dummyUpgradeUSDC.interface.parseLog(event);
            expect(parsedEvent.args[0]).to.equal(0); // totalChecked
            expect(parsedEvent.args[1]).to.equal(0); // totalTriggered
            expect(parsedEvent.args[2]).to.be.a('bigint'); // gasUsed
        });

        it("Should prevent invalid contract operations", async function () {
            await expect(
                dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(999, buyer.address)
            ).to.be.revertedWith("Only contract seller");
        });
    });

    describe("Gas Usage Analysis", function () {
        it("Should track gas usage for batch whitelist operations", async function () {
            // Create contract with whitelist
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );
            
            const buyers = [buyer.address, buyer2.address, buyer3.address, nonWhitelisted.address];
            
            const tx = await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(1, buyers);
            const receipt = await tx.wait();
            
            console.log("Batch add whitelist (4 buyers) gas used:", receipt.gasUsed.toString());
            expect(receipt.gasUsed).to.be.lt(350000); // Increased limit to 350k
        });

        it("Should track gas usage for automation", async function () {
            // Create multiple contracts
            for (let i = 0; i < 3; i++) {
                await dummyUpgradeUSDC.connect(owner).createContract(
                    "AVAX", TRIGGER_PRICE, this.startDate, this.endDate,
                    false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false,
                    { value: CONTRACT_RESERVE_AVAX }
                );
            }
            
            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            
            console.log("Automation (3 contracts) gas used:", receipt.gasUsed.toString());
            expect(receipt.gasUsed).to.be.lt(1000000); // Should be reasonable
        });
    });
});