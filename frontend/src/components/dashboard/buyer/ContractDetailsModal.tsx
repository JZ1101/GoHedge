import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Copy } from 'lucide-react';
import { purchaseInsurance, getErrorMessage } from '../../../utils/sdk/index.js';
import { web3WalletManager } from '../../../utils/web3Wallet';
import { MarketplaceContract } from '../../../types/contract';
import { usePrice } from '../../../hooks/usePrice';

interface ContractDetailsModalProps {
  contract: MarketplaceContract;
  onClose: () => void;
}

const ContractDetailsModal = ({ contract, onClose }: ContractDetailsModalProps) => {
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const { prices } = usePrice();

  // Get current AVAX price from price hook
  const currentPrice = prices.AVAX?.usd?.toString() || contract.current_price;

  const handlePurchase = async () => {
    setPurchasing(true);
    setError('');
    
    try {
      console.log(`Purchasing contract ${contract.id}...`);
      
      // Use the centralized transaction provider
      const provider = web3WalletManager.getTransactionProvider();
      const signer = await provider.getSigner();
      
      // Purchase the insurance using the SDK - convert to string for consistency
      const result = await purchaseInsurance(signer, Number(contract.id), contract.insurance_fee.toString());
      
      // Extract transaction hash from result
      const txHash = result?.hash || result?.transactionHash || 'Transaction completed';
      setTransactionId(txHash);
      setPurchaseSuccess(true);
      console.log("Contract purchased successfully, tx:", txHash);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Purchase error:', err);
    } finally {
      setPurchasing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (purchaseSuccess) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600">Purchase Successful!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6 space-y-4">
            <p className="text-gray-600 mb-4">
              Insurance contract purchased successfully
            </p>
            {transactionId && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Transaction ID:</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="font-mono text-xs break-all">
                    {transactionId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(transactionId)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract.trigger_token} Insurance Contract
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contract Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Contract Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract ID:</span>
                  <span className="font-mono">{contract.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-blue-100 text-blue-800">Available</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires In:</span>
                  <span>{contract.expires_in_days} days</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Seller Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Address:</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono text-xs">
                      {contract.seller.slice(0, 6)}...{contract.seller.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(contract.seller)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trigger Conditions */}
          <div>
            <h3 className="font-semibold mb-3">Trigger Conditions</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Token:</span>
                  <div className="font-semibold">{contract.trigger_token}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Trigger Price:</span>
                  <div className="font-semibold">${contract.trigger_price}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Current Price:</span>
                  <div className="font-semibold">${parseFloat(currentPrice).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Distance:</span>
                  <div className={`font-semibold ${
                    parseFloat(currentPrice) > contract.trigger_price ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {((parseFloat(currentPrice) - contract.trigger_price) / contract.trigger_price * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reserve & Pricing */}
          <div>
            <h3 className="font-semibold mb-3">Reserve & Pricing</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Reserve Amount:</span>
                <span className="font-semibold">
                  {contract.reserve_amount} {contract.reserve_token}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Insurance Fee:</span>
                <span className="font-semibold text-blue-600">
                  {contract.insurance_fee} {contract.reserve_token}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee:</span>
                <span className="font-semibold">
                  {((contract.insurance_fee * 0.1) + 0.01).toFixed(4)} {contract.reserve_token}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total Cost:</span>
                <span className="font-semibold text-green-600">
                  {contract.total_cost} {contract.reserve_token}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              className="flex-1"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? 'Processing...' : `Purchase for ${contract.total_cost} ${contract.reserve_token}`}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDetailsModal;
