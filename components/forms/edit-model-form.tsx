'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Model, Association } from '@/lib/db-types';
import { useLtimStrategies } from '@/hooks/use-database';


export function EditModelForm({ model, associations, onSuccess, onUpdate }: { 
  model: Model; 
  associations: Association[]; 
  onSuccess: () => void; 
  onUpdate: (model: Model) => Promise<any> 
}) {
  const { items: ltimStrategies, loading: strategiesLoading } = useLtimStrategies();

  const [formData, setFormData] = useState({
    name: model.name,
    client_id: model.client_id,
    housing: model.housing,
    starting_amount: model.starting_amount,
    inflation_rate: model.inflation_rate,
    monthly_fees: model.monthly_fees,
    monthly_fees_rate: model.monthly_fees_rate,
    cushion_fund: model.cushion_fund,
    period: model.period,
    bank_rate: model.bank_rate,
    bank_int_rate: model.bank_int_rate,
    loan_years: model.loan_years,
    fiscal_year: model.fiscal_year,
    inv_strategy: model.inv_strategy,
    // New financial simulator fields
    immediate_assessment: model.immediate_assessment,
    loan_amount: model.loan_amount,
    liquidated_investment_principal: model.liquidated_investment_principal,
    liquidated_earnings: model.liquidated_earnings,
    yearly_collections: model.yearly_collections,
    total_amount_invested: model.total_amount_invested,
    annual_investment_return_rate: model.annual_investment_return_rate,
    investment_amount_compound: model.investment_amount_compound,
    bank_savings_interest_rate: model.bank_savings_interest_rate,


    loan_term_years: model.loan_term_years,
    annual_loan_interest_rate: model.annual_loan_interest_rate,
    
    // LTIM Strategy Settings
    ltim_enabled: model.ltim_enabled,
    ltim_strategy_id: model.ltim_strategy_id || 'none',
    ltim_percentage: model.ltim_percentage,
    ltim_start_year: model.ltim_start_year,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...model,
        ...formData,
        updated_at: Date.now(),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Financial Model</DialogTitle>
        <DialogDescription>Update financial planning simulation model settings.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        {/* Basic Information */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-model-name">Model Name *</Label>
              <Input
                id="edit-model-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-model-client_id">Association *</Label>
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
              <Label htmlFor="edit-model-fiscal_year">Fiscal Year</Label>
              <Input
                id="edit-model-fiscal_year"
                value={formData.fiscal_year}
                onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-model-period">Simulation Period (Years)</Label>
              <Input
                id="edit-model-period"
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
        <Tabs defaultValue="funding" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mt-6">
            <TabsTrigger value="funding">Funding</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="ltim">LTIM</TabsTrigger>
          </TabsList>

          {/* Funding Sources Tab */}
          <TabsContent value="funding" className="space-y-3 mt-6">
            <h4 className="font-medium text-lg text-center underline">Funding Sources</h4>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <Label htmlFor="edit-starting_amount">Starting Amount ($)</Label>
                <Input
                  id="edit-starting_amount"
                  type="number"
                  min="0"
                  value={formData.starting_amount}
                  onChange={(e) => setFormData({ ...formData, starting_amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-immediate_assessment">Immediate Assessment ($)</Label>
                <Input
                  id="edit-immediate_assessment"
                  type="number"
                  min="0"
                  value={formData.immediate_assessment}
                  onChange={(e) => setFormData({ ...formData, immediate_assessment: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-loan_amount">Loan Amount ($)</Label>
                <Input
                  id="edit-loan_amount"
                  type="number"
                  min="0"
                  value={formData.loan_amount}
                  onChange={(e) => setFormData({ ...formData, loan_amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-liquidated_investment_principal">Liquidated Investment Principal ($)</Label>
                <Input
                  id="edit-liquidated_investment_principal"
                  type="number"
                  min="0"
                  value={formData.liquidated_investment_principal}
                  onChange={(e) => setFormData({ ...formData, liquidated_investment_principal: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-liquidated_earnings">Liquidated Earnings ($)</Label>
                <Input
                  id="edit-liquidated_earnings"
                  type="number"
                  min="0"
                  value={formData.liquidated_earnings}
                  onChange={(e) => setFormData({ ...formData, liquidated_earnings: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-yearly_collections">Yearly Collections ($)</Label>
                <Input
                  id="edit-yearly_collections"
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
                <Label htmlFor="edit-total_amount_invested">Total Amount Invested ($)</Label>
                <Input
                  id="edit-total_amount_invested"
                  type="number"
                  min="0"
                  value={formData.total_amount_invested}
                  onChange={(e) => setFormData({ ...formData, total_amount_invested: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-investment_amount_compound">Investment Amount for Compound ($)</Label>
                <Input
                  id="edit-investment_amount_compound"
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
                <Label htmlFor="edit-annual_investment_return_rate">Annual Investment Return Rate (%)</Label>
                <Input
                  id="edit-annual_investment_return_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.annual_investment_return_rate}
                  onChange={(e) => setFormData({ ...formData, annual_investment_return_rate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-bank_savings_interest_rate">Bank Savings Interest Rate (%)</Label>
                <Input
                  id="edit-bank_savings_interest_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={formData.bank_savings_interest_rate}
                  onChange={(e) => setFormData({ ...formData, bank_savings_interest_rate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-inflation_rate">Inflation Rate (%)</Label>
                <Input
                  id="edit-inflation_rate"
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
                <Label htmlFor="edit-loan_term_years">Loan Term (Years)</Label>
                <Input
                  id="edit-loan_term_years"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.loan_term_years}
                  onChange={(e) => setFormData({ ...formData, loan_term_years: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-annual_loan_interest_rate">Annual Loan Interest Rate (%)</Label>
                <Input
                  id="edit-annual_loan_interest_rate"
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
                <Label htmlFor="edit-ltim_enabled">Enable LTIM</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-ltim_enabled"
                    checked={formData.ltim_enabled}
                    onChange={(e) => setFormData({ ...formData, ltim_enabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-ltim_enabled" className="text-sm text-gray-600">
                    Enable Long-Term Investment Management strategy
                  </Label>
                </div>
              </div>

              {formData.ltim_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ltim_strategy_id">LTIM Strategy</Label>
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
                    <Label htmlFor="edit-ltim_percentage">LTIM Allocation Percentage (%)</Label>
                    <Input
                      id="edit-ltim_percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.ltim_percentage}
                      onChange={(e) => setFormData({ ...formData, ltim_percentage: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-ltim_start_year">LTIM Start Year</Label>
                    <Input
                      id="edit-ltim_start_year"
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
          <Label htmlFor="edit-model-inv_strategy">Investment Strategy</Label>
          <Textarea
            id="edit-model-inv_strategy"
            value={formData.inv_strategy}
            onChange={(e) => setFormData({ ...formData, inv_strategy: e.target.value })}
            placeholder="Describe the investment strategy for this financial plan..."
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full">
          Update Financial Model
        </Button>
      </form>
    </>
  );
}
