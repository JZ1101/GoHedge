
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, History, TrendingDown, Zap } from 'lucide-react';
import { useGoHedgeContract } from '../../../utils/sdk/index.js';
import { blockchainService } from '../../../utils/sdk/blockchain.js';
import { web3WalletManager } from '../../../utils/web3Wallet';
import { useToast } from '@/hooks/use-toast';

const ContractHistory = () => {
  const { contracts, loading, error, refetch } = useGoHedgeContract();
  const [triggeringContract, setTriggeringContract] = useState<string | null>(null);
  const [localContracts, setLocalContracts] = useState<any[]>([]);
  const [lastTriggeredId, setLastTriggeredId] = useState<string | null>(null);
  const { toast } = useToast();

  // Update local contracts when SDK data changes
  useEffect(() => {
    if (Array.isArray(contracts)) {
      // Update the triggered status for contracts that were just triggered
      const updatedContracts = contracts.map(contract => {
        if (contract.id === lastTriggeredId) {
          return { ...contract, isTriggered: true };
        }
        return contract;
      });
      setLocalContracts(updatedContracts);
    } else {
      setLocalContracts([]);
    }
  }, [contracts, lastTriggeredId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-blue-100 text-blue-800';
      case 'purchased':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'triggered':
        return 'bg-red-100 text-red-800';
      case 'claimed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractStatus = (contract: any) => {
    if (contract.isClaimed) return 'claimed';
    if (contract.isTriggered) return 'triggered';
    if (contract.isExpired) return 'expired';
    if (contract.isActive) return 'active';
    return 'available';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTriggerPayout = async (contractId: string) => {
    try {
      setTriggeringContract(contractId);
      console.log(`🔥 Triggering payout for contract ${contractId}`);
      
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      const result = await blockchainService.triggerPayout(signer, parseInt(contractId));
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Payout triggered for contract #${contractId}`,
        });
        
        // Mark this contract as triggered to update local state immediately
        setLastTriggeredId(contractId);
        
        // Update local state immediately
        setLocalContracts(prev => prev.map(contract => 
          contract.id === contractId 
            ? { ...contract, isTriggered: true }
            : contract
        ));
        
        // Then refresh the data from the blockchain
        setTimeout(async () => {
          await refetch();
          // Clear the triggered ID after refresh
          setLastTriggeredId(null);
        }, 1000);
        
        console.log(`✅ Successfully triggered payout for contract ${contractId}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error triggering payout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger payout",
        variant: "destructive",
      });
    } finally {
      setTriggeringContract(null);
    }
  };

  const handleRefresh = () => {
    setLastTriggeredId(null);
    refetch();
  };

  // Show all contracts, sorted by ID (newest first)
  const allContracts = [...localContracts].sort((a, b) => parseInt(b.id) - parseInt(a.id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-gray-600" />
          <CardTitle>Contract History</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading contracts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh}>Retry</Button>
          </div>
        ) : allContracts.length === 0 ? (
          <div className="text-center py-8">
            <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No contracts found</p>
            <p className="text-sm text-gray-500">Contracts will appear here when created</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {allContracts.length} contract{allContracts.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract ID</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Reserve</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allContracts.map((contract) => {
                  const status = getContractStatus(contract);
                  const canTrigger = contract.isActive && !contract.isTriggered && !contract.isExpired;
                  
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">#{contract.id}</TableCell>
                      <TableCell>
                        AVAX @ ${parseFloat(contract.triggerPrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {parseFloat(contract.reserveAmount).toFixed(2)} AVAX
                      </TableCell>
                      <TableCell>
                        {parseFloat(contract.insuranceFee).toFixed(2)} AVAX
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(contract.startDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(contract.endDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {canTrigger && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTriggerPayout(contract.id)}
                            disabled={triggeringContract === contract.id}
                          >
                            {triggeringContract === contract.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Zap className="h-3 w-3 mr-1" />
                                Trigger
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractHistory;
