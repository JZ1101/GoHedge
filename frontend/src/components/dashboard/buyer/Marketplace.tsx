import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, ArrowUpDown, TrendingUp } from 'lucide-react';
import ContractDetailsModal from './ContractDetailsModal';
import { useGoHedgeContract } from '../../../utils/sdk/index.js';
import { usePrice } from '../../../hooks/usePrice';
import { MarketplaceContract } from '../../../types/contract';

const TOKEN_LIST = ["AVAX", "BTC", "ETH", "SOL"];

const Marketplace = () => {
  const { contracts: sdkContracts, loading, error: sdkError, refetch } = useGoHedgeContract();
  const { prices } = usePrice();
  const [contracts, setContracts] = useState<MarketplaceContract[]>([]);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'trigger_price' | 'expires_in_days'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [showArbitrageOnly, setShowArbitrageOnly] = useState(false);

  const [filters, setFilters] = useState({
    reserve_token: '',
    min_price: '',
    max_price: '',
    min_trigger_price: '',
    max_trigger_price: '',
    expiration: ''
  });

  const [selectedContract, setSelectedContract] = useState<MarketplaceContract | null>(null);

  // Convert SDK contracts to marketplace contracts
  useEffect(() => {
    console.log('🔄 Processing SDK contracts:', sdkContracts);
    
    if (sdkContracts && Array.isArray(sdkContracts)) {
      // Get current AVAX price from the price hook
      const currentAvaxPrice = prices.AVAX?.usd || 45.00;
      
      const marketplaceContracts = sdkContracts.map((contract: any) => ({
        id: contract.id,
        trigger_token: 'AVAX',
        trigger_price: parseFloat(contract.triggerPrice) || 0,
        current_price: currentAvaxPrice.toString(),
        reserve_token: 'AVAX',
        reserve_amount: parseFloat(contract.reserveAmount) || 0,
        insurance_fee: parseFloat(contract.insuranceFee) || 0,
        total_cost: (parseFloat(contract.insuranceFee) || 0).toString(),
        expires_in_days: Math.max(0, Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        expires_at: contract.endDate,
        seller: contract.seller,
        buyer: contract.buyer,
        status: contract.status || 'available',
        isAvailable: contract.isAvailable !== false
      }));
      
      console.log('🎯 Converted marketplace contracts with real AVAX price:', marketplaceContracts);
      setContracts(marketplaceContracts);
    } else {
      console.log('❌ No valid contracts received');
      setContracts([]);
    }
  }, [sdkContracts, prices.AVAX?.usd]);

  // Set error from SDK
  useEffect(() => {
    if (sdkError) {
      setError(sdkError);
    }
  }, [sdkError]);

  const fetchContracts = async () => {
    setError('');
    console.log('🔄 Refetching contracts...');
    await refetch();
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSort = (field: 'price' | 'trigger_price' | 'expires_in_days') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Fixed arbitrage opportunity logic
  const isArbitrageOpportunity = (contract: MarketplaceContract) => {
    const currentPrice = parseFloat(contract.current_price);
    const triggerPrice = contract.trigger_price;
    
    // An arbitrage opportunity exists when:
    // 1. Trigger price is higher than current price (immediate profit potential)
    // 2. OR trigger price is very close to current price (within 10% below)
    const isHigherTrigger = triggerPrice > currentPrice;
    const isCloseTrigger = triggerPrice >= (currentPrice * 0.9) && triggerPrice <= currentPrice;
    
    return (isHigherTrigger || isCloseTrigger) && contract.isAvailable && !contract.buyer;
  };

  const getFilteredAndSortedContracts = () => {
    let filteredContracts = contracts;

    // Filter by availability
    if (showOnlyAvailable) {
      filteredContracts = filteredContracts.filter(c => c.isAvailable && !c.buyer);
    }

    // Filter by arbitrage opportunities
    if (showArbitrageOnly) {
      filteredContracts = filteredContracts.filter(c => isArbitrageOpportunity(c));
    }

    // Apply other filters
    if (filters.reserve_token && filters.reserve_token !== 'all') {
      filteredContracts = filteredContracts.filter(c => c.reserve_token === filters.reserve_token);
    }

    if (filters.min_price) {
      filteredContracts = filteredContracts.filter(c => c.insurance_fee >= parseFloat(filters.min_price));
    }

    if (filters.max_price) {
      filteredContracts = filteredContracts.filter(c => c.insurance_fee <= parseFloat(filters.max_price));
    }

    if (filters.min_trigger_price) {
      filteredContracts = filteredContracts.filter(c => c.trigger_price >= parseFloat(filters.min_trigger_price));
    }

    if (filters.max_trigger_price) {
      filteredContracts = filteredContracts.filter(c => c.trigger_price <= parseFloat(filters.max_trigger_price));
    }

    // Sort contracts
    filteredContracts.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'price':
          aValue = a.insurance_fee;
          bValue = b.insurance_fee;
          break;
        case 'trigger_price':
          aValue = a.trigger_price;
          bValue = b.trigger_price;
          break;
        case 'expires_in_days':
          aValue = a.expires_in_days;
          bValue = b.expires_in_days;
          break;
        default:
          aValue = a.insurance_fee;
          bValue = b.insurance_fee;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filteredContracts;
  };

  const getStatusBadge = (contract: MarketplaceContract) => {
    if (isArbitrageOpportunity(contract)) {
      return <Badge className="bg-yellow-100 text-yellow-800">Arbitrage Opportunity</Badge>;
    }
    if (contract.isAvailable && !contract.buyer) {
      return <Badge className="bg-green-100 text-green-800">Available</Badge>;
    } else if (contract.buyer) {
      return <Badge className="bg-blue-100 text-blue-800">Purchased</Badge>;
    } else if (contract.expires_in_days <= 0) {
      return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">Unavailable</Badge>;
    }
  };

  const displayContracts = getFilteredAndSortedContracts();
  const arbitrageCount = contracts.filter(c => isArbitrageOpportunity(c)).length;

  if (loading && contracts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading marketplace contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Marketplace Filters</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={showOnlyAvailable ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
            >
              {showOnlyAvailable ? "Show All" : "Available Only"}
            </Button>
            <Button onClick={fetchContracts} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Arbitrage Filter */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <div>
                  <Label className="text-sm font-medium">Arbitrage Opportunities Only</Label>
                  <p className="text-xs text-gray-600">Show contracts where trigger price ≤ 115% of current price</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-yellow-700 font-medium">{arbitrageCount} opportunities</span>
                <Switch
                  checked={showArbitrageOnly}
                  onCheckedChange={setShowArbitrageOnly}
                />
              </div>
            </div>

            {/* Existing Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Reserve Token</Label>
                <Select onValueChange={(value) => handleFilterChange('reserve_token', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All tokens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tokens</SelectItem>
                    {TOKEN_LIST.map((token) => (
                      <SelectItem key={token} value={token}>
                        {token}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min Fee</Label>
                <Input
                  placeholder="Min fee"
                  value={filters.min_price}
                  onChange={(e) => handleFilterChange('min_price', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Fee</Label>
                <Input
                  placeholder="Max fee"
                  value={filters.max_price}
                  onChange={(e) => handleFilterChange('max_price', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Min Trigger Price</Label>
                <Input
                  placeholder="Min trigger"
                  value={filters.min_trigger_price}
                  onChange={(e) => handleFilterChange('min_trigger_price', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Trigger Price</Label>
                <Input
                  placeholder="Max trigger"
                  value={filters.max_trigger_price}
                  onChange={(e) => handleFilterChange('max_trigger_price', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select onValueChange={(value) => handleFilterChange('expiration', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All periods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Sort by:</span>
            <Button
              variant={sortBy === 'price' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('price')}
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Fee {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'trigger_price' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('trigger_price')}
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Trigger Price {sortBy === 'trigger_price' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'expires_in_days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('expires_in_days')}
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Expiry {sortBy === 'expires_in_days' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600 text-center">{error}</p>
            <div className="text-center mt-4">
              <Button onClick={fetchContracts}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug info */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            Total contracts loaded: {contracts.length} | 
            Available: {contracts.filter(c => c.isAvailable && !c.buyer).length} | 
            Arbitrage Opportunities: {arbitrageCount} |
            Showing: {displayContracts.length} |
            Loading: {loading ? 'Yes' : 'No'} |
            Current AVAX Price: ${prices.AVAX?.usd || 'Loading...'}
          </p>
        </CardContent>
      </Card>

      {/* Contract Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayContracts.map((contract) => (
          <Card key={contract.id} className={`hover:shadow-lg transition-shadow duration-200 ${isArbitrageOpportunity(contract) ? 'ring-2 ring-yellow-300 bg-yellow-50' : ''}`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold">
                  {contract.trigger_token} Insurance
                </CardTitle>
                {getStatusBadge(contract)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Trigger Price</span>
                <span className="font-semibold">${contract.trigger_price}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Price</span>
                <span className="font-semibold">${parseFloat(contract.current_price).toFixed(2)}</span>
              </div>

              {isArbitrageOpportunity(contract) && (
                <div className="flex items-center justify-between bg-yellow-100 p-2 rounded">
                  <span className="text-sm text-yellow-700 font-medium">Profit Potential</span>
                  <span className="text-sm text-yellow-800 font-bold">
                    {contract.trigger_price > parseFloat(contract.current_price) ? 
                      `+${((contract.trigger_price / parseFloat(contract.current_price) - 1) * 100).toFixed(1)}%` :
                      'Ready to trigger'
                    }
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reserve</span>
                <span className="font-semibold">
                  {contract.reserve_amount} {contract.reserve_token}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Premium</span>
                <span className="font-semibold text-green-600">
                  {contract.insurance_fee} {contract.reserve_token}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expires In</span>
                <span className="font-semibold">
                  {contract.expires_in_days > 0 ? `${contract.expires_in_days} days` : 'Expired'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Seller</span>
                <span className="text-sm font-mono">{contract.seller.slice(0, 6)}...{contract.seller.slice(-4)}</span>
              </div>

              <Button 
                className="w-full mt-4" 
                onClick={() => setSelectedContract(contract)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayContracts.length === 0 && !loading && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              {showArbitrageOnly ? 'No arbitrage opportunities found.' : 
               showOnlyAvailable ? 'No available contracts found.' : 'No contracts found with current filters.'}
            </p>
            <Button onClick={fetchContracts} className="mt-4">
              Refresh Contracts
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </div>
  );
};

export default Marketplace;
