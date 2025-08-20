'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Association } from '@/lib/db-types';
import { useLtimStrategies } from '@/hooks/use-database';


export function AddModelForm({ associations, onSuccess, onAdd }: { 
  associations: Association[]; 
  onSuccess: () => void; 
  onAdd: (model: any) => Promise<any> 
}) {
  const { items: ltimStrategies, loading: strategiesLoading } = useLtimStrategies();

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    housing: 1,
    starting_amount: 100000,
    inflation_rate: 3.0,
    monthly_fees: 0,
    monthly_fees_rate: 0,
    cushion_fund: 0,
    period: 30,
    bank_rate: 2.0,
    bank_int_rate: 2.0,
    loan_years: 10,
    fiscal_year: new Date().getFullYear().toString(),
    inv_strategy: '',
    // New financial simulator fields
    immediate_assessment: 5000,
    loan_amount: 50000,
    liquidated_investment_principal: 10000,
    liquidated_earnings: 1000,
    yearly_collections: 20000,
    total_amount_invested: 30000,
    annual_investment_return_rate: 5.0,
    investment_amount_compound: 25000,
    bank_savings_interest_rate: 2.0,


    loan_term_years: 10,
    annual_loan_interest_rate: 6.0,
    
    // LTIM Strategy Settings
    ltim_enabled: false,
    ltim_strategy_id: '',
    ltim_percentage: 50,
    ltim_start_year: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAdd({
        ...formData,
        active: true,
        updated_at: Date.now(),
        created_at: Date.now(),
      });
      onSuccess();
      setFormData({
        name: '',
        client_id: '',
        housing: 1,
        starting_amount: 100000,
        inflation_rate: 3.0,
        monthly_fees: 0,
        monthly_fees_rate: 0,
        cushion_fund: 0,
        period: 30,
        bank_rate: 2.0,
        bank_int_rate: 2.0,
        loan_years: 10,
        fiscal_year: new Date().getFullYear().toString(),
        inv_strategy: '',
        // New financial simulator fields
        immediate_assessment: 5000,
        loan_amount: 50000,
        liquidated_investment_principal: 10000,
        liquidated_earnings: 1000,
        yearly_collections: 20000,
        total_amount_invested: 30000,
        annual_investment_return_rate: 5.0,
        investment_amount_compound: 25000,
        bank_savings_interest_rate: 2.0,
    
        loan_term_years: 10,
        annual_loan_interest_rate: 6.0,
        
        // LTIM Strategy Settings
        ltim_enabled: false,
        ltim_strategy_id: 'none',
        ltim_percentage: 50,
        ltim_start_year: 0,
      });
    } catch (error) {
      console.error('Failed to add model:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Financial Model</DialogTitle>
        <DialogDescription>Set up a new financial planning simulation model.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        {/* Basic Information */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Model Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="client_id">Association *</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an association" />
                </SelectTrigger>
                <SelectContent>
                  {associations.map((association) => (
                    <SelectItem key={association.id} value={association.id}>
                      {association.association}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="fiscal_year">Fiscal Year</Label>
              <Input
                id="fiscal_year"
                value={formData.fiscal_year}
                onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period">Simulation Period (Years)</Label>
              <Input
                id="period"
                type="number"
                min="1"
                max="50"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Tabbed Interface for Financial Fields */}
        <Tabs defaultValue="funding" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="funding">Funding</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="ltim">LTIM</TabsTrigger>
          </TabsList>

          {/* Funding Sources Tab */}
          <TabsContent value="funding" className="space-y-6 mt-6">
            <h4 className="font-medium text-lg text-center underline">Funding Sources</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="starting_amount">Starting Amount ($)</Label>
                <Input
                  id="starting_amount"
                  type="number"
                  min="0"
                  value={formData.starting_amount}
                  onChange={(e) => setFormData({ ...formData, starting_amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="immediate_assessment">Immediate Assessment ($)</Label>
                <Input
                  id="immediate_assessment"
                  type="number"
                  min="0"
                  value={formData.immediate_assessment}
                  onChange={(e) => setFormData({ ...formData, immediate_assessment: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="loan_amount">Loan Amount ($)</Label>
                <Input
                  id="loan_amount"
                  type="number"
                  min="0"
                  value={formData.loan_amount}
                  onChange={(e) => setFormData({ ...formData, loan_amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="liquidated_investment_principal">Liquidated Investment Principal ($)</Label>
                <Input
                  id="liquidated_investment_principal"
                  type="number"
                  min="0"
                  value={formData.liquidated_investment_principal}
                  onChange={(e) => setFormData({ ...formData, liquidated_investment_principal: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="liquidated_earnings">Liquidated Earnings ($)</Label>
                <Input
                  id="liquidated_earnings"
                  type="number"
                  min="0"
                  value={formData.liquidated_earnings}
                  onChange={(e) => setFormData({ ...formData, liquidated_earnings: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="yearly_collections">Yearly Collections ($)</Label>
                <Input
                  id="yearly_collections"
                  type="number"
                  min="0"
                  value={formData.yearly_collections}
                  onChange={(e) => setFormData({ ...formData, yearly_collections: Number(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Investment Allocations Tab */}
          <TabsContent value="allocations" className="space-y-3 mt-6">
            <h4 className="font-medium text-lg text-center underline">Investment Allocations</h4>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <Label htmlFor="total_amount_invested">Total Amount Invested ($)</Label>
                <Input
                  id="total_amount_invested"
                  type="number"
                  min="0"
                  value={formData.total_amount_invested}
                  onChange={(e) => setFormData({ ...formData, total_amount_invested: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="investment_amount_compound">Investment Amount for Compound ($)</Label>
                <Input
                  id="investment_amount_compound"
                  type="number"
                  min="0"
                  value={formData.investment_amount_compound}
                  onChange={(e) => setFormData({ ...formData, investment_amount_compound: Number(e.target.value) })}
                />
              </div>


            </div>
          </TabsContent>

          {/* Rates & Returns Tab */}
          <TabsContent value="rates" className="space-y-3 mt-6">
            <h4 className="font-medium text-lg text-center underline">Rates & Returns</h4>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <Label htmlFor="annual_investment_return_rate">Annual Investment Return Rate (%)</Label>
                <Input
                  id="annual_investment_return_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.annual_investment_return_rate}
                  onChange={(e) => setFormData({ ...formData, annual_investment_return_rate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bank_savings_interest_rate">Bank Savings Interest Rate (%)</Label>
                <Input
                  id="bank_savings_interest_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={formData.bank_savings_interest_rate}
                  onChange={(e) => setFormData({ ...formData, bank_savings_interest_rate: Number(e.target.value) })}
                />
              </div>



              <div className="space-y-1">
                <Label htmlFor="inflation_rate">Inflation Rate (%)</Label>
                <Input
                  id="inflation_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={formData.inflation_rate}
                  onChange={(e) => setFormData({ ...formData, inflation_rate: Number(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Loans Tab */}
          <TabsContent value="loans" className="space-y-3 mt-6">
            <h4 className="font-medium text-lg text-center underline">Loans</h4>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <Label htmlFor="loan_term_years">Loan Term (Years)</Label>
                <Input
                  id="loan_term_years"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.loan_term_years}
                  onChange={(e) => setFormData({ ...formData, loan_term_years: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="annual_loan_interest_rate">Annual Loan Interest Rate (%)</Label>
                <Input
                  id="annual_loan_interest_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.annual_loan_interest_rate}
                  onChange={(e) => setFormData({ ...formData, annual_loan_interest_rate: Number(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          {/* LTIM Tab */}
          <TabsContent value="ltim" className="space-y-4 mt-6">
            <h4 className="font-medium text-lg text-center underline">LTIM Strategy Settings</h4>
            
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="ltim_enabled">Enable LTIM</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ltim_enabled"
                    checked={formData.ltim_enabled}
                    onChange={(e) => setFormData({ ...formData, ltim_enabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="ltim_enabled" className="text-sm text-gray-600">
                    Enable Long-Term Investment Management strategy
                  </Label>
                </div>
              </div>

              {formData.ltim_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ltim_strategy_id">LTIM Strategy</Label>
                    <Select 
                      value={formData.ltim_strategy_id} 
                      onValueChange={(value) => setFormData({ ...formData, ltim_strategy_id: value })}
                      disabled={strategiesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={strategiesLoading ? "Loading strategies..." : "Select a strategy"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Strategy Selected</SelectItem>
                        {ltimStrategies.filter(s => s.active).map((strategy) => (
                          <SelectItem key={strategy.id} value={strategy.id}>
                            {strategy.name} ({strategy.state})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ltim_percentage">LTIM Allocation Percentage (%)</Label>
                    <Input
                      id="ltim_percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.ltim_percentage}
                      onChange={(e) => setFormData({ ...formData, ltim_percentage: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ltim_start_year">LTIM Start Year</Label>
                    <Input
                      id="ltim_start_year"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.ltim_start_year}
                      onChange={(e) => setFormData({ ...formData, ltim_start_year: Number(e.target.value) })}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-1">
          <Label htmlFor="inv_strategy">Investment Strategy</Label>
          <Textarea
            id="inv_strategy"
            value={formData.inv_strategy}
            onChange={(e) => setFormData({ ...formData, inv_strategy: e.target.value })}
            placeholder="Describe the investment strategy for this financial plan..."
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" disabled={!formData.client_id}>
          Create Financial Model
        </Button>
      </form>
    </>
  );
}
