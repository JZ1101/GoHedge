
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Marketplace from './buyer/Marketplace';
import ContractHistory from './buyer/ContractHistory';
import TradingViewChart from '../TradingViewChart';

const MarketDashboard = () => {
  const [showChart, setShowChart] = useState(true);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Market Dashboard</h2>
        <p className="text-gray-600 mt-1">Browse available insurance contracts and view trading history</p>
      </div>

      {/* AVAX Options Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Price Chart</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChart(!showChart)}
            className="h-8 w-8 p-0"
          >
            {showChart ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        {showChart && (
          <CardContent>
            <TradingViewChart 
              symbol="BINANCE:AVAXUSDT" 
              height={800} 
              key={showChart ? 'expanded' : 'collapsed'}
            />
          </CardContent>
        )}
      </Card>

      {/* Market Tabs */}
      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="marketplace">Available Contracts</TabsTrigger>
          <TabsTrigger value="history">Contract History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="marketplace" className="space-y-6">
          <Marketplace />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <ContractHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketDashboard;
