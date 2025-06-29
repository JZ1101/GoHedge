import React, { useState } from 'react';
import { Search, Filter, Shield, Clock, DollarSign, User, Calendar, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const BuyInsurance = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContract, setSelectedContract] = useState<any>(null);
  
  // Mock contract data - XXXX_CONTRACT_DATA
  const contracts = [
    {
      id: 'INS001',
      status: 'active',
      coverageAmount: 100,
      premiumCost: 2.5,
      triggerPrice: 20.00,
      sellerAddress: '0xAbCd...1234',
      expirationDate: '2024-12-31',
      currentPrice: 24.56
    },
    {
      id: 'INS002',
      status: 'active',
      coverageAmount: 250,
      premiumCost: 8.75,
      triggerPrice: 18.50,
      sellerAddress: '0xEfGh...5678',
      expirationDate: '2024-11-15',
      currentPrice: 24.56
    },
    {
      id: 'INS003',
      status: 'active',
      coverageAmount: 50,
      premiumCost: 1.25,
      triggerPrice: 22.00,
      sellerAddress: '0xIjKl...9012',
      expirationDate: '2025-01-20',
      currentPrice: 24.56
    }
  ];

  const handleBuyInsurance = (contractId: string) => {
    // XXXX_BUY_INSURANCE
    console.log(`Buying insurance for contract: ${contractId}`);
    setSelectedContract(null); // Close dialog after purchase
  };

  const openConfirmDialog = (contract: any) => {
    setSelectedContract(contract);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'triggered':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const calculateDaysToExpiration = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (contracts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buy Insurance</h1>
            <p className="text-gray-600 mt-1">Protect your AVAX holdings against price drops</p>
          </div>
        </div>

        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Insurance Contracts Available</h3>
          <p className="text-gray-600 mb-6">Be the first to create an insurance contract for others to purchase.</p>
          <Button>Create Insurance Contract</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buy Insurance</h1>
          <p className="text-gray-600 mt-1">Protect your AVAX holdings against price drops</p>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          {/* XXXX_FILTER_CONTROLS */}
        </div>
      </div>

      {/* Contract Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contracts.map((contract) => (
          <Card key={contract.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold">
                  Contract {contract.id}
                </CardTitle>
                <Badge className={getStatusColor(contract.status)}>
                  {contract.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Coverage Amount */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Coverage</span>
                </div>
                <span className="font-semibold">{contract.coverageAmount} AVAX</span>
              </div>

              {/* Premium Cost */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">Premium</span>
                </div>
                <span className="font-semibold text-green-600">{contract.premiumCost} AVAX</span>
              </div>

              {/* Trigger Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-gray-600">Trigger Price</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${contract.triggerPrice}</div>
                  <div className="text-xs text-gray-500">Current: ${contract.currentPrice}</div>
                </div>
              </div>

              {/* Seller */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Seller</span>
                </div>
                <span className="text-sm font-mono">{contract.sellerAddress}</span>
              </div>

              {/* Expiration */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Expires</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{contract.expirationDate}</div>
                  <div className="text-xs text-gray-500">
                    {calculateDaysToExpiration(contract.expirationDate)} days left
                  </div>
                </div>
              </div>

              {/* Buy Button with Confirmation Dialog */}
              <AlertDialog open={selectedContract?.id === contract.id} onOpenChange={(open) => !open && setSelectedContract(null)}>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => openConfirmDialog(contract)}
                  >
                    Buy Insurance
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Insurance Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please review the details below before confirming your insurance purchase.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  {selectedContract && (
                    <div className="space-y-3 py-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Contract ID:</span>
                        <span className="font-medium">{selectedContract.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Coverage Amount:</span>
                        <span className="font-medium">{selectedContract.coverageAmount} AVAX</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Premium Cost:</span>
                        <span className="font-medium text-green-600">{selectedContract.premiumCost} AVAX</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Trigger Price:</span>
                        <span className="font-medium">${selectedContract.triggerPrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Expires:</span>
                        <span className="font-medium">{selectedContract.expirationDate}</span>
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total Cost:</span>
                          <span className="text-green-600">{selectedContract.premiumCost} AVAX</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => selectedContract && handleBuyInsurance(selectedContract.id)}>
                      Confirm Purchase
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BuyInsurance;
