
export interface Contract {
  id: string;
  seller: string;
  buyer?: string;
  triggerToken: string;
  triggerPrice: number;
  currentPrice: string;
  reserveToken: string;
  reserveAmount: number;
  insuranceFee: number;
  totalCost: string;
  expiresInDays: number;
  expiresAt: string;
  status: 'available' | 'active' | 'triggered' | 'expired';
  canPurchase?: boolean;
  createdAt: string;
}

export interface MarketplaceContract {
  id: string;
  seller: string;
  buyer?: string;
  trigger_token: string;
  trigger_price: number;
  current_price: string;
  reserve_token: string;
  reserve_amount: number;
  insurance_fee: number;
  total_cost: string;
  expires_in_days: number;
  expires_at: string;
  status?: string;
  isAvailable: boolean;
}

export interface InsuranceContract {
  id: number;
  seller_address: string;
  buyer_address?: string;
  trigger_token: string;
  trigger_price: number;
  reserve_token: string;
  reserve_token_address: string;
  reserve_amount: number;
  insurance_fee: number;
  start_date: string;
  end_date: string;
  status: 'available' | 'active' | 'triggered' | 'expired';
  tx_hash: string;
  created_at: string;
  purchased_at?: string;
  triggered: boolean;
  payout_claimed: boolean;
  fee_withdrawn: boolean;
}

export interface WalletState {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
}

export interface PriceData {
  usd: number;
  usd_24h_change: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}
