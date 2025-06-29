
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PriceChart from './PriceChart';
import PortfolioOverview from './PortfolioOverview';
import { useTradingViewPrice } from '../../hooks/useTradingViewPrice';

const CRYPTO_TOKENS = ["AVAX", "BTC", "ETH", "SOL", "LINK"];
const FOREX_TOKENS = ["EUR/USD", "USD/JPY"];
const COMMODITY_TOKENS = ["XAU/USD"];

const PriceDisplay = () => {
  const { prices, loading, error, refreshPrice } = useTradingViewPrice();
  const [selectedToken, setSelectedToken] = useState<string>("BTC");

  console.log("PriceDisplay - Current prices:", prices);
  console.log("PriceDisplay - Loading:", loading, "Error:", error);

  if (loading && Object.keys(prices).length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading real-time prices...</p>
        </div>
      </div>
    );
  }

  if (error && Object.keys(prices).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refreshPrice}>Retry</Button>
      </div>
    );
  }

  const renderTokenGrid = (tokens: string[], title: string) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-600 px-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tokens.map((token) => {
          const tokenData = prices[token];
          if (!tokenData || tokenData.price === 0) {
            return (
              <Card 
                key={token}
                className="cursor-pointer opacity-50"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{token}</span>
                  </div>
                  <div className="text-xs text-gray-500">Loading...</div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card 
              key={token}
              className={`cursor-pointer transition-colors hover:shadow-md ${
                selectedToken === token ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedToken(token)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{token}</span>
                  <div className="flex items-center">
                    {tokenData.change24h >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                  </div>
                </div>
                <div className="text-base font-bold">
                  {token.includes('/') ? 
                    tokenData.price.toFixed(4) : 
                    `$${typeof tokenData.price === 'number' ? tokenData.price.toFixed(2) : tokenData.price}`
                  }
                </div>
                <Badge 
                  variant={tokenData.change24h >= 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {tokenData.change24h >= 0 ? '+' : ''}{tokenData.change24h.toFixed(2)}%
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section - Price Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Real-Time Market Prices</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPrice}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderTokenGrid(CRYPTO_TOKENS, "Cryptocurrencies")}
          {renderTokenGrid(FOREX_TOKENS, "Forex Pairs")}
          {renderTokenGrid(COMMODITY_TOKENS, "Commodities")}
        </CardContent>
      </Card>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedToken} Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceChart symbol={selectedToken} />
        </CardContent>
      </Card>

      {/* Portfolio Overview */}
      <PortfolioOverview />
    </div>
  );
};

export default PriceDisplay;
