
/**
 * REACT INTEGRATION HOOKS
 */
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from './config.js';
import { formatContractForDisplay } from './formatters.js';
import DUMMY_ABI from '../DummyABI.js';

const CONTRACT_ABI = DUMMY_ABI;

export const useGoHedgeContract = () => {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, provider);
    
    const fetchContracts = async () => {
        try {
            setLoading(true);
            const contractIds = await contract.getAllContracts();
            const contractsData = [];
            
            for (const id of contractIds) {
                const contractData = await contract.getContract(id);
                const formattedContract = formatContractForDisplay(id, contractData);
                contractsData.push(formattedContract);
            }
            
            setContracts(contractsData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchContracts();
    }, []);
    
    return { contracts, loading, error, refetch: fetchContracts };
};

export const useUserContracts = (userAddress) => {
    const [userContracts, setUserContracts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const fetchUserContracts = async () => {
        if (!userAddress) {
            setUserContracts([]);
            setLoading(false);
            setError(null);
            return;
        }
        
        try {
            setLoading(true);
            setError(null);
            console.log("SDK: Fetching contracts for user:", userAddress);
            
            // For now, return mock data since the actual contract might not exist
            // This simulates what would happen with real contract data
            const mockContracts = [
                {
                    id: "1",
                    seller: "0x1234567890123456789012345678901234567890",
                    buyer: userAddress,
                    triggerPrice: "25.00",
                    reserveAmount: "100.0",
                    insuranceFee: "2.5",
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
                    timeRemaining: "23d 12h",
                    isActive: true,
                    isTriggered: false,
                    isClaimed: false,
                    isExpired: false,
                    userRole: 'buyer'
                },
                {
                    id: "2",
                    seller: userAddress,
                    buyer: "0x0987654321098765432109876543210987654321",
                    triggerPrice: "20.00",
                    reserveAmount: "50.0",
                    insuranceFee: "1.25",
                    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
                    timeRemaining: "27d 8h",
                    isActive: true,
                    isTriggered: false,
                    isClaimed: false,
                    isExpired: false,
                    userRole: 'seller'
                }
            ];
            
            console.log("SDK: Returning mock contracts:", mockContracts);
            setUserContracts(mockContracts);
            
        } catch (err) {
            console.error("SDK: Error fetching user contracts:", err);
            setError(err.message || "Failed to fetch contracts");
            setUserContracts([]);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchUserContracts();
    }, [userAddress]);
    
    return { userContracts, loading, error, refetch: fetchUserContracts };
};
