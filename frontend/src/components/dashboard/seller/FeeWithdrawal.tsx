
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { useUserContracts, withdrawReserve, getErrorMessage } from '../../../utils/sdk/index.js';
import { useWallet } from '../../../hooks/useWallet';
import { web3WalletManager } from '../../../utils/web3Wallet';

interface WithdrawableContract {
  id: string;
  triggerToken: string;
  fee: number;
  status: 'expired' | 'completed';
}

const FeeWithdrawal = () => {
  const [withdrawableContracts, setWithdrawableContracts] = useState<WithdrawableContract[]>([]);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastWithdrawnId, setLastWithdrawnId] = useState<string | null>(null);
  const { account, isConnected } = useWallet();
  
  console.log('💳 FeeWithdrawal - Current wallet state:', {
    account,
    isConnected,
    timestamp: new Date().toISOString()
  });
  
  // Only fetch contracts if wallet is connected
  const { userContracts, loading, error: sdkError, refetch } = useUserContracts(account);

  // Convert SDK contracts to withdrawable contracts
  useEffect(() => {
    if (!isConnected || !account) {
      setWithdrawableContracts([]);
      return;
    }

    if (userContracts && Array.isArray(userContracts)) {
      const withdrawable = userContracts
        .filter((contract: any) => {
          // Only show contracts where current connected wallet is the seller and can withdraw
          const isCurrentWalletSeller = contract.seller?.toLowerCase() === account.toLowerCase();
          const canWithdraw = (contract.isExpired || contract.isClaimed) && !contract.isTriggered;
          
          // Filter out the contract that was just withdrawn
          const notJustWithdrawn = contract.id !== lastWithdrawnId;
          
          console.log(`Contract ${contract.id} withdrawal check:`, {
            seller: contract.seller,
            currentWallet: account,
            isCurrentWalletSeller,
            isExpired: contract.isExpired,
            isClaimed: contract.isClaimed,
            isTriggered: contract.isTriggered,
            canWithdraw: isCurrentWalletSeller && canWithdraw,
            notJustWithdrawn,
            lastWithdrawnId
          });
          
          return contract.userRole === 'seller' && isCurrentWalletSeller && canWithdraw && notJustWithdrawn;
        })
        .map((contract: any) => ({
          id: contract.id,
          triggerToken: 'AVAX',
          fee: parseFloat(contract.reserveAmount) || 0,
          status: (contract.isClaimed ? 'completed' : 'expired') as 'expired' | 'completed'
        }));
      
      setWithdrawableContracts(withdrawable);
      console.log("Withdrawable contracts for current wallet:", withdrawable);
    } else {
      setWithdrawableContracts([]);
    }
  }, [userContracts, account, isConnected, lastWithdrawnId]);

  const handleWithdraw = async (contractId: string) => {
    console.log('💸 Withdraw attempt - Wallet verification:', {
      isConnected,
      currentAccount: account,
      contractId,
      timestamp: new Date().toISOString()
    });

    if (!account || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    
    setWithdrawing(contractId);
    setError('');
    
    try {
      console.log(`Withdrawing fees for contract: ${contractId} with wallet: ${account}`);
      
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      // Verify the signer address matches current wallet
      const signerAddress = await signer.getAddress();
      
      console.log('🔍 Wallet verification for withdrawal:', {
        connectedWallet: account,
        signerWallet: signerAddress,
        walletType: web3WalletManager.getConnectedWalletType(),
        match: signerAddress.toLowerCase() === account.toLowerCase(),
        contractId,
        timestamp: new Date().toISOString()
      });
      
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Wallet mismatch. Please reconnect your wallet.');
      }
      
      await withdrawReserve(signer, parseInt(contractId));
      
      console.log('✅ Fees withdrawn successfully for contract:', contractId);
      
      // Mark this contract as withdrawn to filter it out immediately
      setLastWithdrawnId(contractId);
      
      // Remove the withdrawn contract from the local state immediately
      setWithdrawableContracts(prev => prev.filter(contract => contract.id !== contractId));
      
      // Then refresh the data from the blockchain
      setTimeout(async () => {
        await refetch();
        // Clear the withdrawn ID after refresh to allow future withdrawals
        setLastWithdrawnId(null);
      }, 1000);
      
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      console.error('❌ Withdrawal failed:', error);
      setError(errorMessage);
    } finally {
      setWithdrawing(null);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fee Withdrawal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            Please connect your wallet to view withdrawable fees
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Fee Withdrawal</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Wallet: {account?.slice(0, 6)}...{account?.slice(-4)}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLastWithdrawnId(null);
              refetch();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && withdrawableContracts.length === 0 ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading withdrawable fees...</p>
            </div>
          ) : (sdkError || error) && withdrawableContracts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4">{error || sdkError}</p>
              <Button onClick={refetch}>Retry</Button>
            </div>
          ) : withdrawableContracts.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              No fees available for withdrawal from your contracts
            </p>
          ) : (
            withdrawableContracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-semibold">Contract #{contract.id}</div>
                    <div className="text-sm text-gray-600">
                      {contract.triggerToken} Insurance
                    </div>
                  </div>
                  <Badge className={contract.status === 'expired' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}>
                    {contract.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold">{contract.fee} AVAX</div>
                    <div className="text-sm text-gray-600">Available to withdraw</div>
                  </div>
                  <Button 
                    onClick={() => handleWithdraw(contract.id)}
                    size="sm"
                    disabled={withdrawing === contract.id}
                  >
                    {withdrawing === contract.id ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Withdrawing...
                      </>
                    ) : (
                      'Withdraw'
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeeWithdrawal;
