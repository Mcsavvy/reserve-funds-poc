'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useModels } from '@/hooks/use-database';
import { Model, ModelSchema } from '@/lib/db-schemas';

// Form schema (omit auto-generated fields)
const FormSchema = ModelSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

type FormData = z.infer<typeof FormSchema>;

interface EditModelDialogProps {
  model: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditModelDialog({ model, open, onOpenChange }: EditModelDialogProps) {
  const { updateModel } = useModels();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
  });

  // Reset form when model changes
  useEffect(() => {
    if (model) {
      form.reset({
        name: model.name,
        period: model.period,
        housingUnits: model.housingUnits,
        startingAmount: model.startingAmount,
        fiscalYear: model.fiscalYear,
        monthlyReserveFeesPerHousingUnit: model.monthlyReserveFeesPerHousingUnit,
        inflationRate: model.inflationRate,
        maximumAllowableFeeIncrease: model.maximumAllowableFeeIncrease,
        bankInterestRate: model.bankInterestRate,
        safetyNetPercentage: model.safetyNetPercentage,
        cashReserveThresholdPercentage: model.cashReserveThresholdPercentage,
      });
    }
  }, [model, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      await updateModel(model.id, data);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update model:', error);
      alert('Failed to update model. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Reserve Fund Model</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Model Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Model Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter model name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Period */}
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
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Model'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
