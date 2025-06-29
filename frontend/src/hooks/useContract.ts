
import { useState, useEffect } from 'react';
import { InsuranceContract } from '../types';
import { useGoHedgeContract, createContract as sdkCreateContract, purchaseInsurance, claimPayout as sdkClaimPayout, withdrawReserve, getErrorMessage } from '../utils/sdk/index.js';
import { useWallet } from './useWallet';
import { web3WalletManager } from '../utils/web3Wallet';

export const useContract = () => {
  const { contracts: sdkContracts, loading, error: sdkError, refetch } = useGoHedgeContract();
  const { account, isConnected } = useWallet();
  const [error, setError] = useState<string>('');

  console.log('🔐 useContract - Current wallet state:', {
    account,
    isConnected,
    contractsCount: sdkContracts?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Convert SDK contracts to our type format
  const contracts: InsuranceContract[] = sdkContracts.map(contract => ({
    id: parseInt(contract.id),
    seller: contract.seller,
    buyer: contract.buyer || '',
    triggerToken: 'AVAX',
    triggerPrice: parseFloat(contract.triggerPrice),
    reserveToken: 'AVAX',
    reserveAmount: parseFloat(contract.reserveAmount),
    insuranceFee: parseFloat(contract.insuranceFee),
    startDate: new Date(contract.startDate),
    endDate: new Date(contract.endDate),
    active: contract.isActive,
    triggered: contract.isTriggered,
    claimed: contract.isClaimed
  }));

  const loadContracts = async (): Promise<void> => {
    await refetch();
  };

  const createContract = async (formData: any): Promise<void> => {
    console.log('🏗️ Creating contract - Wallet check:', {
      isConnected,
      currentAccount: account,
      timestamp: new Date().toISOString()
    });

    if (!isConnected || !account) {
      throw new Error('Please connect your wallet first');
    }

    try {
      console.log('Creating contract with centralized wallet provider');
      
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      // Verify the signer address matches current connected wallet
      const signerAddress = await signer.getAddress();
      
      console.log('🔍 Wallet verification for contract creation:', {
        connectedWallet: account,
        signerWallet: signerAddress,
        walletType: web3WalletManager.getConnectedWalletType(),
        match: signerAddress.toLowerCase() === account.toLowerCase(),
        timestamp: new Date().toISOString()
      });
      
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Wallet mismatch. Please reconnect your wallet and try again.');
      }
      
      console.log('Verified signer matches connected wallet:', signerAddress);
      
      await sdkCreateContract(signer, formData);
      await refetch(); // Refresh contracts after creation
      
      console.log('Contract created successfully by:', signerAddress);
    } catch (err: any) {
      console.error('Contract creation failed:', err);
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const buyInsurance = async (contractId: number, fee: string): Promise<void> => {
    console.log('💰 Purchasing insurance - Wallet check:', {
      isConnected,
      currentAccount: account,
      contractId,
      timestamp: new Date().toISOString()
    });

    if (!isConnected || !account) {
      throw new Error('Please connect your wallet first');
    }

    try {
      console.log('Purchasing insurance with centralized wallet provider');
      
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      // Verify the signer address matches current connected wallet
      const signerAddress = await signer.getAddress();
      
      console.log('🔍 Wallet verification for insurance purchase:', {
        connectedWallet: account,
        signerWallet: signerAddress,
        walletType: web3WalletManager.getConnectedWalletType(),
        match: signerAddress.toLowerCase() === account.toLowerCase(),
        contractId,
        timestamp: new Date().toISOString()
      });
      
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Wallet mismatch. Please reconnect your wallet and try again.');
      }
      
      await purchaseInsurance(signer, contractId, fee);
      await refetch(); // Refresh contracts after purchase
    } catch (err: any) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const triggerPayout = async (contractId: number): Promise<void> => {
    console.log("Triggering payout for contract:", contractId);
    // This would be handled by the smart contract's automated system
  };

  const claimPayout = async (contractId: number): Promise<void> => {
    if (!isConnected || !account) {
      throw new Error('Please connect your wallet first');
    }

    try {
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      // Verify the signer address matches current connected wallet
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Wallet mismatch. Please reconnect your wallet and try again.');
      }
      
      await sdkClaimPayout(signer, contractId);
      await refetch(); // Refresh contracts after claim
    } catch (err: any) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const withdrawFees = async (contractId: number): Promise<void> => {
    if (!isConnected || !account) {
      throw new Error('Please connect your wallet first');
    }

    try {
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      // Verify the signer address matches current connected wallet
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Wallet mismatch. Please reconnect your wallet and try again.');
      }
      
      await withdrawReserve(signer, contractId);
      await refetch(); // Refresh contracts after withdrawal
    } catch (err: any) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  return {
    contracts,
    loading,
    error: error || sdkError,
    loadContracts,
    createContract,
    buyInsurance,
    triggerPayout,
    claimPayout,
    withdrawFees
  };
};
