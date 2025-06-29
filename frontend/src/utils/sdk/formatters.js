
/**
 * UTILITY FUNCTIONS FOR FORMATTING DATA
 */
import { ethers } from 'ethers';

export const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return "Expired";
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

export const formatContractForDisplay = (id, rawContract) => {
    const now = Math.floor(Date.now() / 1000);
    
    // Convert BigInt values to numbers explicitly
    const startDate = typeof rawContract.startDate === 'bigint' ? Number(rawContract.startDate) : rawContract.startDate;
    const endDate = typeof rawContract.endDate === 'bigint' ? Number(rawContract.endDate) : rawContract.endDate;
    
    const isExpired = now > endDate;
    const timeRemaining = isExpired ? "Expired" : formatTimeRemaining(endDate - now);
    
    let status = "available";
    if (rawContract.claimed) status = "claimed";
    else if (rawContract.triggered) status = "triggered";
    else if (rawContract.active) status = "purchased";
    else if (isExpired) status = "expired";
    
    return {
        id: typeof id === 'bigint' ? id.toString() : id.toString(),
        status,
        seller: rawContract.seller,
        buyer: rawContract.buyer === ethers.ZeroAddress ? null : rawContract.buyer,
        triggerPrice: ethers.formatEther(rawContract.triggerPrice),
        reserveAmount: ethers.formatEther(rawContract.reserveAmount),
        insuranceFee: ethers.formatEther(rawContract.insuranceFee),
        startDate: new Date(startDate * 1000).toISOString(),
        endDate: new Date(endDate * 1000).toISOString(),
        timeRemaining,
        isActive: rawContract.active,
        isTriggered: rawContract.triggered,
        isClaimed: rawContract.claimed,
        isExpired
    };
};
