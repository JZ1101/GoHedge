
import React from 'react';
import { TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { usePrice } from '../hooks/usePrice';

const PriceDisplay: React.FC = () => {
  const { prices, loading, error, refreshPrice } = usePrice();

  if (loading && Object.keys(prices).length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-md">
        <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-500">Loading prices...</span>
      </div>
    );
  }

  if (error && Object.keys(prices).length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 rounded-md">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-600">Price data unavailable</span>
      </div>
    );
  }

  const avaxPrice = prices.AVAX;
  if (!avaxPrice || avaxPrice.usd === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 rounded-md">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <span className="text-sm text-red-600">AVAX price unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-md">
      <TrendingUp className="h-4 w-4 text-green-600" />
      <span className="text-sm font-medium text-green-700">
        AVAX: ${avaxPrice.usd.toFixed(2)}
      </span>
    </div>
  );
};

export default PriceDisplay;
