
import { useState, useEffect } from 'react';

interface PriceData {
  usd: number;
  usd_24h_change: number;
}

interface PricesResponse {
  [key: string]: PriceData;
}

export const usePrice = () => {
  const [prices, setPrices] = useState<PricesResponse>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchPrices = async (): Promise<void> => {
    // Don't show loading if we already have prices
    if (Object.keys(prices).length === 0) {
      setLoading(true);
    }
    setError('');
    
    try {
      console.log("Attempting to fetch real-time AVAX price...");
      
      // Try alternative API endpoints or use a proxy service
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd&include_24hr_change=true',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add mode to handle CORS
          mode: 'cors'
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ Successfully fetched price data:", data);
      
      // Extract real prices from CoinGecko (focus on AVAX only to reduce API calls)
      const avaxPrice = data['avalanche-2'];
      
      if (avaxPrice) {
        const cryptoPrices: PricesResponse = {
          AVAX: {
            usd: avaxPrice.usd || 42.50,
            usd_24h_change: avaxPrice.usd_24h_change || 0
          },
          // Use reasonable mock prices for other assets to reduce API calls
          BTC: {
            usd: 67000,
            usd_24h_change: 1.2
          },
          ETH: {
            usd: 3400,
            usd_24h_change: 0.8
          },
          SOL: {
            usd: 180,
            usd_24h_change: -0.5
          },
          LINK: {
            usd: 15,
            usd_24h_change: 2.1
          }
        };

        // Add mock forex and commodity prices
        const mockPrices: PricesResponse = {
          'EUR/USD': {
            usd: 1.0892,
            usd_24h_change: 0.15
          },
          'JPY/USD': {
            usd: 0.0066,
            usd_24h_change: 0.08
          },
          'XAG/USD': { // Silver
            usd: 31.45,
            usd_24h_change: 1.2
          },
          'XAU/USD': { // Gold
            usd: 2034.50,
            usd_24h_change: 0.8
          }
        };
        
        const allPrices = { ...cryptoPrices, ...mockPrices };
        setPrices(allPrices);
        setError('');
        console.log("✅ Real-time AVAX price updated:", avaxPrice.usd);
      } else {
        throw new Error('No AVAX price data received');
      }
      
    } catch (err) {
      console.error('❌ Failed to fetch real-time prices:', err);
      
      // Enhanced fallback prices with more realistic values
      const fallbackPrices: PricesResponse = {
        AVAX: {
          usd: 42.50,
          usd_24h_change: 1.5
        },
        BTC: {
          usd: 67000,
          usd_24h_change: 2.1
        },
        ETH: {
          usd: 3400,
          usd_24h_change: 1.8
        },
        SOL: {
          usd: 180,
          usd_24h_change: -0.3
        },
        LINK: {
          usd: 15,
          usd_24h_change: 3.2
        },
        'EUR/USD': {
          usd: 1.0892,
          usd_24h_change: 0.15
        },
        'JPY/USD': {
          usd: 0.0066,
          usd_24h_change: 0.08
        },
        'XAG/USD': {
          usd: 31.45,
          usd_24h_change: 1.2
        },
        'XAU/USD': {
          usd: 2034.50,
          usd_24h_change: 0.8
        }
      };
      
      setPrices(fallbackPrices);
      setError('Using fallback prices - API temporarily unavailable');
      console.log('⚠️ Using enhanced fallback prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    
    // Reduce API call frequency to avoid rate limiting - every 2 minutes instead of 30 seconds
    const interval = setInterval(fetchPrices, 120000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    prices,
    loading,
    error,
    refreshPrice: fetchPrices
  };
};
