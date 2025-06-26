// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract YieldForwardInsurance is AutomationCompatibleInterface, ReentrancyGuard, Pausable, Ownable {
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
    event PayoutClaimed(uint256 indexed contractId, address indexed buyer, uint256 amount);
    event InsuranceFeeClaimed(uint256 indexed contractId, address indexed seller, uint256 amount);
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
            gasDeposit: msg.value
        });
        
        if (_reserveToken == address(0)) {
            if (msg.value < GAS_DEPOSIT + _reserveAmount) revert InvalidReserveAmount();
        } else {
            IERC20(_reserveToken).transferFrom(msg.sender, address(this), _reserveAmount);
        }
        
        emit ContractCreated(contractId, msg.sender, _reserveAmount, _insuranceFee);
    }
    
    function purchaseInsurance(uint256 _contractId) external payable whenNotPaused nonReentrant {
        InsuranceContract storage contract_ = contracts[_contractId];
        
        if (contract_.seller == address(0)) revert ContractNotFound();
        if (contract_.state != ContractState.Created) revert InvalidState();
        if (block.timestamp >= contract_.endDate) revert ContractExpired();
        if (msg.value != contract_.insuranceFee) revert InvalidInsuranceFee();
        
        contract_.buyer = msg.sender;
        contract_.state = ContractState.Active;
        
        emit InsurancePurchased(_contractId, msg.sender);
    }
    
    function cancelContract(uint256 _contractId) external nonReentrant {
        InsuranceContract storage contract_ = contracts[_contractId];
        
        if (contract_.seller != msg.sender) revert NotSeller();
        if (contract_.state != ContractState.Created) revert InvalidState();
        
        contract_.state = ContractState.Cancelled;
        
        if (contract_.reserveToken == address(0)) {
            (bool success, ) = contract_.seller.call{value: contract_.reserveAmount + contract_.gasDeposit}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(contract_.reserveToken).transfer(contract_.seller, contract_.reserveAmount);
            (bool success, ) = contract_.seller.call{value: contract_.gasDeposit}("");
            if (!success) revert TransferFailed();
        }
        
        emit ContractCancelled(_contractId);
    }
    
    function triggerPayout(uint256 _contractId) external whenNotPaused nonReentrant {
        InsuranceContract storage contract_ = contracts[_contractId];
        
        if (contract_.seller == address(0)) revert ContractNotFound();
        if (contract_.state != ContractState.Active) revert InvalidState();
        if (block.timestamp >= contract_.endDate) revert ContractExpired();
        if (block.timestamp < contract_.startDate) revert InvalidState();
        
        uint256 currentPrice = getCurrentPrice();
        if (currentPrice >= contract_.triggerPrice) revert ConditionNotMet();
        
        contract_.state = ContractState.Triggered;
        emit PayoutTriggered(_contractId, currentPrice);
    }
    
    function claimPayout(uint256 _contractId) external nonReentrant {
        InsuranceContract storage contract_ = contracts[_contractId];
        
        if (contract_.seller == address(0)) revert ContractNotFound();
        if (contract_.state != ContractState.Triggered) revert InvalidState();
        if (contract_.payoutClaimed) revert InvalidState();
        
        contract_.payoutClaimed = true;
        
        if (contract_.reserveToken == address(0)) {
            (bool success, ) = contract_.buyer.call{value: contract_.reserveAmount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(contract_.reserveToken).transfer(contract_.buyer, contract_.reserveAmount);
        }
        
        emit PayoutClaimed(_contractId, contract_.buyer, contract_.reserveAmount);
    }
    
    function withdrawInsuranceFee(uint256 _contractId) external nonReentrant {
        InsuranceContract storage contract_ = contracts[_contractId];
        
        if (contract_.seller != msg.sender) revert NotSeller();
        if (block.timestamp < contract_.endDate) revert ContractNotExpired();
        if (contract_.state == ContractState.Triggered) revert InvalidState();
        if (contract_.feeClaimed) revert InvalidState();
        
        contract_.feeClaimed = true;
        contract_.state = ContractState.Expired;
        
        uint256 totalAmount = contract_.insuranceFee + contract_.gasDeposit;
        (bool success, ) = contract_.seller.call{value: totalAmount}("");
        if (!success) revert TransferFailed();
        
        emit InsuranceFeeClaimed(_contractId, contract_.seller, contract_.insuranceFee);
    }
    
    function withdrawReserve(uint256 _contractId) external nonReentrant {
        InsuranceContract storage contract_ = contracts[_contractId];
        
        if (contract_.seller != msg.sender) revert NotSeller();
        if (block.timestamp < contract_.endDate) revert ContractNotExpired();
        if (contract_.state == ContractState.Triggered) revert InvalidState();
        
        if (contract_.reserveToken == address(0)) {
            (bool success, ) = contract_.seller.call{value: contract_.reserveAmount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(contract_.reserveToken).transfer(contract_.seller, contract_.reserveAmount);
        }
    }
    
    function getCurrentPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return uint256(price);
    }
    
    function checkUpkeep(bytes calldata checkData) 
        external view override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        uint256[] memory contractIds = abi.decode(checkData, (uint256[]));
        uint256[] memory triggerableContracts = new uint256[](contractIds.length);
        uint256 count = 0;
        uint256 currentPrice = getCurrentPrice();
        
        for (uint256 i = 0; i < contractIds.length; i++) {
            uint256 contractId = contractIds[i];
            InsuranceContract storage contract_ = contracts[contractId];
            
            if (contract_.state == ContractState.Active &&
                block.timestamp >= contract_.startDate &&
                block.timestamp < contract_.endDate &&
                currentPrice < contract_.triggerPrice) {
                triggerableContracts[count] = contractId;
                count++;
            }
        }
        
        if (count > 0) {
            uint256[] memory result = new uint256[](count);
            for (uint256 i = 0; i < count; i++) {
                result[i] = triggerableContracts[i];
            }
            upkeepNeeded = true;
            performData = abi.encode(result);
        }
    }
    
    function performUpkeep(bytes calldata performData) external override {
        uint256[] memory contractIds = abi.decode(performData, (uint256[]));
        
        for (uint256 i = 0; i < contractIds.length; i++) {
            try this.triggerPayout(contractIds[i]) {
            } catch {
            }
        }
    }
    
    function emergencyWithdraw(uint256 _contractId) external onlyOwner {
        InsuranceContract storage contract_ = contracts[_contractId];
        if (contract_.seller == address(0)) revert ContractNotFound();
        
        if (contract_.reserveToken == address(0)) {
            (bool success, ) = contract_.seller.call{value: contract_.reserveAmount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(contract_.reserveToken).transfer(contract_.seller, contract_.reserveAmount);
        }
        
        if (contract_.buyer != address(0)) {
            (bool success, ) = contract_.buyer.call{value: contract_.insuranceFee}("");
            if (!success) revert TransferFailed();
        }
        
        contract_.state = ContractState.Cancelled;
        emit EmergencyWithdrawal(_contractId);
    }
    
    function getContractDetails(uint256 _contractId) external view returns (InsuranceContract memory) {
        return contracts[_contractId];
    }
    
    function checkContractStatus(uint256 _contractId) external view returns (ContractState) {
        return contracts[_contractId].state;
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}