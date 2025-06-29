
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { useClaimableContracts, claimPayout, getErrorMessage } from '../../../utils/sdk/index.js';
import { useWallet } from '../../../hooks/useWallet';
import { web3WalletManager } from '../../../utils/web3Wallet';

interface ClaimableContract {
  id: string;
  trigger_token: string;
  trigger_price: number;
  current_price: number;
  payout_amount: number;
  status: 'triggered' | 'claimable';
}

const PayoutClaim = () => {
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState<{ [key: string]: boolean }>({});
  const [localClaimableContracts, setLocalClaimableContracts] = useState<ClaimableContract[]>([]);
  const [lastClaimedId, setLastClaimedId] = useState<string | null>(null);
  const { account } = useWallet();
  const { claimableContracts, loading, error: sdkError, refetch } = useClaimableContracts(account);

  console.log("💰 PayoutClaim - State check:");
  console.log("  - account:", account);
  console.log("  - claimableContracts:", claimableContracts);
  console.log("  - loading:", loading);
  console.log("  - sdkError:", sdkError);

  // Update local state when SDK data changes
  useEffect(() => {
    if (Array.isArray(claimableContracts)) {
      // Filter out the contract that was just claimed
      const filteredContracts = claimableContracts.filter(contract => contract.id !== lastClaimedId);
      setLocalClaimableContracts(filteredContracts);
    } else {
      setLocalClaimableContracts([]);
    }
  }, [claimableContracts, lastClaimedId]);

  const handleClaim = async (contractId: string) => {
    if (!account) return;
    
    setClaiming(prev => ({ ...prev, [contractId]: true }));
    setError('');
    
    try {
      console.log(`💰 Claiming payout for contract: ${contractId}`);
      
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      const result = await claimPayout(signer, parseInt(contractId));
      console.log("✅ Payout claimed successfully:", result);
      
      // Mark this contract as claimed to filter it out immediately
      setLastClaimedId(contractId);
      
      // Remove the claimed contract from local state immediately
      setLocalClaimableContracts(prev => prev.filter(contract => contract.id !== contractId));
      
      // Then refresh the data from the blockchain
      setTimeout(async () => {
        await refetch();
        // Clear the claimed ID after refresh to allow future operations
        setLastClaimedId(null);
      }, 1000);
      
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      console.error('❌ Claim error:', err);
      setError(errorMessage);
    } finally {
      setClaiming(prev => ({ ...prev, [contractId]: false }));
    }
  };

  const handleRefresh = () => {
    setLastClaimedId(null);
    refetch();
  };

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            Please connect your wallet to view claimable payouts
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading claimable contracts from blockchain...</p>
              <p className="text-sm text-gray-500 mt-2">Connected to {account?.slice(0, 6)}...{account?.slice(-4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payout Claims</CardTitle>
        <Button onClick={handleRefresh} disabled={loading} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {(error || sdkError) && (
          <div className="text-center py-4">
            <p className="text-red-600 mb-4">{error || sdkError}</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </div>
        )}
        
        <div className="space-y-4">
          {localClaimableContracts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">No payouts available for claim</p>
              <p className="text-sm text-gray-500">
                Claimable contracts will appear here when payout conditions are triggered
              </p>
            </div>
          ) : (
            localClaimableContracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-semibold">Contract {contract.id}</div>
                    <div className="text-sm text-gray-600">
                      {contract.trigger_token} triggered at ${contract.current_price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Trigger price: ${contract.trigger_price.toFixed(2)}
                    </div>
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {contract.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {contract.payout_amount} AVAX
                    </div>
                    <div className="text-sm text-gray-600">Available to claim</div>
                  </div>
                  <Button 
                    onClick={() => handleClaim(contract.id)}
                    disabled={claiming[contract.id]}
                    size="sm"
                  >
                    {claiming[contract.id] ? 'Claiming...' : 'Claim Payout'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutClaim;
