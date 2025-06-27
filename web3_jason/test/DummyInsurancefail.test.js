const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DummyInsurance", function () {
    let dummyInsurance;
    let owner, seller, buyer, newBeneficiary, newFeeReceiver;
    
    // Test data
    const TRIGGER_TOKEN = "AVAX";
    const TRIGGER_PRICE = ethers.parseEther("25"); // $25 in wei
    const RESERVE_TOKEN = "AVAX";
    const RESERVE_AMOUNT = ethers.parseEther("1"); // 1 AVAX
    const INSURANCE_FEE = ethers.parseEther("0.1"); // 0.1 AVAX
    const START_DATE = Math.floor(Date.now() / 1000); // Current timestamp
    const END_DATE = START_DATE + (30 * 24 * 60 * 60); // 30 days later

    beforeEach(async function () {
        // Get signers
        [owner, seller, buyer, newBeneficiary, newFeeReceiver] = await ethers.getSigners();
        
        // Deploy contract
        const DummyInsurance = await ethers.getContractFactory("DummyInsurance");
        dummyInsurance = await DummyInsurance.deploy(ethers.ZeroAddress); // No price feed for testing
        await dummyInsurance.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await dummyInsurance.owner()).to.equal(owner.address);
        });

        it("Should start with contract counter at 0", async function () {
            expect(await dummyInsurance.contractCounter()).to.equal(0);
        });

        it("Should be in test mode", async function () {
            expect(await dummyInsurance.testMode()).to.equal(true);
        });
    });

    describe("Contract Creation", function () {
        it("Should create a new insurance contract", async function () {
            await expect(
                dummyInsurance.connect(seller).createContract(
                    TRIGGER_TOKEN,
                    TRIGGER_PRICE,
                    START_DATE,
                    END_DATE,
                    RESERVE_TOKEN,
                    RESERVE_AMOUNT,
                    INSURANCE_FEE,
                    { value: RESERVE_AMOUNT }
                )
            ).to.emit(dummyInsurance, "ContractCreated")
             .withArgs(1, seller.address, TRIGGER_TOKEN, TRIGGER_PRICE);

            expect(await dummyInsurance.contractCounter()).to.equal(1);
        });

        it("Should fail if insufficient AVAX sent for reserve", async function () {
            await expect(
                dummyInsurance.connect(seller).createContract(
                    TRIGGER_TOKEN,
                    TRIGGER_PRICE,
                    START_DATE,
                    END_DATE,
                    RESERVE_TOKEN,
                    RESERVE_AMOUNT,
                    INSURANCE_FEE,
                    { value: ethers.parseEther("0.5") } // Less than reserve amount
                )
            ).to.be.revertedWith("Must send enough AVAX for reserve");
        });

        it("Should fail if end date is before start date", async function () {
            await expect(
                dummyInsurance.connect(seller).createContract(
                    TRIGGER_TOKEN,
                    TRIGGER_PRICE,
                    END_DATE,
                    START_DATE, // Swapped dates
                    RESERVE_TOKEN,
                    RESERVE_AMOUNT,
                    INSURANCE_FEE,
                    { value: RESERVE_AMOUNT }
                )
            ).to.be.revertedWith("End date must be after start date");
        });

        it("Should store contract details correctly", async function () {
            await dummyInsurance.connect(seller).createContract(
                TRIGGER_TOKEN,
                TRIGGER_PRICE,
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                RESERVE_AMOUNT,
                INSURANCE_FEE,
                { value: RESERVE_AMOUNT }
            );

            const contract = await dummyInsurance.getContract(1);
            expect(contract.seller).to.equal(seller.address);
            expect(contract.buyer).to.equal(ethers.ZeroAddress);
            expect(contract.beneficiary).to.equal(ethers.ZeroAddress);
            expect(contract.feeReceiver).to.equal(seller.address);
            expect(contract.triggerToken).to.equal(TRIGGER_TOKEN);
            expect(contract.triggerPrice).to.equal(TRIGGER_PRICE);
            expect(contract.reserveToken).to.equal(RESERVE_TOKEN);
            expect(contract.reserveAmount).to.equal(RESERVE_AMOUNT);
            expect(contract.insuranceFee).to.equal(INSURANCE_FEE);
            expect(contract.active).to.equal(false);
            expect(contract.triggered).to.equal(false);
            expect(contract.claimed).to.equal(false);
        });
    });

    describe("Contract Purchase", function () {
        beforeEach(async function () {
            // Create a contract first
            await dummyInsurance.connect(seller).createContract(
                TRIGGER_TOKEN,
                TRIGGER_PRICE,
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                RESERVE_AMOUNT,
                INSURANCE_FEE,
                { value: RESERVE_AMOUNT }
            );
        });

        it("Should allow buyer to purchase insurance", async function () {
            await expect(
                dummyInsurance.connect(buyer).purchaseInsurance(1, {
                    value: INSURANCE_FEE
                })
            ).to.emit(dummyInsurance, "ContractPurchased")
             .withArgs(1, buyer.address);

            const contract = await dummyInsurance.getContract(1);
            expect(contract.buyer).to.equal(buyer.address);
            expect(contract.beneficiary).to.equal(buyer.address);
            expect(contract.active).to.equal(true);
        });

        it("Should fail if insufficient fee paid", async function () {
            await expect(
                dummyInsurance.connect(buyer).purchaseInsurance(1, {
                    value: ethers.parseEther("0.05") // Less than required fee
                })
            ).to.be.revertedWith("Must pay full insurance fee");
        });

        it("Should fail if contract doesn't exist", async function () {
            await expect(
                dummyInsurance.connect(buyer).purchaseInsurance(999, {
                    value: INSURANCE_FEE
                })
            ).to.be.revertedWith("Contract does not exist");
        });

        it("Should fail if contract already purchased", async function () {
            // First purchase
            await dummyInsurance.connect(buyer).purchaseInsurance(1, {
                value: INSURANCE_FEE
            });

            // Second purchase attempt
            await expect(
                dummyInsurance.connect(newBeneficiary).purchaseInsurance(1, {
                    value: INSURANCE_FEE
                })
            ).to.be.revertedWith("Contract already purchased");
        });
    });

    describe("Change Beneficiary", function () {
        beforeEach(async function () {
            // Create and purchase contract
            await dummyInsurance.connect(seller).createContract(
                TRIGGER_TOKEN,
                TRIGGER_PRICE,
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                RESERVE_AMOUNT,
                INSURANCE_FEE,
                { value: RESERVE_AMOUNT }
            );
            
            await dummyInsurance.connect(buyer).purchaseInsurance(1, {
                value: INSURANCE_FEE
            });
        });

        it("Should allow buyer to change beneficiary", async function () {
            await expect(
                dummyInsurance.connect(buyer).changeBeneficiary(1, newBeneficiary.address)
            ).to.emit(dummyInsurance, "BeneficiaryChanged")
             .withArgs(1, buyer.address, newBeneficiary.address);

            const contract = await dummyInsurance.getContract(1);
            expect(contract.beneficiary).to.equal(newBeneficiary.address);
        });

        it("Should fail if not called by buyer", async function () {
            await expect(
                dummyInsurance.connect(seller).changeBeneficiary(1, newBeneficiary.address)
            ).to.be.revertedWith("Only buyer can change beneficiary");
        });

        it("Should fail if contract not active", async function () {
            // Create a new unpurchased contract
            await dummyInsurance.connect(seller).createContract(
                TRIGGER_TOKEN,
                TRIGGER_PRICE,
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                RESERVE_AMOUNT,
                INSURANCE_FEE,
                { value: RESERVE_AMOUNT }
            );

            await expect(
                dummyInsurance.connect(buyer).changeBeneficiary(2, newBeneficiary.address)
            ).to.be.revertedWith("Only buyer can change beneficiary");
        });

        it("Should fail with invalid beneficiary address", async function () {
            await expect(
                dummyInsurance.connect(buyer).changeBeneficiary(1, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid beneficiary address");
        });
    });

    describe("Change Fee Receiver", function () {
        beforeEach(async function () {
            // Create contract (but don't purchase yet)
            await dummyInsurance.connect(seller).createContract(
                TRIGGER_TOKEN,
                TRIGGER_PRICE,
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                RESERVE_AMOUNT,
                INSURANCE_FEE,
                { value: RESERVE_AMOUNT }
            );
        });

        it("Should allow seller to change fee receiver", async function () {
            await expect(
                dummyInsurance.connect(seller).changeFeeReceiver(1, newFeeReceiver.address)
            ).to.emit(dummyInsurance, "FeeReceiverChanged")
             .withArgs(1, seller.address, newFeeReceiver.address);

            const contract = await dummyInsurance.getContract(1);
            expect(contract.feeReceiver).to.equal(newFeeReceiver.address);
        });

        it("Should fail if not called by seller", async function () {
            await expect(
                dummyInsurance.connect(buyer).changeFeeReceiver(1, newFeeReceiver.address)
            ).to.be.revertedWith("Only seller can change fee receiver");
        });

        it("Should fail if contract already purchased", async function () {
            // Purchase the contract first
            await dummyInsurance.connect(buyer).purchaseInsurance(1, {
                value: INSURANCE_FEE
            });

            await expect(
                dummyInsurance.connect(seller).changeFeeReceiver(1, newFeeReceiver.address)
            ).to.be.revertedWith("Cannot change fee receiver after purchase");
        });

        it("Should fail with invalid fee receiver address", async function () {
            await expect(
                dummyInsurance.connect(seller).changeFeeReceiver(1, ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid fee receiver address");
        });
    });

    describe("Trigger and Claim", function () {
        beforeEach(async function () {
            // Create and purchase contract
            await dummyInsurance.connect(seller).createContract(
                TRIGGER_TOKEN,
                TRIGGER_PRICE,
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                RESERVE_AMOUNT,
                INSURANCE_FEE,
                { value: RESERVE_AMOUNT }
            );
            
            await dummyInsurance.connect(buyer).purchaseInsurance(1, {
                value: INSURANCE_FEE
            });
        });

        it("Should allow owner to trigger payout manually", async function () {
            await expect(
                dummyInsurance.connect(owner).triggerPayout(1)
            ).to.emit(dummyInsurance, "PayoutTriggered")
             .withArgs(1, 25 * 10**8); // contractId and currentPrice (test price)

            const contract = await dummyInsurance.getContract(1);
            expect(contract.triggered).to.equal(true);
        });

        it("Should allow beneficiary to claim payout after trigger", async function () {
            // Trigger payout first
            await dummyInsurance.connect(owner).triggerPayout(1);

            // Get initial balance
            const initialBalance = await ethers.provider.getBalance(buyer.address);

            await expect(
                dummyInsurance.connect(buyer).claimPayout(1)
            ).to.emit(dummyInsurance, "PayoutClaimed")
             .withArgs(1, buyer.address, RESERVE_AMOUNT);

            // Check balance increased
            const finalBalance = await ethers.provider.getBalance(buyer.address);
            expect(finalBalance).to.be.gt(initialBalance);

            const contract = await dummyInsurance.getContract(1);
            expect(contract.claimed).to.equal(true);
        });

        it("Should allow custom beneficiary to claim payout", async function () {
            // Change beneficiary first
            await dummyInsurance.connect(buyer).changeBeneficiary(1, newBeneficiary.address);
            
            // Trigger payout
            await dummyInsurance.connect(owner).triggerPayout(1);

            // Get initial balance
            const initialBalance = await ethers.provider.getBalance(newBeneficiary.address);

            await expect(
                dummyInsurance.connect(newBeneficiary).claimPayout(1)
            ).to.emit(dummyInsurance, "PayoutClaimed")
             .withArgs(1, newBeneficiary.address, RESERVE_AMOUNT);

            // Check balance increased
            const finalBalance = await ethers.provider.getBalance(newBeneficiary.address);
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("Should fail to claim if not triggered", async function () {
            await expect(
                dummyInsurance.connect(buyer).claimPayout(1)
            ).to.be.revertedWith("Payout not triggered yet");
        });

        it("Should fail to claim twice", async function () {
            // Trigger and claim once
            await dummyInsurance.connect(owner).triggerPayout(1);
            await dummyInsurance.connect(buyer).claimPayout(1);

            // Try to claim again
            await expect(
                dummyInsurance.connect(buyer).claimPayout(1)
            ).to.be.revertedWith("Payout already claimed");
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            // Create multiple contracts
            await dummyInsurance.connect(seller).createContract(
                TRIGGER_TOKEN,
                TRIGGER_PRICE,
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                RESERVE_AMOUNT,
                INSURANCE_FEE,
                { value: RESERVE_AMOUNT }
            );

            await dummyInsurance.connect(buyer).createContract(
                "BTC",
                ethers.parseEther("50000"),
                START_DATE,
                END_DATE,
                RESERVE_TOKEN,
                ethers.parseEther("2"),
                ethers.parseEther("0.2"),
                { value: ethers.parseEther("2") }
            );
        });

        it("Should return all contract IDs", async function () {
            const allContracts = await dummyInsurance.getAllContracts();
            expect(allContracts.length).to.equal(2);
            expect(allContracts[0]).to.equal(1);
            expect(allContracts[1]).to.equal(2);
        });

        it("Should return contracts by user", async function () {
            const sellerContracts = await dummyInsurance.getContractsByUser(seller.address);
            const buyerContracts = await dummyInsurance.getContractsByUser(buyer.address);
            
            expect(sellerContracts.length).to.equal(1);
            expect(sellerContracts[0]).to.equal(1);
            
            expect(buyerContracts.length).to.equal(1);
            expect(buyerContracts[0]).to.equal(2);
        });

        it("Should return contract balance", async function () {
            const balance = await dummyInsurance.getContractBalance();
            expect(balance).to.equal(ethers.parseEther("3")); // 1 + 2 AVAX from reserves
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to set test price", async function () {
            await expect(
                dummyInsurance.connect(owner).setTestPrice(30 * 10**8)
            ).to.not.be.reverted;

            await expect(
                dummyInsurance.connect(seller).setTestPrice(30 * 10**8)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});