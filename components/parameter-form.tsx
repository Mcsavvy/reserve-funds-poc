'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ModelParameters } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const parameterSchema = z.object({
  horizon: z.number().min(1).max(100),
  baseMaintenance: z.number().min(0),
  inflationRate: z.number().min(0).max(50),
  loanThresholdPercentage: z.number().min(0).max(100),
  loanRate: z.number().min(0).max(50),
  loanTerm: z.number().min(1).max(30),
  safetyNetPercentage: z.number().min(0).max(100),
  openingBalance: z.number(),
  maxFeeIncreasePercentage: z.number().min(0).max(100),
  fiscalYear: z.number().min(2000).max(2100),
});

type ParameterFormData = z.infer<typeof parameterSchema>;

interface ParameterFormProps {
  parameters: ModelParameters;
  onParametersChange: (parameters: ModelParameters) => void;
}

export function ParameterForm({ parameters, onParametersChange }: ParameterFormProps) {
  const form = useForm<ParameterFormData>({
    resolver: zodResolver(parameterSchema),
    defaultValues: parameters,
    mode: 'onChange',
  });

  const onSubmit = (data: ParameterFormData) => {
    onParametersChange(data);
  };

  // Update parameters when form is submitted or when fields lose focus
  const handleFormChange = React.useCallback(() => {
    const currentValues = form.getValues();
    const result = parameterSchema.safeParse(currentValues);
    if (result.success) {
      onParametersChange(currentValues);
    }
  }, [form, onParametersChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Parameters</CardTitle>
        <CardDescription>
          Configure the financial model parameters. Changes will update the projections in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fiscalYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Fiscal Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={2000}
                      max={2100}
                    />
                  </FormControl>
                  <FormDescription>The calendar year when projections begin</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="horizon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projection Horizon (Years)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={1}
                      max={100}
                    />
                  </FormControl>
                  <FormDescription>Number of years to project</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseMaintenance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Maintenance (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={0}
                      step="1000"
                    />
                  </FormControl>
                  <FormDescription>Annual base maintenance cost</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inflationRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inflation Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={0}
                      max={50}
                      step="0.1"
                    />
                  </FormControl>
                  <FormDescription>Annual inflation rate</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loanThresholdPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Threshold (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={0}
                      max={100}
                      step="1"
                    />
                  </FormControl>
                  <FormDescription>Percentage of large expenses covered by loans</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loanRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Interest Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={0}
                      max={50}
                      step="0.1"
                    />
                  </FormControl>
                  <FormDescription>Annual loan interest rate</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="loanTerm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan Term (Years)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={1}
                      max={30}
                    />
                  </FormControl>
                  <FormDescription>Loan repayment period</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="safetyNetPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Safety Net (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={0}
                      max={100}
                      step="1"
                    />
                  </FormControl>
                  <FormDescription>Safety net as percentage of expenses</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      step="1000"
                    />
                  </FormControl>
                  <FormDescription>Starting balance</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxFeeIncreasePercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Annual Fee Increase (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      onBlur={handleFormChange}
                      min={0}
                      max={100}
                      step="1"
                    />
                  </FormControl>
                  <FormDescription>Maximum percentage increase in annual maintenance fees</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
