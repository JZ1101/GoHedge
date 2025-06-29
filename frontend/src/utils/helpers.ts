
// Helper functions for formatting and calculations

export const formatCurrency = (amount: string | number, currency: string = 'AVAX'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${numAmount.toFixed(2)} ${currency}`;
};

export const formatDate = (timestamp: bigint | number): string => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString();
};

export const calculateDaysUntilExpiration = (endDate: bigint): number => {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(endDate) - now;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60)));
};

export const calculateReturnPercentage = (fee: string, reserve: string): string => {
  const feeNum = parseFloat(fee);
  const reserveNum = parseFloat(reserve);
  if (reserveNum === 0) return '0';
  return ((feeNum / reserveNum) * 100).toFixed(2);
};
