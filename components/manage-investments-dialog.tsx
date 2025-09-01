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
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { useInvestments } from '@/hooks/use-database';
import { Model, Investment, InvestmentSchema } from '@/lib/db-schemas';
import { formatCurrency, formatPercentage } from '@/lib/db-utils';

// Form schema (omit auto-generated fields)
const FormSchema = InvestmentSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

type FormData = z.infer<typeof FormSchema>;

interface ManageInvestmentsDialogProps {
  model: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNewModel?: boolean;
}

export function ManageInvestmentsDialog({ 
  model, 
  open, 
  onOpenChange, 
  isNewModel = false 
}: ManageInvestmentsDialogProps) {
  const { investments, createInvestment, updateInvestment, deleteInvestment } = useInvestments(model.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      modelId: model.id,
      investmentType: 'CD',
      strategyName: '',
      amountInvested: 10000,
      yearStarted: model.fiscalYear,
      annualInterestRate: 3.5,
      terms: 5,
      note: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      // Validate that year started is on or before fiscal year
      if (data.yearStarted > model.fiscalYear) {
        form.setError('yearStarted', {
          type: 'manual',
          message: 'Investment year must be on or before the model\'s fiscal year'
        });
        return;
      }

      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, data);
        setEditingInvestment(null);
      } else {
        await createInvestment(data);
      }
      form.reset({
        modelId: model.id,
        investmentType: 'CD',
        strategyName: '',
        amountInvested: 10000,
        yearStarted: model.fiscalYear,
        annualInterestRate: 3.5,
        terms: 5,
        note: '',
      });
    } catch (error) {
      console.error('Failed to save investment:', error);
      alert('Failed to save investment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment);
    form.reset({
      modelId: investment.modelId,
      investmentType: investment.investmentType,
      strategyName: investment.strategyName || '',
      amountInvested: investment.amountInvested,
      yearStarted: investment.yearStarted,
      annualInterestRate: investment.annualInterestRate,
      terms: investment.terms,
      note: investment.note || '',
    });
  };

  const handleDeleteInvestment = async (investment: Investment) => {
    if (confirm(`Are you sure you want to delete this ${investment.investmentType} investment?`)) {
      try {
        await deleteInvestment(investment.id);
      } catch (error) {
        console.error('Failed to delete investment:', error);
        alert('Failed to delete investment. Please try again.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingInvestment(null);
    form.reset({
      modelId: model.id,
      investmentType: 'CD',
      strategyName: '',
      amountInvested: 10000,
      yearStarted: model.fiscalYear,
      annualInterestRate: 3.5,
      terms: 5,
      note: '',
    });
  };

  const totalInvested = investments.reduce((sum, investment) => sum + investment.amountInvested, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogDescription className="sr-only">
          This tool helps you manage investments for a reserve fund model.
        </DialogDescription>
        <DialogHeader>
          <DialogTitle>
            {isNewModel ? 'Add Investments to New Model' : 'Manage Investments'} - {model.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add/Edit Investment Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {editingInvestment ? 'Edit Investment' : 'Add New Investment'}
              </h3>
              {editingInvestment && (
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel Edit
                </Button>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="amountInvested"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Invested ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(+e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearStarted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Started</FormLabel>
                      <FormControl>
                        <Input type="number" max={model.fiscalYear} {...field} onChange={e => field.onChange(+e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="annualInterestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Interest Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} onChange={e => field.onChange(+e.target.value)} />
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
                          <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
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

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting 
                    ? (editingInvestment ? 'Updating...' : 'Adding...') 
                    : (editingInvestment ? 'Update Investment' : 'Add Investment')
                  }
                </Button>
              </form>
            </Form>

            {isNewModel && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Getting Started:</strong> Add investments for this reserve fund model. 
                  You can always add more investments later by clicking the "Manage Investments" 
                  button in the table.
                </p>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p><strong>Year Started:</strong> Must be on or before fiscal year {model.fiscalYear}</p>
              <p><strong>Terms:</strong> Number of years until the investment matures</p>
              <p><strong>Note:</strong> Investments cannot be liquidated early</p>
            </div>
          </div>

          {/* Investments List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Current Investments</h3>
              <div className="text-sm text-gray-600">
                Total: <span className="font-medium">{formatCurrency(totalInvested)}</span>
              </div>
            </div>

            {investments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No investments added yet</p>
                <p className="text-sm">Add your first investment using the form</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {investments.map((investment) => (
                  <div
                    key={investment.id}
                    className={`p-3 border rounded-lg ${
                      editingInvestment?.id === investment.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">
                            {investment.strategyName || `${investment.investmentType} Investment`}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {investment.investmentType}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Amount: {formatCurrency(investment.amountInvested)} | 
                          Rate: {formatPercentage(investment.annualInterestRate)} | 
                          Terms: {investment.terms} years | 
                          Started: {investment.yearStarted}
                        </p>
                        {investment.note && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {investment.note}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditInvestment(investment)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvestment(investment)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isNewModel ? 'Finish & Close' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
