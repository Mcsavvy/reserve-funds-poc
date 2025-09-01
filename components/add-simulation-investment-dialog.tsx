'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { calculateCompoundInterest, calculateCompoundInterestEarned } from '@/lib/utils';

// Schema for simulation investments (not persisted to database)
const SimulationInvestmentSchema = z.object({
  investmentType: z.enum(['CD', 'T-Bonds']),
  strategyName: z.string().max(200, 'Strategy name must be 200 characters or less').optional(),
  amountType: z.enum(['amount', 'percentage']),
  amount: z.number().min(0, 'Amount must be non-negative').optional(),
  percentage: z.number().min(0, 'Percentage must be non-negative').max(100, 'Percentage must be 100% or less').optional(),
  annualInterestRate: z.number().min(0, 'Annual interest rate must be non-negative').max(100, 'Annual interest rate must be less than 100'),
  terms: z.number().min(1, 'Terms must be at least 1 year').max(50, 'Terms must be 50 years or less'),
  earlyWithdrawalPenaltyDays: z.number().min(0, 'Early withdrawal penalty must be non-negative').optional(),
  earlyWithdrawalMinPenalty: z.number().min(0, 'Early withdrawal minimum penalty must be non-negative').optional(),
  note: z.string().max(500, 'Note must be 500 characters or less').optional(),
}).refine((data) => {
  if (data.amountType === 'amount') {
    return data.amount !== undefined && data.amount > 0;
  } else {
    return data.percentage !== undefined && data.percentage > 0;
  }
}, {
  message: 'Either amount or percentage must be specified',
  path: ['amount'],
});

type SimulationInvestmentData = z.infer<typeof SimulationInvestmentSchema>;

export interface SimulationInvestment extends SimulationInvestmentData {
  id: string;
  year: number;
  amountInvested: number;
  isLiquidated?: boolean;
  liquidationYear?: number;
  liquidatedAmount?: number;
}

interface AddSimulationInvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  availableToInvest: number;
  onAddInvestment: (investment: SimulationInvestment) => void;
}

export function AddSimulationInvestmentDialog({ 
  open, 
  onOpenChange, 
  year,
  availableToInvest,
  onAddInvestment
}: AddSimulationInvestmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SimulationInvestmentData>({
    resolver: zodResolver(SimulationInvestmentSchema),
    defaultValues: {
      investmentType: 'CD',
      strategyName: '',
      amountType: 'percentage',
      amount: 50000,
      percentage: 50,
      annualInterestRate: 5,
      terms: 5,
      earlyWithdrawalPenaltyDays: 0,
      earlyWithdrawalMinPenalty: 0,
      note: '',
    },
  });

  const watchedAmountType = form.watch('amountType');
  const watchedAmount = form.watch('amount');
  const watchedPercentage = form.watch('percentage');

  // Calculate the actual amount to invest
  const calculatedAmount = watchedAmountType === 'amount' 
    ? (watchedAmount || 0)
    : (availableToInvest * (watchedPercentage || 0) / 100);

  const onSubmit = async (data: SimulationInvestmentData) => {
    try {
      setIsSubmitting(true);
      
      const actualAmount = data.amountType === 'amount' 
        ? (data.amount || 0)
        : (availableToInvest * (data.percentage || 0) / 100);

      if (actualAmount > availableToInvest) {
        form.setError('amount', {
          type: 'manual',
          message: `Amount cannot exceed available to invest (${formatCurrency(availableToInvest)})`
        });
        return;
      }

      const investment: SimulationInvestment = {
        id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        year,
        amountInvested: actualAmount,
        investmentType: data.investmentType,
        strategyName: data.strategyName,
        amountType: data.amountType,
        amount: data.amount,
        percentage: data.percentage,
        annualInterestRate: data.annualInterestRate,
        terms: data.terms,
        earlyWithdrawalPenaltyDays: data.earlyWithdrawalPenaltyDays,
        earlyWithdrawalMinPenalty: data.earlyWithdrawalMinPenalty,
        note: data.note,
      };

      onAddInvestment(investment);
      
      form.reset({
        investmentType: 'CD',
        strategyName: '',
        amountType: 'amount',
        amount: 0,
        percentage: 0,
        annualInterestRate: 3.5,
        terms: 5,
        earlyWithdrawalPenaltyDays: 0,
        earlyWithdrawalMinPenalty: 0,
        note: '',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add investment:', error);
      alert('Failed to add investment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogDescription className="sr-only">
          Add a new investment for year {year} during simulation.
        </DialogDescription>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Add Investment for Year {year}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available to Invest Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Available to Invest</h3>
                <p className="text-sm text-blue-700">
                  Starting amount + collections - expenses - loan repayments
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(availableToInvest)}
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="investmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select investment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CD">Certificate of Deposit (CD)</SelectItem>
                          <SelectItem value="T-Bonds">Treasury Bonds (T-Bonds)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strategyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strategy Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Conservative Growth" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select amount type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedAmountType === 'amount' ? (
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Invest ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            onChange={e => field.onChange(+e.target.value)} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage to Invest (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            {...field} 
                            onChange={e => field.onChange(+e.target.value)} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="annualInterestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          onChange={e => field.onChange(+e.target.value)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms (years)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={0}
                          {...field} 
                          onChange={e => field.onChange(+e.target.value)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="earlyWithdrawalPenaltyDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Early Withdrawal Penalty (days of interest)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          {...field} 
                          onChange={e => field.onChange(+e.target.value)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="earlyWithdrawalMinPenalty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Early Withdrawal Minimum Penalty ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          onChange={e => field.onChange(+e.target.value)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about this investment..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Investment Summary */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-900 mb-2">Investment Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Amount to Invest:</p>
                    <p className="font-bold text-green-600">{formatCurrency(calculatedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Maturity Year:</p>
                    <p className="font-bold text-green-600">{year + (form.watch('terms') || 0)}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Expected Return (Compound):</p>
                    <p className="font-bold text-green-600">
                      {formatCurrency(
                        calculateCompoundInterestEarned(calculatedAmount, form.watch('annualInterestRate') || 0, form.watch('terms') || 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700">Total at Maturity:</p>
                    <p className="font-bold text-green-600">
                      {formatCurrency(
                        calculateCompoundInterest(calculatedAmount, form.watch('annualInterestRate') || 0, form.watch('terms') || 0)
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-green-100 rounded text-xs">
                  <p className="text-green-700 font-medium">Compound Interest Calculation</p>
                  <p className="text-green-600">
                    Formula: Principal × (1 + Rate)^Years = {calculatedAmount} × (1 + {(form.watch('annualInterestRate') || 0) / 100})^{(form.watch('terms') || 0)}
                  </p>
                  <p className="text-green-600 mt-1">
                    Result: {formatCurrency(calculateCompoundInterest(calculatedAmount, form.watch('annualInterestRate') || 0, form.watch('terms') || 0))}
                  </p>
                </div>
                <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                  <p className="text-blue-700 font-medium">Interest Comparison</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-blue-600">Simple Interest:</p>
                      <p className="font-medium">{formatCurrency(calculatedAmount * (form.watch('terms') || 0) * (form.watch('annualInterestRate') || 0) / 100)}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Compound Interest:</p>
                      <p className="font-medium">{formatCurrency(calculateCompoundInterestEarned(calculatedAmount, form.watch('annualInterestRate') || 0, form.watch('terms') || 0))}</p>
                    </div>
                  </div>
                  <p className="text-blue-600 mt-1">
                    Difference: +{formatCurrency(
                      calculateCompoundInterestEarned(calculatedAmount, form.watch('annualInterestRate') || 0, form.watch('terms') || 0) - 
                      (calculatedAmount * (form.watch('terms') || 0) * (form.watch('annualInterestRate') || 0) / 100)
                    )}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || calculatedAmount <= 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Adding...' : 'Add Investment'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
