
/**
 * PORTFOLIO TRACKING AND ANALYTICS
 */
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from './config.js';
import { formatContractForDisplay } from './formatters.js';
import DUMMY_ABI from '../DummyABI.js';

const CONTRACT_ABI = DUMMY_ABI;

export const useUserPortfolio = (userAddress) => {
    const [portfolio, setPortfolio] = useState({
        summary: {
            totalContracts: 0,
            activeInsurance: 0,
            totalReserveOffered: 0,
            totalFeesEarned: 0,
            totalInsurancePurchased: 0,
            totalPremiumsPaid: 0,
            pendingClaims: 0,
            totalClaimsReceived: 0
        },
        asSellerContracts: [],
        asBuyerContracts: [],
        transactions: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_ABI, provider);

    const calculatePortfolio = async () => {
        if (!userAddress) return;

        try {
            setLoading(true);
            const contractIds = await contract.getContractsByUser(userAddress);
            
            const asSellerContracts = [];
            const asBuyerContracts = [];
            let summary = {
                totalContracts: contractIds.length,
                activeInsurance: 0,
                totalReserveOffered: 0,
                totalFeesEarned: 0,
                totalInsurancePurchased: 0,
                totalPremiumsPaid: 0,
                pendingClaims: 0,
                totalClaimsReceived: 0
            };

            for (const id of contractIds) {
                const contractData = await contract.getContract(id);
                const formattedContract = formatContractForDisplay(id, contractData);
                
                const reserveAmount = parseFloat(formattedContract.reserveAmount);
                const insuranceFee = parseFloat(formattedContract.insuranceFee);

                // User as Seller
                if (contractData.seller.toLowerCase() === userAddress.toLowerCase()) {
                    formattedContract.userRole = 'seller';
                    asSellerContracts.push(formattedContract);
                    
                    summary.totalReserveOffered += reserveAmount;
                    
                    if (formattedContract.isActive && !formattedContract.isExpired) {
                        summary.activeInsurance++;
                        summary.totalFeesEarned += insuranceFee;
                    }
                }
                
                // User as Buyer
                if (contractData.buyer.toLowerCase() === userAddress.toLowerCase()) {
                    formattedContract.userRole = 'buyer';
                    asBuyerContracts.push(formattedContract);
                    
                    summary.totalInsurancePurchased++;
                    summary.totalPremiumsPaid += insuranceFee;
                    
                    if (formattedContract.isTriggered && !formattedContract.isClaimed) {
                        summary.pendingClaims++;
                    }
                    
                    if (formattedContract.isClaimed) {
                        summary.totalClaimsReceived += reserveAmount;
                    }
                }
            }

            setPortfolio({
                summary,
                asSellerContracts,
                asBuyerContracts,
                transactions: [] // Would need event parsing for full transaction history
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        calculatePortfolio();
    }, [userAddress]);

    return { portfolio, loading, error, refetch: calculatePortfolio };
};

export const getPortfolioStats = (portfolio) => {
    const { summary, asSellerContracts, asBuyerContracts } = portfolio;
    
    // Seller Performance
    const sellerStats = {
        totalOffered: summary.totalReserveOffered,
        feesEarned: summary.totalFeesEarned,
        activeContracts: asSellerContracts.filter(c => c.isActive && !c.isExpired).length,
        triggeredContracts: asSellerContracts.filter(c => c.isTriggered).length,
        profitLoss: summary.totalFeesEarned - asSellerContracts
            .filter(c => c.isTriggered && c.isClaimed)
            .reduce((sum, c) => sum + parseFloat(c.reserveAmount), 0)
    };
    
    // Buyer Performance
    const buyerStats = {
        totalPaid: summary.totalPremiumsPaid,
        totalReceived: summary.totalClaimsReceived,
        activeInsurance: asBuyerContracts.filter(c => c.isActive && !c.isExpired).length,
        successfulClaims: asBuyerContracts.filter(c => c.isClaimed).length,
        profitLoss: summary.totalClaimsReceived - summary.totalPremiumsPaid
    };
    
    return { sellerStats, buyerStats };
};

export const filterContractsByStatus = (contracts, status) => {
    switch (status) {
        case 'active':
            return contracts.filter(c => c.isActive && !c.isExpired && !c.isTriggered);
        case 'triggered':
            return contracts.filter(c => c.isTriggered && !c.isClaimed);
        case 'claimed':
            return contracts.filter(c => c.isClaimed);
        case 'expired':
            return contracts.filter(c => c.isExpired && !c.isActive);
        case 'available':
            return contracts.filter(c => !c.isActive && !c.isExpired);
        default:
            return contracts;
    }
};

export const sortContractsByDate = (contracts, order = 'desc') => {
    return contracts.sort((a, b) => {
        const dateA = new Date(a.endDate);
        const dateB = new Date(b.endDate);
        return order === 'desc' ? dateB - dateA : dateA - dateB;
    });
};
