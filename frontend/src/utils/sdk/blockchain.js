/**
 * BLOCKCHAIN INTEGRATION SERVICE
 * Real contract interaction with your deployed DummyInsurance contract
 */
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from './config.js';
import REAL_CONTRACT_ABI from '../RealContractABI.js';

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.rpcUrl);
    this.contract = new ethers.Contract(CONTRACT_CONFIG.address, REAL_CONTRACT_ABI, this.provider);
  }

  async getContractWithSigner(signer) {
    return new ethers.Contract(CONTRACT_CONFIG.address, REAL_CONTRACT_ABI, signer);
  }

  async getUserContracts(userAddress) {
    try {
      console.log('🔗 Fetching real contracts for user:', userAddress);
      
      // Get contract IDs for this user
      const contractIds = await this.contract.getContractsByUser(userAddress);
      console.log('📋 Found contract IDs:', contractIds.map(id => id.toString()));
      
      const userContracts = [];
      
      for (const contractId of contractIds) {
        try {
          const contractData = await this.contract.getContract(contractId);
          console.log(`📄 Contract ${contractId} data:`, contractData);
          
          // Convert contract data to our format
          const formattedContract = {
            id: contractId.toString(),
            seller: contractData.seller,
            buyer: contractData.buyer === ethers.ZeroAddress ? null : contractData.buyer,
            triggerPrice: ethers.formatEther(contractData.triggerPrice),
            reserveAmount: ethers.formatEther(contractData.reserveAmount),
            insuranceFee: ethers.formatEther(contractData.insuranceFee),
            startDate: new Date(Number(contractData.startDate) * 1000).toISOString(),
            endDate: new Date(Number(contractData.endDate) * 1000).toISOString(),
            isActive: contractData.active,
            isTriggered: contractData.triggered,
            isClaimed: contractData.claimed,
            isExpired: Date.now() > Number(contractData.endDate) * 1000,
            userRole: contractData.seller.toLowerCase() === userAddress.toLowerCase() ? 'seller' : 'buyer'
          };
          
          userContracts.push(formattedContract);
          console.log(`✅ Processed contract ${contractId}:`, formattedContract);
          
        } catch (error) {
          console.error(`❌ Error processing contract ${contractId}:`, error);
        }
      }
      
      console.log('🎯 Final user contracts:', userContracts);
      return userContracts;
      
    } catch (error) {
      console.error('❌ Error fetching user contracts:', error);
      throw error;
    }
  }

  async getAllContracts() {
    try {
      console.log('🔗 Fetching all contracts from blockchain...');
      
      const contractIds = await this.contract.getAllContracts();
      console.log('📋 Found contract IDs:', contractIds.map(id => id.toString()));
      
      const allContracts = [];
      
      for (const contractId of contractIds) {
        try {
          const contractData = await this.contract.getContract(contractId);
          console.log(`📄 Contract ${contractId} data:`, contractData);
          
          // Simplified availability logic - a contract is available if:
          // 1. No buyer (buyer is zero address)
          // 2. Not expired
          const currentTime = Date.now();
          const endTime = Number(contractData.endDate) * 1000;
          
          const hasNoBuyer = contractData.buyer === ethers.ZeroAddress;
          const isNotExpired = currentTime < endTime;
          
          const isAvailable = hasNoBuyer && isNotExpired;
          
          console.log(`Contract ${contractId} availability check:`, {
            hasNoBuyer,
            isNotExpired,
            isAvailable,
            currentTime: new Date(currentTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            buyerAddress: contractData.buyer
          });
          
          const formattedContract = {
            id: contractId.toString(),
            seller: contractData.seller,
            buyer: contractData.buyer === ethers.ZeroAddress ? null : contractData.buyer,
            triggerPrice: ethers.formatEther(contractData.triggerPrice),
            reserveAmount: ethers.formatEther(contractData.reserveAmount),
            insuranceFee: ethers.formatEther(contractData.insuranceFee),
            startDate: new Date(Number(contractData.startDate) * 1000).toISOString(),
            endDate: new Date(Number(contractData.endDate) * 1000).toISOString(),
            isActive: contractData.active,
            isTriggered: contractData.triggered,
            isClaimed: contractData.claimed,
            isExpired: currentTime > endTime,
            isAvailable: isAvailable,
            status: isAvailable ? 'available' : 'not_available'
          };
          
          allContracts.push(formattedContract);
          console.log(`✅ Added contract ${contractId}:`, formattedContract);
          
        } catch (error) {
          console.error(`❌ Error processing contract ${contractId}:`, error);
        }
      }
      
      console.log('🎯 All contracts from blockchain:', allContracts);
      console.log('🎯 Available contracts:', allContracts.filter(c => c.isAvailable));
      
      return allContracts;
      
    } catch (error) {
      console.error('❌ Error fetching all contracts:', error);
      throw error;
    }
  }

  async getClaimableContracts(userAddress) {
    try {
      console.log('🔗 Fetching claimable contracts for user:', userAddress);
      
      const userContracts = await this.getUserContracts(userAddress);
      
      // Filter for claimable contracts (buyer, triggered, not claimed)
      const claimableContracts = userContracts.filter(contract => {
        const isClaimable = contract.userRole === 'buyer' && 
                           contract.isTriggered && 
                           !contract.isClaimed;
        
        console.log(`Contract ${contract.id} claimable check:`, {
          userRole: contract.userRole,
          isTriggered: contract.isTriggered,
          isClaimed: contract.isClaimed,
          isClaimable
        });
        
        return isClaimable;
      }).map(contract => ({
        id: contract.id,
        trigger_token: 'AVAX',
        trigger_price: parseFloat(contract.triggerPrice),
        current_price: parseFloat(contract.triggerPrice), // Using trigger price as current for demo
        payout_amount: parseFloat(contract.reserveAmount),
        status: 'claimable'
      }));
      
      console.log('🎯 Claimable contracts:', claimableContracts);
      return claimableContracts;
      
    } catch (error) {
      console.error('❌ Error fetching claimable contracts:', error);
      throw error;
    }
  }

  async createContract(signer, formData) {
    try {
      console.log('🔗 Creating contract on blockchain:', formData);
      
      const contract = await this.getContractWithSigner(signer);
      
      // Calculate start and end times
      const startTime = formData.startDate ? 
        Math.floor(new Date(formData.startDate).getTime() / 1000) : 
        Math.floor(Date.now() / 1000);
      
      const endTime = startTime + (formData.duration * 60 * 60); // duration in hours
      
      const tx = await contract.createContract(
        formData.triggerToken || 'AVAX',
        ethers.parseEther(formData.triggerPrice.toString()),
        startTime,
        endTime,
        formData.reserveToken || 'AVAX',
        ethers.parseEther(formData.reserveAmount.toString()),
        ethers.parseEther(formData.insuranceFee.toString()),
        { value: ethers.parseEther(formData.reserveAmount.toString()) }
      );
      
      console.log('📝 Contract creation transaction:', tx.hash);
      const receipt = await tx.wait();
      
      return { success: true, hash: tx.hash, receipt };
      
    } catch (error) {
      console.error('❌ Error creating contract:', error);
      throw error;
    }
  }

  async purchaseInsurance(signer, contractId, fee) {
    try {
      console.log('🔗 Purchasing insurance:', { contractId, fee });
      
      const contract = await this.getContractWithSigner(signer);
      
      const tx = await contract.purchaseInsurance(
        contractId,
        { value: ethers.parseEther(fee.toString()) }
      );
      
      console.log('📝 Insurance purchase transaction:', tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
      
    } catch (error) {
      console.error('❌ Error purchasing insurance:', error);
      throw error;
    }
  }

  async claimPayout(signer, contractId) {
    try {
      console.log('🔗 Claiming payout for contract:', contractId);
      
      const contract = await this.getContractWithSigner(signer);
      
      const tx = await contract.claimPayout(contractId);
      
      console.log('📝 Payout claim transaction:', tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
      
    } catch (error) {
      console.error('❌ Error claiming payout:', error);
      throw error;
    }
  }

  async withdrawReserve(signer, contractId) {
    try {
      console.log('🔗 Withdrawing reserve for contract:', contractId);
      
      const contract = await this.getContractWithSigner(signer);
      
      const tx = await contract.withdrawReserve(contractId);
      
      console.log('📝 Reserve withdrawal transaction:', tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
      
    } catch (error) {
      console.error('❌ Error withdrawing reserve:', error);
      throw error;
    }
  }

  async triggerPayout(signer, contractId) {
    try {
      console.log('🔗 Triggering payout for contract:', contractId);
      
      const contract = await this.getContractWithSigner(signer);
      
      const tx = await contract.triggerPayout(contractId);
      
      console.log('📝 Trigger payout transaction:', tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
      
    } catch (error) {
      console.error('❌ Error triggering payout:', error);
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();
