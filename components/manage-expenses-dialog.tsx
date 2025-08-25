'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { useExpenses } from '@/hooks/use-database';
import { Model, Expense, ExpenseSchema } from '@/lib/db-schemas';
import { formatCurrency, calculateTotalExpenses } from '@/lib/db-utils';

// Form schema (omit auto-generated fields)
const FormSchema = ExpenseSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

type FormData = z.infer<typeof FormSchema>;

interface ManageExpensesDialogProps {
  model: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNewModel?: boolean;
}

export function ManageExpensesDialog({ 
  model, 
  open, 
  onOpenChange, 
  isNewModel = false 
}: ManageExpensesDialogProps) {
  const { expenses, createExpense, updateExpense, deleteExpense } = useExpenses(model.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      modelId: model.id,
      name: '',
      cost: 5000,
      expectedLife: 25,
      remainingLife: 15,
      sirs: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      if (editingExpense) {
        await updateExpense(editingExpense.id, data);
        setEditingExpense(null);
      } else {
        await createExpense(data);
      }
      form.reset({
        modelId: model.id,
        name: '',
        cost: 5000,
        expectedLife: 25,
        remainingLife: 15,
        sirs: false,
      });
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      modelId: expense.modelId,
      name: expense.name,
      cost: expense.cost,
      expectedLife: expense.expectedLife,
      remainingLife: expense.remainingLife,
      sirs: expense.sirs,
    });
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (confirm(`Are you sure you want to delete "${expense.name}"?`)) {
      try {
        await deleteExpense(expense.id);
      } catch (error) {
        console.error('Failed to delete expense:', error);
        alert('Failed to delete expense. Please try again.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    form.reset({
      modelId: model.id,
      name: '',
      cost: 5000,
      expectedLife: 25,
      remainingLife: 15,
      sirs: false,
    });
  };

  const totalExpenses = calculateTotalExpenses(expenses);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNewModel ? 'Add Expenses to New Model' : 'Manage Expenses'} - {model.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add/Edit Expense Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              {editingExpense && (
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel Edit
                </Button>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Roof Replacement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(+e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expectedLife"
                    render={({ field }) => (
                                          <FormItem>
                      <FormLabel>Expected Life (total years)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remainingLife"
                    render={({ field }) => (
                                          <FormItem>
                      <FormLabel>Remaining Life (years from fiscal year)</FormLabel>
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
                  name="sirs"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          SIRS (Structural Improvement Reserve Study)
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting 
                    ? (editingExpense ? 'Updating...' : 'Adding...') 
                    : (editingExpense ? 'Update Expense' : 'Add Expense')
                  }
                </Button>
              </form>
            </Form>

            {isNewModel && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Getting Started:</strong> Add expenses for this reserve fund model. 
                  You can always add more expenses later by clicking the "Manage Expenses" 
                  button in the table.
                </p>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p><strong>Expected Life:</strong> Total lifespan before renewal is needed</p>
              <p><strong>Remaining Life:</strong> Years left from fiscal year {model.fiscalYear} until renewal</p>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Current Expenses</h3>
              <div className="text-sm text-gray-600">
                Total: <span className="font-medium">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No expenses added yet</p>
                <p className="text-sm">Add your first expense using the form</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className={`p-3 border rounded-lg ${
                      editingExpense?.id === expense.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{expense.name}</h4>
                          {expense.sirs && (
                            <Badge variant="secondary" className="text-xs">SIRS</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Cost: {formatCurrency(expense.cost)} | 
                          Remaining: {expense.remainingLife} years | Expected: {expense.expectedLife} years
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExpense(expense)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense)}
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
