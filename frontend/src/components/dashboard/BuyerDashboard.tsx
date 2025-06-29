
import React from 'react';
import PortfolioOverview from './PortfolioOverview';
import PayoutClaim from './buyer/PayoutClaim';
import Marketplace from './buyer/Marketplace';

const BuyerDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">My Portfolio</h2>
        <p className="text-gray-600 mt-1">Manage your insurance portfolio and claims</p>
      </div>

      {/* Portfolio Overview */}
      <PortfolioOverview />

      {/* Payout Claims */}
      <PayoutClaim />
    </div>
  );
};

export default BuyerDashboard;
