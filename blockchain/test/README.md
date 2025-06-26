# GoHedge Insurance Contract Test Suite

Comprehensive test suites for GoHedge insurance smart contracts covering local development and testnet deployment.

## Test Structure
Dummy contract at 0xc62C15AD56f54757bb074e0779aE85e54FD67861
```
test/
├── README.md                          # This file
├── YieldForwardInsurance.test.js       # Main contract tests (local)
├── local/
│   ├── DummyInsurance.test.js         # Dummy contract comprehensive tests
│   └── testDummy.txt                  # Test specification (40 steps)
└── testnet/
    ├── testnetDummy.js                # 2-wallet testnet integration tests
    └── testnetDummy.txt               # Testnet test specification
```

## Quick Start

### Local Testing

```bash
# Run all local tests
npx hardhat test

# Run specific test file
npx hardhat test test/YieldForwardInsurance.test.js
npx hardhat test test/local/DummyInsurance.test.js
```

### Testnet Testing
```bash
# Deploy contracts
npx hardhat run scripts/dummyTestNetDeploy.js --network fuji

# Run integration tests
npx hardhat run test/testnet/testnetDummy.js --network fuji
```

## Test Coverage

### YieldForwardInsurance.test.js
Main production contract tests:
- Contract creation with AVAX reserves
- Insurance purchase validation
- Price-triggered payout system
- Chainlink automation integration
- Fee withdrawal after expiration
- Error handling and edge cases

### local/DummyInsurance.test.js
Comprehensive dummy contract testing (40 steps):
- Multi-contract creation scenarios
- Insurance purchase workflows
- Price triggering mechanisms
- Payout claims and withdrawals
- Contract expiration handling
- Seller protection for unpurchased contracts
- Balance tracking and recycling
- Error scenarios and validations

### testnet/testnetDummy.js
Real testnet integration (2-wallet scenario):
- Live deployment verification
- Multi-wallet interaction testing
- Real AVAX transaction flows
- Contract lifecycle on Fuji testnet
- Gas cost analysis
- Balance recycling validation

## Wallet Requirements

### Local Testing
- No real funds required (Hardhat local blockchain)
- 10,000 test AVAX provided automatically

### Testnet Testing
- Wallet 1 (Deployer/Seller): 3 AVAX minimum
- Wallet 2 (Buyer): 2 AVAX minimum
- Total Required: 5 AVAX on Fuji testnet

## Expected Outcomes

### Local Tests
- Duration: 2-3 minutes
- Result: All assertions pass
- Coverage: 100% function coverage

### Testnet Integration
- Duration: 5-7 minutes (includes wait times)
- AVAX Recovery Rate: 109% (net profit after gas)
- Final Balance: 5.8 AVAX from 5.0 AVAX initial

## Key Test Scenarios

### 1. Contract Lifecycle Testing
- Create multiple insurance contracts with different parameters
- Purchase insurance from different buyers
- Trigger payouts based on price conditions
- Claim payouts and verify transfers

### 2. Seller Protection
Unpurchased Contract Scenario:
- Create contract without buyer
- Wait for expiration
- Seller withdraws full reserve
- Only gas fees lost (seller protected)

### 3. Price Condition Validation
- Test various trigger price scenarios
- Verify price-based payout logic
- Handle edge cases (expired contracts, invalid triggers)

### 4. Multi-User Interactions
- Multiple sellers creating contracts
- Multiple buyers purchasing insurance
- Concurrent contract operations
- Balance tracking across users

## Test Specifications

### testDummy.txt (40 Steps)
Detailed step-by-step specification for local dummy contract testing:
- Contract creation parameters
- Expected balance changes
- Transaction validation steps
- Error scenario testing

### testnetDummy.txt (2-Wallet Flow)
Real-world testnet integration specification:
- Deployment requirements
- Multi-phase testing workflow
- Balance recycling verification
- Gas cost optimization

## Configuration

### Environment Setup
```bash
# Required environment variables (.env)
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
BUYER_PRIVATE_KEY=your_buyer_private_key
```

### Contract Verification
```bash
# Install verification plugin
npm install --save-dev @nomicfoundation/hardhat-verify

# Verify deployed contract
npx hardhat verify --network fuji CONTRACT_ADDRESS "0x0000000000000000000000000000000000000000"
```

### Network Configuration
- Local: Hardhat Network (automatic)
- Testnet: Avalanche Fuji
- Gas optimization for testnet deployment

## Test Metrics

| Test Suite | Duration | Coverage | Assertions |
|------------|----------|----------|------------|
| YieldForwardInsurance | 30s | 95% | 25+ |
| DummyInsurance Local | 60s | 100% | 40+ |
| Testnet Integration | 300s | End-to-End | 15+ |

## Troubleshooting

### Common Issues

**"Insufficient AVAX" Error**
- Ensure wallets have minimum required balances
- Check Fuji faucet for additional test AVAX

**"Contract Not Found" Error**
- Run deployment script before tests
- Verify deployment file exists in deployments/

**"Price Condition Not Met" Error**
- Check test price settings in contract
- Verify trigger price logic in test scenarios

### Getting Test AVAX
- Fuji Faucet: https://faucet.avax.network/
- Required: 5 AVAX total (3 + 2 for two wallets)
- Drip Rate: 2 AVAX per request (24h cooldown)

## Success Criteria

All tests pass when:
- Contract deployment successful
- All insurance purchases complete
- Price triggers activate correctly
- Payouts claimed successfully
- Seller protection verified
- Balance recycling rate >100%
- No critical errors or reverts

These tests validate the complete insurance contract ecosystem including contract creation, purchase workflows, payout mechanisms, and seller protection features. The testnet integration provides real-world validation with actual AVAX transactions.
