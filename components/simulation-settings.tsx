'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCwIcon, RotateCcwIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react';
import { Model, ModelItem } from '@/lib/db-types';
import { formatCurrency } from '@/lib/financial-simulator';
import { 
  calculateTotalAvailableToInvest, 
  validateInvestmentAllocations 
} from '@/lib/financial-simulator';

export type FinancialSimulatorSettings = {
  projectionYears: number;
  
  // Funding Sources
  starting_amount: number;
  immediate_assessment: number;
  loan_amount: number;
  liquidated_investment_principal: number;
  liquidated_earnings: number;
  yearly_collections: number;
  
  // Investment Allocations
  total_amount_invested: number;
  investment_amount_compound: number;

  // Monthly Fees
  monthly_fees: number;
  maximum_fee_increase: number;
  
  // Rates & Returns
  annual_investment_return_rate: number;
  bank_savings_interest_rate: number;
  ltim_return_rate: number;
  inflation_rate: number;
  
  // Loans
  loan_term_years: number;
  annual_loan_interest_rate: number;
};

interface SimulationSettingsProps {
  model: Model;
  modelItems: ModelItem[];
  settings: FinancialSimulatorSettings;
  onSettingsChange: (settings: FinancialSimulatorSettings) => void;
}

export function SimulationSettings({
  model,
  modelItems,
  settings,
  onSettingsChange,
}: SimulationSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleInputChange = (field: keyof FinancialSimulatorSettings, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleReset = () => {
    const defaultSettings: FinancialSimulatorSettings = {
      projectionYears: model.period || 30,
      
      // Funding Sources (from model)
      starting_amount: model.starting_amount || 0,
      immediate_assessment: model.immediate_assessment || 0,
      loan_amount: model.loan_amount || 0,
      liquidated_investment_principal: model.liquidated_investment_principal || 0,
      liquidated_earnings: model.liquidated_earnings || 0,
      yearly_collections: model.yearly_collections || 0,
      
      // Monthly Fees
      monthly_fees: model.monthly_fees || 0,
      maximum_fee_increase: model.maximum_fee_increase || 0,
      
      // Investment Allocations (from model)
      total_amount_invested: model.total_amount_invested || 0,
      investment_amount_compound: model.investment_amount_compound || 0,

      
      // Rates & Returns (from model)
      annual_investment_return_rate: model.annual_investment_return_rate || 5,
      bank_savings_interest_rate: model.bank_savings_interest_rate || 2,
      ltim_return_rate: model.ltim_return_rate || 4,
      inflation_rate: model.inflation_rate || 3,      
      // Loans (from model)
      loan_term_years: model.loan_term_years || 10,
      annual_loan_interest_rate: model.annual_loan_interest_rate || 6,
    };
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  // Calculate derived values
  const totalAvailableToInvest = calculateTotalAvailableToInvest({
    ...model,
    ...localSettings,
  } as Model);

  const validation = validateInvestmentAllocations({
    ...model,
    ...localSettings,
  } as Model);

  const remainingAfterInvestment = totalAvailableToInvest - localSettings.total_amount_invested;
  const remainingAfterCompound = remainingAfterInvestment - localSettings.investment_amount_compound;

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Financial Simulator Settings</CardTitle>
            <CardDescription>Configure financial planning parameters</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcwIcon className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Alerts */}
        {!validation.isValid && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Info */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Total Available to Invest:</strong> {formatCurrency(totalAvailableToInvest)}
          </AlertDescription>
        </Alert>

        {/* Projection Period */}
        <div className="space-y-2">
          <Label htmlFor="projectionYears">Projection Period (Years)</Label>
          <Input
            id="projectionYears"
            type="number"
            min="1"
            max="50"
            value={localSettings.projectionYears}
            onChange={(e) => handleInputChange('projectionYears', parseInt(e.target.value) || 30)}
          />
          <p className="text-xs text-gray-500">
            Range: 1-50 years
          </p>
        </div>

        <Separator />

        {/* Tabbed Interface for Different Categories */}
        <Tabs defaultValue="funding" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="funding">Funding</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
          </TabsList>

          {/* Funding Sources Tab */}
          <TabsContent value="funding" className="space-y-4">
            <h4 className="font-medium text-sm">Funding Sources</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="starting_amount">Starting Amount ($)</Label>
                <Input
                  id="starting_amount"
                  type="number"
                  min="0"
                  value={localSettings.starting_amount}
                  onChange={(e) => handleInputChange('starting_amount', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="immediate_assessment">Immediate Assessment ($)</Label>
                <Input
                  id="immediate_assessment"
                  type="number"
                  min="0"
                  value={localSettings.immediate_assessment}
                  onChange={(e) => handleInputChange('immediate_assessment', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan_amount">Loan Amount ($)</Label>
                <Input
                  id="loan_amount"
                  type="number"
                  min="0"
                  value={localSettings.loan_amount}
                  onChange={(e) => handleInputChange('loan_amount', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidated_investment_principal">Liquidated Investment Principal ($)</Label>
                <Input
                  id="liquidated_investment_principal"
                  type="number"
                  min="0"
                  value={localSettings.liquidated_investment_principal}
                  onChange={(e) => handleInputChange('liquidated_investment_principal', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="liquidated_earnings">Liquidated Earnings ($)</Label>
                <Input
                  id="liquidated_earnings"
                  type="number"
                  min="0"
                  value={localSettings.liquidated_earnings}
                  onChange={(e) => handleInputChange('liquidated_earnings', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearly_collections">Yearly Collections ($)</Label>
                <Input
                  id="yearly_collections"
                  type="number"
                  min="0"
                  value={localSettings.yearly_collections}
                  onChange={(e) => handleInputChange('yearly_collections', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly_fees">Monthly Fees per Unit ($)</Label>
                <Input
                  id="monthly_fees"
                  type="number"
                  min="0"
                  step="0.01"
                  value={localSettings.monthly_fees}
                  onChange={(e) => handleInputChange('monthly_fees', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maximum_fee_increase">Maximum Fee Increase (%)</Label>
                <Input
                  id="maximum_fee_increase"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={localSettings.maximum_fee_increase}
                  onChange={(e) => handleInputChange('maximum_fee_increase', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Investment Allocations Tab */}
          <TabsContent value="allocations" className="space-y-4">
            <h4 className="font-medium text-sm">Investment Allocations</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="total_amount_invested">Total Amount Invested ($)</Label>
                <Input
                  id="total_amount_invested"
                  type="number"
                  min="0"
                  max={totalAvailableToInvest}
                  value={localSettings.total_amount_invested}
                  onChange={(e) => handleInputChange('total_amount_invested', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500">
                  Max: {formatCurrency(totalAvailableToInvest)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment_amount_compound">Investment Amount for Compound ($)</Label>
                <Input
                  id="investment_amount_compound"
                  type="number"
                  min="0"
                  max={remainingAfterInvestment}
                  value={localSettings.investment_amount_compound}
                  onChange={(e) => handleInputChange('investment_amount_compound', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500">
                  Max: {formatCurrency(Math.max(0, remainingAfterInvestment))} (after investments)
                </p>
              </div>


            </div>
          </TabsContent>

          {/* Rates & Returns Tab */}
          <TabsContent value="rates" className="space-y-4">
            <h4 className="font-medium text-sm">Rates & Returns</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="annual_investment_return_rate">Annual Investment Return Rate (%)</Label>
                <Input
                  id="annual_investment_return_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={localSettings.annual_investment_return_rate}
                  onChange={(e) => handleInputChange('annual_investment_return_rate', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_savings_interest_rate">Bank Savings Interest Rate (%)</Label>
                <Input
                  id="bank_savings_interest_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={localSettings.bank_savings_interest_rate}
                  onChange={(e) => handleInputChange('bank_savings_interest_rate', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ltim_return_rate">LTIM Return Rate (%)</Label>
                <Input
                  id="ltim_return_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={localSettings.ltim_return_rate}
                  onChange={(e) => handleInputChange('ltim_return_rate', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inflation_rate">Inflation Rate (%)</Label>
                <Input
                  id="inflation_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={localSettings.inflation_rate}
                  onChange={(e) => handleInputChange('inflation_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Loans Tab */}
          <TabsContent value="loans" className="space-y-4">
            <h4 className="font-medium text-sm">Loans</h4>
            
            <div className="space-y-3">

              <div className="space-y-2">
                <Label htmlFor="loan_term_years">Loan Term (Years)</Label>
                <Input
                  id="loan_term_years"
                  type="number"
                  min="1"
                  max="50"
                  value={localSettings.loan_term_years}
                  onChange={(e) => handleInputChange('loan_term_years', parseInt(e.target.value) || 10)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual_loan_interest_rate">Annual Loan Interest Rate (%)</Label>
                <Input
                  id="annual_loan_interest_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={localSettings.annual_loan_interest_rate}
                  onChange={(e) => handleInputChange('annual_loan_interest_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
