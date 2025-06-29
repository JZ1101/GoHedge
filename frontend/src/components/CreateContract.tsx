
import React, { useState } from 'react';
import { DollarSign, Clock, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface CreateContractForm {
  reserveAmount: string;
  insuranceFee: string;
  triggerPrice: string;
  duration: string;
  termsAccepted: boolean;
}

interface FormErrors {
  reserveAmount?: string;
  insuranceFee?: string;
  triggerPrice?: string;
  duration?: string;
  termsAccepted?: string;
}

const CreateContract = () => {
  const [formData, setFormData] = useState<CreateContractForm>({
    reserveAmount: '',
    insuranceFee: '',
    triggerPrice: '',
    duration: '',
    termsAccepted: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  const currentPrice = 24.56; // XXXX_PRICE_FEED

  const handleInputChange = (field: keyof CreateContractForm, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.reserveAmount || parseFloat(formData.reserveAmount) <= 0) {
      newErrors.reserveAmount = 'Reserve amount must be greater than 0';
    }

    if (!formData.insuranceFee || parseFloat(formData.insuranceFee) <= 0) {
      newErrors.insuranceFee = 'Insurance fee must be greater than 0';
    }

    if (!formData.triggerPrice || parseFloat(formData.triggerPrice) <= 0) {
      newErrors.triggerPrice = 'Trigger price must be greater than 0';
    }

    if (formData.triggerPrice && parseFloat(formData.triggerPrice) >= currentPrice) {
      newErrors.triggerPrice = 'Trigger price must be below current price';
    }

    if (!formData.duration) {
      newErrors.duration = 'Please select a duration';
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateContract = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      // XXXX_CREATE_CONTRACT
      console.log('Creating contract with data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset form on success
      setFormData({
        reserveAmount: '',
        insuranceFee: '',
        triggerPrice: '',
        duration: '',
        termsAccepted: false
      });
      
      alert('Insurance contract created successfully!');
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const calculatePotentialReturn = () => {
    const reserve = parseFloat(formData.reserveAmount) || 0;
    const fee = parseFloat(formData.insuranceFee) || 0;
    return reserve + fee;
  };

  const calculateReturnPercentage = () => {
    const reserve = parseFloat(formData.reserveAmount) || 0;
    const fee = parseFloat(formData.insuranceFee) || 0;
    if (reserve === 0) return 0;
    return ((fee / reserve) * 100).toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Insurance Contract</h1>
        <p className="text-gray-600 mt-1">Set up a new insurance contract for others to purchase</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Contract Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reserveAmount">Reserve Amount (AVAX)</Label>
                  <Input
                    id="reserveAmount"
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={formData.reserveAmount}
                    onChange={(e) => handleInputChange('reserveAmount', e.target.value)}
                    className={errors.reserveAmount ? 'border-red-500' : ''}
                  />
                  {errors.reserveAmount && (
                    <p className="text-sm text-red-500 flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.reserveAmount}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Amount you'll stake as collateral</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceFee">Insurance Fee (AVAX)</Label>
                  <Input
                    id="insuranceFee"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={formData.insuranceFee}
                    onChange={(e) => handleInputChange('insuranceFee', e.target.value)}
                    className={errors.insuranceFee ? 'border-red-500' : ''}
                  />
                  {errors.insuranceFee && (
                    <p className="text-sm text-red-500 flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.insuranceFee}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Fee buyers will pay for insurance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Parameters Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span>Risk Parameters</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="triggerPrice">Trigger Price (USD)</Label>
                <div className="relative">
                  <Input
                    id="triggerPrice"
                    type="number"
                    step="0.01"
                    placeholder="20.00"
                    value={formData.triggerPrice}
                    onChange={(e) => handleInputChange('triggerPrice', e.target.value)}
                    className={errors.triggerPrice ? 'border-red-500' : ''}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs text-gray-500">Current: ${currentPrice}</span>
                  </div>
                </div>
                {errors.triggerPrice && (
                  <p className="text-sm text-red-500 flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.triggerPrice}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500">Insurance pays out if AVAX drops to this price</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span>Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Contract Duration</Label>
                <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                  <SelectTrigger className={errors.duration ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
                {errors.duration && (
                  <p className="text-sm text-red-500 flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.duration}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500">How long the contract will be active</p>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => handleInputChange('termsAccepted', checked as boolean)}
                  className={errors.termsAccepted ? 'border-red-500' : ''}
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I accept the terms and conditions
                  </Label>
                  <p className="text-xs text-gray-500">
                    By checking this box, you agree to our insurance contract terms.
                    {/* XXXX_TERMS_CHECKBOX */}
                  </p>
                </div>
              </div>
              {errors.termsAccepted && (
                <p className="text-sm text-red-500 flex items-center space-x-1 mt-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.termsAccepted}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Create Button */}
          <Button
            onClick={handleCreateContract}
            disabled={isCreating}
            className="w-full h-12 text-lg"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Contract...
              </>
            ) : (
              'Create Insurance Contract'
            )}
          </Button>
        </div>

        {/* Contract Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contract Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reserve Amount</span>
                  <span className="font-semibold">
                    {formData.reserveAmount || '0'} AVAX
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Insurance Fee</span>
                  <span className="font-semibold text-green-600">
                    {formData.insuranceFee || '0'} AVAX
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Trigger Price</span>
                  <span className="font-semibold">
                    ${formData.triggerPrice || '0'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Duration</span>
                  <span className="font-semibold">
                    {formData.duration ? `${formData.duration} days` : 'Not set'}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Potential Return</span>
                  <span className="font-bold text-blue-600">
                    {calculatePotentialReturn().toFixed(2)} AVAX
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Return Rate</span>
                  <span className="font-bold text-blue-600">
                    {calculateReturnPercentage()}%
                  </span>
                </div>
              </div>

              {formData.reserveAmount && formData.insuranceFee && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-700">
                      <p className="font-medium">Ready to create!</p>
                      <p>Your contract will be available for purchase once created.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateContract;
