require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-verify");

module.exports = {
  solidity: "0.8.19",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY,  // Wallet 1: Deployer/Seller
        process.env.BUYER_PRIVATE_KEY      // Wallet 2: Buyer
      ],
      chainId: 43113
    }
  },
  etherscan: {
    apiKey: {
      fuji: "snowtrace" // Use object format with network name as key
    },
    customChains: [
      {
        network: "fuji", 
        chainId: 43113,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
          browserURL: "https://testnet.snowtrace.io"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
};