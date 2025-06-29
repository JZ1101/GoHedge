
import React, { useState, useEffect } from 'react';
import MarketDashboard from './dashboard/MarketDashboard';
import SellerDashboard from './dashboard/SellerDashboard';
import BuyerDashboard from './dashboard/BuyerDashboard';

interface DashboardProps {
  activeTab?: string;
}

const Dashboard = ({ activeTab = "market" }: DashboardProps) => {
  const [currentTab, setCurrentTab] = useState(activeTab);

  // Map header tab names to dashboard tab names
  const getTabFromHeader = (headerTab: string) => {
    switch (headerTab) {
      case 'buy':
        return 'buyer';
      case 'create':
        return 'seller';
      case 'contracts':
        return 'market';
      default:
        return 'market';
    }
  };

  // Update current tab when activeTab prop changes
  useEffect(() => {
    const mappedTab = getTabFromHeader(activeTab);
    console.log('Dashboard tab mapping:', { activeTab, mappedTab });
    setCurrentTab(mappedTab);
  }, [activeTab]);

  const renderContent = () => {
    switch (currentTab) {
      case 'market':
        return <MarketDashboard />;
      case 'seller':
        return <SellerDashboard />;
      case 'buyer':
        return <BuyerDashboard />;
      default:
        return <MarketDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default Dashboard;
