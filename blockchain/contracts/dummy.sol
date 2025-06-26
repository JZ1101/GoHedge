// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DummyInsurance
 * @dev A simplified insurance contract for testing and development
 * 
 * This contract allows users to:
 * 1. Create insurance contracts with custom trigger conditions
 * 2. Purchase insurance by paying a fee
 * 3. Trigger payouts when conditions are met
 * 4. Claim payouts if triggered
 * 5. Withdraw fees after expiration (if not triggered)
 * 
 * NOTE: This is a dummy contract for testing purposes.
 * It uses manual price input instead of oracles for simplicity.
 */
contract DummyInsurance {
    /**
     * @dev Structure to store insurance contract details
     */
    struct Contract {
        address seller;        // Who created the insurance contract
        address buyer;         // Who purchased the insurance (initially empty)
        string triggerToken;   // Token to monitor (e.g., "AVAX", "BTC")
        uint256 triggerPrice;  // Price threshold that triggers payout (in wei)
        string reserveToken;   // Token used for payout (e.g., "AVAX", "USDC")
        uint256 reserveAmount; // Amount to pay out if triggered (in wei)
        uint256 insuranceFee;  // Fee paid by buyer to purchase insurance (in wei)
        uint256 startDate;     // When insurance becomes active (timestamp)
        uint256 endDate;       // When insurance expires (timestamp)
        bool active;           // True when buyer has purchased, false otherwise
        bool triggered;        // True when payout condition is met
        bool claimed;          // True when payout has been claimed by buyer
    }
    
    /// @dev Mapping from contract ID to Contract struct
    mapping(uint256 => Contract) public contracts;
    
    /// @dev Counter for generating unique contract IDs
    uint256 public contractCounter;
    
    /**
     * @dev Emitted when a new insurance contract is created
     * @param contractId Unique ID of the created contract
     * @param seller Address of the contract creator
     * @param triggerToken Token being monitored for price changes
     * @param triggerPrice Price threshold for triggering payout
     */
    event ContractCreated(
        uint256 indexed contractId,
        address indexed seller,
        string triggerToken,
        uint256 triggerPrice
    );
    
    /**
     * @dev Emitted when someone purchases an insurance contract
     * @param contractId ID of the purchased contract
     * @param buyer Address of the insurance buyer
     */
    event ContractPurchased(
        uint256 indexed contractId,
        address indexed buyer
    );
    
    /**
     * @dev Emitted when payout conditions are met
     * @param contractId ID of the triggered contract
     * @param currentPrice Current price that triggered the payout
     */
    event PayoutTriggered(
        uint256 indexed contractId,
        uint256 currentPrice
    );
    
    /**
     * @dev Emitted when buyer claims their payout
     * @param contractId ID of the contract
     * @param buyer Address of the buyer claiming payout
     * @param amount Amount paid out
     */
    event PayoutClaimed(
        uint256 indexed contractId,
        address indexed buyer,
        uint256 amount
    );
    
    /**
     * @dev Creates a new insurance contract
     * @param _triggerToken Name of token to monitor (e.g., "AVAX", "BTC")
     * @param _triggerPrice Price threshold in wei (e.g., 20 * 10^18 for $20)
     * @param _startDate Timestamp when insurance becomes active
     * @param _endDate Timestamp when insurance expires
     * @param _reserveToken Name of token used for payouts
     * @param _reserveAmount Amount to pay out if triggered (in wei)
     * @param _insuranceFee Fee buyer must pay to purchase (in wei)
     * 
     * Requirements:
     * - Must send enough AVAX to cover the reserve amount
     * - Start date must be in the future or now
     * - End date must be after start date
     * 
     * Example: Create insurance that pays 1 AVAX if AVAX price drops below $20
     * createContract("AVAX", 20000000000000000000, now, now + 7 days, "AVAX", 1000000000000000000, 100000000000000000)
     */
    function createContract(
        string memory _triggerToken,
        uint256 _triggerPrice,
        uint256 _startDate,
        uint256 _endDate,
        string memory _reserveToken,
        uint256 _reserveAmount,
        uint256 _insuranceFee
    ) external payable {
        require(msg.value >= _reserveAmount, "Must send enough AVAX for reserve");
        require(_endDate > _startDate, "End date must be after start date");
        
        contractCounter++;
        
        contracts[contractCounter] = Contract({
            seller: msg.sender,
            buyer: address(0),           // No buyer initially
            triggerToken: _triggerToken,
            triggerPrice: _triggerPrice,
            reserveToken: _reserveToken,
            reserveAmount: _reserveAmount,
            insuranceFee: _insuranceFee,
            startDate: _startDate,
            endDate: _endDate,
            active: false,               // Not active until purchased
            triggered: false,            // Not triggered initially
            claimed: false               // Not claimed initially
        });
        
        emit ContractCreated(contractCounter, msg.sender, _triggerToken, _triggerPrice);
    }
    
    /**
     * @dev Purchase an existing insurance contract
     * @param _contractId ID of the contract to purchase
     * 
     * Requirements:
     * - Contract must exist and not be purchased yet
     * - Must send enough AVAX to cover insurance fee
     * - Contract must not have started yet or be currently active
     * - Contract must not be expired
     * 
     * Example: Purchase insurance contract #1 by paying the required fee
     * purchaseInsurance(1) with value = insuranceFee
     */
    function purchaseInsurance(uint256 _contractId) external payable {
        Contract storage c = contracts[_contractId];
        require(c.seller != address(0), "Contract does not exist");
        require(c.buyer == address(0), "Contract already purchased");
        require(msg.value >= c.insuranceFee, "Must pay full insurance fee");
        require(block.timestamp >= c.startDate, "Contract not started yet");
        require(block.timestamp < c.endDate, "Contract has expired");
        
        c.buyer = msg.sender;
        c.active = true;
        
        // Immediately transfer the insurance fee to the seller
        payable(c.seller).transfer(c.insuranceFee);
        
        emit ContractPurchased(_contractId, msg.sender);
    }
    
    /**
     * @dev Manually trigger payout if conditions are met
     * @param _contractId ID of the contract to trigger
     * @param _currentPrice Current price of the trigger token (in wei)
     * 
     * NOTE: In a real contract, this would use price oracles like Chainlink.
     * Here we manually input the price for testing purposes.
     * 
     * Requirements:
     * - Contract must be active (purchased by someone)
     * - Must not be triggered already
     * - Current price must be at or below trigger price
     * - Contract must not be expired
     * 
     * Example: Trigger payout if AVAX price drops to $19
     * triggerPayout(1, 19000000000000000000) // 19 * 10^18
     */
    function triggerPayout(uint256 _contractId, uint256 _currentPrice) external {
        Contract storage c = contracts[_contractId];
        require(c.active, "Contract not active - needs buyer first");
        require(!c.triggered, "Payout already triggered");
        require(_currentPrice <= c.triggerPrice, "Price condition not met - current price too high");
        require(block.timestamp < c.endDate, "Contract has expired");
        
        c.triggered = true;
        
        emit PayoutTriggered(_contractId, _currentPrice);
    }
    
    /**
     * @dev Claim payout after trigger conditions are met
     * @param _contractId ID of the contract to claim from
     * 
     * Requirements:
     * - Only the buyer can claim
     * - Payout must be triggered first
     * - Cannot claim twice
     * 
     * Example: After insurance is triggered, buyer claims their 1 AVAX payout
     * claimPayout(1)
     */
    function claimPayout(uint256 _contractId) external {
        Contract storage c = contracts[_contractId];
        require(c.buyer == msg.sender, "Only buyer can claim payout");
        require(c.triggered, "Payout not triggered yet");
        require(!c.claimed, "Payout already claimed");
        
        c.claimed = true;
        
        // Send the reserve amount to the buyer
        payable(msg.sender).transfer(c.reserveAmount);
        
        emit PayoutClaimed(_contractId, msg.sender, c.reserveAmount);
    }
    
    /**
     * @dev Withdraw remaining reserve after contract expires (if not triggered)
     * @param _contractId ID of the contract to withdraw from
     * 
     * Requirements:
     * - Only the seller can withdraw
     * - Contract must be expired
     * - Contract must not have been triggered (seller gets reserve back only if no payout)
     * 
     * Example: After contract expires without triggering, seller withdraws the 1 AVAX reserve
     * withdrawReserve(1)
     */
    function withdrawReserve(uint256 _contractId) external {
        Contract storage c = contracts[_contractId];
        require(c.seller == msg.sender, "Only seller can withdraw reserve");
        require(block.timestamp >= c.endDate, "Contract not expired yet");
        require(!c.triggered, "Cannot withdraw reserve - contract was triggered");
        
        // Send the reserve amount back to the seller
        payable(msg.sender).transfer(c.reserveAmount);
    }
    
    /**
     * @dev Get complete details of a specific contract
     * @param _contractId ID of the contract to query
     * @return seller Address of the seller who created the contract
     * @return buyer Address of the buyer who purchased the contract
     * @return triggerToken Token name being monitored for price changes
     * @return triggerPrice Price threshold that triggers payout
     * @return reserveToken Token used for payout
     * @return reserveAmount Amount to pay out if triggered
     * @return insuranceFee Fee paid by buyer to purchase insurance
     * @return startDate When insurance becomes active
     * @return endDate When insurance expires
     * @return active Whether the contract is active
     * @return triggered Whether the payout has been triggered
     * @return claimed Whether the payout has been claimed
     * 
     * Example: Get details of contract #1
     * (seller, buyer, triggerToken, ...) = getContract(1)
     */
    function getContract(uint256 _contractId) external view returns (
        address seller,
        address buyer,
        string memory triggerToken,
        uint256 triggerPrice,
        string memory reserveToken,
        uint256 reserveAmount,
        uint256 insuranceFee,
        uint256 startDate,
        uint256 endDate,
        bool active,
        bool triggered,
        bool claimed
    ) {
        Contract storage c = contracts[_contractId];
        return (
            c.seller,
            c.buyer,
            c.triggerToken,
            c.triggerPrice,
            c.reserveToken,
            c.reserveAmount,
            c.insuranceFee,
            c.startDate,
            c.endDate,
            c.active,
            c.triggered,
            c.claimed
        );
    }
    
    /**
     * @dev Get all contract IDs associated with a specific user
     * @param _user Address to search for (as seller or buyer)
     * @return Array of contract IDs where user is involved
     * 
     * Example: Get all contracts for address 0x123...
     * uint256[] memory myContracts = getContractsByUser(0x123...)
     */
    function getContractsByUser(address _user) external view returns (uint256[] memory) {
        uint256[] memory userContracts = new uint256[](contractCounter);
        uint256 count = 0;
        
        // Loop through all contracts to find user's involvement
        for (uint256 i = 1; i <= contractCounter; i++) {
            if (contracts[i].seller == _user || contracts[i].buyer == _user) {
                userContracts[count] = i;
                count++;
            }
        }
        
        // Create properly sized result array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = userContracts[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get all existing contract IDs
     * @return Array of all contract IDs (1, 2, 3, ...)
     * 
     * Example: Get list of all contracts to browse marketplace
     * uint256[] memory allContracts = getAllContracts()
     */
    function getAllContracts() external view returns (uint256[] memory) {
        uint256[] memory allContracts = new uint256[](contractCounter);
        
        for (uint256 i = 1; i <= contractCounter; i++) {
            allContracts[i-1] = i;
        }
        
        return allContracts;
    }
    
    /**
     * @dev Get the contract balance (for debugging)
     * @return Current AVAX balance held by this contract
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}