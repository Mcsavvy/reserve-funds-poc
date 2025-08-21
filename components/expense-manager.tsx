'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Expense } from '@/lib/types';
import { formatCurrency } from '@/lib/financial-calculator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const expenseSchema = z.object({
  year: z.number().min(1).max(100),
  amountUsdToday: z.number().min(0),
  type: z.enum(['Large', 'Small']),
  description: z.string().min(1).max(200),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseManagerProps {
  expenses: Expense[];
  onExpensesChange: (expenses: Expense[]) => void;
  maxYear?: number;
}

export function ExpenseManager({ expenses, onExpensesChange, maxYear = 50 }: ExpenseManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      year: 1,
      amountUsdToday: 0,
      type: 'Small',
      description: '',
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    if (editingExpense) {
      // Update existing expense
      const updatedExpenses = expenses.map(expense =>
        expense.id === editingExpense.id
          ? { ...expense, ...data }
          : expense
      );
      onExpensesChange(updatedExpenses);
    } else {
      // Add new expense
      const newExpense: Expense = {
        id: Date.now().toString(),
        ...data,
      };
      onExpensesChange([...expenses, newExpense]);
    }
    
    setIsDialogOpen(false);
    setEditingExpense(null);
    form.reset();
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset(expense);
    setIsDialogOpen(true);
  };

  const handleDelete = (expenseId: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
    onExpensesChange(updatedExpenses);
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    form.reset({
      year: 1,
      amountUsdToday: 0,
      type: 'Small',
      description: '',
    });
    setIsDialogOpen(true);
  };

  // Sort expenses by year for display
  const sortedExpenses = [...expenses].sort((a, b) => a.year - b.year);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Future Expenses</CardTitle>
            <CardDescription>
              Manage planned future expenses that will impact the reserve fund calculations.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </DialogTitle>
                <DialogDescription>
                  {editingExpense 
                    ? 'Update the expense details below.'
                    : 'Enter the details for the new future expense.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            min={1}
                            max={maxYear}
                          />
                        </FormControl>
                        <FormDescription>Year when the expense will occur</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amountUsdToday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (USD Today)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            min={0}
                            step="1000"
                          />
                        </FormControl>
                        <FormDescription>Cost in today's dollars (inflation will be applied)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select expense type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Large">Large (Eligible for loans)</SelectItem>
                            <SelectItem value="Small">Small (Cash only)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Large expenses can be partially financed with loans
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Elevator modernisation"
                            maxLength={200}
                          />
                        </FormControl>
                        <FormDescription>Brief description of the expense</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingExpense ? 'Update' : 'Add'} Expense
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sortedExpenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No expenses planned. Add some future expenses to see their impact on projections.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.year}</TableCell>
                  <TableCell>{formatCurrency(expense.amountUsdToday)}</TableCell>
                  <TableCell>
                    <Badge variant={expense.type === 'Large' ? 'default' : 'secondary'}>
                      {expense.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
