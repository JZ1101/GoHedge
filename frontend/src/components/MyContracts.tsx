
import React, { useState } from 'react';
import { Shield, TrendingDown, Calendar, DollarSign, User, MoreVertical, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const MyContracts = () => {
  const [activeTab, setActiveTab] = useState('all');

  // Mock data - XXXX_CONTRACT_DATA
  const userContracts = [
    {
      id: 'INS001',
      role: 'seller',
      status: 'active',
      coverageAmount: 100,
      premiumCost: 2.5,
      triggerPrice: 20.00,
      counterparty: '0xBuyer...1234',
      expirationDate: '2024-12-31',
      currentPrice: 24.56,
      createdDate: '2024-06-15',
      canCancel: true,
      canWithdraw: false,
      canTrigger: false,
      canClaim: false
    },
    {
      id: 'INS002',
      role: 'buyer',
      status: 'active',
      coverageAmount: 250,
      premiumCost: 8.75,
      triggerPrice: 18.50,
      counterparty: '0xSeller...5678',
      expirationDate: '2024-11-15',
      currentPrice: 24.56,
      createdDate: '2024-06-10',
      canCancel: false,
      canWithdraw: false,
      canTrigger: true,
      canClaim: false
    },
    {
      id: 'INS003',
      role: 'seller',
      status: 'expired',
      coverageAmount: 50,
      premiumCost: 1.25,
      triggerPrice: 22.00,
      counterparty: '0xBuyer...9012',
      expirationDate: '2024-06-20',
      currentPrice: 24.56,
      createdDate: '2024-05-15',
      canCancel: false,
      canWithdraw: true,
      canTrigger: false,
      canClaim: false
    }
  ];

  const stats = {
    totalContracts: userContracts.length,
    activeContracts: userContracts.filter(c => c.status === 'active').length,
    totalCoverage: userContracts.reduce((sum, c) => sum + c.coverageAmount, 0),
    totalPremiums: userContracts.reduce((sum, c) => sum + c.premiumCost, 0)
  };

  const handleAction = (action: string, contractId: string) => {
    console.log(`Performing ${action} on contract ${contractId}`);
    
    switch (action) {
      case 'cancel':
        // XXXX_CANCEL_CONTRACT
        break;
      case 'trigger':
        // XXXX_TRIGGER_PAYOUT
        break;
      case 'claim':
        // XXXX_CLAIM_PAYOUT
        break;
      case 'withdraw':
        // XXXX_WITHDRAW_FEES
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'triggered':
        return 'bg-red-100 text-red-800';
      case 'claimed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'seller' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const filteredContracts = userContracts.filter(contract => {
    if (activeTab === 'all') return true;
    if (activeTab === 'seller') return contract.role === 'seller';
    if (activeTab === 'buyer') return contract.role === 'buyer';
    return contract.status === activeTab;
  });

  const calculateDaysToExpiration = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (userContracts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>
          <p className="text-gray-600 mt-1">Manage your insurance contracts and track performance</p>
        </div>

        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Contracts Yet</h3>
          <p className="text-gray-600 mb-6">Start by creating an insurance contract or purchasing existing coverage.</p>
          <div className="space-x-4">
            <Button>Create Contract</Button>
            <Button variant="outline">Browse Insurance</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>
        <p className="text-gray-600 mt-1">Manage your insurance contracts and track performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Total Contracts</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.totalContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">Active</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.activeContracts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-600">Total Coverage</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.totalCoverage} AVAX</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">Premiums</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.totalPremiums.toFixed(2)} AVAX</div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Contracts</TabsTrigger>
              <TabsTrigger value="seller">As Seller</TabsTrigger>
              <TabsTrigger value="buyer">As Buyer</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {filteredContracts.map((contract) => (
              <Card key={contract.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                    {/* Contract Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{contract.id}</span>
                        <Badge className={getStatusColor(contract.status)}>
                          {contract.status}
                        </Badge>
                        <Badge className={getRoleColor(contract.role)}>
                          {contract.role}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Coverage:</span>
                          <div className="font-medium">{contract.coverageAmount} AVAX</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Premium:</span>
                          <div className="font-medium text-green-600">{contract.premiumCost} AVAX</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Trigger:</span>
                          <div className="font-medium">${contract.triggerPrice}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Expires:</span>
                          <div className="font-medium">
                            {calculateDaysToExpiration(contract.expirationDate)} days
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Counterparty: {contract.counterparty}</span>
                        <span>Created: {contract.createdDate}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {contract.status === 'active' && contract.triggerPrice >= contract.currentPrice && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-red-50 rounded-md">
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                          <span className="text-xs text-red-600">At trigger price</span>
                        </div>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border shadow-lg">
                          {contract.canCancel && (
                            <DropdownMenuItem onClick={() => handleAction('cancel', contract.id)}>
                              Cancel Contract
                            </DropdownMenuItem>
                          )}
                          {contract.canTrigger && (
                            <DropdownMenuItem onClick={() => handleAction('trigger', contract.id)}>
                              Trigger Payout
                            </DropdownMenuItem>
                          )}
                          {contract.canClaim && (
                            <DropdownMenuItem onClick={() => handleAction('claim', contract.id)}>
                              Claim Payout
                            </DropdownMenuItem>
                          )}
                          {contract.canWithdraw && (
                            <DropdownMenuItem onClick={() => handleAction('withdraw', contract.id)}>
                              Withdraw Funds
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyContracts;
