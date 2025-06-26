const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("YieldForward Insurance", function () {
  let insurance, mockPriceFeed, owner, seller, buyer;
  const DEFAULT_RESERVE = ethers.parseEther("1");
  const DEFAULT_FEE = ethers.parseEther("0.1");
  const GAS_DEPOSIT = ethers.parseEther("0.01");
  const TRIGGER_PRICE = 30_00000000;
  const HIGH_PRICE = 35_00000000;
  const LOW_PRICE = 25_00000000;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();
    
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    mockPriceFeed = await MockV3Aggregator.deploy(8, HIGH_PRICE);
    
    const YieldForwardInsurance = await ethers.getContractFactory("YieldForwardInsurance");
    insurance = await YieldForwardInsurance.deploy(await mockPriceFeed.getAddress());
  });

  describe("Contract Creation", function () {
    it("Should create contract with AVAX reserve", async function () {
      const startDate = await time.latest() + 3600;
      const endDate = startDate + 86400;

      await expect(insurance.connect(seller).createContract(
        ethers.ZeroAddress, DEFAULT_RESERVE, DEFAULT_FEE, TRIGGER_PRICE, startDate, endDate,
        { value: DEFAULT_RESERVE + GAS_DEPOSIT }
      )).to.emit(insurance, "ContractCreated").withArgs(0, seller.address, DEFAULT_RESERVE, DEFAULT_FEE);

      const contract = await insurance.getContractDetails(0);
      expect(contract.seller).to.equal(seller.address);
      expect(contract.state).to.equal(0);
    });

    it("Should revert with invalid reserve", async function () {
      const startDate = await time.latest() + 3600;
      const endDate = startDate + 86400;

      await expect(insurance.connect(seller).createContract(
        ethers.ZeroAddress, ethers.parseEther("0.05"), DEFAULT_FEE, TRIGGER_PRICE, startDate, endDate,
        { value: GAS_DEPOSIT }
      )).to.be.revertedWithCustomError(insurance, "InvalidReserveAmount");
    });
  });

  describe("Insurance Purchase", function () {
    let contractId, startDate, endDate;

    beforeEach(async function () {
      startDate = await time.latest() + 3600;
      endDate = startDate + 86400;
      await insurance.connect(seller).createContract(
        ethers.ZeroAddress, DEFAULT_RESERVE, DEFAULT_FEE, TRIGGER_PRICE, startDate, endDate,
        { value: DEFAULT_RESERVE + GAS_DEPOSIT }
      );
      contractId = 0;
    });

    it("Should allow buyer to purchase", async function () {
      await expect(insurance.connect(buyer).purchaseInsurance(contractId, { value: DEFAULT_FEE }))
        .to.emit(insurance, "InsurancePurchased").withArgs(contractId, buyer.address);

      const contract = await insurance.getContractDetails(contractId);
      expect(contract.buyer).to.equal(buyer.address);
      expect(contract.state).to.equal(1);
    });

    it("Should revert wrong fee", async function () {
      await expect(insurance.connect(buyer).purchaseInsurance(contractId, { value: ethers.parseEther("0.05") }))
        .to.be.revertedWithCustomError(insurance, "InvalidInsuranceFee");
    });
  });

  describe("Payout System", function () {
    let contractId;

    beforeEach(async function () {
      const startDate = await time.latest() + 3600;
      const endDate = startDate + 86400;
      await insurance.connect(seller).createContract(
        ethers.ZeroAddress, DEFAULT_RESERVE, DEFAULT_FEE, TRIGGER_PRICE, startDate, endDate,
        { value: DEFAULT_RESERVE + GAS_DEPOSIT }
      );
      await insurance.connect(buyer).purchaseInsurance(0, { value: DEFAULT_FEE });
      contractId = 0;
    });

    it("Should trigger payout when price drops", async function () {
      await time.increaseTo(await time.latest() + 3700);
      await mockPriceFeed.updateAnswer(LOW_PRICE);

      await expect(insurance.triggerPayout(contractId))
        .to.emit(insurance, "PayoutTriggered").withArgs(contractId, LOW_PRICE);

      const contract = await insurance.getContractDetails(contractId);
      expect(contract.state).to.equal(2);
    });

    it("Should allow claiming payout", async function () {
      await time.increaseTo(await time.latest() + 3700);
      await mockPriceFeed.updateAnswer(LOW_PRICE);
      await insurance.triggerPayout(contractId);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      await expect(insurance.claimPayout(contractId))
        .to.emit(insurance, "PayoutClaimed").withArgs(contractId, buyer.address, DEFAULT_RESERVE);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(DEFAULT_RESERVE);
    });

    it("Should revert if condition not met", async function () {
      await time.increaseTo(await time.latest() + 3700);
      await expect(insurance.triggerPayout(contractId))
        .to.be.revertedWithCustomError(insurance, "ConditionNotMet");
    });
  });

  describe("Fee Withdrawal", function () {
    let contractId, endDate;

    beforeEach(async function () {
      const startDate = await time.latest() + 3600;
      endDate = startDate + 86400;
      await insurance.connect(seller).createContract(
        ethers.ZeroAddress, DEFAULT_RESERVE, DEFAULT_FEE, TRIGGER_PRICE, startDate, endDate,
        { value: DEFAULT_RESERVE + GAS_DEPOSIT }
      );
      await insurance.connect(buyer).purchaseInsurance(0, { value: DEFAULT_FEE });
      contractId = 0;
    });

    it("Should allow seller to withdraw fee after expiry", async function () {
      await time.increaseTo(endDate + 1);

      await expect(insurance.connect(seller).withdrawInsuranceFee(contractId))
        .to.emit(insurance, "InsuranceFeeClaimed").withArgs(contractId, seller.address, DEFAULT_FEE);
    });

    it("Should revert if not expired", async function () {
      await expect(insurance.connect(seller).withdrawInsuranceFee(contractId))
        .to.be.revertedWithCustomError(insurance, "ContractNotExpired");
    });
  });

  describe("Automation", function () {
    it("Should detect upkeep needed", async function () {
      const startDate = await time.latest() + 3600;
      const endDate = startDate + 86400;
      await insurance.connect(seller).createContract(
        ethers.ZeroAddress, DEFAULT_RESERVE, DEFAULT_FEE, TRIGGER_PRICE, startDate, endDate,
        { value: DEFAULT_RESERVE + GAS_DEPOSIT }
      );
      await insurance.connect(buyer).purchaseInsurance(0, { value: DEFAULT_FEE });
      
      await time.increaseTo(startDate + 100);
      await mockPriceFeed.updateAnswer(LOW_PRICE);

      const checkData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256[]"], [[0]]);
      const [upkeepNeeded] = await insurance.checkUpkeep(checkData);
      expect(upkeepNeeded).to.be.true;
    });
  });
});