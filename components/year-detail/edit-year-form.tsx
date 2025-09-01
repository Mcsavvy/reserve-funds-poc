'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';
import { useEffect } from 'react';

// Schema for year-specific adjustments
const YearAdjustmentSchema = z.object({
  openingBalance: z.number(),
  collections: z.number().min(0, 'Collections cannot be negative'),
  expenses: z.number().min(0, 'Expenses cannot be negative'),
  safetyNet: z.number().min(0, 'Safety net cannot be negative'),
  loansTaken: z.number().min(0, 'Loans taken cannot be negative'),
  loanPayments: z.number().min(0, 'Loan payments cannot be negative'),
  investmentLiquidations: z.number().min(0, 'Investment liquidations cannot be negative'),
  monthlyFee: z.number().min(0, 'Monthly fee cannot be negative'),
});

type YearAdjustmentData = z.infer<typeof YearAdjustmentSchema>;

interface EditYearFormProps {
  yearProjection: YearProjection;
  model: SimulationParams;
  adjustedProjection: YearProjection;
  onYearAdjustment: (year: number, adjustments: YearAdjustmentData) => void;
}

export function EditYearForm({ yearProjection, model, adjustedProjection, onYearAdjustment }: EditYearFormProps) {
  // Calculate the current monthly fee for this year
  const currentMonthlyFee = yearProjection.collections / 12 / (model.housingUnits || 1);

  const form = useForm<YearAdjustmentData>({
    resolver: zodResolver(YearAdjustmentSchema),
    defaultValues: {
      openingBalance: yearProjection.openingBalance,
      collections: yearProjection.collections,
      expenses: yearProjection.expenses,
      safetyNet: yearProjection.safetyNet,
      loansTaken: yearProjection.loansTaken || 0,
      loanPayments: yearProjection.loanPayments || 0,
      investmentLiquidations: yearProjection.investmentLiquidations || 0,
      monthlyFee: currentMonthlyFee,
    },
  });

  // Reset form when yearProjection changes
  useEffect(() => {
    const currentMonthlyFeeForReset = yearProjection.collections / 12 / (model.housingUnits || 1);
    const defaultValues = {
      openingBalance: yearProjection.openingBalance,
      collections: yearProjection.collections,
      expenses: yearProjection.expenses,
      safetyNet: yearProjection.safetyNet,
      loansTaken: yearProjection.loansTaken || 0,
      loanPayments: yearProjection.loanPayments || 0,
      investmentLiquidations: yearProjection.investmentLiquidations || 0,
      monthlyFee: currentMonthlyFeeForReset,
    };
    form.reset(defaultValues);
  }, [yearProjection, form, model.housingUnits]);

  const handleApplyAdjustments = () => {
    onYearAdjustment(yearProjection.year, form.getValues());
  };

  const handleReset = () => {
    const originalValues = {
      openingBalance: yearProjection.openingBalance,
      collections: yearProjection.collections,
      expenses: yearProjection.expenses,
      safetyNet: yearProjection.safetyNet,
      loansTaken: yearProjection.loansTaken || 0,
      loanPayments: yearProjection.loanPayments || 0,
      investmentLiquidations: yearProjection.investmentLiquidations || 0,
      monthlyFee: currentMonthlyFee,
    };
    form.reset(originalValues);
  };

  const hasChanges = JSON.stringify(form.getValues()) !== JSON.stringify({
    openingBalance: yearProjection.openingBalance,
    collections: yearProjection.collections,
    expenses: yearProjection.expenses,
    safetyNet: yearProjection.safetyNet,
    loansTaken: yearProjection.loansTaken || 0,
    loanPayments: yearProjection.loanPayments || 0,
    investmentLiquidations: yearProjection.investmentLiquidations || 0,
    monthlyFee: currentMonthlyFee,
  });

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Current vs Adjusted Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Year Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Original Closing Balance</p>
                <p className={`font-bold ${yearProjection.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(yearProjection.closingBalance)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Adjusted Closing Balance</p>
                <p className={`font-bold ${adjustedProjection.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(adjustedProjection.closingBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Values */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit Year Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance ($)</FormLabel>
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

              <FormField
                control={form.control}
                name="monthlyFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Fee per Unit ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={e => {
                          field.onChange(+e.target.value);
                          // Update collections when monthly fee changes
                          const newCollections = (+e.target.value) * 12 * (model.housingUnits || 1);
                          form.setValue('collections', newCollections);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collections"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Collections ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={e => {
                          field.onChange(+e.target.value);
                          // Update monthly fee when collections change
                          const newMonthlyFee = (+e.target.value) / 12 / (model.housingUnits || 1);
                          form.setValue('monthlyFee', newMonthlyFee);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expenses ($)</FormLabel>
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

              <FormField
                control={form.control}
                name="safetyNet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Safety Net ($)</FormLabel>
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

              <FormField
                control={form.control}
                name="loansTaken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loans Taken ($)</FormLabel>
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

              <FormField
                control={form.control}
                name="loanPayments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Payments ($)</FormLabel>
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

              <FormField
                control={form.control}
                name="investmentLiquidations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Liquidations ($)</FormLabel>
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

            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">Calculated Closing Balance:</p>
              <p className={`text-lg font-bold ${adjustedProjection.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(adjustedProjection.closingBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Opening Balance + Collections + Loans Taken + Investment Liquidations - Expenses - Safety Net - Loan Payments
              </p>
              {model.minimumCollectionFee > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  💡 Minimum collection fee: {formatCurrency(model.minimumCollectionFee)}/month
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Apply Button */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleApplyAdjustments}
            disabled={!hasChanges}
          >
            Apply Changes
          </Button>
        </div>
      </div>
    </Form>
  );
}
