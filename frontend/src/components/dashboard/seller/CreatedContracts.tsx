
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Clock, Calendar } from 'lucide-react';
import { useWallet } from '../../../hooks/useWallet';
import { useUserContracts } from '../../../utils/sdk/index.js';

const CreatedContracts = () => {
  const { account } = useWallet();
  const { userContracts: contracts, loading, error, refetch } = useUserContracts(account);

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

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else {
      return `${hours}h`;
    }
  };

  const getContractStatus = (contract: any) => {
    const now = new Date();
    const endDate = new Date(contract.endDate);
    
    if (now > endDate) return 'expired';
    if (contract.isTriggered) return 'triggered';
    if (contract.buyer && contract.buyer !== '0x0000000000000000000000000000000000000000') return 'active';
    return 'available';
  };

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Created Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            Please connect your wallet to view your contracts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Created Contracts</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading && contracts.length === 0 ? (
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading contracts...</p>
          </div>
        ) : error && contracts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refetch}>Retry</Button>
          </div>
        ) : contracts.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No contracts created yet. Create your first contract using the form.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract ID</TableHead>
                <TableHead>Trigger Token</TableHead>
                <TableHead>Trigger Price</TableHead>
                <TableHead>Reserve</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time Remaining</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const status = getContractStatus(contract);
                const timeRemaining = formatTimeRemaining(contract.endDate);
                const createdDate = new Date(contract.startDate || contract.createdDate || Date.now());
                
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">#{contract.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">AVAX</span>
                        <span className="text-xs text-gray-500">Avalanche</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">${parseFloat(contract.triggerPrice).toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{parseFloat(contract.reserveAmount).toFixed(2)} AVAX</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">
                        {parseFloat(contract.insuranceFee).toFixed(2)} AVAX
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(status)}>
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {timeRemaining}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {createdDate.toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CreatedContracts;
