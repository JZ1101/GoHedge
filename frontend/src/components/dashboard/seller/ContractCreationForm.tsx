import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, TrendingUp, TrendingDown, Calendar, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTradingViewPrice } from '../../../hooks/useTradingViewPrice';
import { useWallet } from '../../../hooks/useWallet';
import { createContract, getErrorMessage } from '../../../utils/sdk/index.js';
import { ethers } from 'ethers';

// Token categories
const CRYPTO_TOKENS = ["BTC", "SOL", "ETH", "LINK", "AVAX"];
const FOREX_TOKENS = ["JPY/USD", "EUR/USD"];
const COMMODITY_TOKENS = ["XAG/USD", "XAU/USD"];
const ALL_TRIGGER_TOKENS = [...CRYPTO_TOKENS, ...FOREX_TOKENS, ...COMMODITY_TOKENS];

const RESERVE_TOKENS = ["AVAX", "USDC"];

const ContractCreationForm = () => {
  const [formData, setFormData] = useState({
    triggerToken: 'AVAX',
    triggerPrice: '',
    reserveToken: 'AVAX',
    reserveAmount: '',
    insuranceFee: '',
    duration: '24',
    durationType: 'hours',
    customDuration: '',
    startDate: '',
    enableWhitelist: false,
    whitelistAddresses: []
  });

  const [newWhitelistAddress, setNewWhitelistAddress] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { prices, loading: pricesLoading } = useTradingViewPrice();
  const { account } = useWallet();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!formData.triggerPrice || !formData.reserveAmount || !formData.insuranceFee) {
      setError('Please fill in all required fields (Trigger Price, Reserve Amount, Insurance Fee)');
      return;
    }

    let durationInHours;
    if (formData.durationType === 'custom' && formData.customDuration) {
      durationInHours = parseInt(formData.customDuration);
    } else {
      durationInHours = parseInt(formData.duration);
    }

    if (!durationInHours || durationInHours <= 0) {
      setError('Please specify a valid duration');
      return;
    }

    const triggerPrice = parseFloat(formData.triggerPrice);
    const reserveAmount = parseFloat(formData.reserveAmount);
    const insuranceFee = parseFloat(formData.insuranceFee);

    if (triggerPrice <= 0 || reserveAmount <= 0 || insuranceFee <= 0) {
      setError('All amounts must be greater than 0');
      return;
    }

    // Validate whitelist addresses if enabled
    if (formData.enableWhitelist && formData.whitelistAddresses.length === 0) {
      setError('Please add at least one whitelist address or disable whitelist');
      return;
    }
    
    setIsCreating(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const contractParams = {
        triggerToken: formData.triggerToken,
        triggerPrice: formData.triggerPrice,
        reserveToken: formData.reserveToken,
        reserveAmount: formData.reserveAmount,
        insuranceFee: formData.insuranceFee,
        duration: durationInHours,
        startDate: formData.startDate || new Date().toISOString(),
        enableWhitelist: formData.enableWhitelist,
        whitelistAddresses: formData.whitelistAddresses
      };
      
      console.log('Creating contract with params:', contractParams);
      
      const receipt = await createContract(signer, contractParams);
      
      console.log('Contract created successfully:', receipt);
      
      const txHash = receipt?.hash || receipt?.transactionHash || 'Transaction completed';
      setSuccess(`Contract created successfully! ${txHash !== 'Transaction completed' ? `Transaction hash: ${txHash}` : ''}`);
      
      // Reset form
      setFormData({
        triggerToken: 'AVAX',
        triggerPrice: '',
        reserveToken: 'AVAX',
        reserveAmount: '',
        insuranceFee: '',
        duration: '24',
        durationType: 'hours',
        customDuration: '',
        startDate: '',
        enableWhitelist: false,
        whitelistAddresses: []
      });
      setNewWhitelistAddress('');
      
    } catch (error) {
      console.error('Contract creation failed:', error);
      setError(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const addWhitelistAddress = () => {
    if (!newWhitelistAddress.trim()) return;
    
    // Basic Ethereum address validation
    if (!ethers.isAddress(newWhitelistAddress)) {
      setError('Invalid Ethereum address format');
      return;
    }
    
    if (formData.whitelistAddresses.includes(newWhitelistAddress)) {
      setError('Address already in whitelist');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      whitelistAddresses: [...prev.whitelistAddresses, newWhitelistAddress]
    }));
    setNewWhitelistAddress('');
    setError('');
  };

  const removeWhitelistAddress = (addressToRemove) => {
    setFormData(prev => ({
      ...prev,
      whitelistAddresses: prev.whitelistAddresses.filter(addr => addr !== addressToRemove)
    }));
  };

  const calculateEstimatedFees = () => {
    const fee = parseFloat(formData.insuranceFee) || 0;
    const serviceFee = fee * 0.1 + 0.01;
    const totalEarning = fee - serviceFee;
    return { serviceFee: serviceFee.toFixed(4), totalEarning: totalEarning.toFixed(4) };
  };

  const getCurrentPrice = () => {
    if (!formData.triggerToken || !prices[formData.triggerToken]) return null;
    return prices[formData.triggerToken];
  };

  const calculatePriceDistance = () => {
    const currentPrice = getCurrentPrice();
    const triggerPrice = parseFloat(formData.triggerPrice);
    
    if (!currentPrice || !triggerPrice) return null;
    
    const distance = ((triggerPrice - currentPrice.price) / currentPrice.price) * 100;
    return distance;
  };

  const getTokenCategory = (token) => {
    if (CRYPTO_TOKENS.includes(token)) return 'Crypto';
    if (FOREX_TOKENS.includes(token)) return 'Forex';
    if (COMMODITY_TOKENS.includes(token)) return 'Commodity';
    return '';
  };

  const { serviceFee, totalEarning } = calculateEstimatedFees();
  const currentPrice = getCurrentPrice();
  const priceDistance = calculatePriceDistance();

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Create Insurance Contract</CardTitle>
          <Badge variant="outline" className="text-xs">
            New Contract
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Set up a new insurance contract for token price protection
        </p>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Token Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900">Token Configuration</h3>
              <Info className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="triggerToken">Trigger Token *</Label>
                <Select value={formData.triggerToken} onValueChange={(value) => handleInputChange('triggerToken', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger token" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">Crypto</div>
                    {CRYPTO_TOKENS.map((token) => (
                      <SelectItem key={token} value={token}>
                        <div className="flex items-center justify-between w-full">
                          <span>{token}</span>
                          {prices[token] && (
                            <span className="text-sm text-gray-500 ml-2">
                              ${typeof prices[token].price === 'number' ? prices[token].price.toFixed(2) : prices[token].price}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">Forex</div>
                    {FOREX_TOKENS.map((token) => (
                      <SelectItem key={token} value={token}>
                        <div className="flex items-center justify-between w-full">
                          <span>{token}</span>
                          {prices[token] && (
                            <span className="text-sm text-gray-500 ml-2">
                              {prices[token].price.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">Commodities</div>
                    {COMMODITY_TOKENS.map((token) => (
                      <SelectItem key={token} value={token}>
                        <div className="flex items-center justify-between w-full">
                          <span>{token}</span>
                          {prices[token] && (
                            <span className="text-sm text-gray-500 ml-2">
                              ${prices[token].price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {formData.triggerToken && currentPrice && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        Current {formData.triggerToken} Price (TradingView):
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-blue-900">
                          {formData.triggerToken.includes('/') ? 
                            currentPrice.price.toFixed(4) : 
                            `$${currentPrice.price.toFixed(2)}`
                          }
                        </span>
                        {currentPrice.change24h >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <Badge variant={currentPrice.change24h >= 0 ? "default" : "destructive"} className="text-xs">
                          {currentPrice.change24h >= 0 ? '+' : ''}{currentPrice.change24h.toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      Data sourced from TradingView-aligned feeds
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerPrice">Trigger Price (USD) *</Label>
                <Input
                  id="triggerPrice"
                  type="number"
                  step="0.0001"
                  placeholder={formData.triggerToken.includes('/') ? "1.0000" : "Enter trigger price"}
                  value={formData.triggerPrice}
                  onChange={(e) => handleInputChange('triggerPrice', e.target.value)}
                  required
                />
                
                {priceDistance !== null && (
                  <div className={`p-2 rounded text-sm ${priceDistance > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
                    {priceDistance > 0 ? (
                      <>⚠️ Trigger price is {priceDistance.toFixed(1)}% above current TradingView price</>
                    ) : (
                      <>✅ Trigger price is {Math.abs(priceDistance).toFixed(1)}% below current TradingView price</>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reserve Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Reserve Configuration</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reserveToken">Reserve Token *</Label>
                <Select value={formData.reserveToken} onValueChange={(value) => handleInputChange('reserveToken', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reserve token" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESERVE_TOKENS.map((token) => (
                      <SelectItem key={token} value={token}>
                        {token}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reserveAmount">Reserve Amount ({formData.reserveToken}) *</Label>
                <Input
                  id="reserveAmount"
                  type="number"
                  step={formData.reserveToken === 'USDC' ? "0.01" : "0.0001"}
                  placeholder={formData.reserveToken === 'USDC' ? "1000.00" : "1.0000"}
                  value={formData.reserveAmount}
                  onChange={(e) => handleInputChange('reserveAmount', e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Amount you'll stake as collateral {formData.reserveToken === 'USDC' ? '(USD Coin)' : '(AVAX)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insuranceFee">Insurance Fee ({formData.reserveToken}) *</Label>
                <Input
                  id="insuranceFee"
                  type="number"
                  step={formData.reserveToken === 'USDC' ? "0.01" : "0.0001"}
                  placeholder={formData.reserveToken === 'USDC' ? "50.00" : "2.0000"}
                  value={formData.insuranceFee}
                  onChange={(e) => handleInputChange('insuranceFee', e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Fee buyers will pay for this insurance</p>
              </div>
            </div>
          </div>

          {/* Whitelist Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Access Control</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableWhitelist"
                  checked={formData.enableWhitelist}
                  onCheckedChange={(checked) => handleInputChange('enableWhitelist', checked)}
                />
                <Label htmlFor="enableWhitelist" className="text-sm font-medium">
                  Enable Whitelist (Restrict to specific addresses)
                </Label>
              </div>
              
              {formData.enableWhitelist && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter Ethereum address (0x...)"
                      value={newWhitelistAddress}
                      onChange={(e) => setNewWhitelistAddress(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addWhitelistAddress}
                      disabled={!newWhitelistAddress.trim()}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {formData.whitelistAddresses.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Whitelisted Addresses:</Label>
                      {formData.whitelistAddresses.map((address, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm font-mono">{address}</span>
                          <Button
                            type="button"
                            onClick={() => removeWhitelistAddress(address)}
                            variant="ghost"
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Duration Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900">Duration Configuration</h3>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationType">Duration Type *</Label>
                <Select value={formData.durationType} onValueChange={(value) => handleInputChange('durationType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Preset Hours</SelectItem>
                    <SelectItem value="custom">Custom Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.durationType === 'hours' && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Contract Duration (Hours) *</Label>
                  <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Hour</SelectItem>
                      <SelectItem value="6">6 Hours</SelectItem>
                      <SelectItem value="12">12 Hours</SelectItem>
                      <SelectItem value="24">24 Hours (1 Day)</SelectItem>
                      <SelectItem value="48">48 Hours (2 Days)</SelectItem>
                      <SelectItem value="72">72 Hours (3 Days)</SelectItem>
                      <SelectItem value="168">168 Hours (1 Week)</SelectItem>
                      <SelectItem value="336">336 Hours (2 Weeks)</SelectItem>
                      <SelectItem value="720">720 Hours (1 Month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.durationType === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="customDuration">Custom Duration (Hours) *</Label>
                  <Input
                    id="customDuration"
                    type="number"
                    min="1"
                    max="8760"
                    placeholder="Enter hours (e.g., 48)"
                    value={formData.customDuration}
                    onChange={(e) => handleInputChange('customDuration', e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">Minimum 1 hour, maximum 8760 hours (1 year)</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500">Leave empty to start immediately</p>
              </div>
            </div>
          </div>

          {formData.insuranceFee && parseFloat(formData.insuranceFee) > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-blue-900">Fee Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-blue-700">Service Fee (10% + 0.01):</span>
                <span className="font-medium text-blue-900">{serviceFee} {formData.reserveToken}</span>
                <span className="text-blue-700">Your Earning:</span>
                <span className="font-medium text-blue-900">{totalEarning} {formData.reserveToken}</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isCreating || !account}
          >
            {isCreating ? 'Creating Contract...' : !account ? 'Connect Wallet First' : 'Create Contract'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContractCreationForm;
