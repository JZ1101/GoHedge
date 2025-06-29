
import { BrowserProvider, formatEther } from 'ethers';

export interface WalletProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isAvalanche?: boolean;
}

export const AVALANCHE_NETWORK = {
  chainId: '0xA86A', // 43114 in hex (Avalanche Mainnet)
  chainName: 'Avalanche Network',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://snowtrace.io/'],
};

export const AVALANCHE_TESTNET = {
  chainId: '0xA869', // 43113 in hex (Fuji Testnet)
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
};

export class Web3WalletManager {
  private provider: WalletProvider | null = null;
  private ethersProvider: BrowserProvider | null = null;
  private eventListenersSupported: boolean = false;
  private connectedWalletType: 'metamask' | 'core' | null = null;

  async connectWallet(walletType: 'metamask' | 'core'): Promise<{
    account: string;
    chainId: number;
  }> {
    try {
      // Reset previous connections
      this.disconnect();
      
      // Strict wallet detection and selection
      if (walletType === 'metamask') {
        const ethereum = (window as any).ethereum;
        
        if (!ethereum) {
          throw new Error('MetaMask not installed. Please install MetaMask extension.');
        }
        
        // Handle multiple providers case
        if (ethereum.providers && Array.isArray(ethereum.providers)) {
          this.provider = ethereum.providers.find((provider: any) => provider.isMetaMask && !provider.isAvalanche);
          if (!this.provider) {
            throw new Error('MetaMask provider not found among installed wallets');
          }
        } else if (ethereum.isMetaMask && !ethereum.isAvalanche) {
          this.provider = ethereum;
        } else {
          throw new Error('MetaMask not detected. Please ensure MetaMask is installed and enabled.');
        }
        
        this.connectedWalletType = 'metamask';
        
      } else if (walletType === 'core') {
        // Core Wallet uses window.avalanche or can be detected via specific methods
        const avalanche = (window as any).avalanche;
        
        if (avalanche) {
          this.provider = avalanche;
        } else {
          // Core Wallet sometimes uses ethereum provider but with specific properties
          const ethereum = (window as any).ethereum;
          if (ethereum && ethereum.isAvalanche) {
            this.provider = ethereum;
          } else {
            throw new Error('Core Wallet not installed. Please install Core Wallet extension.');
          }
        }
        
        this.connectedWalletType = 'core';
      }

      if (!this.provider) {
        throw new Error(`${walletType} wallet provider not available`);
      }

      // Check if event listeners are supported
      this.eventListenersSupported = typeof this.provider.on === 'function' && typeof this.provider.removeListener === 'function';

      console.log(`Successfully connected to ${walletType} wallet provider`);

      // Request account access
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet and try again.');
      }

      // Get current chain ID
      const chainId = await this.provider.request({
        method: 'eth_chainId'
      });

      // Create ethers provider for balance fetching - ensure it's properly initialized
      try {
        this.ethersProvider = new BrowserProvider(this.provider);
        console.log('✅ Ethers provider created successfully for', walletType);
      } catch (providerError) {
        console.error('❌ Failed to create ethers provider:', providerError);
        this.ethersProvider = null;
      }

      return {
        account: accounts[0],
        chainId: parseInt(chainId, 16)
      };
    } catch (error) {
      console.error(`Failed to connect ${walletType} wallet:`, error);
      this.disconnect(); // Clean up on error
      throw error;
    }
  }

  // NEW: Get the transaction provider for the currently connected wallet
  getTransactionProvider(): BrowserProvider {
    if (!this.provider || !this.ethersProvider) {
      throw new Error('No wallet connected. Please connect your wallet first.');
    }
    
    console.log('🔐 Using transaction provider for:', this.connectedWalletType);
    return this.ethersProvider;
  }

  // NEW: Get the connected wallet type
  getConnectedWalletType(): 'metamask' | 'core' | null {
    return this.connectedWalletType;
  }

  // NEW: Validate that the current provider matches the connected wallet
  async validateConnection(): Promise<boolean> {
    if (!this.provider || !this.connectedWalletType) {
      return false;
    }

    try {
      const accounts = await this.provider.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch (error) {
      console.error('❌ Connection validation failed:', error);
      return false;
    }
  }

  async switchToAvalanche(): Promise<void> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    try {
      // Try to switch to Avalanche network
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AVALANCHE_TESTNET.chainId }], // Using testnet for development
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [AVALANCHE_TESTNET],
        });
      } else {
        throw switchError;
      }
    }
  }

  async getBalance(address: string): Promise<string> {
    if (!this.ethersProvider) {
      console.error('No ethers provider available for balance fetch');
      return '0.00';
    }

    try {
      const balance = await this.ethersProvider.getBalance(address);
      const formattedBalance = parseFloat(formatEther(balance)).toFixed(4);
      console.log(`✅ Balance fetched: ${formattedBalance} AVAX`);
      return formattedBalance;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return '0.00';
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.provider && this.eventListenersSupported) {
      this.provider.on!('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (this.provider && this.eventListenersSupported) {
      this.provider.on!('chainChanged', callback);
    }
  }

  removeListeners(): void {
    if (this.provider && this.eventListenersSupported) {
      this.provider.removeListener!('accountsChanged', () => {});
      this.provider.removeListener!('chainChanged', () => {});
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting wallet manager...');
    this.removeListeners();
    this.provider = null;
    this.ethersProvider = null;
    this.eventListenersSupported = false;
    this.connectedWalletType = null;
  }
}

export const web3WalletManager = new Web3WalletManager();
