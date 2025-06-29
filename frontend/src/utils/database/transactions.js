
export const TRANSACTION_HISTORY = [
  {
    id: 1,
    contract_id: 2,
    user_address: "0x987654321fedcba987654321fedcba987654321f",
    transaction_type: "purchase",
    amount: 2.5,
    token: "AVAX",
    tx_hash: "0xabc123def456789...",
    timestamp: "2024-06-16T14:30:00Z",
    gas_fee: 0.01,
    status: "confirmed",
    block_number: 12345678
  },
  {
    id: 2,
    contract_id: 3,
    user_address: "0x987654321fedcba987654321fedcba987654321f",
    transaction_type: "purchase",
    amount: 3.75,
    token: "AVAX",
    tx_hash: "0xdef456ghi789012...",
    timestamp: "2024-06-11T09:15:00Z",
    gas_fee: 0.015,
    status: "confirmed",
    block_number: 12344567
  },
  {
    id: 3,
    contract_id: 1,
    user_address: "0x1234567890123456789012345678901234567890",
    transaction_type: "create",
    amount: 100,
    token: "AVAX",
    tx_hash: "0x123456789abc...",
    timestamp: "2024-06-20T10:00:00Z",
    gas_fee: 0.02,
    status: "confirmed",
    block_number: 12345679
  }
];
