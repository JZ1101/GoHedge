
import React from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { useWallet } from '../hooks/useWallet';

const WalletBalance = () => {
  const { balance, loading, refreshBalance } = useWalletBalance();
  const { isConnected } = useWallet();

  if (!isConnected) {
    return null;
  }

  const handleRefresh = () => {
    console.log('💰 WalletBalance - Manual refresh triggered');
    refreshBalance();
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-md">
      <Wallet className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-700">
        {loading ? 'Loading...' : `${balance} AVAX`}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={loading}
        className="h-6 w-6 p-0"
        title={loading ? 'Refreshing...' : 'Refresh balance'}
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
};

export default WalletBalance;
