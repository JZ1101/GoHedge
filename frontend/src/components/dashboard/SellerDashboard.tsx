
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreatedContracts from './seller/CreatedContracts';
import ContractCreationForm from './seller/ContractCreationForm';
import FeeWithdrawal from './seller/FeeWithdrawal';

const SellerDashboard = () => {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Seller Dashboard</h2>
        <p className="text-gray-600 mt-1">Create and manage your insurance contracts</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Contract Creation */}
        <div className="xl:col-span-1">
          <ContractCreationForm />
        </div>
        
        {/* Right Column - Management */}
        <div className="xl:col-span-2 space-y-6">
          {/* Created Contracts */}
          <CreatedContracts />
          
          {/* Fee Withdrawal */}
          <FeeWithdrawal />
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
