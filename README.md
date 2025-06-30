# GoHedge - Trigger-Based Insurance Protocol

**Live Deployment:** [Avalanche Fuji Testnet](https://testnet.snowtrace.io/address/0x93A8dB48b19E3f4Ec4DB864aBEf054560a3E7257)  
**Contract Address:** `0x93A8dB48b19E3f4Ec4DB864aBEf054560a3E7257`

**Upkeep address:** [Chainlink Automation](https://automation.chain.link/fuji/3517839470200857376614867633919432353455215496638757101451424364126993591560)  
**Contract Address:** `0x6111AE96A28d77dDCAe6FBcA0b9675adB27F4882`

## Problem

High-yield tokens lack hedging tools. This creates low investor confidence and limited volumes for Layer 1 projects.

## Solution

GoHedge provides trigger-based insurance for L1 tokens. Users buy protection against price drops below a set threshold, enabling confident investment in high-yield but risky protocols.

## How It Works

### For Insurance Sellers
1. Set trigger price (e.g., $1.00 for a $2.00 token)
2. Deposit reserve funds (payout amount)
3. Set insurance fee (premium to collect)
4. Earn fee if price stays above trigger

### For Insurance Buyers  
1. Pay insurance fee
2. Get guaranteed payout if price drops below trigger
3. Automated execution via Chainlink

## Real-World Example

**Farm2 Token Scenario:**
- Current price: $2.00
- Seller creates insurance with $1.00 trigger (50% protection)
- Buyer pays 1 AVAX fee for 10 AVAX protection
- If Farm2 drops below $1.00, buyer gets 10 AVAX automatically

## Technical Features

### Chainlink Integration
- **Price Feeds:** Real-time price monitoring for AVAX, BTC, ETH, LINK, USDC
- **Time-based Automation:** Hourly automated checks and payouts
- **CCIP:** Cross-chain whitelist synchronization

*For detailed Chainlink integration examples and implementation details, see [Technical Documentation](web3/TECHNICAL_DOCUMENTATION.md#example-chainlink-integration)*

### Smart Contract Features
- USDC and AVAX reserve support
- Seller-controlled whitelists
- Emergency controls
- Gas-optimized automation
- Comprehensive testing (100+ test cases)

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Smart Contract  │    │   Chainlink     │
│   (React/Vite)  │◄──►│  GoHedgePreProd  │◄──►│   Services      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌──────────────┐        ┌──────────────┐
                       │ USDC/AVAX    │        │ • Price Feed │
                       │ Reserves     │        │ • Automation │
                       └──────────────┘        │ • CCIP       │
                                               └──────────────┘
```

## Project Structure

```
GoHedge/
├── web3/                 # Smart contracts (final deployment)
│   ├── contracts/        # Solidity contracts
│   ├── test/            # Comprehensive test suite
│   ├── scripts/         # Deployment scripts
│   └── deployment-gohedge-info.json
├── frontend/            # React web interface
└── blockchain/          # Legacy contracts
```

## Deployment Information

**Network:** Avalanche Fuji Testnet  
**Contract:** GoHedgePreProduction  
**Address:** `0x93A8dB48b19E3f4Ec4DB864aBEf054560a3E7257`  
**USDC Token:** `0x10268c766Ade3610Ff8F6ceF42Ec90B5AaF6c311`  
**Block:** 42713764  

## Use Cases

1. **New Protocol Launch** - Hedge against early volatility
2. **Yield Farming** - Protect principal while earning high APY  
3. **Arbitrage Protection** - Hedge positions during cross-chain activities
4. **Government Finance** - Hedge sovereign foreign currency reserves
5. **Investment Funds** - Limit downside on multi-asset portfolios

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask with Avalanche Fuji testnet
- Test AVAX from [faucet](https://faucet.avax.network/)

### Setup

1. **Clone repository:**
```bash
git clone https://github.com/JZ1101/GoHedge.git
cd GoHedge
```

2. **Install dependencies:**
```bash
# Smart contracts
cd web3
npm install

# Frontend
cd ../frontend  
npm install
```

3. **Deploy contracts:**
```bash
cd web3
npx hardhat run scripts/deployGoHedgePreProduction.js --network fuji
```

4. **Run frontend:**
```bash
cd frontend
npm run dev
```

## Testing

```bash
cd web3
npm run test:all
```

**Test Coverage:**
- 100+ comprehensive test cases
- Gas optimization tests
- Security vulnerability tests
- Cross-chain functionality tests

**Additional Test Commands:**
- `npm run test:core` - Core functionality tests
- `npm run test:security` - Security tests
- `npm run test:performance` - Performance tests
- `npm run test:gas` - Gas optimization tests

## Key Features

- **Automated Execution** - No manual intervention required
- **Multi-Token Support** - AVAX, BTC, ETH, LINK, USDC price feeds
- **Flexible Reserves** - Support for both USDC and AVAX
- **Cross-Chain Ready** - CCIP integration for multi-chain expansion
- **Security First** - ReentrancyGuard, comprehensive testing

## Impact

**For Investors:** Secure participation in high-yield protocols with defined risk limits  
**For Developers:** Increased ecosystem confidence and higher token volumes  
**For Markets:** Better price discovery and reduced volatility through risk distribution

## Technical Documentation

See [web3/TECHNICAL_DOCUMENTATION.md](web3/TECHNICAL_DOCUMENTATION.md) for detailed technical specifications.

## Demo Video

[Watch Demo](https://youtu.be/TjyQAORsQ0w)

## License

GPL License - see [LICENSE](LICENSE) file for details.
