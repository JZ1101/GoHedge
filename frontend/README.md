
# GoHedge - Decentralized Insurance Platform

GoHedge is a decentralized finance (DeFi) platform that enables users to create and trade insurance contracts for various assets including cryptocurrencies, forex pairs, and commodities.

## What is GoHedge?

GoHedge provides a marketplace where users can:
- **Buy Insurance**: Protect your investments against price volatility
- **Sell Insurance**: Create insurance contracts and earn fees from premiums
- **Trade Contracts**: Access a liquid marketplace for insurance products

The platform supports multiple asset classes:
- **Cryptocurrencies**: AVAX, BTC, ETH, SOL, LINK
- **Forex Pairs**: EUR/USD, JPY/USD  
- **Commodities**: Gold (XAU/USD)

## Features

- **Real-time Price Data**: Live market data integration for accurate pricing
- **Interactive Charts**: Detailed price charts with 24-hour historical data
- **Portfolio Management**: Track your insurance positions and performance
- **Web3 Integration**: Connect your wallet to interact with smart contracts
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite
- **Web3**: Ethers.js for blockchain interactions

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. locate the `frontend` directory in your terminal:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080/`

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
### Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── lib/                # Library configurations
```

### Making Changes

1. The main application logic is in `src/App.tsx`
2. Dashboard components are in `src/components/dashboard/`
3. Price data is managed by `src/hooks/useTradingViewPrice.ts`
4. Styling uses Tailwind CSS classes throughout the codebase

## Deployment

Build the application for production:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Contributing

1. Create a feature branch from main
2. Make your changes
3. Test thoroughly
4. Submit a pull request with a clear description

## License

This project is part of the GoHedge decentralized insurance platform.
