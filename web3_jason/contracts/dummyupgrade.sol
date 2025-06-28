// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DummyUpgrade - Time-Based Automated Insurance Contract
 * @dev Enhanced insurance contract with Chainlink Time-based Automation only
 * 
 * Features:
 * - Real-time price monitoring via Chainlink Price Feeds
 * - Time-based automated payout execution via Chainlink Time-based Upkeep
 * - Multiple trigger conditions support
 * - Gas-optimized time-based automation checks
 * - Emergency controls and safety mechanisms
 */
contract DummyUpgrade is ReentrancyGuard, Ownable {
    /**
     * @dev Enhanced structure for insurance contracts
     */
    struct Contract {
        address seller;           // Contract creator
        address buyer;            // Insurance purchaser
        address beneficiary;      // Payout recipient
        address feeReceiver;      // Fee recipient
        string triggerToken;      // Monitored token symbol
        uint256 triggerPrice;     // Trigger price threshold (scaled by 10^8)
        string reserveToken;      // Payout token
        uint256 reserveAmount;    // Payout amount (in wei)
        uint256 insuranceFee;     // Purchase fee (in wei)
        uint256 startDate;        // Activation timestamp
        uint256 endDate;          // Expiration timestamp
        uint256 lastCheckTime;    // Last automation check timestamp
        bool active;              // Purchase status
        bool triggered;           // Trigger status
        bool claimed;             // Claim status
        bool autoExecute;         // Enable automatic payout execution
    }
    
    /// @dev Contract storage mapping
    mapping(uint256 => Contract) public contracts;
    
    /// @dev Enhanced tracking variables
    uint256 public contractCounter;
    uint256 public activeContractsCount;
    uint256 public totalTriggeredContracts;
    uint256 public automationGasLimit = 500000;
    uint256 public maxContractsPerCheck = 50; // Gas optimization
    
    /// @dev Price feed interfaces for different tokens
    mapping(string => AggregatorV3Interface) public priceFeeds;
    
    /// @dev Test mode configuration
    bool public testMode = true;
    mapping(string => uint256) public testPrices;
    
    /// @dev Time-based automation configuration
    bool public automationEnabled = true;
    uint256 public lastGlobalCheck;
    uint256 public automationInterval = 3600; // Time interval in seconds (1 hour default)
    
    /**
     * @dev Enhanced events for real-time monitoring
     */
    event ContractCreated(
        uint256 indexed contractId,
        address indexed seller,
        string triggerToken,
        uint256 triggerPrice,
        uint256 reserveAmount,
        bool autoExecute
    );
    
    event ContractPurchased(
        uint256 indexed contractId,
        address indexed buyer,
        uint256 timestamp
    );
    
    event PayoutTriggered(
        uint256 indexed contractId,
        address indexed buyer,
        uint256 amount,
        uint256 currentPrice,
        uint256 triggerPrice,
        bool autoExecuted
    );
    
    event PayoutClaimed(
        uint256 indexed contractId,
        address indexed beneficiary,
        uint256 amount
    );
    
    event AutomationExecuted(
        uint256 totalChecked,
        uint256 totalTriggered,
        uint256 gasUsed
    );
    
    event PriceFeedUpdated(
        string indexed token,
        address indexed feedAddress
    );
    
    event AutomationConfigChanged(
        bool enabled,
        uint256 gasLimit,
        uint256 maxContractsPerCheck,
        uint256 timeInterval
    );

    event ReserveWithdrawn(
        uint256 indexed contractId,
        address indexed seller,
        uint256 amount
    );

    /**
     * @dev Constructor with multiple price feed support
     * @param _avaxPriceFeed AVAX/USD price feed address
     */
    constructor(address _avaxPriceFeed) {
        if (_avaxPriceFeed != address(0)) {
            priceFeeds["AVAX"] = AggregatorV3Interface(_avaxPriceFeed);
            testPrices["AVAX"] = 25 * 10**8; // Default $25
        }
        
        // Initialize common test prices
        testPrices["BTC"] = 30000 * 10**8;   // $30,000
        testPrices["ETH"] = 2000 * 10**8;    // $2,000
        testPrices["USDC"] = 1 * 10**8;      // $1
        
        lastGlobalCheck = block.timestamp;
    }

    /**
     * @dev Enhanced contract creation with automation features
     */
    function createContract(
        string memory _triggerToken,
        uint256 _triggerPrice,
        uint256 _startDate,
        uint256 _endDate,
        string memory _reserveToken,
        uint256 _reserveAmount,
        uint256 _insuranceFee,
        bool _autoExecute
    ) external payable {
        require(msg.value >= _reserveAmount, "Insufficient reserve sent");
        require(_endDate > _startDate, "Invalid date range");
        require(_endDate > block.timestamp, "End date must be in future");
        require(_triggerPrice > 0, "Invalid trigger price");
        
        contractCounter++;
        
        contracts[contractCounter] = Contract({
            seller: msg.sender,
            buyer: address(0),
            beneficiary: address(0),
            feeReceiver: msg.sender,
            triggerToken: _triggerToken,
            triggerPrice: _triggerPrice,
            reserveToken: _reserveToken,
            reserveAmount: _reserveAmount,
            insuranceFee: _insuranceFee,
            startDate: _startDate,
            endDate: _endDate,
            lastCheckTime: 0,
            active: false,
            triggered: false,
            claimed: false,
            autoExecute: _autoExecute
        });
        
        emit ContractCreated(
            contractCounter, 
            msg.sender, 
            _triggerToken, 
            _triggerPrice, 
            _reserveAmount,
            _autoExecute
        );
    }

    /**
     * @dev Enhanced purchase function with activation
     */
    function purchaseInsurance(uint256 _contractId) external payable nonReentrant {
        Contract storage c = contracts[_contractId];
        require(c.seller != address(0), "Contract does not exist");
        require(c.buyer == address(0), "Already purchased");
        require(msg.value >= c.insuranceFee, "Insufficient fee");
        require(block.timestamp >= c.startDate, "Not started");
        require(block.timestamp < c.endDate, "Expired");
        
        c.buyer = msg.sender;
        c.beneficiary = msg.sender;
        c.active = true;
        c.lastCheckTime = block.timestamp;
        
        activeContractsCount++;
        
        // Transfer fee to receiver
        payable(c.feeReceiver).transfer(c.insuranceFee);
        
        // Return excess payment
        if (msg.value > c.insuranceFee) {
            payable(msg.sender).transfer(msg.value - c.insuranceFee);
        }
        
        emit ContractPurchased(_contractId, msg.sender, block.timestamp);
    }

    /**
     * @dev Enhanced price retrieval with multiple feeds support
     */
    function getCurrentPrice(string memory _token) public view returns (uint256) {
        if (testMode) {
            return testPrices[_token];
        }
        
        AggregatorV3Interface feed = priceFeeds[_token];
        require(address(feed) != address(0), "Price feed not available");
        
        (, int256 price, , uint256 updatedAt, ) = feed.latestRoundData();
        require(price > 0, "Invalid price data");
        
        return uint256(price);
    }

    /**
     * @dev Safe internal trigger function with error handling
     */
    function _triggerPayoutSafe(uint256 _contractId) internal returns (bool success) {
        try this._triggerPayoutInternal(_contractId) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev Internal trigger function (external for try-catch)
     */
    function _triggerPayoutInternal(uint256 _contractId) external {
        require(msg.sender == address(this), "Internal function only");
        
        Contract storage c = contracts[_contractId];
        require(c.active && !c.triggered, "Invalid contract state");
        require(block.timestamp < c.endDate, "Contract expired");
        
        uint256 currentPrice = getCurrentPrice(c.triggerToken);
        require(currentPrice <= c.triggerPrice, "Price condition not met");
        
        c.triggered = true;
        c.lastCheckTime = block.timestamp;
        activeContractsCount--;
        totalTriggeredContracts++;
        
        bool autoExecuted = false;
        
        // Auto-execute payout if enabled
        if (c.autoExecute && !c.claimed) {
            c.claimed = true;
            payable(c.beneficiary).transfer(c.reserveAmount);
            autoExecuted = true;
        }
        
        emit PayoutTriggered(
            _contractId, 
            c.buyer, 
            c.reserveAmount, 
            currentPrice, 
            c.triggerPrice,
            autoExecuted
        );
        
        if (autoExecuted) {
            emit PayoutClaimed(_contractId, c.beneficiary, c.reserveAmount);
        }
    }

    /**
     * @dev Manual trigger with enhanced validation
     */
    function triggerPayout(uint256 _contractId) external {
        Contract storage c = contracts[_contractId];
        require(c.active, "Contract not active");
        require(!c.triggered, "Already triggered");
        require(block.timestamp < c.endDate, "Contract expired");
        
        uint256 currentPrice = getCurrentPrice(c.triggerToken);
        require(currentPrice <= c.triggerPrice, "Price condition not met");
        
        this._triggerPayoutInternal(_contractId);
    }

    /**
     * @dev Enhanced claim function
     */
    function claimPayout(uint256 _contractId) external nonReentrant {
        Contract storage c = contracts[_contractId];
        require(c.triggered, "Not triggered");
        require(!c.claimed, "Already claimed");
        require(msg.sender == c.beneficiary, "Not beneficiary");
        
        c.claimed = true;
        payable(c.beneficiary).transfer(c.reserveAmount);
        
        emit PayoutClaimed(_contractId, c.beneficiary, c.reserveAmount);
    }

    /**
     * @dev Add price feed for new token
     */
    function addPriceFeed(string memory _token, address _feedAddress) external onlyOwner {
        require(_feedAddress != address(0), "Invalid feed address");
        priceFeeds[_token] = AggregatorV3Interface(_feedAddress);
        emit PriceFeedUpdated(_token, _feedAddress);
    }

    /**
     * @dev Configure time-based automation settings
     */
    function configureAutomation(
        bool _enabled,
        uint256 _gasLimit,
        uint256 _maxContractsPerCheck,
        uint256 _timeInterval
    ) external onlyOwner {
        automationEnabled = _enabled;
        automationGasLimit = _gasLimit;
        maxContractsPerCheck = _maxContractsPerCheck;
        automationInterval = _timeInterval;
        
        emit AutomationConfigChanged(_enabled, _gasLimit, _maxContractsPerCheck, _timeInterval);
    }

    /**
     * @dev Set test price for specific token
     */
    function setTestPrice(string memory _token, uint256 _price) external onlyOwner {
        require(testMode, "Not in test mode");
        testPrices[_token] = _price;
    }

    /**
     * @dev Toggle test mode
     */
    function setTestMode(bool _testMode) external onlyOwner {
        testMode = _testMode;
    }

    /**
     * @dev Get automation statistics
     */
    function getAutomationStats() external view returns (
        uint256 totalContracts,
        uint256 activeContracts,
        uint256 triggeredContracts,
        uint256 lastCheck,
        bool enabled
    ) {
        return (
            contractCounter,
            activeContractsCount,
            totalTriggeredContracts,
            lastGlobalCheck,
            automationEnabled
        );
    }

    /**
     * @dev Enhanced contract getter with automation info
     */
    function getContract(uint256 _contractId) external view returns (
        address seller,
        address buyer,
        address beneficiary,
        address feeReceiver,
        string memory triggerToken,
        uint256 triggerPrice,
        string memory reserveToken,
        uint256 reserveAmount,
        uint256 insuranceFee,
        uint256 startDate,
        uint256 endDate,
        bool active,
        bool triggered,
        bool claimed,
        bool autoExecute,
        uint256 lastCheckTime
    ) {
        Contract storage c = contracts[_contractId];
        return (
            c.seller, c.buyer, c.beneficiary, c.feeReceiver,
            c.triggerToken, c.triggerPrice, c.reserveToken,
            c.reserveAmount, c.insuranceFee, c.startDate, c.endDate,
            c.active, c.triggered, c.claimed, c.autoExecute, c.lastCheckTime
        );
    }

    /**
     * @dev Emergency functions for contract management
     */
    function emergencyPause() external onlyOwner {
        automationEnabled = false;
    }

    function emergencyResume() external onlyOwner {
        automationEnabled = true;
        lastGlobalCheck = block.timestamp;
    }

    /**
     * @dev Withdraw remaining reserve (enhanced with automation cleanup)
     */
    function withdrawReserve(uint256 _contractId) external nonReentrant {
        Contract storage c = contracts[_contractId];
        require(c.seller == msg.sender, "Only seller");
        require(c.reserveAmount > 0, "No reserve");
        
        if (block.timestamp < c.endDate) {
            require(!c.active, "Still active");
        } else {
            require(!c.triggered, "Was triggered");
            if (c.active) {
                activeContractsCount--;
                c.active = false;
            }
        }
        
        uint256 refundAmount = c.reserveAmount;
        c.reserveAmount = 0;
        
        payable(msg.sender).transfer(refundAmount);
        emit ReserveWithdrawn(_contractId, msg.sender, refundAmount);
    }

    /**
     * @dev Get active contracts for automation monitoring
     */
    function getActiveContracts() external view returns (uint256[] memory) {
        uint256[] memory activeIds = new uint256[](activeContractsCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= contractCounter; i++) {
            if (contracts[i].active && !contracts[i].triggered && 
                block.timestamp < contracts[i].endDate) {
                activeIds[index] = i;
                index++;
            }
        }
        
        return activeIds;
    }

    // Keep existing view functions for compatibility
    function getAllContracts() external view returns (uint256[] memory) {
        uint256[] memory allContracts = new uint256[](contractCounter);
        for (uint256 i = 1; i <= contractCounter; i++) {
            allContracts[i-1] = i;
        }
        return allContracts;
    }

    function getContractsByUser(address _user) external view returns (uint256[] memory) {
        uint256[] memory userContracts = new uint256[](contractCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= contractCounter; i++) {
            if (contracts[i].seller == _user || contracts[i].buyer == _user) {
                userContracts[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = userContracts[i];
        }
        return result;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev MAIN TIME-BASED AUTOMATION FUNCTION
     * This function will be called at regular intervals by Chainlink Time-based Upkeep
     */
    function performTimeBasedUpkeep() external {
        require(automationEnabled, "Automation disabled");
        
        uint256 gasStart = gasleft();
        uint256 successfulTriggers = 0;
        uint256 checked = 0;
        
        // Update last check time
        lastGlobalCheck = block.timestamp;
        
        // Check all active contracts for trigger conditions
        for (uint256 i = 1; i <= contractCounter && checked < maxContractsPerCheck; i++) {
            Contract storage c = contracts[i];
            
            // Skip if not eligible for checking
            if (!c.active || c.triggered || block.timestamp >= c.endDate) {
                continue;
            }
            
            checked++;
            
            // Break if running low on gas
            if (gasleft() < 100000) {
                break;
            }
            
            // Check price trigger condition
            try this.getCurrentPrice(c.triggerToken) returns (uint256 currentPrice) {
                if (currentPrice <= c.triggerPrice) {
                    // Trigger payout for this contract
                    if (_triggerPayoutSafe(i)) {
                        successfulTriggers++;
                    }
                }
            } catch {
                // Skip contracts with price feed issues
                continue;
            }
        }
        
        uint256 gasUsed = gasStart - gasleft();
        emit AutomationExecuted(checked, successfulTriggers, gasUsed);
    }

    /**
     * @dev Get time-based upkeep status
     */
    function getTimeBasedStatus() external view returns (
        uint256 eligibleContracts,
        uint256 nextCheckTime,
        bool canExecute
    ) {
        uint256 eligible = 0;
        
        for (uint256 i = 1; i <= contractCounter; i++) {
            Contract storage c = contracts[i];
            if (c.active && !c.triggered && block.timestamp < c.endDate) {
                eligible++;
            }
        }
        
        return (
            eligible,
            lastGlobalCheck + automationInterval,
            automationEnabled && eligible > 0
        );
    }
}