
import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number;
  width?: string;
  key?: string | number; // Add key prop for re-rendering
}

const TradingViewChart = ({ 
  symbol = "BINANCE:AVAXUSDT", 
  theme = "light", 
  height = 400,
  width = "100%",
  key
}: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear any existing content first
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com"
    });

    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme, key]); // Include key in dependencies

  return (
    <div 
      ref={containerRef} 
      style={{ height: `${height}px`, width: width }}
      className="tradingview-widget-container"
    >
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
};

export default TradingViewChart;
