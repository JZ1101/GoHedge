
// Web3 utility functions

export const formatEther = (value: bigint): string => {
  // XXXX_FORMAT_ETHER
  return (Number(value) / 1e18).toString();
};

export const parseEther = (value: string): bigint => {
  // XXXX_PARSE_ETHER
  return BigInt(Math.floor(parseFloat(value) * 1e18));
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};
