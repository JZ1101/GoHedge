import { useState, useEffect, useCallback } from 'react';
import { WalletState } from '../types';
import { web3WalletManager } from '../utils/web3Wallet';

// Create a global state manager with better connection handling
class WalletStateManager {
  private state: WalletState = {
    account: null,
    chainId: null,
    isConnecting: false
  };
  private listeners = new Set<(state: WalletState) => void>();
  private initialized = false;
  private connectionId = 0; // Track connection sessions

  getState() {
    return { ...this.state };
  }

  setState(newState: Partial<WalletState>) {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    const hasChanged = 
      previousState.account !== this.state.account ||
      previousState.chainId !== this.state.chainId ||
      previousState.isConnecting !== this.state.isConnecting;
    
    console.log('🔄 WalletStateManager - State updated:', {
      previous: previousState,
      current: this.state,
      listeners: this.listeners.size,
      hasChanged,
      connectionId: this.connectionId
    });
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  subscribe(listener: (state: WalletState) => void) {
    console.log('📡 WalletStateManager - New listener subscribed, total:', this.listeners.size + 1);
    this.listeners.add(listener);
    // Immediately call the listener with current state
    listener({ ...this.state });
    
    return () => {
      console.log('📡 WalletStateManager - Listener unsubscribed, remaining:', this.listeners.size - 1);
      this.listeners.delete(listener);
    };
  }

  // Force fresh connection check
  async forceRefresh() {
    console.log('🔄 WalletStateManager - Force refreshing with new connection ID');
    this.connectionId += 1;
    this.initialized = false;
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('⚠️ WalletStateManager - Already initialized, skipping');
      return;
    }
    this.initialized = true;
    console.log('🚀 WalletStateManager - Initializing with connection ID:', this.connectionId);
    await this.checkWalletConnection();
  }

  async checkWalletConnection() {
    // Check for existing connection with fresh data
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // Always fetch fresh account data
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        
        if (accounts && accounts.length > 0) {
          console.log('✅ WalletStateManager - Found existing connection:', { 
            account: accounts[0], 
            chainId,
            connectionId: this.connectionId 
          });
          this.setState({
            account: accounts[0],
            chainId: parseInt(chainId, 16),
            isConnecting: false
          });
        } else {
          console.log('📭 WalletStateManager - No existing connection found');
          this.setState({
            account: null,
            chainId: null,
            isConnecting: false
          });
        }
      } catch (error) {
        console.error('❌ WalletStateManager - Error checking existing connection:', error);
        this.setState({
          account: null,
          chainId: null,
          isConnecting: false
        });
      }
    }
  }

  // Method to clear state and force fresh connection
  reset() {
    console.log('🔄 WalletStateManager - Resetting state and clearing listeners');
    this.listeners.clear();
    this.state = {
      account: null,
      chainId: null,
      isConnecting: false
    };
    this.initialized = false;
    this.connectionId = 0;
  }
}

// Create a single global instance
const walletStateManager = new WalletStateManager();

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>(() => walletStateManager.getState());

  console.log('🎯 useWallet render - current state:', walletState);
  console.log('💡 CURRENT CONNECTED WALLET:', {
    account: walletState.account,
    chainId: walletState.chainId,
    isConnected: !!walletState.account,
    timestamp: new Date().toISOString()
  });

  // Initialize the wallet state manager once
  useEffect(() => {
    walletStateManager.initialize();
  }, []);

  // Subscribe to global state changes
  useEffect(() => {
    console.log('🔗 useWallet - Setting up subscription');
    const unsubscribe = walletStateManager.subscribe((newState) => {
      console.log('📨 useWallet - Received state update:', newState);
      setWalletState(newState);
    });
    return unsubscribe;
  }, []);

  const connectWallet = async (walletType: 'metamask' | 'core'): Promise<void> => {
    console.log(`🔌 Connecting to ${walletType} wallet with fresh connection...`);
    
    // Force fresh connection by resetting web3 manager
    web3WalletManager.disconnect();
    
    walletStateManager.setState({ isConnecting: true });
    
    try {
      const { account, chainId } = await web3WalletManager.connectWallet(walletType);
      
      // Try to switch to Avalanche network
      try {
        await web3WalletManager.switchToAvalanche();
        // Get updated chain ID after switch
        const updatedChainId = chainId === 43113 ? 43113 : 43114; // Fuji testnet or mainnet
        
        const newState = {
          account,
          chainId: updatedChainId,
          isConnecting: false
        };
        
        console.log('✅ Setting fresh wallet state to:', newState);
        walletStateManager.setState(newState);
      } catch (networkError) {
        console.warn('⚠️ Failed to switch to Avalanche network:', networkError);
        // Still set the wallet state even if network switch fails
        const newState = {
          account,
          chainId,
          isConnecting: false
        };
        
        console.log('✅ Setting wallet state to (after network error):', newState);
        walletStateManager.setState(newState);
      }
      
      console.log('🎉 Fresh wallet connection established:', account);
    } catch (error) {
      console.error("❌ Failed to connect wallet:", error);
      walletStateManager.setState({ isConnecting: false });
      throw error;
    }
  };

  const disconnectWallet = useCallback((): void => {
    console.log('🔌 Disconnecting wallet...');
    web3WalletManager.disconnect();
    web3WalletManager.removeListeners();
    walletStateManager.setState({
      account: null,
      chainId: null,
      isConnecting: false
    });
    console.log('✅ Wallet disconnected');
  }, []);

  const refreshWallet = useCallback(async (): Promise<void> => {
    console.log('🔄 Refreshing wallet state with force refresh...');
    await walletStateManager.forceRefresh();
  }, []);

  // Handle account changes - set up once globally
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 Accounts changed:', accounts);
      if (accounts.length === 0) {
        walletStateManager.setState({
          account: null,
          chainId: null,
          isConnecting: false
        });
      } else {
        console.log('🔄 Account switched to:', accounts[0]);
        walletStateManager.setState({ account: accounts[0] });
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log('🔄 Chain changed:', chainId);
      walletStateManager.setState({ chainId: parseInt(chainId, 16) });
    };

    const handleConnect = (connectInfo: any) => {
      console.log('🔗 Wallet connected:', connectInfo);
      walletStateManager.forceRefresh();
    };

    const handleDisconnect = () => {
      console.log('🔌 Wallet disconnected');
      walletStateManager.setState({
        account: null,
        chainId: null,
        isConnecting: false
      });
    };

    web3WalletManager.onAccountsChanged(handleAccountsChanged);
    web3WalletManager.onChainChanged(handleChainChanged);

    // Additional event listeners for better wallet state management
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.on('connect', handleConnect);
      (window as any).ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      web3WalletManager.removeListeners();
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        (window as any).ethereum.removeListener('connect', handleConnect);
        (window as any).ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  const isConnected = !!walletState.account;
  
  console.log('🎯 useWallet final state:', { ...walletState, isConnected });

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    refreshWallet,
    isConnected
  };
};
