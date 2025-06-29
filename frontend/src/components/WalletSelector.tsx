
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, ExternalLink, AlertCircle } from 'lucide-react';

interface WalletOption {
  id: 'metamask' | 'core';
  name: string;
  icon: string;
  description: string;
  downloadUrl: string;
  isInstalled: boolean;
}

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (walletId: 'metamask' | 'core') => void;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({ isOpen, onClose, onWalletSelect }) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Improved wallet detection with better specificity
  const detectWallets = () => {
    const ethereum = (window as any).ethereum;
    const avalanche = (window as any).avalanche;
    
    let metamaskInstalled = false;
    let coreInstalled = false;

    console.log('🔍 WalletSelector - Detecting wallets:', {
      hasEthereum: !!ethereum,
      hasAvalanche: !!avalanche,
      ethereumIsMetaMask: ethereum?.isMetaMask,
      ethereumIsAvalanche: ethereum?.isAvalanche,
      ethereumProviders: ethereum?.providers?.length || 0
    });

    // Core Wallet detection - prioritize native avalanche object
    if (avalanche && typeof avalanche.request === 'function') {
      coreInstalled = true;
      console.log('✅ Core Wallet detected via window.avalanche');
    }

    // MetaMask detection - be very specific and exclude Core
    if (ethereum) {
      if (ethereum.providers && Array.isArray(ethereum.providers)) {
        // Multiple providers case - find MetaMask specifically
        const metamaskProvider = ethereum.providers.find((provider: any) => 
          provider.isMetaMask && !provider.isAvalanche
        );
        if (metamaskProvider) {
          metamaskInstalled = true;
          console.log('✅ MetaMask detected in providers array');
        }
      } else if (ethereum.isMetaMask && !ethereum.isAvalanche && !avalanche) {
        // Single provider case - ensure it's MetaMask and not Core
        metamaskInstalled = true;
        console.log('✅ MetaMask detected as single provider');
      }
    }

    console.log('🔍 Final wallet detection:', { metamaskInstalled, coreInstalled });

    return { metamaskInstalled, coreInstalled };
  };

  const { metamaskInstalled, coreInstalled } = detectWallets();

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Most popular Ethereum wallet',
      downloadUrl: 'https://metamask.io/download/',
      isInstalled: metamaskInstalled
    },
    {
      id: 'core',
      name: 'Core Wallet',
      icon: 'CO',
      description: 'Native Avalanche wallet',
      downloadUrl: 'https://core.app/',
      isInstalled: coreInstalled
    }
  ];

  const handleWalletSelect = async (walletId: 'metamask' | 'core') => {
    setIsConnecting(walletId);
    try {
      console.log(`🔌 WalletSelector - User attempting to connect ${walletId} wallet`);
      await onWalletSelect(walletId);
      onClose();
    } catch (error) {
      console.error(`❌ Failed to connect ${walletId} wallet:`, error);
      // Don't close modal on error so user can try again
    } finally {
      setIsConnecting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to GoHedge and start trading insurance contracts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {walletOptions.map((wallet) => (
            <div key={wallet.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{wallet.icon}</span>
                  <div>
                    <h3 className="font-medium">{wallet.name}</h3>
                    <p className="text-sm text-gray-600">{wallet.description}</p>
                  </div>
                </div>
                
                {wallet.isInstalled ? (
                  <Button
                    onClick={() => handleWalletSelect(wallet.id)}
                    disabled={isConnecting === wallet.id}
                    variant="outline"
                    size="sm"
                  >
                    {isConnecting === wallet.id ? 'Connecting...' : 'Connect'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => window.open(wallet.downloadUrl, '_blank')}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Install
                  </Button>
                )}
              </div>
              
              {!wallet.isInstalled && (
                <div className="flex items-center gap-2 mt-2 text-sm text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  Wallet not detected. Please install and refresh the page.
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="text-xs text-gray-500 text-center mt-4">
          By connecting a wallet, you agree to our Terms of Service and Privacy Policy.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletSelector;
