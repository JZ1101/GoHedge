# GoHedge - Decentralized Insurance Protocol

## Overview

GoHedge is a comprehensive decentralized insurance protocol built on the Avalanche network that provides automated cryptocurrency price-based insurance contracts. The protocol integrates with Chainlink price feeds and automation to deliver trustless, automated insurance payouts when specified price conditions are met.

## Technology Stack

### Blockchain & Smart Contracts
- **Blockchain Platform**: Avalanche (C-Chain)
  - Mainnet: High-speed, low-cost transactions
  - Fuji Testnet: Development and testing environment
- **Smart Contract Language**: Solidity 0.8.19
- **Contract Architecture**: Upgradeable proxy pattern with OpenZeppelin
- **Gas Optimization**: Assembly optimizations, packed structs, batch operations

### Development Framework
- **Development Environment**: Hardhat 2.25.0
- **Package Manager**: npm
- **Node.js**: Version 18+ recommended
- **Testing Framework**: Mocha + Chai
- **Coverage**: Hardhat Coverage Plugin
- **Linting**: Solhint for Solidity code quality

### Blockchain Infrastructure
- **Oracle Service**: Chainlink Price Feeds
  - Real-time cryptocurrency price data
  - Decentralized and tamper-resistant
- **Automation**: Chainlink Automation (Time-based Upkeep)
  - Automated contract execution every hour
  - Gas-efficient batch operations
- **Cross-Chain**: Chainlink CCIP (Cross-Chain Interoperability Protocol)
  - Multi-chain contract synchronization
  - Cross-chain whitelist management

### Security & Standards
- **Security Library**: OpenZeppelin Contracts 4.9.6
  - ReentrancyGuard: Prevents reentrancy attacks
  - Ownable: Access control pattern
  - Pausable: Emergency stop functionality
- **Token Standards**: ERC-20 (USDC integration)
- **Security Patterns**: 
  - Checks-Effects-Interactions (CEI)
  - Pull payment pattern
  - Rate limiting

### Testing & Quality Assurance
- **Unit Testing**: Hardhat Test Environment
- **Integration Testing**: Forked mainnet testing
- **Testnet Testing**: Live Fuji testnet validation
- **Mock Infrastructure**: 
  - MockERC20 for token testing
  - Mock Chainlink aggregators
- **Performance Testing**: Gas usage analysis and optimization
- **Security Testing**: Reentrancy, overflow, access control tests

### Development Tools & Libraries
- **Web3 Library**: Ethers.js 6.14.4
- **Environment Management**: dotenv 16.6.0
- **Code Compilation**: Hardhat Compiler (Solidity)
- **ABI Generation**: Automatic contract interface generation
- **Type Safety**: TypeScript support via Hardhat Toolbox

### Infrastructure & Deployment
- **Network Configuration**: Hardhat Network Config
  - Local: Hardhat Node (127.0.0.1:8545)
  - Testnet: Avalanche Fuji (Chain ID: 43113)
  - Mainnet: Avalanche C-Chain (Chain ID: 43114)
- **Deployment Scripts**: Custom Hardhat deployment automation
- **Contract Verification**: Snowtrace integration
- **Environment Variables**: Secure key management

### APIs & External Services
- **Price Data Sources**:
  - Chainlink AVAX/USD: `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD` (Fuji)
  - Chainlink BTC/USD: `0x31CF013A08c6Ac228C94551d535d5BAfE19c602a` (Fuji)
  - Chainlink ETH/USD: `0x86d67c3D38D2bCeE722E601025C25a575021c6EA` (Fuji)
  - Chainlink LINK/USD: `0x34C4c526902d88a3Aa98DB8a9b802603EB1E3470` (Fuji)
- **Block Explorer**: Snowtrace (Avalanche's Etherscan)
- **Faucet Service**: Avalanche Fuji Faucet for testnet AVAX

### Token Integration
- **Native Token**: AVAX (Avalanche native token)
- **Stablecoin**: USDC (USD Coin) - Circle's stablecoin
- **Mock Tokens**: MockERC20 for testing environments
- **Token Standards**: Full ERC-20 compatibility

### Performance & Scalability
- **Transaction Throughput**: Avalanche C-Chain (4,500+ TPS)
- **Block Time**: Sub-second finality
- **Gas Efficiency**: Optimized contract bytecode
- **Batch Operations**: Multiple contract processing
- **Automation Efficiency**: Time-based upkeep integration

### Development Workflow
```
Local Development → Unit Tests → Integration Tests → Fuji Testnet → Security Audit → Mainnet
```

### Project Structure
```
web3/
├── contracts/                    # Solidity smart contracts
│   ├── dummyupgrade.sol         # Core insurance protocol
│   ├── DummyUpgradeUSDC.sol     # USDC reserve support
│   ├── DummyUpgradeUSDC_Whitelist.sol  # Whitelist functionality
│   ├── GoHedgePreProduction.sol # Production-ready version
│   └── MockERC20.sol           # Token testing utilities
├── scripts/                     # Deployment and utility scripts
│   ├── deployGoHedgePreProduction.js
│   ├── deploy.js
│   ├── get-abi.js
│   ├── get-abi-usdc.js
│   └── RunAllTests.js          # Test automation
├── test/                       # Comprehensive test suites
│   ├── AddPriceFeed_TimeBased.test.js
│   ├── DummyUpgrade.test.js
│   ├── DummyUpgradeUSDC.test.js
│   ├── DummyUpgradeUSDC_Whitelist.test.js
│   ├── DummyUpgradeUSDC_Whitelist_TimeBased.test.js
│   ├── GasAndPerformance.test.js
│   ├── GasAndPerformance_Whitelist.test.js
│   ├── GoHedgePreProduction.comprehensive.test.js
│   ├── GoHedgePreProduction.dummy.test.js
│   ├── GoHedgePreProduction.testnet.test.js
│   ├── SecurityTests.test.js
│   └── SecurityTests_Whitelist.test.js
├── abi/                        # Contract ABIs
├── artifacts/                  # Compiled contracts
├── cache/                      # Build cache
├── deployments/               # Deployment artifacts
├── ignition/                  # Hardhat Ignition deployment
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies and scripts
├── README.md                 # This file
└── TECHNICAL_DOCUMENTATION.md # Detailed technical docs
```

### Environment Configuration
```env
# Blockchain Network
AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AVALANCHE_MAINNET_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Account Management
DEPLOYER_PRIVATE_KEY=0x...
BUYER_PRIVATE_KEY=0x...

# External Services
SNOWTRACE_API_KEY=YourSnowtraceAPIKey
COINMARKETCAP_API_KEY=YourCoinMarketCapAPIKey

# Contract Addresses (Fuji Testnet)
CHAINLINK_AVAX_USD_FEED=0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
```

### Dependencies Overview
```json
{
  "dependencies": {
    "@openzeppelin/contracts": "^4.9.6",     // Security & standards
    "@chainlink/contracts": "^1.4.0",        // Oracle integration
    "ethers": "^6.14.4",                     // Web3 library
    "hardhat": "^2.25.0",                    // Development framework
    "dotenv": "^16.6.0"                      // Environment management
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^6.0.0",
    "hardhat-gas-reporter": "^1.0.8",
    "solidity-coverage": "^0.8.1"
  }
}
```

### Network Specifications
| Network | Chain ID | RPC Endpoint | Block Explorer | Native Token |
|---------|----------|--------------|----------------|--------------|
| Avalanche Mainnet | 43114 | https://api.avax.network/ext/bc/C/rpc | https://snowtrace.io | AVAX |
| Avalanche Fuji | 43113 | https://api.avax-test.network/ext/bc/C/rpc | https://testnet.snowtrace.io | AVAX |
| Hardhat Local | 31337 | http://127.0.0.1:8545 | N/A | ETH |

### Gas & Performance Metrics
| Operation | Gas Usage | USD Cost (Fuji) | Description |
|-----------|-----------|------------------|-------------|
| Contract Creation | ~260K | <$0.01 | Deploy new insurance contract |
| Purchase Insurance | ~80K | <$0.01 | Buy insurance coverage |
| Claim Payout | ~120K | <$0.01 | Process insurance claim |
| Batch Automation | ~500K | <$0.01 | Process 10 contracts |
| Price Update | ~30K | <$0.01 | Update test prices |

## Core Features

- **Price-Triggered Insurance**: Contracts automatically trigger when cryptocurrency prices fall below specified thresholds
- **Time-Based Automation**: Chainlink Time-based Upkeep for hourly automated execution
- **Dual-Mode Operation**: Test mode for development and production mode for live trading
- **Multi-Token Support**: Support for various cryptocurrencies (AVAX, BTC, ETH, LINK, USDC)
- **Dual Reserve System**: Support for both AVAX and USDC reserves
- **Whitelist Management**: Optional whitelist functionality with cross-chain synchronization
- **Emergency Controls**: Owner-controlled pause/resume functionality for emergency situations

## Smart Contract Architecture

### Contract Variants

1. **DummyUpgrade** - Core insurance protocol with AVAX reserves
2. **DummyUpgradeUSDC** - Enhanced version with USDC reserve support
3. **DummyUpgradeUSDC_Whitelist** - Adds whitelist functionality
4. **GoHedgePreProduction** - Production-ready version with all features

### Security Features
- **Reentrancy Protection**: ReentrancyGuard implementation prevents reentrancy attacks
- **Access Control**: Ownable pattern for administrative functions
- **Input Validation**: Comprehensive parameter validation
- **CEI Pattern**: Checks-Effects-Interactions pattern for secure state management

## Installation

```shell
# Clone the repository
git clone <repository-url>
cd GoHedge/web3

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

# Run all tests
npm run test:all

# Run specific test files
npx hardhat test test/DummyUpgrade.test.js
npx hardhat test test/SecurityTests.test.js
npx hardhat test test/GasAndPerformance.test.js

# Generate gas report
REPORT_GAS=true npx hardhat test

# Start local blockchain
npx hardhat node

# Get contract ABI
node scripts/get-abi.js
node scripts/get-abi-usdc.js
```

### Network Deployment

```shell
# Deploy to Avalanche Fuji Testnet
npx hardhat run scripts/deployGoHedgePreProduction.js --network fuji

# Verify contract on Snowtrace
npx hardhat verify --network fuji <CONTRACT_ADDRESS>

# Run testnet tests
npx hardhat test test/GoHedgePreProduction.testnet.test.js --network fuji
```

**Important Notes for Testnet Deployment:**
- The USDC token address in `deployment-gohedge-info.json` is a **MockERC20 token**, not real USDC
- This mock USDC is specifically deployed for testing purposes on Fuji testnet
- The contract supports both local testing (with test prices) and live testnet functionality

## Testing

The project includes comprehensive testing suites for both local and testnet environments:

### Test Categories

1. **Core Functionality Tests**
   - `DummyUpgrade.test.js` - Basic insurance functionality
   - `DummyUpgradeUSDC.test.js` - USDC reserve support
   - `DummyUpgradeUSDC_Whitelist.test.js` - Whitelist functionality
   - `AddPriceFeed_TimeBased.test.js` - Multi-token price feeds

2. **Integration Tests**
   - `GoHedgePreProduction.comprehensive.test.js` - Full feature testing
   - `GoHedgePreProduction.dummy.test.js` - 40-step validation
   - `DummyUpgradeUSDC_Whitelist_TimeBased.test.js` - Advanced automation

3. **Security Tests**
   - `SecurityTests.test.js` - Reentrancy and access control
   - `SecurityTests_Whitelist.test.js` - Whitelist security

4. **Performance Tests**
   - `GasAndPerformance.test.js` - Gas optimization testing
   - `GasAndPerformance_Whitelist.test.js` - Whitelist performance

5. **Testnet Tests**
   - `GoHedgePreProduction.testnet.test.js` - Live Fuji validation

### Test Execution

```shell
# Run all tests locally
npm run test:all

# Run testnet tests (requires Fuji network)
npx hardhat test test/GoHedgePreProduction.testnet.test.js --network fuji

# Run specific test categories
npx hardhat test test/SecurityTests.test.js
npx hardhat test test/GasAndPerformance.test.js

# Generate coverage report
npx hardhat coverage
```

### Testing Features

- **Comprehensive Coverage**: 95%+ function coverage across all contracts
- **Security Testing**: Reentrancy, access control, and edge case validation
- **Performance Testing**: Gas optimization and scalability testing
- **Real Testnet Integration**: Live Fuji testnet with actual Chainlink infrastructure
- **Mock Infrastructure**: Safe testing with MockERC20 tokens

## Automation & Chainlink Integration

### Time-Based Automation
The protocol exclusively uses Chainlink Time-based Upkeep:

```solidity
// Main automation function
function performTimeBasedUpkeep() external {
    require(automationEnabled, "Automation disabled");
    // Processes eligible contracts hourly
}

// Configuration
function configureAutomation(
    bool _enabled,
    uint256 _gasLimit,
    uint256 _maxContractsPerCheck,
    uint256 _timeInterval
) external onlyOwner
```

### Chainlink Services Integration

1. **Price Feeds**: Real-time price data from multiple tokens
2. **Time-based Upkeep**: Hourly automated execution
3. **CCIP**: Cross-chain whitelist synchronization

## Contract Interaction Examples

### Creating an Insurance Contract

```javascript
// AVAX Reserve Contract
const tx = await dummyUpgrade.connect(seller).createContract(
    "AVAX",                           // Token to monitor
    20 * 10**8,                      // Trigger price ($20 with 8 decimals)
    Math.floor(Date.now() / 1000),   // Start time
    Math.floor(Date.now() / 1000) + 86400, // End time (24 hours)
    false,                           // AVAX reserve (not USDC)
    ethers.parseEther("1"),          // Reserve amount (1 AVAX)
    ethers.parseEther("0.1"),        // Insurance fee (0.1 AVAX)
    true,                            // Auto-execute enabled
    false,                           // No whitelist
    { value: ethers.parseEther("1") } // Send reserve amount
);
```

### USDC Reserve Contract

```javascript
// Approve USDC first
await mockUSDC.approve(contractAddress, ethers.parseUnits("1000", 6));

// Create USDC reserve contract
const tx = await dummyUpgradeUSDC.connect(seller).createContract(
    "AVAX",                          // Token to monitor
    20 * 10**8,                      // Trigger price
    startTime,
    endTime,
    true,                            // USDC reserve
    ethers.parseUnits("1000", 6),    // Reserve amount (1000 USDC)
    ethers.parseEther("0.1"),        // Insurance fee (in AVAX)
    true,                            // Auto-execute
    false                            // No whitelist
);
```

## Configuration

### Automation Settings

```javascript
// Configure Time-based Automation
await contract.configureAutomation(
    true,       // Enable automation
    1500000,    // Gas limit (1.5M gas)
    20,         // Max contracts per check
    3600        // Time interval (1 hour)
);
```

### Test Mode Configuration

```javascript
// Set test prices (test mode only)
await contract.setTestPrice("AVAX", 25 * 10**8);
await contract.setTestPrice("BTC", 30000 * 10**8);

// Toggle test mode
await contract.setTestMode(false); // Switch to production mode
```

## Security Considerations

### Implemented Protections
- **Reentrancy Guard**: ReentrancyGuard on all fund transfer functions
- **Access Control**: OpenZeppelin Ownable for administrative functions
- **Input Validation**: Comprehensive parameter validation
- **CEI Pattern**: Checks-Effects-Interactions pattern implementation
- **Integer Overflow Protection**: Solidity 0.8.19 built-in protection
- **Emergency Functions**: Pause/resume functionality

### Security Testing Results
- ✅ Reentrancy attack prevention validated
- ✅ Access control properly enforced
- ✅ Input validation comprehensive
- ✅ State consistency maintained
- ✅ Edge cases handled gracefully
- ✅ Balance tracking accurate

## Production Deployment Checklist

### Fuji Testnet Deployment
- ✅ Smart contract testing complete (44/44 tests passing)
- ✅ Time-based automation implemented and tested
- ✅ Security validations passed
- ✅ Gas optimization verified
- ✅ Emergency controls operational
- ✅ Chainlink integration validated

### Mainnet Readiness
- ⏳ Professional security audit (recommended)
- ⏳ Bug bounty program (optional)
- ⏳ Replace MockERC20 with real USDC
- ⏳ Configure production price feeds
- ⏳ Set up monitoring and alerting

## API Reference

### Core Functions

#### Contract Creation
```solidity
function createContract(
    string calldata _token,
    uint256 _triggerPrice,
    uint256 _startDate,
    uint256 _endDate,
    bool _isUSDCReserve,           // USDC variant only
    uint256 _reserveAmount,
    uint256 _insuranceFee,
    bool _autoExecute,
    bool _whitelistEnabled         // Whitelist variant only
) external payable
```

#### Insurance Purchase
```solidity
function purchaseInsurance(uint256 _contractId) external payable
```

#### Automation Functions
```solidity
function performTimeBasedUpkeep() external
function configureAutomation(bool _enabled, uint256 _gasLimit, uint256 _maxContracts, uint256 _interval) external
```

### View Functions

#### Contract Information
```solidity
function getContract(uint256 _contractId) external view returns (Contract memory)
function getAllContracts() external view returns (uint256[] memory)
function getAutomationStats() external view returns (uint256, uint256, uint256, uint256, bool)
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
- Check the comprehensive test documentation in `/test` directory

## Technical Documentation

For detailed technical information, see:
- [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md) - Comprehensive technical guide
- Test documentation files in `/test` directory
- Contract ABI files in `/abi` directory

---

**Disclaimer**: This software is experimental and should be used at your own risk. Ensure thorough testing and security audits before production deployment.
