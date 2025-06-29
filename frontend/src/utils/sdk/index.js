
/**
 * SDK - DATA AND UTILITY FUNCTIONS
 *
 * Real blockchain integration with the deployed DummyInsurance contract
 */
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from './config.js';
import { blockchainService } from './blockchain.js';

// Real blockchain functions
export const createContract = async (signer, formData) => {
    console.log("SDK: createContract called with:", formData);
    return await blockchainService.createContract(signer, formData);
};

export const purchaseInsurance = async (signer, contractId, fee) => {
    console.log(`SDK: purchaseInsurance called for contract ${contractId} with fee ${fee}`);
    return await blockchainService.purchaseInsurance(signer, contractId, fee);
};

export const claimPayout = async (signer, contractId) => {
    console.log("SDK: claimPayout called for contract:", contractId);
    return await blockchainService.claimPayout(signer, contractId);
};

export const withdrawReserve = async (signer, contractId) => {
    console.log("SDK: withdrawReserve called for contract:", contractId);
    return await blockchainService.withdrawReserve(signer, contractId);
};

// Hook to get all contracts from blockchain
export const useGoHedgeContract = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchContracts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("SDK: Fetching contracts from blockchain...");

            const blockchainContracts = await blockchainService.getAllContracts();
            console.log("SDK: Received contracts from blockchain:", blockchainContracts);
            
            setContracts(blockchainContracts);
        } catch (err) {
            console.error("SDK: Error fetching contracts:", err);
            setError(err.message);
            setContracts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    return {
        contracts,
        loading,
        error,
        refetch: fetchContracts
    };
};

// Hook to get user-specific contracts from blockchain
export const useUserContracts = (userAddress) => {
  const [userContracts, setUserContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserContracts = useCallback(async () => {
    console.log('SDK: Fetching contracts for user:', userAddress);
    
    if (!userAddress) {
      console.log('SDK: No user address provided, returning empty contracts');
      setUserContracts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('SDK: Calling blockchain service for user:', userAddress);
      const blockchainContracts = await blockchainService.getUserContracts(userAddress);
      console.log('SDK: Received user contracts from blockchain:', blockchainContracts);
      
      setUserContracts(blockchainContracts);
    } catch (err) {
      console.error('SDK: Error fetching user contracts:', err);
      setError(err.message || "Failed to fetch contracts");
      setUserContracts([]);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchUserContracts();
  }, [fetchUserContracts]);

  return {
    userContracts,
    loading,
    error,
    refetch: fetchUserContracts
  };
};

// Hook to get claimable contracts
export const useClaimableContracts = (userAddress) => {
    const [claimableContracts, setClaimableContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchClaimableContracts = useCallback(async () => {
        console.log('SDK: Fetching claimable contracts for user:', userAddress);
        
        if (!userAddress) {
            console.log('SDK: No user address provided, returning empty claimable contracts');
            setClaimableContracts([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const claimable = await blockchainService.getClaimableContracts(userAddress);
            console.log('SDK: Received claimable contracts:', claimable);
            
            setClaimableContracts(claimable);
        } catch (err) {
            console.error('SDK: Error fetching claimable contracts:', err);
            setError(err.message || "Failed to fetch claimable contracts");
            setClaimableContracts([]);
        } finally {
            setLoading(false);
        }
    }, [userAddress]);

    useEffect(() => {
        fetchClaimableContracts();
    }, [fetchClaimableContracts]);

    return {
        claimableContracts,
        loading,
        error,
        refetch: fetchClaimableContracts
    };
};

// Mock function to simulate fetching user profile
export const useUserProfile = (userAddress) => {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!userAddress) return;

            try {
                setLoading(true);
                setError(null);

                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 400));

                // Mock user profile data
                const mockProfile = {
                    address: userAddress,
                    username: "TestUser",
                    reputation: 4.5,
                    joinDate: new Date().toISOString()
                };

                setUserProfile(mockProfile);
            } catch (err) {
                console.error("SDK: Error fetching user profile:", err);
                setError(err.message);
                setUserProfile(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [userAddress]);

    return {
        userProfile,
        loading,
        error
    };
};

export const getErrorMessage = (error) => {
    if (error.message.includes('user rejected transaction')) {
        return 'User rejected transaction';
    } else if (error.message.includes('missing provider')) {
        return 'Please connect your wallet';
    } else if (error.message.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
    } else if (error.message.includes('Contract does not exist')) {
        return 'Contract not found';
    } else if (error.message.includes('Contract already purchased')) {
        return 'Contract already purchased';
    } else if (error.message.includes('Payout not triggered')) {
        return 'Payout conditions not met yet';
    } else if (error.message.includes('Payout already claimed')) {
        return 'Payout already claimed';
    } else {
        return error.message || 'An unexpected error occurred';
    }
};
