
import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';
import { web3WalletManager } from '../utils/web3Wallet';

export const useWalletBalance = () => {
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState<boolean>(false);
  const { account, isConnected } = useWallet();

  const fetchBalance = async () => {
    if (!isConnected || !account) {
      setBalance('0.00');
      return;
    }

    setLoading(true);
    try {
      const walletBalance = await web3WalletManager.getBalance(account);
      setBalance(walletBalance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance('0.00');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [account, isConnected]);

  return {
    balance,
    loading,
    refreshBalance: fetchBalance
  };
};
