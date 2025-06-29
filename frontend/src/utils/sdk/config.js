
/**
 * CONTRACT CONFIGURATION
 */
export const CONTRACT_CONFIG = {
  // Your deployed contract on Avalanche Fuji testnet
  address: "0xc62C15AD56f54757bb074e0779aE85e54FD67861",
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  chainId: 43113,
  name: "DummyInsurance",
  blockExplorer: "https://testnet.snowtrace.io/"
};

export const SUPPORTED_CHAINS = {
  43113: {
    name: "Avalanche Fuji Testnet",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    currency: "AVAX",
    blockExplorer: "https://testnet.snowtrace.io/"
  }
};
