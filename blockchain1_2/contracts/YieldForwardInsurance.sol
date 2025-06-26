// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract YieldForwardInsurance is AutomationCompatibleInterface, ReentrancyGuard, Pausable, Ownable (msg.sender) {
    enum ContractState { Created, Active, Triggered, Expired, Cancelled }
    
    struct InsuranceContract {
        address seller;
        address buyer;
        address reserveToken;
        uint256 reserveAmount;
        uint256 insuranceFee;
        uint256 triggerPrice;
        uint256 startDate;
        uint256 endDate;
        ContractState state;
        bool payoutClaimed;
        bool feeClaimed;
        uint256 gasDeposit;
        address payable beneficiary;
        address payable feeReceiver;
    }
    
    mapping(uint256 => InsuranceContract) public contracts;
    uint256 public contractCounter;
    AggregatorV3Interface public priceFeed;
    
    uint256 public constant MIN_RESERVE = 0.1 ether;
    uint256 public constant MAX_RESERVE = 10000 ether;
    uint256 public constant MIN_INSURANCE_FEE = 0.01 ether;
    uint256 public constant GAS_DEPOSIT = 0.01 ether;
    
    event ContractCreated(uint256 indexed contractId, address indexed seller, uint256 reserveAmount, uint256 insuranceFee);
    event InsurancePurchased(uint256 indexed contractId, address indexed buyer);
    event PayoutTriggered(uint256 indexed contractId, uint256 currentPrice);
    event PayoutClaimed(uint256 indexed contractId, address indexed beneficiary, uint256 amount);
    event InsuranceFeeClaimed(uint256 indexed contractId, address indexed feeReceiver, uint256 amount);
    event ContractCancelled(uint256 indexed contractId);
    event EmergencyWithdrawal(uint256 indexed contractId);
    
    error InvalidReserveAmount();
    error InvalidInsuranceFee();
    error InvalidTimeRange();
    error ContractNotFound();
    error NotSeller();
    error InvalidState();
    error ContractExpired();
    error ContractNotExpired();
    error InsufficientGasDeposit();
    error TransferFailed();
    error ConditionNotMet();
    
    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    function createContract(
        address _reserveToken,
        uint256 _reserveAmount,
        uint256 _insuranceFee,
        uint256 _triggerPrice,
        uint256 _startDate,
        uint256 _endDate
    ) external payable whenNotPaused nonReentrant {
        if (_reserveAmount < MIN_RESERVE || _reserveAmount > MAX_RESERVE) revert InvalidReserveAmount();
        if (_insuranceFee < MIN_INSURANCE_FEE) revert InvalidInsuranceFee();
        if (_startDate >= _endDate || _endDate <= block.timestamp) revert InvalidTimeRange();
        if (msg.value < GAS_DEPOSIT) revert InsufficientGasDeposit();
        
        uint256 contractId = contractCounter++;
        contracts[contractId] = InsuranceContract({
            seller: msg.sender,
            buyer: address(0),
            reserveToken: _reserveToken,
            reserveAmount: _reserveAmount,
            insuranceFee: _insuranceFee,
            triggerPrice: _triggerPrice,
            startDate: _startDate,
            endDate: _endDate,
            state: ContractState.Created,
            payoutClaimed: false,
            feeClaimed: false,
            gasDeposit: msg.value,
            beneficiary: payable(address(0)),
            feeReceiver: payable(msg.sender)
        });
        
        if (_reserveToken == address(0)) {
            if (msg.value < GAS_DEPOSIT + _reserveAmount) revert InvalidReserveAmount();
        } else {
            IERC20(_reserveToken).transferFrom(msg.sender, address(this), _reserveAmount);
        }
        
        emit ContractCreated(contractId, msg.sender, _reserveAmount, _insuranceFee);
    }
    
    function purchaseInsurance(uint256 _contractId) external payable whenNotPaused nonReentrant {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller == address(0)) revert ContractNotFound();
        if (c.state != ContractState.Created) revert InvalidState();
        if (block.timestamp >= c.endDate) revert ContractExpired();
        if (msg.value != c.insuranceFee) revert InvalidInsuranceFee();
        
        c.buyer = msg.sender;
        c.state = ContractState.Active;
        c.beneficiary = payable(msg.sender);
        
        emit InsurancePurchased(_contractId, msg.sender);
    }
    
    function changeBeneficiary(uint256 _contractId, address payable _newBeneficiary) external {
        InsuranceContract storage c = contracts[_contractId];
        if (c.buyer != msg.sender) revert InvalidState();
        if (c.state != ContractState.Active) revert InvalidState();
        c.beneficiary = _newBeneficiary;
    }
    
    function changeFeeReceiver(uint256 _contractId, address payable _newReceiver) external {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller != msg.sender) revert NotSeller();
        if (c.state != ContractState.Created) revert InvalidState();
        c.feeReceiver = _newReceiver;
    }
    
    function cancelContract(uint256 _contractId) external nonReentrant {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller != msg.sender) revert NotSeller();
        if (c.state != ContractState.Created) revert InvalidState();
        c.state = ContractState.Cancelled;
        
        if (c.reserveToken == address(0)) {
            (bool ok,) = c.seller.call{value: c.reserveAmount + c.gasDeposit}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(c.reserveToken).transfer(c.seller, c.reserveAmount);
            (bool ok,) = c.seller.call{value: c.gasDeposit}("");
            if (!ok) revert TransferFailed();
        }
        
        emit ContractCancelled(_contractId);
    }
    
    function triggerPayout(uint256 _contractId) external whenNotPaused nonReentrant {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller == address(0)) revert ContractNotFound();
        if (c.state != ContractState.Active) revert InvalidState();
        if (block.timestamp >= c.endDate) revert ContractExpired();
        if (block.timestamp < c.startDate) revert InvalidState();
        
        uint256 price = getCurrentPrice();
        if (price >= c.triggerPrice) revert ConditionNotMet();
        
        c.state = ContractState.Triggered;
        emit PayoutTriggered(_contractId, price);
    }
    
    function claimPayout(uint256 _contractId) external nonReentrant {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller == address(0)) revert ContractNotFound();
        if (c.state != ContractState.Triggered) revert InvalidState();
        if (c.payoutClaimed) revert InvalidState();
        
        c.payoutClaimed = true;
        if (c.reserveToken == address(0)) {
            (bool ok,) = c.beneficiary.call{value: c.reserveAmount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(c.reserveToken).transfer(c.beneficiary, c.reserveAmount);
        }
        
        emit PayoutClaimed(_contractId, c.beneficiary, c.reserveAmount);
    }
    
    function withdrawInsuranceFee(uint256 _contractId) external nonReentrant {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller != msg.sender) revert NotSeller();
        if (block.timestamp < c.endDate) revert ContractNotExpired();
        if (c.state == ContractState.Triggered) revert InvalidState();
        if (c.feeClaimed) revert InvalidState();
        
        c.feeClaimed = true;
        c.state = ContractState.Expired;
        uint256 total = c.insuranceFee + c.gasDeposit;
        
        (bool ok,) = c.feeReceiver.call{value: total}("");
        if (!ok) revert TransferFailed();
        
        emit InsuranceFeeClaimed(_contractId, c.feeReceiver, c.insuranceFee);
    }
    
    function withdrawReserve(uint256 _contractId) external nonReentrant {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller != msg.sender) revert NotSeller();
        if (block.timestamp < c.endDate) revert ContractNotExpired();
        if (c.state == ContractState.Triggered) revert InvalidState();
        
        if (c.reserveToken == address(0)) {
            (bool ok,) = c.seller.call{value: c.reserveAmount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(c.reserveToken).transfer(c.seller, c.reserveAmount);
        }
    }
    
    function getCurrentPrice() public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        return uint256(price);
    }
    
    function checkUpkeep(bytes calldata checkData) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256[] memory ids = abi.decode(checkData, (uint256[]));
        uint256[] memory toTrigger = new uint256[](ids.length);
        uint256 cnt;
        uint256 price = getCurrentPrice();
        for (uint i; i < ids.length; i++) {
            InsuranceContract storage c = contracts[ids[i]];
            if (c.state == ContractState.Active && block.timestamp >= c.startDate && block.timestamp < c.endDate && price < c.triggerPrice) {
                toTrigger[cnt++] = ids[i];
            }
        }
        if (cnt > 0) {
            uint256[] memory sel = new uint256[](cnt);
            for (uint i; i < cnt; i++) sel[i] = toTrigger[i];
            upkeepNeeded = true;
            performData = abi.encode(sel);
        }
    }
    
    function performUpkeep(bytes calldata performData) external override {
        uint256[] memory ids = abi.decode(performData, (uint256[]));
        for (uint i; i < ids.length; i++) {
            try this.triggerPayout(ids[i]) {} catch {}
        }
    }
    
    function emergencyWithdraw(uint256 _contractId) external onlyOwner {
        InsuranceContract storage c = contracts[_contractId];
        if (c.seller == address(0)) revert ContractNotFound();
        
        if (c.reserveToken == address(0)) {
            (bool ok1,) = c.seller.call{value: c.reserveAmount}("");
            if (!ok1) revert TransferFailed();
        } else {
            IERC20(c.reserveToken).transfer(c.seller, c.reserveAmount);
        }
        if (c.buyer != address(0)) {
            (bool ok2,) = c.beneficiary.call{value: c.insuranceFee}("");
            if (!ok2) revert TransferFailed();
        }
        
        c.state = ContractState.Cancelled;
        emit EmergencyWithdrawal(_contractId);
    }
    
    function getContractDetails(uint256 _contractId) external view returns (InsuranceContract memory) {
        return contracts[_contractId];
    }
    
    function checkContractStatus(uint256 _contractId) external view returns (ContractState) {
        return contracts[_contractId].state;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
