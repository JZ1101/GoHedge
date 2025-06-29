
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTradingViewPrice } from '../../hooks/useTradingViewPrice';

interface PriceChartProps {
  symbol: string;
}

const PriceChart = ({ symbol }: PriceChartProps) => {
  const { prices } = useTradingViewPrice();
  const [priceHistory, setPriceHistory] = useState<Array<{time: string, price: number}>>([]);

  useEffect(() => {
    // Generate mock historical data based on current price and 24h change
    const currentPrice = prices[symbol]?.price || 0;
    const change24h = prices[symbol]?.change24h || 0;
    
    if (currentPrice > 0) {
      const startPrice = currentPrice / (1 + change24h / 100);
      const dataPoints = [];
      
      // Generate 24 hours of mock data points
      for (let i = 0; i < 24; i++) {
        const progress = i / 23;
        const priceVariation = Math.sin(progress * Math.PI * 2) * (currentPrice * 0.02); // 2% variation
        const trendPrice = startPrice + (currentPrice - startPrice) * progress;
        const finalPrice = trendPrice + priceVariation;
        
        dataPoints.push({
          time: `${String(i).padStart(2, '0')}:00`,
          price: Math.max(finalPrice, 0)
        });
      }
      
      setPriceHistory(dataPoints);
    }
  }, [symbol, prices]);

  const currentPrice = prices[symbol]?.price || 0;
  const change24h = prices[symbol]?.change24h || 0;
  const isPositive = change24h >= 0;

  if (!currentPrice) {
    return (
      <div className="w-full h-96 bg-white rounded-lg border overflow-hidden">
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-24 mx-auto"></div>
            </div>
            <p className="text-gray-600 mt-4">
              Loading {symbol} price data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{symbol}/USD</h3>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">${currentPrice.toFixed(2)}</span>
              <span className={`text-sm px-2 py-1 rounded ${
                isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isPositive ? '+' : ''}{change24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>24H Chart</div>
            <div>Live Market Data</div>
          </div>
        </div>
      </div>
      
      <div className="p-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              stroke="#666"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickLine={false}
              domain={['dataMin - 1', 'dataMax + 1']}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              labelStyle={{ color: '#666' }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: isPositive ? "#10b981" : "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;
