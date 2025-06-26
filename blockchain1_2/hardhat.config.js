require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Default dummy private key for local development
const DUMMY_PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001";

module.exports = {
  solidity: "0.8.19",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [DUMMY_PRIVATE_KEY]
    }
  }
};