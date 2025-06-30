import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Wallet, AlertCircle } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useUserContracts } from '../../utils/sdk/index.js';
import { usePrice } from '../../hooks/usePrice';

interface Contract {
  id: string;
  token: string;
  triggerPrice: number;
  currentPrice: number;
  status: 'active' | 'expired' | 'nearly-expired' | 'claimable';
  expirationDate: string;
  premium: number;
  reserveAmount: number;
  reserveToken: string;
  userRole: 'buyer' | 'seller';
}

const PortfolioOverview = () => {
  const { account, isConnected, isConnecting } = useWallet();
  const { userContracts: sdkContracts, loading, error: sdkError, refetch } = useUserContracts(account);
  const { prices } = usePrice();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  console.log("📊 Portfolio Overview - Current wallet state:");
  console.log("💡 CURRENT CONNECTED WALLET:", {
    account,
    isConnected,
    isConnecting,
    contractsCount: sdkContracts?.length || 0,
    timestamp: new Date().toISOString()
  });
  console.log("  - sdkContracts:", sdkContracts);
  console.log("  - loading:", loading);
  console.log("  - sdkError:", sdkError);

  // Convert SDK contracts to our interface format
  useEffect(() => {
    console.log("📊 Portfolio Overview - Processing contracts for wallet:", account);
    console.log("  - sdkContracts:", sdkContracts);
    console.log("  - isArray:", Array.isArray(sdkContracts));
    
    if (sdkContracts && Array.isArray(sdkContracts)) {
      const mappedContracts = sdkContracts.map((contract: any) => {
        let status: 'active' | 'expired' | 'nearly-expired' | 'claimable' = 'active';
        
        if (contract.isClaimed) {
          status = 'expired';
        } else if (contract.isTriggered) {
          status = 'claimable';
        } else if (contract.isExpired) {
          status = 'expired';
        } else if (contract.timeRemaining && contract.timeRemaining.includes('d') && parseInt(contract.timeRemaining) <= 1) {
          status = 'nearly-expired';
        }

        const currentPrice = prices['AVAX']?.usd || 0;

        return {
          id: String(contract.id),
          token: 'AVAX',
          triggerPrice: parseFloat(contract.triggerPrice) || 0,
          currentPrice: currentPrice,
          status,
          expirationDate: contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '',
          premium: parseFloat(contract.insuranceFee) || 0,
          reserveAmount: parseFloat(contract.reserveAmount) || 0,
          reserveToken: 'AVAX',
          userRole: contract.userRole || 'buyer'
        };
      });
      
      console.log("📊 Portfolio Overview - Mapped contracts for", account, ":", mappedContracts);
      setContracts(mappedContracts);
    } else {
      console.log("📊 Portfolio Overview - No contracts for wallet", account, ", setting empty array");
      setContracts([]);
    }
  }, [sdkContracts, prices, account]);

  // Auto-refresh when wallet connects or changes
  useEffect(() => {
    console.log("📊 Portfolio Overview - Wallet connection effect triggered");
    console.log("  - isConnected:", isConnected);
    console.log("  - account:", account);
    
    if (isConnected && account) {
      console.log("📊 Portfolio Overview - Triggering refetch for wallet:", account);
      refetch();
    } else if (!isConnected) {
      console.log("📊 Portfolio Overview - Wallet disconnected, clearing contracts");
      setContracts([]);
    }
  }, [isConnected, account, refetch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      console.log("📊 Portfolio Overview - Manual refresh completed");
    } catch (error) {
      console.error("📊 Portfolio Overview - Manual refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'nearly-expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'claimable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const filterContracts = (status?: string) => {
    if (!status || !Array.isArray(contracts)) return contracts;
    return contracts.filter(contract => contract.status === status);
  };

  const ContractCard = ({ contract }: { contract: Contract }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div>
          <div className="font-semibold">{contract.token} Insurance ({contract.userRole})</div>
          <div className="text-sm text-gray-600">
            Trigger: ${contract.triggerPrice.toFixed(2)} | Current: ${contract.currentPrice.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            Reserve: {contract.reserveAmount} {contract.reserveToken}
          </div>
        </div>
        <Badge className={getStatusColor(contract.status)}>
          {contract.status}
        </Badge>
      </div>
      <div className="text-right">
        <div className="font-semibold">{contract.premium} {contract.reserveToken}</div>
        <div className="text-sm text-gray-600">
          Expires: {contract.expirationDate}
        </div>
      </div>
    </div>
  );

  // Show wallet connection states
  if (!isConnected) {
    if (isConnecting) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Connecting to wallet...</p>
              <p className="text-sm text-gray-500">
                Please approve the connection in your wallet
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Connect your wallet to view your portfolio
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Use the "Connect Wallet" button in the header to get started
            </p>
            <div className="text-xs text-gray-400">
              Supported wallets: MetaMask, Core Wallet
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state only when actually loading
  if (loading && !refreshing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading your portfolio...</p>
              <p className="text-sm text-gray-500 mt-2">Connected to {account?.slice(0, 6)}...{account?.slice(-4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state with more context
  if (sdkError && !refreshing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Failed to load portfolio</p>
            <p className="text-sm text-gray-600 mb-4">{sdkError}</p>
            <p className="text-xs text-gray-500 mb-4">
              Connected wallet: {account?.slice(0, 6)}...{account?.slice(-4)}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portfolio Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </div>
          <Button onClick={handleRefresh} disabled={loading || refreshing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({contracts.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({filterContracts('active').length})</TabsTrigger>
            <TabsTrigger value="claimable">Claimable ({filterContracts('claimable').length})</TabsTrigger>
            <TabsTrigger value="nearly-expired">Expiring ({filterContracts('nearly-expired').length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({filterContracts('expired').length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {contracts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  No contracts in your portfolio yet
                </p>
                <p className="text-sm text-gray-500">
                  Create or purchase insurance contracts to get started
                </p>
              </div>
            ) : (
              contracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4">
            {filterContracts('active').length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No active contracts
              </p>
            ) : (
              filterContracts('active').map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="claimable" className="space-y-4">
            {filterContracts('claimable').length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No claimable contracts
              </p>
            ) : (
              filterContracts('claimable').map((contract) => (
                <div key={contract.id} className="bg-red-50">
                  <ContractCard contract={contract} />
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="nearly-expired" className="space-y-4">
            {filterContracts('nearly-expired').length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No contracts expiring soon
              </p>
            ) : (
              filterContracts('nearly-expired').map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="expired" className="space-y-4">
            {filterContracts('expired').length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No expired contracts
              </p>
            ) : (
              filterContracts('expired').map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PortfolioOverview;
