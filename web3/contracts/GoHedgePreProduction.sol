// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Import CCIP interfaces
import "./interfaces/CCIP.sol";

/**
 * @title GoHedgePreProduction - Time-Based Automated Insurance Contract with USDC Support, Simple Whitelist and CCIP Cross-Chain Sync
 * @dev Enhanced insurance contract with Chainlink Time-based Automation, USDC reserves, seller-controlled whitelist, and CCIP cross-chain whitelist synchronization
 * 
 * Features:
 * - Real-time price monitoring via Chainlink Price Feeds
 * - Time-based automated payout execution via Chainlink Time-based Upkeep
 * - USDC token support for reserves
 * - AVAX fees, USDC or AVAX reserves
 * - Gas-optimized time-based automation checks
 * - Emergency controls and safety mechanisms
 * - Simple whitelist system controlled by contract sellers
 * - CCIP cross-chain whitelist synchronization (NEW!)
 */
contract GoHedgePreProduction is ReentrancyGuard, Ownable, CCIPReceiver {
    using SafeERC20 for IERC20;

    /**
     * @dev Enhanced structure for insurance contracts with USDC support
     */
    struct Contract {
        address seller;                // Contract creator
        address buyer;                 // Insurance purchaser
        address beneficiary;           // Payout recipient
        address feeReceiver;           // Fee recipient
        string triggerToken;           // Monitored token symbol
        uint256 triggerPrice;          // Trigger price threshold (scaled by 10^8)
        bool isUSDCReserve;            // True if reserve is USDC, false if AVAX
        uint256 reserveAmount;         // Payout amount (in USDC units with 6 decimals or AVAX wei)
        uint256 insuranceFee;          // Purchase fee (always in AVAX wei)
        uint256 startDate;             // Activation timestamp
        uint256 endDate;               // Expiration timestamp
        uint256 lastCheckTime;         // Last automation check timestamp
        bool active;                   // Purchase status
        bool triggered;                // Trigger status
        bool claimed;                  // Claim status
        bool autoExecute;              // Enable automatic payout execution
        bool whitelistEnabled;         // Whether this contract uses whitelist
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
    
    /// @dev USDC token contract
    IERC20 public immutable usdcToken;
    
    /// @dev Test mode configuration
    bool public testMode = true;
    mapping(string => uint256) public testPrices;
    
    /// @dev Time-based automation configuration
    bool public automationEnabled = true;
    uint256 public lastGlobalCheck;
    uint256 public automationInterval = 3600; // Time interval in seconds (1 hour default)

    /// @dev Seller-controlled whitelist mappings
    /// @dev contractId => buyer address => is whitelisted
    mapping(uint256 => mapping(address => bool)) public contractWhitelist;
    /// @dev contractId => array of whitelisted addresses for enumeration
    mapping(uint256 => address[]) public contractWhitelistArray;
    /// @dev contractId => buyer address => index in array (for efficient removal)
    mapping(uint256 => mapping(address => uint256)) private whitelistIndex;

    // ===== NEW: CCIP Cross-Chain Functionality =====
    IRouterClient private immutable ccipRouter;
    
    // CCIP Chain Selectors
    uint64 private constant POLYGON_MUMBAI_CHAIN_SELECTOR = 12532609583862916517;
    uint64 private constant AVALANCHE_FUJI_CHAIN_SELECTOR = 14767482510784806043;
    uint64 private constant ETHEREUM_SEPOLIA_CHAIN_SELECTOR = 16015286601757825753;
    uint64 private constant POLYGON_MAINNET_CHAIN_SELECTOR = 4051577828743386545;
    uint64 private constant AVALANCHE_MAINNET_CHAIN_SELECTOR = 6433500567565415381;
    uint64 private constant ETHEREUM_MAINNET_CHAIN_SELECTOR = 5009297550715157269;
    
    // CCIP Configuration
    mapping(uint64 => address) public chainReceivers; // Receiver contract addresses on other chains
    mapping(uint64 => bool) public supportedChains;   // Supported chains
    mapping(uint64 => bool) public allowedSourceChains; // Allowed source chains
    mapping(address => bool) public allowedSenders;   // Allowed sender addresses
    
    // Operation tracking for idempotency
    mapping(bytes32 => bool) public processedOperations;
    uint256 public totalCCIPMessagesSent;
    
    // CCIP Message Types
    enum CCIPMessageType {
        ADD_TO_WHITELIST,           // Add to whitelist
        REMOVE_FROM_WHITELIST,      // Remove from whitelist
        BATCH_ADD_TO_WHITELIST,     // Batch add to whitelist
        BATCH_REMOVE_FROM_WHITELIST,// Batch remove from whitelist
        SYNC_WHITELIST_REQUEST,     // Request whitelist sync
        SYNC_WHITELIST_RESPONSE,    // Whitelist sync response
        SUPPLEMENT_WHITELIST        // Supplement missing whitelist entries
    }
    
    // CCIP Message Structure
    struct CCIPWhitelistMessage {
        CCIPMessageType messageType;
        uint256 contractId;
        address buyer;
        address[] buyers;
        address contractSeller;
        uint256 timestamp;
        bytes32 operationId;
        string metadata;
        uint256 totalWhitelisted;
        address requestingContract;
    }
    
    /**
     * @dev Enhanced events for real-time monitoring
     */
    event ContractCreated(
        uint256 indexed contractId,
        address indexed seller,
        string triggerToken,
        uint256 triggerPrice,
        uint256 reserveAmount,
        bool isUSDCReserve,
        bool autoExecute,
        bool whitelistEnabled
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
        bool isUSDCPayout,
        bool autoExecuted
    );
    
    event PayoutClaimed(
        uint256 indexed contractId,
        address indexed beneficiary,
        uint256 amount,
        bool isUSDCPayout
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
        uint256 amount,
        bool isUSDCWithdrawal
    );

    /// @dev Whitelist events
    event BuyerAddedToWhitelist(uint256 indexed contractId, address indexed buyer, address indexed seller);
    event BuyerRemovedFromWhitelist(uint256 indexed contractId, address indexed buyer, address indexed seller);
    event BatchWhitelistUpdate(uint256 indexed contractId, uint256 usersAdded, uint256 usersRemoved, address indexed seller);

    // ===== NEW: CCIP Events =====
    event CCIPWhitelistSynced(
        uint64 indexed sourceChain,
        uint256 indexed contractId,
        CCIPMessageType indexed messageType,
        address buyer,
        bytes32 operationId
    );
    
    event CCIPMessageSent(
        bytes32 indexed messageId,
        uint64 indexed destinationChain,
        uint256 contractId,
        CCIPMessageType messageType,
        uint256 feesPaid
    );

    event WhitelistSyncRequested(
        uint256 indexed contractId,
        uint64 indexed targetChain,
        address indexed targetContract,
        bytes32 operationId
    );

    event WhitelistSyncCompleted(
        uint256 indexed contractId,
        uint256 addedCount,
        uint256 totalCount,
        bytes32 operationId
    );

    event WhitelistSupplemented(
        uint256 indexed contractId,
        uint256 supplementedCount,
        uint256 newTotalCount,
        bytes32 operationId
    );

    /// @dev Access control modifiers
    modifier onlyContractSeller(uint256 _contractId) {
        require(contracts[_contractId].seller == msg.sender, "Only contract seller");
        _;
    }

    modifier checkWhitelist(uint256 _contractId) {
        Contract storage c = contracts[_contractId];
        if (c.whitelistEnabled) {
            require(contractWhitelist[_contractId][msg.sender], "Not whitelisted for this contract");
        }
        _;
    }

    modifier contractMustExist(uint256 _contractId) {
        require(contracts[_contractId].seller != address(0), "Contract does not exist");
        _;
    }

    // ===== NEW: CCIP Modifiers =====
    modifier onlyAllowedSourceChain(uint64 _sourceChainSelector) {
        require(allowedSourceChains[_sourceChainSelector], "Source chain not allowed");
        _;
    }

    modifier onlyAllowedSender(address _sender) {
        require(allowedSenders[_sender], "Sender not allowed");
        _;
    }

    /**
     * @dev Constructor with USDC support and CCIP
     * @param _avaxPriceFeed AVAX/USD price feed address (use zero address for test mode)
     * @param _usdcToken USDC token contract address
     * @param _ccipRouter CCIP Router address
     */
    constructor(
        address _avaxPriceFeed, 
        address _usdcToken,
        address _ccipRouter
    ) CCIPReceiver(_ccipRouter) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_ccipRouter != address(0), "Invalid CCIP router address");
        
        usdcToken = IERC20(_usdcToken);
        ccipRouter = IRouterClient(_ccipRouter);
        
        if (_avaxPriceFeed != address(0)) {
            priceFeeds["AVAX"] = AggregatorV3Interface(_avaxPriceFeed);
        }
        
        // Initialize test prices explicitly
        testPrices["AVAX"] = 25 * 10**8;     // $25
        testPrices["BTC"] = 30000 * 10**8;   // $30,000
        testPrices["ETH"] = 2000 * 10**8;    // $2,000
        testPrices["USDC"] = 1 * 10**8;      // $1
        
        lastGlobalCheck = block.timestamp;
        
        // ===== NEW: Initialize CCIP Configuration =====
        // Testnet configuration
        supportedChains[POLYGON_MUMBAI_CHAIN_SELECTOR] = true;
        supportedChains[AVALANCHE_FUJI_CHAIN_SELECTOR] = true;
        supportedChains[ETHEREUM_SEPOLIA_CHAIN_SELECTOR] = true;
        
        allowedSourceChains[POLYGON_MUMBAI_CHAIN_SELECTOR] = true;
        allowedSourceChains[AVALANCHE_FUJI_CHAIN_SELECTOR] = true;
        allowedSourceChains[ETHEREUM_SEPOLIA_CHAIN_SELECTOR] = true;
        
        // Mainnet configuration (disabled by default)
        supportedChains[POLYGON_MAINNET_CHAIN_SELECTOR] = false;
        supportedChains[AVALANCHE_MAINNET_CHAIN_SELECTOR] = false;
        supportedChains[ETHEREUM_MAINNET_CHAIN_SELECTOR] = false;
        
        allowedSourceChains[POLYGON_MAINNET_CHAIN_SELECTOR] = false;
        allowedSourceChains[AVALANCHE_MAINNET_CHAIN_SELECTOR] = false;
        allowedSourceChains[ETHEREUM_MAINNET_CHAIN_SELECTOR] = false;
    }

    // ===== CORE CONTRACT CREATION FUNCTIONALITY =====
    
    /**
     * @dev Enhanced contract creation with optional whitelist
     */
    function createContract(
        string memory _triggerToken,
        uint256 _triggerPrice,
        uint256 _startDate,
        uint256 _endDate,
        bool _isUSDCReserve,
        uint256 _reserveAmount,
        uint256 _insuranceFee,
        bool _autoExecute,
        bool _whitelistEnabled
    ) external payable {
        require(_endDate > _startDate, "Invalid date range");
        require(_endDate > block.timestamp, "End date must be in future");
        require(_triggerPrice > 0, "Invalid trigger price");
        require(_reserveAmount > 0, "Invalid reserve amount");
        
        contractCounter++;
        
        // Handle reserve deposit based on token type
        if (_isUSDCReserve) {
            // USDC reserve - no AVAX needed for reserve
            require(msg.value == 0, "No AVAX needed for USDC reserve");
            usdcToken.safeTransferFrom(msg.sender, address(this), _reserveAmount);
        } else {
            // AVAX reserve
            require(msg.value >= _reserveAmount, "Insufficient AVAX reserve sent");
        }
        
        contracts[contractCounter] = Contract({
            seller: msg.sender,
            buyer: address(0),
            beneficiary: address(0),
            feeReceiver: msg.sender,
            triggerToken: _triggerToken,
            triggerPrice: _triggerPrice,
            isUSDCReserve: _isUSDCReserve,
            reserveAmount: _reserveAmount,
            insuranceFee: _insuranceFee,
            startDate: _startDate,
            endDate: _endDate,
            lastCheckTime: 0,
            active: false,
            triggered: false,
            claimed: false,
            autoExecute: _autoExecute,
            whitelistEnabled: _whitelistEnabled
        });
        
        emit ContractCreated(
            contractCounter, 
            msg.sender, 
            _triggerToken, 
            _triggerPrice, 
            _reserveAmount,
            _isUSDCReserve,
            _autoExecute,
            _whitelistEnabled
        );
    }

    // ===== ENHANCED WHITELIST FUNCTIONS WITH CCIP SYNC =====

    /**
     * @dev Add buyer to contract whitelist with optional CCIP sync
     * @param _contractId Contract ID
     * @param _buyer Buyer address to whitelist
     * @param _syncCrossChain Whether to sync to other chains via CCIP
     */
    function addBuyerToWhitelist(
        uint256 _contractId, 
        address _buyer, 
        bool _syncCrossChain
    ) external onlyContractSeller(_contractId) contractMustExist(_contractId) {
        require(_buyer != address(0), "Invalid buyer address");
        require(contracts[_contractId].whitelistEnabled, "Whitelist not enabled for this contract");
        require(!contractWhitelist[_contractId][_buyer], "Already whitelisted");
        
        // Add to local whitelist
        contractWhitelist[_contractId][_buyer] = true;
        contractWhitelistArray[_contractId].push(_buyer);
        whitelistIndex[_contractId][_buyer] = contractWhitelistArray[_contractId].length - 1;
        
        emit BuyerAddedToWhitelist(_contractId, _buyer, msg.sender);
        
        // ===== NEW: CCIP Cross-Chain Sync =====
        if (_syncCrossChain && address(ccipRouter) != address(0)) {
            bytes32 operationId = _generateOperationId("ADD", _contractId, _buyer);
            
            address[] memory buyers = new address[](1);
            buyers[0] = _buyer;
            
            _syncWhitelistCrossChain(
                CCIPMessageType.ADD_TO_WHITELIST,
                _contractId,
                _buyer,
                buyers,
                operationId,
                "SINGLE_ADD"
            );
        }
    }

    /**
     * @dev Remove buyer from contract whitelist with optional CCIP sync
     * @param _contractId Contract ID
     * @param _buyer Buyer address to remove
     * @param _syncCrossChain Whether to sync to other chains via CCIP
     */
    function removeBuyerFromWhitelist(
        uint256 _contractId, 
        address _buyer, 
        bool _syncCrossChain
    ) external onlyContractSeller(_contractId) contractMustExist(_contractId) {
        require(contractWhitelist[_contractId][_buyer], "Not whitelisted");
        
        // Remove from local whitelist
        contractWhitelist[_contractId][_buyer] = false;
        
        // Remove from array efficiently
        uint256 buyerIndex = whitelistIndex[_contractId][_buyer];
        address[] storage whitelist = contractWhitelistArray[_contractId];
        address lastBuyer = whitelist[whitelist.length - 1];
        
        whitelist[buyerIndex] = lastBuyer;
        whitelistIndex[_contractId][lastBuyer] = buyerIndex;
        whitelist.pop();
        delete whitelistIndex[_contractId][_buyer];
        
        emit BuyerRemovedFromWhitelist(_contractId, _buyer, msg.sender);
        
        // ===== NEW: CCIP Cross-Chain Sync =====
        if (_syncCrossChain && address(ccipRouter) != address(0)) {
            bytes32 operationId = _generateOperationId("REMOVE", _contractId, _buyer);
            
            address[] memory buyers = new address[](1);
            buyers[0] = _buyer;
            
            _syncWhitelistCrossChain(
                CCIPMessageType.REMOVE_FROM_WHITELIST,
                _contractId,
                _buyer,
                buyers,
                operationId,
                "SINGLE_REMOVE"
            );
        }
    }

    /**
     * @dev Batch add buyers to contract whitelist with optional CCIP sync
     * @param _contractId Contract ID
     * @param _buyers Array of buyer addresses to whitelist
     * @param _syncCrossChain Whether to sync to other chains via CCIP
     */
    function batchAddBuyersToWhitelist(
        uint256 _contractId, 
        address[] calldata _buyers, 
        bool _syncCrossChain
    ) external onlyContractSeller(_contractId) contractMustExist(_contractId) {
        require(contracts[_contractId].whitelistEnabled, "Whitelist not enabled for this contract");
        require(_buyers.length > 0, "No buyers to add");
        
        uint256 usersAdded = 0;
        
        // Add to local whitelist
        for (uint256 i = 0; i < _buyers.length; i++) {
            address buyer = _buyers[i];
            if (buyer != address(0) && !contractWhitelist[_contractId][buyer]) {
                contractWhitelist[_contractId][buyer] = true;
                contractWhitelistArray[_contractId].push(buyer);
                whitelistIndex[_contractId][buyer] = contractWhitelistArray[_contractId].length - 1;
                usersAdded++;
                emit BuyerAddedToWhitelist(_contractId, buyer, msg.sender);
            }
        }
        
        emit BatchWhitelistUpdate(_contractId, usersAdded, 0, msg.sender);
        
        // ===== NEW: CCIP Cross-Chain Sync =====
        if (_syncCrossChain && usersAdded > 0 && address(ccipRouter) != address(0)) {
            bytes32 operationId = _generateOperationId("BATCH_ADD", _contractId, address(0));
            
            _syncWhitelistCrossChain(
                CCIPMessageType.BATCH_ADD_TO_WHITELIST,
                _contractId,
                address(0),
                _buyers,
                operationId,
                "BATCH_ADD"
            );
        }
    }

    /**
     * @dev Batch remove buyers from contract whitelist with optional CCIP sync
     * @param _contractId Contract ID
     * @param _buyers Array of buyer addresses to remove
     * @param _syncCrossChain Whether to sync to other chains via CCIP
     */
    function batchRemoveBuyersFromWhitelist(
        uint256 _contractId, 
        address[] calldata _buyers, 
        bool _syncCrossChain
    ) external onlyContractSeller(_contractId) contractMustExist(_contractId) {
        require(_buyers.length > 0, "No buyers to remove");
        
        uint256 usersRemoved = 0;
        
        // Remove from local whitelist
        for (uint256 i = 0; i < _buyers.length; i++) {
            address buyer = _buyers[i];
            if (contractWhitelist[_contractId][buyer]) {
                contractWhitelist[_contractId][buyer] = false;
                
                // Remove from array efficiently
                uint256 buyerIndex = whitelistIndex[_contractId][buyer];
                address[] storage whitelist = contractWhitelistArray[_contractId];
                address lastBuyer = whitelist[whitelist.length - 1];
                
                whitelist[buyerIndex] = lastBuyer;
                whitelistIndex[_contractId][lastBuyer] = buyerIndex;
                whitelist.pop();
                delete whitelistIndex[_contractId][buyer];
                
                usersRemoved++;
                emit BuyerRemovedFromWhitelist(_contractId, buyer, msg.sender);
            }
        }
        
        emit BatchWhitelistUpdate(_contractId, 0, usersRemoved, msg.sender);
        
        // ===== NEW: CCIP Cross-Chain Sync =====
        if (_syncCrossChain && usersRemoved > 0 && address(ccipRouter) != address(0)) {
            bytes32 operationId = _generateOperationId("BATCH_REMOVE", _contractId, address(0));
            
            _syncWhitelistCrossChain(
                CCIPMessageType.BATCH_REMOVE_FROM_WHITELIST,
                _contractId,
                address(0),
                _buyers,
                operationId,
                "BATCH_REMOVE"
            );
        }
    }

    /**
     * @dev Request whitelist sync from specific chain and contract
     * @param _contractId Contract ID to sync
     * @param _sourceChain Source chain to request data from
     * @param _sourceContract Source contract address
     */
    function requestWhitelistSync(
        uint256 _contractId,
        uint64 _sourceChain,
        address _sourceContract
    ) external onlyContractSeller(_contractId) contractMustExist(_contractId) returns (bytes32 operationId) {
        require(supportedChains[_sourceChain], "Chain not supported");
        require(_sourceContract != address(0), "Invalid source contract");

        operationId = _generateOperationId("SYNC_REQUEST", _contractId, _sourceContract);

        CCIPWhitelistMessage memory message = CCIPWhitelistMessage({
            messageType: CCIPMessageType.SYNC_WHITELIST_REQUEST,
            contractId: _contractId,
            buyer: address(0),
            buyers: new address[](0),
            contractSeller: msg.sender,
            timestamp: block.timestamp,
            operationId: operationId,
            metadata: "SYNC_REQUEST",
            totalWhitelisted: 0,
            requestingContract: address(this)
        });

        _sendCCIPMessage(_sourceChain, _sourceContract, message);

        emit WhitelistSyncRequested(_contractId, _sourceChain, _sourceContract, operationId);

        return operationId;
    }

    /**
     * @dev Supplement whitelist with missing entries from other chains
     * @param _contractId Contract ID to supplement
     * @param _newBuyers Array of new buyers to add (missing from current whitelist)
     * @param _syncCrossChain Whether to sync the supplement to other chains
     */
    function supplementWhitelist(
        uint256 _contractId,
        address[] calldata _newBuyers,
        bool _syncCrossChain
    ) external onlyContractSeller(_contractId) contractMustExist(_contractId) nonReentrant returns (bytes32 operationId) {
        require(_newBuyers.length > 0, "No buyers to supplement");

        operationId = _generateOperationId("SUPPLEMENT", _contractId, address(0));

        uint256 supplementedCount = 0;
        uint256 initialCount = contractWhitelistArray[_contractId].length;

        // Add only buyers that are not already whitelisted
        for (uint256 i = 0; i < _newBuyers.length; i++) {
            address buyer = _newBuyers[i];
            if (buyer != address(0) && !contractWhitelist[_contractId][buyer]) {
                _addToWhitelistInternal(_contractId, buyer);
                supplementedCount++;
                emit BuyerAddedToWhitelist(_contractId, buyer, msg.sender);
            }
        }

        uint256 newTotalCount = contractWhitelistArray[_contractId].length;

        emit WhitelistSupplemented(_contractId, supplementedCount, newTotalCount, operationId);

        // Sync supplement to other chains if requested
        if (_syncCrossChain && supplementedCount > 0 && address(ccipRouter) != address(0)) {
            _syncWhitelistCrossChain(
                CCIPMessageType.SUPPLEMENT_WHITELIST,
                _contractId,
                address(0),
                _newBuyers,
                operationId,
                "SUPPLEMENT_SYNC"
            );
        }

        return operationId;
    }

    // ===== NEW: CCIP CROSS-CHAIN SYNC FUNCTIONALITY =====

    /**
     * @dev Send whitelist sync message to other chains
     */
    function _syncWhitelistCrossChain(
        CCIPMessageType _messageType,
        uint256 _contractId,
        address _buyer,
        address[] memory _buyers,
        bytes32 _operationId,
        string memory _metadata
    ) internal {
        CCIPWhitelistMessage memory message = CCIPWhitelistMessage({
            messageType: _messageType,
            contractId: _contractId,
            buyer: _buyer,
            buyers: _buyers,
            contractSeller: msg.sender,
            timestamp: block.timestamp,
            operationId: _operationId,
            metadata: _metadata,
            totalWhitelisted: contractWhitelistArray[_contractId].length,
            requestingContract: address(this)
        });

        // Send to all supported chains
        uint64[] memory supportedChainsList = _getSupportedChains();
        
        for (uint256 i = 0; i < supportedChainsList.length; i++) {
            uint64 chainSelector = supportedChainsList[i];
            address receiver = chainReceivers[chainSelector];
            
            if (receiver != address(0)) {
                _sendCCIPMessage(chainSelector, receiver, message);
            }
        }
    }

    /**
     * @dev Send CCIP message to specific chain
     */
    function _sendCCIPMessage(
        uint64 _destinationChainSelector,
        address _receiver,
        CCIPWhitelistMessage memory _message
    ) internal {
        // Create CCIP message
        Client.EVM2AnyMessage memory evm2AnyMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: abi.encode(_message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 300_000})
            ),
            feeToken: address(0) // Use native token for fees
        });

        // Calculate fees
        uint256 fees = ccipRouter.getFee(_destinationChainSelector, evm2AnyMessage);

        // Send message if sufficient balance
        if (fees <= address(this).balance) {
            bytes32 messageId = ccipRouter.ccipSend{value: fees}(
                _destinationChainSelector,
                evm2AnyMessage
            );

            totalCCIPMessagesSent++;

            emit CCIPMessageSent(
                messageId,
                _destinationChainSelector,
                _message.contractId,
                _message.messageType,
                fees
            );
        }
    }

    /**
     * @dev CCIP message receiver
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory any2EvmMessage
    )
        internal
        override
        onlyAllowedSourceChain(any2EvmMessage.sourceChainSelector)
        onlyAllowedSender(abi.decode(any2EvmMessage.sender, (address)))
    {
        CCIPWhitelistMessage memory message = abi.decode(any2EvmMessage.data, (CCIPWhitelistMessage));
        
        // Check for duplicate operations
        if (processedOperations[message.operationId]) {
            return;
        }

        // Process the message
        _processCCIPWhitelistMessage(message, any2EvmMessage.sourceChainSelector);
        
        // Mark operation as processed
        processedOperations[message.operationId] = true;
    }

    /**
     * @dev Process CCIP whitelist message
     */
    function _processCCIPWhitelistMessage(
        CCIPWhitelistMessage memory message,
        uint64 sourceChain
    ) internal {
        if (message.messageType == CCIPMessageType.SYNC_WHITELIST_REQUEST) {
            _handleSyncRequest(message, sourceChain);
            
        } else if (message.messageType == CCIPMessageType.SYNC_WHITELIST_RESPONSE) {
            _handleSyncResponse(message);
            
        } else if (message.messageType == CCIPMessageType.ADD_TO_WHITELIST) {
            _addToWhitelistInternal(message.contractId, message.buyer);
            
        } else if (message.messageType == CCIPMessageType.REMOVE_FROM_WHITELIST) {
            _removeFromWhitelistInternal(message.contractId, message.buyer);
            
        } else if (message.messageType == CCIPMessageType.BATCH_ADD_TO_WHITELIST) {
            for (uint256 i = 0; i < message.buyers.length; i++) {
                _addToWhitelistInternal(message.contractId, message.buyers[i]);
            }
            
        } else if (message.messageType == CCIPMessageType.BATCH_REMOVE_FROM_WHITELIST) {
            for (uint256 i = 0; i < message.buyers.length; i++) {
                _removeFromWhitelistInternal(message.contractId, message.buyers[i]);
            }
            
        } else if (message.messageType == CCIPMessageType.SUPPLEMENT_WHITELIST) {
            _handleSupplementWhitelist(message);
        }

        emit CCIPWhitelistSynced(
            sourceChain,
            message.contractId,
            message.messageType,
            message.buyer,
            message.operationId
        );
    }

    /**
     * @dev Handle sync request from other chain
     */
    function _handleSyncRequest(CCIPWhitelistMessage memory message, uint64 sourceChain) internal {
        if (contracts[message.contractId].seller != address(0) && contractWhitelistArray[message.contractId].length > 0) {
            // Send whitelist data back to requesting chain
            address[] memory whitelistedBuyers = contractWhitelistArray[message.contractId];
            
            CCIPWhitelistMessage memory response = CCIPWhitelistMessage({
                messageType: CCIPMessageType.SYNC_WHITELIST_RESPONSE,
                contractId: message.contractId,
                buyer: address(0),
                buyers: whitelistedBuyers,
                contractSeller: contracts[message.contractId].seller,
                timestamp: block.timestamp,
                operationId: message.operationId,
                metadata: "SYNC_RESPONSE",
                totalWhitelisted: whitelistedBuyers.length,
                requestingContract: message.requestingContract
            });

            // Send response back to requesting chain
            address receiver = chainReceivers[sourceChain];
            if (receiver != address(0)) {
                _sendCCIPMessage(sourceChain, receiver, response);
            }
        }
    }

    /**
     * @dev Handle sync response from other chain
     */
    function _handleSyncResponse(CCIPWhitelistMessage memory message) internal {
        if (contracts[message.contractId].seller != address(0)) {
            uint256 supplementedCount = 0;
            
            // Add any missing buyers from the response
            for (uint256 i = 0; i < message.buyers.length; i++) {
                address buyer = message.buyers[i];
                if (buyer != address(0) && !contractWhitelist[message.contractId][buyer]) {
                    _addToWhitelistInternal(message.contractId, buyer);
                    supplementedCount++;
                }
            }

            if (supplementedCount > 0) {
                emit WhitelistSyncCompleted(
                    message.contractId,
                    supplementedCount,
                    contractWhitelistArray[message.contractId].length,
                    message.operationId
                );
            }
        }
    }

    /**
     * @dev Handle supplement whitelist message
     */
    function _handleSupplementWhitelist(CCIPWhitelistMessage memory message) internal {
        uint256 supplementedCount = 0;
        
        for (uint256 i = 0; i < message.buyers.length; i++) {
            address buyer = message.buyers[i];
            if (buyer != address(0) && !contractWhitelist[message.contractId][buyer]) {
                _addToWhitelistInternal(message.contractId, buyer);
                supplementedCount++;
            }
        }

        if (supplementedCount > 0) {
            emit WhitelistSupplemented(
                message.contractId,
                supplementedCount,
                contractWhitelistArray[message.contractId].length,
                message.operationId
            );
        }
    }

    /**
     * @dev Internal function to add buyer to whitelist (for CCIP sync)
     */
    function _addToWhitelistInternal(uint256 _contractId, address _buyer) internal {
        if (_buyer == address(0) || contractWhitelist[_contractId][_buyer]) {
            return; // Skip invalid or already whitelisted addresses
        }
        
        contractWhitelist[_contractId][_buyer] = true;
        contractWhitelistArray[_contractId].push(_buyer);
        whitelistIndex[_contractId][_buyer] = contractWhitelistArray[_contractId].length - 1;
    }

    /**
     * @dev Internal function to remove buyer from whitelist (for CCIP sync)
     */
    function _removeFromWhitelistInternal(uint256 _contractId, address _buyer) internal {
        if (!contractWhitelist[_contractId][_buyer]) {
            return; // Skip if not whitelisted
        }
        
        contractWhitelist[_contractId][_buyer] = false;
        
        // Efficient array removal
        uint256 buyerIndex = whitelistIndex[_contractId][_buyer];
        address[] storage whitelist = contractWhitelistArray[_contractId];
        
        if (whitelist.length > 0) {
            address lastBuyer = whitelist[whitelist.length - 1];
            whitelist[buyerIndex] = lastBuyer;
            whitelistIndex[_contractId][lastBuyer] = buyerIndex;
            whitelist.pop();
        }
        
        delete whitelistIndex[_contractId][_buyer];
    }

    /**
     * @dev Generate unique operation ID
     */
    function _generateOperationId(
        string memory _operation,
        uint256 _contractId,
        address _buyer
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                _operation,
                _contractId,
                _buyer,
                block.timestamp,
                msg.sender,
                totalCCIPMessagesSent
            )
        );
    }

    /**
     * @dev Get supported chain selectors
     */
    function _getSupportedChains() internal view returns (uint64[] memory) {
        uint64[] memory allChains = new uint64[](6);
        allChains[0] = POLYGON_MUMBAI_CHAIN_SELECTOR;
        allChains[1] = AVALANCHE_FUJI_CHAIN_SELECTOR;
        allChains[2] = ETHEREUM_SEPOLIA_CHAIN_SELECTOR;
        allChains[3] = POLYGON_MAINNET_CHAIN_SELECTOR;
        allChains[4] = AVALANCHE_MAINNET_CHAIN_SELECTOR;
        allChains[5] = ETHEREUM_MAINNET_CHAIN_SELECTOR;

        uint256 supportedCount = 0;
        for (uint256 i = 0; i < allChains.length; i++) {
            if (supportedChains[allChains[i]]) {
                supportedCount++;
            }
        }

        uint64[] memory result = new uint64[](supportedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allChains.length; i++) {
            if (supportedChains[allChains[i]]) {
                result[index] = allChains[i];
                index++;
            }
        }

        return result;
    }

    // ===== CCIP ADMIN FUNCTIONS =====

    /**
     * @dev Set chain receiver address
     */
    function setChainReceiver(uint64 _chainSelector, address _receiver) external onlyOwner {
        chainReceivers[_chainSelector] = _receiver;
    }

    /**
     * @dev Set supported chain
     */
    function setSupportedChain(uint64 _chainSelector, bool _supported) external onlyOwner {
        supportedChains[_chainSelector] = _supported;
    }

    /**
     * @dev Allow/disallow source chain for CCIP messages
     */
    function allowSourceChain(uint64 _sourceChainSelector, bool _allowed) external onlyOwner {
        allowedSourceChains[_sourceChainSelector] = _allowed;
    }

    /**
     * @dev Allow/disallow sender for CCIP messages
     */
    function allowSender(address _sender, bool _allowed) external onlyOwner {
        allowedSenders[_sender] = _allowed;
    }

    /**
     * @dev Manual sync whitelist to specific chain
     */
    function manualSyncWhitelistToChain(
        uint64 _destinationChain,
        uint256 _contractId,
        address[] calldata _buyers,
        CCIPMessageType _messageType
    ) external onlyContractSeller(_contractId) contractMustExist(_contractId) {
        require(supportedChains[_destinationChain], "Chain not supported");
        require(chainReceivers[_destinationChain] != address(0), "No receiver set for chain");

        bytes32 operationId = _generateOperationId("MANUAL_SYNC", _contractId, address(0));

        CCIPWhitelistMessage memory message = CCIPWhitelistMessage({
            messageType: _messageType,
            contractId: _contractId,
            buyer: address(0),
            buyers: _buyers,
            contractSeller: msg.sender,
            timestamp: block.timestamp,
            operationId: operationId,
            metadata: "MANUAL_SYNC",
            totalWhitelisted: contractWhitelistArray[_contractId].length,
            requestingContract: address(this)
        });

        _sendCCIPMessage(_destinationChain, chainReceivers[_destinationChain], message);
    }

    // ===== EXISTING CORE FUNCTIONALITY (PRESERVED) =====

    /**
     * @dev Enable or disable whitelist for a contract (only seller, only before first purchase)
     * @param _contractId Contract ID
     * @param _enabled True to enable whitelist, false to disable
     */
    function setContractWhitelistStatus(uint256 _contractId, bool _enabled) external onlyContractSeller(_contractId) contractMustExist(_contractId) {
        Contract storage c = contracts[_contractId];
        require(!c.active, "Cannot change whitelist status after purchase");
        
        c.whitelistEnabled = _enabled;
    }

    /**
     * @dev Enhanced purchase function with contract-specific whitelist
     */
    function purchaseInsurance(uint256 _contractId) external payable nonReentrant checkWhitelist(_contractId) {
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
        
        // Transfer fee to receiver (always AVAX)
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
        require(block.timestamp - updatedAt <= 3600, "Price data too old");
        
        return uint256(price);
    }

    /**
     * @dev Execute payout based on reserve type
     */
    function _executePayout(Contract storage c) internal {
        if (c.isUSDCReserve) {
            // USDC payout
            usdcToken.safeTransfer(c.beneficiary, c.reserveAmount);
        } else {
            // AVAX payout
            payable(c.beneficiary).transfer(c.reserveAmount);
        }
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
     * @dev Internal trigger function with USDC support (external for try-catch)
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
            _executePayout(c);
            autoExecuted = true;
        }
        
        emit PayoutTriggered(
            _contractId, 
            c.buyer, 
            c.reserveAmount, 
            currentPrice, 
            c.triggerPrice,
            c.isUSDCReserve,
            autoExecuted
        );
        
        if (autoExecuted) {
            emit PayoutClaimed(_contractId, c.beneficiary, c.reserveAmount, c.isUSDCReserve);
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
     * @dev Enhanced claim function with USDC support
     */
    function claimPayout(uint256 _contractId) external nonReentrant {
        Contract storage c = contracts[_contractId];
        require(c.triggered, "Not triggered");
        require(!c.claimed, "Already claimed");
        require(msg.sender == c.beneficiary, "Not beneficiary");
        
        c.claimed = true;
        _executePayout(c);
        
        emit PayoutClaimed(_contractId, c.beneficiary, c.reserveAmount, c.isUSDCReserve);
    }

    /**
     * @dev Withdraw remaining reserve with USDC support
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
        bool isUSDCWithdrawal = c.isUSDCReserve;
        c.reserveAmount = 0;
        
        if (isUSDCWithdrawal) {
            // USDC refund
            usdcToken.safeTransfer(msg.sender, refundAmount);
        } else {
            // AVAX refund
            payable(msg.sender).transfer(refundAmount);
        }
        
        emit ReserveWithdrawn(_contractId, msg.sender, refundAmount, isUSDCWithdrawal);
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

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Check if buyer is whitelisted for a specific contract
     * @param _contractId Contract ID
     * @param _buyer Buyer address to check
     * @return True if whitelisted or whitelist disabled for contract
     */
    function isBuyerWhitelisted(uint256 _contractId, address _buyer) external view returns (bool) {
        Contract storage c = contracts[_contractId];
        if (!c.whitelistEnabled) return true;
        return contractWhitelist[_contractId][_buyer];
    }

    /**
     * @dev Get whitelisted buyers for a contract (paginated)
     * @param _contractId Contract ID
     * @param _offset Starting index
     * @param _limit Maximum number of buyers to return
     * @return buyers Array of whitelisted buyer addresses
     * @return hasMore Whether there are more buyers beyond this page
     */
    function getContractWhitelistedBuyers(uint256 _contractId, uint256 _offset, uint256 _limit) external view returns (
        address[] memory buyers,
        bool hasMore
    ) {
        address[] storage whitelistedBuyers = contractWhitelistArray[_contractId];
        uint256 totalBuyers = whitelistedBuyers.length;
        
        if (_offset >= totalBuyers) {
            return (new address[](0), false);
        }
        
        uint256 end = _offset + _limit;
        if (end > totalBuyers) {
            end = totalBuyers;
        }
        
        address[] memory result = new address[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = whitelistedBuyers[i];
        }
        
        return (result, end < totalBuyers);
    }

    /**
     * @dev Get complete whitelist for a contract
     */
    function getCompleteWhitelist(uint256 _contractId) external view returns (address[] memory) {
        return contractWhitelistArray[_contractId];
    }

    /**
     * @dev Get contract whitelist statistics
     * @param _contractId Contract ID
     * @return totalWhitelisted Total number of whitelisted buyers
     * @return whitelistEnabled Whether whitelist is enabled for this contract
     * @return seller Contract seller address
     */
    function getContractWhitelistStats(uint256 _contractId) external view returns (
        uint256 totalWhitelisted,
        bool whitelistEnabled,
        address seller
    ) {
        Contract storage c = contracts[_contractId];
        return (
            contractWhitelistArray[_contractId].length,
            c.whitelistEnabled,
            c.seller
        );
    }

    /**
     * @dev Enhanced contract getter with USDC and whitelist info
     */
    function getContract(uint256 _contractId) external view returns (
        address seller,
        address buyer,
        address beneficiary,
        address feeReceiver,
        string memory triggerToken,
        uint256 triggerPrice,
        bool isUSDCReserve,
        uint256 reserveAmount,
        uint256 insuranceFee,
        uint256 startDate,
        uint256 endDate,
        bool active,
        bool triggered,
        bool claimed,
        bool autoExecute,
        bool whitelistEnabled,
        uint256 lastCheckTime
    ) {
        Contract storage c = contracts[_contractId];
        return (
            c.seller, c.buyer, c.beneficiary, c.feeReceiver,
            c.triggerToken, c.triggerPrice, c.isUSDCReserve,
            c.reserveAmount, c.insuranceFee, c.startDate, c.endDate,
            c.active, c.triggered, c.claimed, c.autoExecute, c.whitelistEnabled, c.lastCheckTime
        );
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
     * @dev Get CCIP system statistics
     */
    function getCCIPStats() external view returns (
        uint256 totalMessagesSent,
        uint256 totalOperationsProcessed,
        address routerAddress,
        uint256 supportedChainsCount
    ) {
        return (
            totalCCIPMessagesSent,
            0, // We don't track processed operations count separately
            address(ccipRouter),
            _getSupportedChains().length
        );
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

    /**
     * @dev Get contracts by user
     */
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

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get USDC balance
     */
    function getUSDCBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    /**
     * @dev Get USDC token address
     */
    function getUSDCAddress() external view returns (address) {
        return address(usdcToken);
    }

    // ===== ADMIN FUNCTIONS =====

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
     * @dev Emergency function to recover stuck USDC tokens (only owner)
     */
    function emergencyUSDCRecovery(uint256 _amount, address _to) external onlyOwner {
        require(_to != address(0), "Invalid recipient");
        require(_amount <= usdcToken.balanceOf(address(this)), "Insufficient balance");
        usdcToken.safeTransfer(_to, _amount);
    }

    /**
     * @dev Emergency function to recover stuck AVAX (only owner)
     */
    function emergencyAvaxRecovery(uint256 _amount, address _to) external onlyOwner {
        require(_to != address(0), "Invalid recipient");
        require(_amount <= address(this).balance, "Insufficient balance");
        payable(_to).transfer(_amount);
    }

    /**
     * @dev Emergency function to recover stuck native tokens for CCIP fees
     */
    function emergencyWithdraw(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Invalid recipient");
        require(_amount <= address(this).balance, "Insufficient balance");
        payable(_to).transfer(_amount);
    }

    /**
     * @dev Override supportsInterface to handle CCIP interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return CCIPReceiver.supportsInterface(interfaceId);
    }

    /**
     * @dev Allow contract to receive AVAX for CCIP fees and emergency testing
     */
    receive() external payable {
        // Allow contract to receive AVAX for CCIP fees
    }
}