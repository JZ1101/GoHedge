# GoHedge - Decentralized Insurance Protocol

## Overview

GoHedge is a comprehensive decentralized insurance protocol built on the Avalanche network that provides automated cryptocurrency price-based insurance contracts. The protocol integrates with Chainlink price feeds and automation to deliver trustless, automated insurance payouts when specified price conditions are met.

## Core Features

- **Price-Triggered Insurance**: Contracts automatically trigger when cryptocurrency prices fall below specified thresholds
- **Chainlink Integration**: Real-time price feeds and automated execution via Chainlink Automation
- **Dual-Mode Operation**: Test mode for development and production mode for live trading
- **Multi-Token Support**: Support for various cryptocurrencies (AVAX, BTC, ETH, etc.)
- **Reserve Fund Management**: Secure handling of insurance reserves and automated payouts
- **Emergency Controls**: Owner-controlled pause/resume functionality for emergency situations

## Smart Contract Architecture

### DummyUpgrade Contract
The main insurance protocol contract that handles:
- Insurance contract creation and management
- Price monitoring and automated triggering
- Payout processing and claims management
- Integration with Chainlink price feeds and automation
- Emergency pause/resume functionality

### Security Features
- **Reentrancy Protection**: ReentrancyGuard implementation prevents reentrancy attacks
- **Access Control**: Ownable pattern for administrative functions
- **Input Validation**: Comprehensive parameter validation
- **CEI Pattern**: Checks-Effects-Interactions pattern for secure state management

## Installation

```shell
# Clone the repository
git clone <repository-url>
cd GoHedge/web3_jason

# Install dependencies
npm install

# Install required packages
npm install @openzeppelin/contracts@^4.9.6
npm install @chainlink/contracts@^1.4.0
npm install @nomicfoundation/hardhat-toolbox@^6.0.0
npm install dotenv@^16.6.0
npm install ethers@^6.14.4
npm install hardhat@^2.25.0
```

## Environment Setup

Create a `.env` file in the project root:

```env
# Required for testnet/mainnet deployment
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
BUYER_PRIVATE_KEY=your_buyer_private_key_here

# Optional: For contract verification
SNOWTRACE_API_KEY=your_snowtrace_api_key_here
```

## Usage

### Basic Commands

```shell
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Run specific test file
npx hardhat test test/DummyUpgrade.test.js

# Run security tests
npx hardhat test test/SecurityTests.test.js

# Run performance tests
npx hardhat test test/GasAndPerformance.test.js

# Generate gas report
REPORT_GAS=true npx hardhat test

# Start local blockchain
npx hardhat node

# Deploy to local network
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

### Network Deployment

```shell
# Deploy to Avalanche Fuji Testnet
npx hardhat run scripts/deploy.js --network fuji

# Verify contract on Snowtrace
npx hardhat verify --network fuji <CONTRACT_ADDRESS>
```

## Testing

The project includes comprehensive testing suites:

### Test Categories

1. **Core Functionality Tests** (`DummyUpgrade.test.js`)
   - Contract deployment and initialization
   - Insurance contract creation and purchase
   - Manual and automated triggering
   - Payout claims and reserve withdrawals
   - Emergency functions

2. **Security Tests** (`SecurityTests.test.js`)
   - Reentrancy attack protection
   - Access control validation
   - Input validation testing
   - State corruption protection
   - Edge case handling

3. **Performance Tests** (`GasAndPerformance.test.js`)
   - Gas limit handling
   - Large-scale operations (200+ contracts)
   - Automation efficiency testing
   - View function performance

### Test Execution

```shell
# Run all tests
npx hardhat test

# Run with detailed output
npx hardhat test --verbose

# Run specific test pattern
npx hardhat test --grep "reentrancy"

# Generate coverage report
npx hardhat coverage
```

## Contract Interaction Examples

### Creating an Insurance Contract

```javascript
// Connect to contract
const dummyUpgrade = await ethers.getContractAt("DummyUpgrade", contractAddress);

// Create insurance contract
const tx = await dummyUpgrade.connect(seller).createContract(
    "AVAX",                           // Token to monitor
    ethers.parseEther("25"),         // Trigger price (25 AVAX)
    Math.floor(Date.now() / 1000),   // Start time
    Math.floor(Date.now() / 1000) + 86400, // End time (24 hours)
    "AVAX",                          // Reserve token
    ethers.parseEther("1"),          // Reserve amount (1 AVAX)
    ethers.parseEther("0.1"),        // Insurance fee (0.1 AVAX)
    true,                            // Auto-execute enabled
    { value: ethers.parseEther("1") } // Send reserve amount
);
```

### Purchasing Insurance

```javascript
// Purchase insurance
const purchaseTx = await dummyUpgrade.connect(buyer).purchaseInsurance(
    1, // Contract ID
    { value: ethers.parseEther("0.1") } // Insurance fee
);
```

### Claiming Payout

```javascript
// Claim payout (after trigger)
const claimTx = await dummyUpgrade.connect(beneficiary).claimPayout(1);
```

## Configuration

### Automation Settings

```javascript
// Configure Chainlink Automation
await dummyUpgrade.configureAutomation(
    true,     // Enable automation
    1000000,  // Gas limit per execution
    10,       // Max contracts per check
    300       // Automation interval (seconds)
);
```

### Test Mode Settings

```javascript
// Set test price (test mode only)
await dummyUpgrade.setTestPrice("AVAX", ethers.parseEther("20"));

// Toggle test mode
await dummyUpgrade.setTestMode(false); // Switch to production mode
```

## Architecture Diagrams

### Contract Lifecycle
```
1. Seller creates insurance contract with reserve
2. Buyer purchases insurance by paying fee
3. Price monitoring begins (Chainlink feeds)
4. If price drops below trigger → automatic payout
5. Beneficiary claims payout or seller withdraws unused reserve
```

### Security Model
```
Access Control: Owner → Admin functions
              Seller → Contract creation, fee receiver changes
              Buyer → Insurance purchase, beneficiary changes
              Beneficiary → Payout claims

Protection: ReentrancyGuard → Prevents reentrancy attacks
           Input Validation → Validates all parameters
           State Management → CEI pattern implementation
```

## Gas Optimization

The contract is optimized for gas efficiency:

- **Contract Creation**: ~200K gas
- **Insurance Purchase**: ~80K gas  
- **Manual Trigger**: ~120K gas
- **Automated Batch (10 contracts)**: ~500K gas
- **View Functions**: <50K gas each

## Security Considerations

### Implemented Protections
- Reentrancy Guard on all fund transfer functions
- Access control with OpenZeppelin Ownable
- Input validation for all parameters
- CEI (Checks-Effects-Interactions) pattern
- Integer overflow protection (Solidity 0.8.19)
- Emergency pause functionality

### Audit Recommendations
- Professional security audit before mainnet deployment
- Bug bounty program consideration
- Comprehensive testnet testing period
- Monitor for unusual transaction patterns

## Deployment Addresses

### Avalanche Fuji Testnet
- **DummyUpgrade Contract**: `0x...` (TBD)
- **Chainlink Price Feed (AVAX/USD)**: `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`

### Avalanche Mainnet
- **DummyUpgrade Contract**: `TBD`
- **Chainlink Price Feed (AVAX/USD)**: `0x0A77230d17318075983913bC2145DB16C7366156`

## API Reference

### Core Functions

#### `createContract()`
Creates a new insurance contract
```solidity
function createContract(
    string calldata _triggerToken,
    uint256 _triggerPrice,
    uint256 _startDate,
    uint256 _endDate,
    string calldata _reserveToken,
    uint256 _reserveAmount,
    uint256 _insuranceFee,
    bool _autoExecute
) external payable
```

#### `purchaseInsurance()`
Purchases insurance for an existing contract
```solidity
function purchaseInsurance(uint256 _contractId) external payable
```

#### `claimPayout()`
Claims insurance payout after trigger
```solidity
function claimPayout(uint256 _contractId) external
```

### View Functions

#### `getContract()`
Returns complete contract information
```solidity
function getContract(uint256 _contractId) external view returns (Contract memory)
```

#### `getAllContracts()`
Returns array of all contract IDs
```solidity
function getAllContracts() external view returns (uint256[] memory)
```

#### `getAutomationStats()`
Returns automation system statistics
```solidity
function getAutomationStats() external view returns (
    uint256 totalContracts,
    uint256 activeContracts,
    uint256 triggeredContracts,
    uint256 lastCheck,
    bool enabled
)
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

### Development Guidelines
- Follow Solidity style guide
- Add comprehensive tests for new features
- Update documentation
- Ensure all tests pass
- Add gas usage analysis for new functions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/test` directory

## Roadmap

### Phase 1 (Current)
- Core insurance contract functionality
- Chainlink integration
- Comprehensive testing suite
- Security implementations

### Phase 2 (Upcoming)
- [ ] Frontend interface development
- [ ] Multi-chain deployment
- [ ] Advanced insurance products
- [ ] Governance token implementation

### Phase 3 (Future)
- [ ] Decentralized governance
- [ ] Insurance marketplace
- [ ] Cross-chain compatibility
- [ ] Layer 2 integration

## Technical Specifications

- **Solidity Version**: 0.8.19
- **Framework**: Hardhat
- **Network**: Avalanche (Fuji Testnet, Mainnet)
- **Oracles**: Chainlink Price Feeds
- **Automation**: Chainlink Automation
- **Security**: OpenZeppelin Contracts v4.9.6
- **Testing**: Mocha, Chai, Hardhat Network Helpers

---

**Disclaimer**: This software is experimental and should be used at your own risk. Ensure thorough testing and security audits before
