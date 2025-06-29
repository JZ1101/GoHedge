# GoHedge Technical Documentation

## Overview

GoHedge is a decentralized insurance protocol deployed on Avalanche Fuji Testnet. It leverages multiple Chainlink services to automate insurance payouts based on real-time price data and supports cross-chain whitelist synchronization using Chainlink CCIP. The protocol is designed for extensibility, security, and composability in DeFi and RWA tokenization use cases.

---

## Submission Requirements Checklist

- **Chainlink Usage:**  
  - Uses Chainlink Data Feeds for price triggers  
  - Uses Chainlink Automation for time-based execution  
  - Uses Chainlink CCIP for cross-chain whitelist sync  
  - All Chainlink integrations are in smart contracts (not just frontend)

- **Video Demo:**  
  - [Link to 3-5 minute public demo video](https://your-demo-link)

- **Source Code:**  
  - [GitHub Repository (public)](https://github.com/your-repo/gohedge)

- **README:**  
  - [README.md](./README.md)  
  - [Chainlink Usage Reference](./README.md#chainlink-integration)

- **Live Demo (optional):**  
  - [Deployed contract on Fuji Testnet](https://testnet.snowtrace.io/address/your-contract)

---

## Architecture & Stack

- **Smart Contracts:** Solidity 0.8.19
- **Framework:** Hardhat
- **Network:** Avalanche Fuji Testnet (C-Chain)
- **Chainlink Services:** Data Feeds, Automation, CCIP
- **Token Support:** AVAX (native), USDC (ERC-20)
- **Testing:** Mocha, Chai, Hardhat Network Helpers
- **Security:** OpenZeppelin Contracts

### Key Files Using Chainlink

- [`contracts/GoHedgePreProduction.sol`](./contracts/GoHedgePreProduction.sol)  
  - Data Feeds, Automation, CCIP
- [`contracts/DummyUpgradeUSDC_Whitelist.sol`](./contracts/DummyUpgradeUSDC_Whitelist.sol)  
  - Data Feeds, Automation
- [`contracts/DummyUpgradeUSDC.sol`](./contracts/DummyUpgradeUSDC.sol)  
  - Data Feeds, Automation

---

## Core Features

- **Automated Insurance Contracts:**  
  Users can create and purchase insurance contracts that pay out if a token price falls below a threshold.

- **Multi-Token Support:**  
  Supports AVAX and USDC reserves, with price triggers for AVAX, BTC, ETH, LINK, and USDC.

- **Chainlink Data Feeds:**  
  Used for secure, real-time price data to trigger insurance payouts.

- **Chainlink Automation:**  
  Time-based automation checks all contracts and triggers payouts when conditions are met.

- **Chainlink CCIP:**  
  Enables cross-chain whitelist synchronization for multi-chain access control.

- **Seller-Controlled Whitelist:**  
  Sellers can restrict contract purchases to specific addresses, with batch operations and CCIP sync.

- **Emergency Controls:**  
  Owner can pause/resume automation and recover stuck funds.

---

## Example Chainlink Integration

**Data Feeds:**
```solidity
AggregatorV3Interface public priceFeed;
function getCurrentPrice(string memory _token) public view returns (uint256) {
    if (testMode) return testPrices[_token];
    AggregatorV3Interface feed = priceFeeds[_token];
    (, int256 price, , uint256 updatedAt, ) = feed.latestRoundData();
    require(price > 0, "Invalid price data");
    require(block.timestamp - updatedAt <= 3600, "Price data too old");
    return uint256(price);
}
```

**Automation:**
```solidity
function performTimeBasedUpkeep() external {
    require(automationEnabled, "Automation disabled");
    // Iterates through contracts and triggers payouts if needed
}
```

**CCIP (Cross-Chain):**
```solidity
function _syncWhitelistCrossChain(
    CCIPMessageType _messageType,
    uint256 _contractId,
    address[] memory _buyers
) internal {
    // Sends whitelist update to other chains via CCIP
}
```

---

## Deployment & Usage

- **Deploy on Fuji Testnet:**  
  See [`scripts/deployUSDC.js`](./scripts/deployUSDC.js) for deployment steps.

- **Configure Automation:**  
  Use `configureAutomation()` to set gas limits, batch size, and interval.

- **Create Contracts:**  
  Use `createContract()` with desired parameters (token, price, reserve type, whitelist, etc).

- **Whitelist Management:**  
  Use `addBuyerToWhitelist()`, `removeBuyerFromWhitelist()`, and batch operations.  
  Enable cross-chain sync with the `_syncCrossChain` flag.

- **Emergency Functions:**  
  Use `emergencyPause()`, `emergencyResume()`, `emergencyUSDCRecovery()`, and `emergencyAvaxRecovery()` as needed.

---

## Security & Testing

- **Reentrancy Protection:**  
  All fund transfer functions use OpenZeppelin ReentrancyGuard.

- **Access Control:**  
  Only sellers can manage whitelists; only owner can use emergency functions.

- **Comprehensive Tests:**  
  - Core, security, performance, and integration tests in `test/` folder.
  - See [README.md#testing](./README.md#testing) for details.

---

## Value Proposition

- **Downside Protection:** Automated, trustless insurance for crypto holders.
- **Cross-Chain Ready:** Whitelist and access control sync across chains.
- **Flexible Reserves:** Supports both stablecoin and native token payouts.
- **Composability:** Designed for integration with DeFi and RWA protocols.

---

## Roadmap

- **Phase 1:** Core protocol, Chainlink integration, Fuji deployment, full test suite.
- **Phase 2:** Frontend, multi-chain deployment, advanced insurance products.
- **Phase 3:** Governance, insurance marketplace, L2 and RWA integrations.

---

## References

- [Chainlink Documentation](https://docs.chain.link/)
- [Avalanche Fuji Testnet](https://chainlist.org/chain/43113)
- [GoHedge GitHub](https://github.com/your-repo/gohedge)

---

*For any questions, see the README or contact the team via the repository.*