
export const USER_PROFILES = {
  "0x987654321fedcba987654321fedcba987654321f": {
    reputation_score: 4.5,
    total_contracts_created: 0,
    total_contracts_purchased: 2,
    success_rate: 0.85,
    joined_date: "2024-01-15T00:00:00Z",
    total_volume: 125.75,
    kyc_verified: false,
    notification_preferences: {
      email: true,
      push: true,
      sms: false
    }
  },
  "0x1234567890123456789012345678901234567890": {
    reputation_score: 4.8,
    total_contracts_created: 5,
    total_contracts_purchased: 1,
    success_rate: 0.92,
    joined_date: "2024-02-10T00:00:00Z",
    total_volume: 500.0,
    kyc_verified: true,
    notification_preferences: {
      email: true,
      push: true,
      sms: true
    }
  },
  "0x2345678901234567890123456789012345678901": {
    reputation_score: 4.2,
    total_contracts_created: 3,
    total_contracts_purchased: 0,
    success_rate: 0.78,
    joined_date: "2024-03-05T00:00:00Z",
    total_volume: 300.0,
    kyc_verified: false,
    notification_preferences: {
      email: true,
      push: false,
      sms: false
    }
  }
};

export const PORTFOLIO_DB = {
  "0x987654321fedcba987654321fedcba987654321f": {
    contracts: [2, 3],
    total_pnl: 125.75,
    active_count: 2,
    expired_count: 0,
    nearly_expired_count: 0,
    total_invested: 6.25,
    current_value: 118.75,
    roi_percentage: -5.0
  }
};
