
// Central database export
export { CONTRACTS_DB } from './contracts.js';
export { USER_PROFILES, PORTFOLIO_DB } from './users.js';
export { TRANSACTION_HISTORY } from './transactions.js';
export { TOKEN_LIST, COINGECKO_IDS, TOKEN_ADDRESSES, MARKET_STATS } from './market.js';

// Helper functions
export const shouldContractBeTriggered = (contract, currentPrice) => {
  if (contract.status !== 'active' || contract.triggered) return false;
  
  const triggerPrice = contract.trigger_price;
  const price = parseFloat(currentPrice);
  
  return price <= triggerPrice;
};

export const updateContractStatuses = (contracts, prices) => {
  return contracts.map(contract => {
    const currentPrice = prices[contract.trigger_token]?.usd;
    
    if (currentPrice && shouldContractBeTriggered(contract, currentPrice)) {
      return {
        ...contract,
        triggered: true,
        status: contract.buyer_address ? 'triggered' : contract.status
      };
    }
    
    return contract;
  });
};

export const getContractDisplayStatus = (contract, currentPrice) => {
  if (contract.triggered && !contract.payout_claimed) {
    return 'claimable';
  }
  
  if (contract.triggered && contract.payout_claimed) {
    return 'claimed';
  }
  
  const now = new Date();
  const endDate = new Date(contract.end_date);
  
  if (now > endDate) {
    return 'expired';
  }
  
  if (contract.status === 'active') {
    const daysToExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= 7) {
      return 'nearly-expired';
    }
  }
  
  return contract.status;
};
