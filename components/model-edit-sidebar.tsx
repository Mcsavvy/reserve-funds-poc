'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { SimulationParams } from '@/lib/simulation';
import { ModelSchema } from '@/lib/db-schemas';

// Form schema (omit auto-generated fields)
const FormSchema = ModelSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

type FormData = z.infer<typeof FormSchema>;

interface ModelEditSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: SimulationParams;
  onSave: (model: SimulationParams) => void;
}

export function ModelEditSidebar({ open, onOpenChange, model, onSave }: ModelEditSidebarProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });

  // Reset form when model changes
  useEffect(() => {
    if (model) {
      form.reset(model);
    }
  }, [model, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save model:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset(model);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit Model Parameters</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 p-4">
            {/* Model Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Study Period */}
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Period (years)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fiscal Year */}
              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Housing Units */}
              <FormField
                control={form.control}
                name="housingUnits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Housing Units</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Starting Amount */}
              <FormField
                control={form.control}
                name="startingAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Monthly Reserve Fees */}
              <FormField
                control={form.control}
                name="monthlyReserveFeesPerHousingUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Fees per Unit ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumCollectionFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Collection Fee ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Inflation Rate */}
              <FormField
                control={form.control}
                name="inflationRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inflation Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Maximum Allowable Fee Increase */}
              <FormField
                control={form.control}
                name="maximumAllowableFeeIncrease"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Fee Increase (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bank Interest Rate */}
              <FormField
                control={form.control}
                name="bankInterestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Safety Net Percentage */}
              <FormField
                control={form.control}
                name="safetyNetPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Safety Net (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cash Reserve Threshold */}
              <FormField
                control={form.control}
                name="cashReserveThresholdPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash Reserve Threshold (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Large Expense Baseline */}
              <FormField
                control={form.control}
                name="largeExpenseBaseline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Large Expense Baseline ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Loan Threshold Percentage */}
              <FormField
                control={form.control}
                name="loanThresholdPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Threshold (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Loan Tenure Years */}
              <FormField
                control={form.control}
                name="loanTenureYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Tenure (years)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Loan Interest Rate */}
              <FormField
                control={form.control}
                name="loanInterestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Applying...' : 'Apply Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
