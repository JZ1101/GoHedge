
# GoHedge - Frontend

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

## License

This project is part of the GoHedge decentralized insurance platform.
