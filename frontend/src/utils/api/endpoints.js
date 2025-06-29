
// API endpoint definitions with standardized structure
export const API_ENDPOINTS = {
  // Price endpoints
  PRICES: '/api/prices',
  PRICE_HISTORY: (token) => `/api/prices/history/${token}`,
  
  // Contract endpoints
  CONTRACTS: '/api/contracts',
  CONTRACT_BY_ID: (id) => `/api/contracts/${id}`,
  CONTRACT_PURCHASE: '/api/contracts/purchase',
  CONTRACT_CLAIM: '/api/contracts/claim',
  CONTRACT_WITHDRAW: '/api/contracts/withdraw',
  
  // User endpoints
  USER_CONTRACTS_CREATED: (address) => `/api/users/${address}/contracts/created`,
  USER_CONTRACTS_PURCHASED: (address) => `/api/users/${address}/contracts/purchased`,
  USER_PORTFOLIO: (address) => `/api/users/${address}/portfolio`,
  USER_TRANSACTIONS: (address) => `/api/users/${address}/transactions`,
  
  // Market endpoints
  MARKET_STATS: '/api/market/stats',
  MARKETPLACE_CONTRACTS: '/api/marketplace/contracts'
};

export const createAPIResponse = (success, data = null, message = '', error = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    response.data = data;
    if (message) response.message = message;
  } else {
    response.error = error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };
  }
  
  return response;
};

export const createPaginatedResponse = (data, page = 1, limit = 20, total = null) => {
  const totalItems = total || (Array.isArray(data) ? data.length : 0);
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  };
};
