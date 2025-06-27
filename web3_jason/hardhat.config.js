require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-verify");

// Default dummy private keys for local development
const DUMMY_PRIVATE_KEY_1 = "0x0000000000000000000000000000000000000000000000000000000000000001";
const DUMMY_PRIVATE_KEY_2 = "0x0000000000000000000000000000000000000000000000000000000000000002";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    // Local Hardhat network with same-timestamp allowance
    hardhat: {
      allowBlocksWithSameTimestamp: true
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY || DUMMY_PRIVATE_KEY_1,  // Wallet 1: Deployer/Seller
        process.env.BUYER_PRIVATE_KEY    || DUMMY_PRIVATE_KEY_2   // Wallet 2: Buyer
      ],
      chainId: 43113
    }
  },
  etherscan: {
    apiKey: {
      fuji: "snowtrace"
    },
    customChains: [
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
          browserURL: "https://testnet.snowtrace.io/"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
};
