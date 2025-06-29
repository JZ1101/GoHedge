
import React, { useState } from 'react';
import { Shield, Wallet, TrendingUp, Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PriceDisplay from './PriceDisplay';
import WalletBalance from './WalletBalance';
import WalletSelector from './WalletSelector';
import { useWallet } from '../hooks/useWallet';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Header = ({ activeTab, setActiveTab }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);
  const { account, isConnected, isConnecting, connectWallet, disconnectWallet } = useWallet();

  const tabs = [
    { id: 'contracts', label: 'Market', icon: TrendingUp },
    { id: 'create', label: 'Create Contract', icon: Shield },
    { id: 'buy', label: 'My Portfolio', icon: Wallet },
  ];

  const handleConnectWallet = () => {
    // Only show wallet selector if not already connected
    if (!isConnected) {
      console.log('🔌 Opening wallet selector - user not connected');
      setIsWalletSelectorOpen(true);
    } else {
      console.log('⚠️ Wallet already connected, not opening selector');
    }
  };

  const handleDisconnectWallet = () => {
    console.log('🔌 User requested wallet disconnect');
    disconnectWallet();
  };

  const handleWalletSelect = async (walletType: 'metamask' | 'core') => {
    try {
      console.log(`🔌 Connecting to ${walletType} from header`);
      await connectWallet(walletType);
      setIsWalletSelectorOpen(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">GoHedge</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Price Ticker */}
            <div className="hidden lg:block">
              <PriceDisplay />
            </div>

            {/* Wallet Balance */}
            {isConnected && (
              <div className="hidden md:block">
                <WalletBalance />
              </div>
            )}

            {/* Network Status */}
            <div className="hidden md:flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Avalanche</span>
            </div>

            {/* Wallet Connection */}
            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden md:flex">
                    <Wallet className="h-4 w-4 mr-2" />
                    <span>{formatAddress(account!)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <div className="flex flex-col">
                      <span className="font-medium">Connected Wallet</span>
                      <span className="text-xs text-gray-500">{account}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDisconnectWallet} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Wallet
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleConnectWallet}
                variant="default"
                size="sm"
                className="hidden md:flex"
                disabled={isConnecting}
              >
                <Wallet className="h-4 w-4 mr-2" />
                {isConnecting ? (
                  <span>Connecting...</span>
                ) : (
                  <span>Connect Wallet</span>
                )}
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-200">
              {isConnected && <WalletBalance />}
              {isConnected ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 text-sm text-gray-600">
                    Connected: {formatAddress(account!)}
                  </div>
                  <Button
                    onClick={handleDisconnectWallet}
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Wallet
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleConnectWallet}
                  variant="default"
                  size="sm"
                  className="w-full mt-2"
                  disabled={isConnecting}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Wallet Selector Modal */}
      <WalletSelector
        isOpen={isWalletSelectorOpen}
        onClose={() => setIsWalletSelectorOpen(false)}
        onWalletSelect={handleWalletSelect}
      />
    </header>
  );
};

export default Header;
