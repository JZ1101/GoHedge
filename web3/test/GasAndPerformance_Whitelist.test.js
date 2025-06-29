const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Gas Limit and Performance Tests - Whitelist Contract", function () {
    let dummyUpgradeUSDC, mockUSDC;
    let owner, seller, accounts;
    
    // Test configuration
    const INITIAL_USDC_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC
    const CONTRACT_RESERVE_USDC = ethers.parseUnits("100", 6);   // 100 USDC
    const CONTRACT_RESERVE_AVAX = ethers.parseEther("0.01");     // 0.01 AVAX
    const INSURANCE_FEE = ethers.parseEther("0.001");            // 0.001 AVAX
    const TRIGGER_PRICE = 18 * 10**8;                           // $18

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0];
        seller = signers[1];
        accounts = signers.slice(2); // Get remaining accounts (starting from index 2)

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

        // Mint USDC tokens to seller and available accounts
        await mockUSDC.mint(seller.address, INITIAL_USDC_SUPPLY);
        
        // Only mint to available accounts (accounts.length should be ~18)
        for (let i = 0; i < accounts.length && i < 18; i++) {
            await mockUSDC.mint(accounts[i].address, INITIAL_USDC_SUPPLY);
        }

        // Set test prices
        await dummyUpgradeUSDC.setTestPrice("AVAX", 25 * 10**8); // $25
    });

    describe("Whitelist Gas Efficiency Tests", function () {
        it("Should handle large whitelist operations efficiently", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            // Create contract with whitelist
            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, startDate, endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );

            // Test batch adding buyers (limit to available accounts)
            const buyers = [];
            const numBuyers = Math.min(50, accounts.length * 3); // Allow duplicates
            for (let i = 0; i < numBuyers; i++) {
                buyers.push(accounts[i % accounts.length].address);
            }

            const gasStart = Date.now();
            const tx = await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(1, buyers);
            const receipt = await tx.wait();
            const gasEnd = Date.now();

            console.log(`Batch add ${buyers.length} buyers took ${gasEnd - gasStart}ms`);
            console.log(`Gas used for batch add (${buyers.length} buyers): ${receipt.gasUsed}`);
            
            expect(Number(receipt.gasUsed)).to.be.lessThan(2000000); // Should be reasonable
            expect(gasEnd - gasStart).to.be.lessThan(10000); // Should complete within 10 seconds

            // Verify whitelist count (may be less than buyers.length due to duplicates)
            const [totalWhitelisted] = await dummyUpgradeUSDC.getContractWhitelistStats(1);
            expect(totalWhitelisted).to.be.greaterThan(0);
            expect(totalWhitelisted).to.be.lessThanOrEqual(accounts.length);
        });

        it("Should handle batch remove operations efficiently", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, startDate, endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );

            // Add buyers first (limit to available accounts)
            const buyers = [];
            const numBuyers = Math.min(30, accounts.length);
            for (let i = 0; i < numBuyers; i++) {
                buyers.push(accounts[i].address);
            }
            await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(1, buyers);

            // Test batch removal
            const gasStart = Date.now();
            const tx = await dummyUpgradeUSDC.connect(seller).batchRemoveBuyersFromWhitelist(1, buyers);
            const receipt = await tx.wait();
            const gasEnd = Date.now();

            console.log(`Batch remove ${buyers.length} buyers took ${gasEnd - gasStart}ms`);
            console.log(`Gas used for batch remove (${buyers.length} buyers): ${receipt.gasUsed}`);

            expect(Number(receipt.gasUsed)).to.be.lessThan(1500000);
            expect(gasEnd - gasStart).to.be.lessThan(8000);

            // Verify all removed
            const [totalWhitelisted] = await dummyUpgradeUSDC.getContractWhitelistStats(1);
            expect(totalWhitelisted).to.equal(0);
        });

        it("Should handle multiple contracts with individual whitelists", async function () {
            this.timeout(120000); // 2 minute timeout

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            console.log("Creating 20 contracts with whitelists...");
            console.log(`Available accounts: ${accounts.length}`);

            // Create 20 contracts, each with whitelist
            for (let i = 0; i < 20; i++) {
                await dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX", TRIGGER_PRICE, startDate, endDate,
                    false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                    { value: CONTRACT_RESERVE_AVAX }
                );

                // Add buyers to each contract's whitelist (limit to available accounts)
                const buyers = [];
                const buyersPerContract = Math.min(10, accounts.length);
                for (let j = 0; j < buyersPerContract; j++) {
                    buyers.push(accounts[j % accounts.length].address);
                }
                
                await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(i + 1, buyers);
            }

            console.log("All contracts created with whitelists");

            // Verify total setup
            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(20);

            // Test querying whitelist stats for all contracts
            const queryStart = Date.now();
            for (let i = 1; i <= 20; i++) {
                const [totalWhitelisted, whitelistEnabled] = await dummyUpgradeUSDC.getContractWhitelistStats(i);
                expect(whitelistEnabled).to.be.true;
                expect(totalWhitelisted).to.be.greaterThan(0);
            }
            const queryEnd = Date.now();

            console.log(`Querying 20 contract whitelist stats took ${queryEnd - queryStart}ms`);
            expect(queryEnd - queryStart).to.be.lessThan(5000);
        });
    });

    describe("Mixed AVAX/USDC Performance Tests", function () {
        it("Should handle mixed reserve types efficiently", async function () {
            this.timeout(180000); // 3 minute timeout

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            console.log("Creating 50 mixed AVAX/USDC contracts...");

            // Create 50 contracts: 25 AVAX + 25 USDC reserves
            for (let i = 0; i < 50; i++) {
                const isUSDC = i % 2 === 0; // Alternate between USDC and AVAX

                if (isUSDC) {
                    // USDC contract
                    await mockUSDC.connect(seller).approve(await dummyUpgradeUSDC.getAddress(), CONTRACT_RESERVE_USDC);
                    await dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX", TRIGGER_PRICE, startDate, endDate,
                        true, CONTRACT_RESERVE_USDC, INSURANCE_FEE, true, true // USDC reserve, whitelist enabled
                    );
                } else {
                    // AVAX contract
                    await dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX", TRIGGER_PRICE, startDate, endDate,
                        false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false, // AVAX reserve, no whitelist
                        { value: CONTRACT_RESERVE_AVAX }
                    );
                }

                // Add buyers to whitelist for USDC contracts only
                if (isUSDC) {
                    const buyers = [
                        accounts[i % accounts.length].address, 
                        accounts[(i + 1) % accounts.length].address
                    ];
                    await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(i + 1, buyers);
                }
            }

            console.log("Mixed contracts created successfully");
            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(50);

            // Verify USDC balance in contract
            const usdcBalance = await dummyUpgradeUSDC.getUSDCBalance();
            expect(usdcBalance).to.equal(CONTRACT_RESERVE_USDC * BigInt(25)); // 25 USDC contracts

            // Verify AVAX balance in contract
            const avaxBalance = await dummyUpgradeUSDC.getContractBalance();
            expect(avaxBalance).to.equal(CONTRACT_RESERVE_AVAX * BigInt(25)); // 25 AVAX contracts
        });

        it("Should handle automation with mixed contract types", async function () {
            this.timeout(120000);

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            // Create 30 mixed contracts
            for (let i = 0; i < 30; i++) {
                const isUSDC = i % 3 === 0; // Every 3rd contract is USDC

                if (isUSDC) {
                    await mockUSDC.connect(seller).approve(await dummyUpgradeUSDC.getAddress(), CONTRACT_RESERVE_USDC);
                    await dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX", TRIGGER_PRICE, startDate, endDate,
                        true, CONTRACT_RESERVE_USDC, INSURANCE_FEE, true, true
                    );
                    // Add buyer to whitelist
                    await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(i + 1, accounts[i % accounts.length].address);
                } else {
                    await dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX", TRIGGER_PRICE, startDate, endDate,
                        false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false,
                        { value: CONTRACT_RESERVE_AVAX }
                    );
                }
            }

            await time.increase(11);

            // Purchase all contracts
            console.log("Purchasing 30 mixed contracts...");
            for (let i = 0; i < 30; i++) {
                await dummyUpgradeUSDC.connect(accounts[i % accounts.length]).purchaseInsurance(i + 1, {
                    value: INSURANCE_FEE
                });
            }

            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(30);

            // Configure automation
            await dummyUpgradeUSDC.configureAutomation(true, 1000000, 10, 3600);
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8); // Trigger all

            // Execute automation
            console.log("Executing automation on mixed contracts...");
            const gasStart = Date.now();
            const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
            const receipt = await tx.wait();
            const gasEnd = Date.now();

            console.log(`Mixed automation took ${gasEnd - gasStart}ms`);
            console.log(`Gas used: ${receipt.gasUsed}`);

            const totalTriggered = await dummyUpgradeUSDC.totalTriggeredContracts();
            console.log(`Contracts triggered: ${totalTriggered}`);

            expect(totalTriggered).to.be.greaterThan(0);
            expect(totalTriggered).to.be.lessThanOrEqual(10); // Respects batch limit
            expect(Number(receipt.gasUsed)).to.be.lessThan(1000000);
        });
    });

    describe("Large Scale Whitelist Tests", function () {
        it("Should handle 100+ contracts with individual whitelists", async function () {
            this.timeout(300000); // 5 minute timeout

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            console.log("Creating 100 contracts with whitelists...");
            console.log(`Available accounts for testing: ${accounts.length}`);

            // Create contracts in batches
            const batchSize = 25;
            for (let batch = 0; batch < 4; batch++) {
                console.log(`Creating batch ${batch + 1}/4...`);
                
                for (let i = 0; i < batchSize; i++) {
                    const contractIndex = batch * batchSize + i;
                    
                    await dummyUpgradeUSDC.connect(seller).createContract(
                        "AVAX", TRIGGER_PRICE, startDate, endDate,
                        false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                        { value: CONTRACT_RESERVE_AVAX }
                    );

                    // Add buyers to each whitelist (limit to available accounts)
                    const buyers = [];
                    const buyersPerContract = Math.min(5, accounts.length);
                    for (let j = 0; j < buyersPerContract; j++) {
                        buyers.push(accounts[(contractIndex + j) % accounts.length].address);
                    }
                    
                    await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(contractIndex + 1, buyers);
                }
            }

            expect(await dummyUpgradeUSDC.contractCounter()).to.equal(100);

            // Test mass whitelist queries
            console.log("Testing mass whitelist queries...");
            const queryStart = Date.now();
            
            let totalWhitelistedUsers = 0;
            for (let i = 1; i <= 100; i++) {
                const [whitelisted, enabled] = await dummyUpgradeUSDC.getContractWhitelistStats(i);
                expect(enabled).to.be.true;
                expect(whitelisted).to.be.greaterThan(0);
                totalWhitelistedUsers += Number(whitelisted);
            }
            
            const queryEnd = Date.now();
            
            console.log(`Queried 100 contract whitelists in ${queryEnd - queryStart}ms`);
            console.log(`Total whitelisted users across all contracts: ${totalWhitelistedUsers}`);
            
            expect(queryEnd - queryStart).to.be.lessThan(10000); // Should complete within 10 seconds
            expect(totalWhitelistedUsers).to.be.greaterThan(0);
        });

        it("Should handle pagination efficiently for large whitelists", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, startDate, endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );

            // Add buyers (with duplicates to simulate large whitelist)
            const buyers = [];
            const numEntries = Math.min(100, accounts.length * 5); // Allow more duplicates
            for (let i = 0; i < numEntries; i++) {
                buyers.push(accounts[i % accounts.length].address);
            }
            
            console.log(`Adding ${buyers.length} buyer entries to whitelist...`);
            const addStart = Date.now();
            await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(1, buyers);
            const addEnd = Date.now();
            
            console.log(`Adding took ${addEnd - addStart}ms`);

            // Test pagination
            const pageSize = 10;
            let offset = 0;
            let allBuyers = [];
            let hasMore = true;
            
            console.log("Testing pagination...");
            const paginationStart = Date.now();
            
            while (hasMore) {
                const [buyersPage, more] = await dummyUpgradeUSDC.getContractWhitelistedBuyers(1, offset, pageSize);
                allBuyers = allBuyers.concat(buyersPage);
                hasMore = more;
                offset += pageSize;
                
                if (offset > 200) break; // Safety break
            }
            
            const paginationEnd = Date.now();
            
            console.log(`Pagination took ${paginationEnd - paginationStart}ms`);
            console.log(`Retrieved ${allBuyers.length} buyers via pagination`);
            
            expect(paginationEnd - paginationStart).to.be.lessThan(5000);
            expect(allBuyers.length).to.be.greaterThan(0);
        });
    });

    describe("Emergency Function Performance", function () {
        it("Should handle emergency operations efficiently", async function () {
            // Setup contracts with both AVAX and USDC
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            // Create AVAX contracts
            for (let i = 0; i < 10; i++) {
                await dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX", TRIGGER_PRICE, startDate, endDate,
                    false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, false,
                    { value: CONTRACT_RESERVE_AVAX }
                );
            }

            // Create USDC contracts
            for (let i = 0; i < 10; i++) {
                await mockUSDC.connect(seller).approve(await dummyUpgradeUSDC.getAddress(), CONTRACT_RESERVE_USDC);
                await dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX", TRIGGER_PRICE, startDate, endDate,
                    true, CONTRACT_RESERVE_USDC, INSURANCE_FEE, true, false
                );
            }

            // Test emergency pause/resume
            const pauseStart = Date.now();
            await dummyUpgradeUSDC.emergencyPause();
            expect(await dummyUpgradeUSDC.automationEnabled()).to.be.false;
            
            await dummyUpgradeUSDC.emergencyResume();
            expect(await dummyUpgradeUSDC.automationEnabled()).to.be.true;
            const pauseEnd = Date.now();
            
            console.log(`Emergency pause/resume took ${pauseEnd - pauseStart}ms`);
            expect(pauseEnd - pauseStart).to.be.lessThan(2000);

            // Test emergency recovery
            const contractBalance = await dummyUpgradeUSDC.getContractBalance();
            const usdcBalance = await dummyUpgradeUSDC.getUSDCBalance();
            
            console.log(`Contract AVAX balance: ${ethers.formatEther(contractBalance)} AVAX`);
            console.log(`Contract USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
            
            expect(contractBalance).to.be.greaterThan(0);
            expect(usdcBalance).to.be.greaterThan(0);

            // Test partial recovery
            const recoveryStart = Date.now();
            
            if (contractBalance > 0) {
                await dummyUpgradeUSDC.emergencyAvaxRecovery(
                    ethers.parseEther("0.01"),
                    owner.address
                );
            }
            
            if (usdcBalance > 0) {
                await dummyUpgradeUSDC.emergencyUSDCRecovery(
                    ethers.parseUnits("50", 6),
                    owner.address
                );
            }
            
            const recoveryEnd = Date.now();
            
            console.log(`Emergency recovery took ${recoveryEnd - recoveryStart}ms`);
            expect(recoveryEnd - recoveryStart).to.be.lessThan(3000);
        });
    });

    describe("Automation Performance with Whitelists", function () {
        it("Should maintain performance with whitelisted contracts", async function () {
            this.timeout(180000);

            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            console.log("Creating 50 whitelisted contracts...");

            // Create 50 contracts with whitelists
            for (let i = 0; i < 50; i++) {
                await dummyUpgradeUSDC.connect(seller).createContract(
                    "AVAX", TRIGGER_PRICE, startDate, endDate,
                    false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                    { value: CONTRACT_RESERVE_AVAX }
                );

                // Add buyer to whitelist
                await dummyUpgradeUSDC.connect(seller).addBuyerToWhitelist(i + 1, accounts[i % accounts.length].address);
            }

            await time.increase(11);

            // Purchase all contracts
            console.log("Purchasing all contracts...");
            for (let i = 0; i < 50; i++) {
                await dummyUpgradeUSDC.connect(accounts[i % accounts.length]).purchaseInsurance(i + 1, {
                    value: INSURANCE_FEE
                });
            }

            expect(await dummyUpgradeUSDC.activeContractsCount()).to.equal(50);

            // Configure automation for reasonable batch size
            await dummyUpgradeUSDC.configureAutomation(true, 1200000, 15, 3600);
            await dummyUpgradeUSDC.setTestPrice("AVAX", 15 * 10**8);

            // Test multiple automation cycles
            let totalProcessed = 0;
            let cycle = 1;
            const maxCycles = 5;

            while (totalProcessed < 50 && cycle <= maxCycles) {
                console.log(`Automation cycle ${cycle}...`);
                
                const cycleStart = Date.now();
                const tx = await dummyUpgradeUSDC.performTimeBasedUpkeep();
                const receipt = await tx.wait();
                const cycleEnd = Date.now();

                const newTotal = await dummyUpgradeUSDC.totalTriggeredContracts();
                const processedThisCycle = Number(newTotal) - totalProcessed;
                totalProcessed = Number(newTotal);

                console.log(`Cycle ${cycle}: ${processedThisCycle} contracts, ${cycleEnd - cycleStart}ms, ${receipt.gasUsed} gas`);

                expect(processedThisCycle).to.be.lessThanOrEqual(15);
                expect(Number(receipt.gasUsed)).to.be.lessThan(1200000);
                expect(cycleEnd - cycleStart).to.be.lessThan(10000);

                cycle++;
                
                if (totalProcessed < 50) {
                    await time.increase(3600); // Fast forward for next cycle
                }
            }

            console.log(`Total processed: ${totalProcessed} contracts in ${cycle - 1} cycles`);
            expect(totalProcessed).to.be.greaterThan(0);
        });
    });

    describe("Memory and Storage Efficiency", function () {
        it("Should efficiently manage whitelist storage", async function () {
            const currentTime = await time.latest();
            const startDate = currentTime + 10;
            const endDate = startDate + 3600;

            await dummyUpgradeUSDC.connect(seller).createContract(
                "AVAX", TRIGGER_PRICE, startDate, endDate,
                false, CONTRACT_RESERVE_AVAX, INSURANCE_FEE, true, true,
                { value: CONTRACT_RESERVE_AVAX }
            );

            // Test add/remove cycles to check for storage leaks
            const buyers = [];
            const numBuyers = Math.min(20, accounts.length);
            for (let i = 0; i < numBuyers; i++) {
                buyers.push(accounts[i % accounts.length].address);
            }

            console.log("Testing add/remove cycles...");
            
            for (let cycle = 0; cycle < 3; cycle++) {
                console.log(`Storage cycle ${cycle + 1}/3`);
                
                // Add buyers
                const addStart = Date.now();
                await dummyUpgradeUSDC.connect(seller).batchAddBuyersToWhitelist(1, buyers);
                const addEnd = Date.now();
                
                let [totalWhitelisted] = await dummyUpgradeUSDC.getContractWhitelistStats(1);
                expect(totalWhitelisted).to.be.greaterThan(0);
                
                // Remove buyers
                const removeStart = Date.now();
                await dummyUpgradeUSDC.connect(seller).batchRemoveBuyersFromWhitelist(1, buyers);
                const removeEnd = Date.now();
                
                [totalWhitelisted] = await dummyUpgradeUSDC.getContractWhitelistStats(1);
                expect(totalWhitelisted).to.equal(0);
                
                console.log(`Cycle ${cycle + 1}: Add ${addEnd - addStart}ms, Remove ${removeEnd - removeStart}ms`);
                
                // Performance should remain consistent across cycles
                expect(addEnd - addStart).to.be.lessThan(5000);
                expect(removeEnd - removeStart).to.be.lessThan(5000);
            }
            
            console.log("Storage efficiency test completed");
        });
    });
});