
/**
 * REAL DUMMY INSURANCE CONTRACT ABI
 * Generated from the actual deployed contract
 */
const REAL_CONTRACT_ABI = [
  // Contract creation
  {
    "inputs": [
      {"internalType": "string", "name": "_triggerToken", "type": "string"},
      {"internalType": "uint256", "name": "_triggerPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "_startDate", "type": "uint256"},
      {"internalType": "uint256", "name": "_endDate", "type": "uint256"},
      {"internalType": "string", "name": "_reserveToken", "type": "string"},
      {"internalType": "uint256", "name": "_reserveAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "_insuranceFee", "type": "uint256"}
    ],
    "name": "createContract",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Purchase insurance
  {
    "inputs": [{"internalType": "uint256", "name": "_contractId", "type": "uint256"}],
    "name": "purchaseInsurance",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Claim payout
  {
    "inputs": [{"internalType": "uint256", "name": "_contractId", "type": "uint256"}],
    "name": "claimPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Trigger payout
  {
    "inputs": [{"internalType": "uint256", "name": "_contractId", "type": "uint256"}],
    "name": "triggerPayout",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Withdraw reserve
  {
    "inputs": [{"internalType": "uint256", "name": "_contractId", "type": "uint256"}],
    "name": "withdrawReserve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get contract details
  {
    "inputs": [{"internalType": "uint256", "name": "_contractId", "type": "uint256"}],
    "name": "getContract",
    "outputs": [
      {"internalType": "address", "name": "seller", "type": "address"},
      {"internalType": "address", "name": "buyer", "type": "address"},
      {"internalType": "string", "name": "triggerToken", "type": "string"},
      {"internalType": "uint256", "name": "triggerPrice", "type": "uint256"},
      {"internalType": "string", "name": "reserveToken", "type": "string"},
      {"internalType": "uint256", "name": "reserveAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "insuranceFee", "type": "uint256"},
      {"internalType": "uint256", "name": "startDate", "type": "uint256"},
      {"internalType": "uint256", "name": "endDate", "type": "uint256"},
      {"internalType": "bool", "name": "active", "type": "bool"},
      {"internalType": "bool", "name": "triggered", "type": "bool"},
      {"internalType": "bool", "name": "claimed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Get contracts by user
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "getContractsByUser",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get all contracts
  {
    "inputs": [],
    "name": "getAllContracts",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get current price
  {
    "inputs": [],
    "name": "getCurrentPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Contract counter
  {
    "inputs": [],
    "name": "contractCounter",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "contractId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "triggerToken", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "triggerPrice", "type": "uint256"}
    ],
    "name": "ContractCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "contractId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"}
    ],
    "name": "ContractPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "contractId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "currentPrice", "type": "uint256"}
    ],
    "name": "PayoutTriggered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "contractId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "PayoutClaimed",
    "type": "event"
  }
];

export default REAL_CONTRACT_ABI;
