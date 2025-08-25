'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CalendarDays, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Edit } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

// Schema for year-specific adjustments
const YearAdjustmentSchema = z.object({
  openingBalance: z.number(),
  collections: z.number().min(0, 'Collections cannot be negative'),
  expenses: z.number().min(0, 'Expenses cannot be negative'),
  safetyNet: z.number().min(0, 'Safety net cannot be negative'),
});

type YearAdjustmentData = z.infer<typeof YearAdjustmentSchema>;

interface YearDetailSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yearProjection: YearProjection;
  model: SimulationParams;
  onYearAdjustment: (year: number, adjustments: YearAdjustmentData) => void;
}

export function YearDetailSidebar({ 
  open, 
  onOpenChange, 
  yearProjection, 
  model,
  onYearAdjustment 
}: YearDetailSidebarProps) {

  const form = useForm<YearAdjustmentData>({
    resolver: zodResolver(YearAdjustmentSchema),
    defaultValues: {
      openingBalance: yearProjection.openingBalance,
      collections: yearProjection.collections,
      expenses: yearProjection.expenses,
      safetyNet: yearProjection.safetyNet,
    },
  });

  // Reset form when yearProjection changes
  useEffect(() => {
    const defaultValues = {
      openingBalance: yearProjection.openingBalance,
      collections: yearProjection.collections,
      expenses: yearProjection.expenses,
      safetyNet: yearProjection.safetyNet,
    };
    form.reset(defaultValues);
  }, [yearProjection, form]);

  // Watch form values to update adjusted projection
  const watchedValues = form.watch();
  
  // Calculate adjusted projection without causing re-renders
  const adjustedProjection = useMemo(() => {
    const { openingBalance, collections, expenses, safetyNet } = watchedValues;
    const closingBalance = openingBalance + collections - expenses - safetyNet;
    
    return {
      ...yearProjection,
      openingBalance,
      collections,
      expenses,
      safetyNet,
      closingBalance,
    };
  }, [watchedValues, yearProjection]);

  const handleApplyAdjustments = () => {
    onYearAdjustment(yearProjection.year, form.getValues());
  };

  const handleReset = () => {
    const originalValues = {
      openingBalance: yearProjection.openingBalance,
      collections: yearProjection.collections,
      expenses: yearProjection.expenses,
      safetyNet: yearProjection.safetyNet,
    };
    form.reset(originalValues);
  };

  const isNegativeBalance = adjustedProjection.closingBalance < 0;
  const isLowBalance = adjustedProjection.closingBalance < 50000 && adjustedProjection.closingBalance >= 0;
  const hasExpenses = adjustedProjection.expenseDetails.length > 0;
  
  const hasChanges = JSON.stringify(form.getValues()) !== JSON.stringify({
    openingBalance: yearProjection.openingBalance,
    collections: yearProjection.collections,
    expenses: yearProjection.expenses,
    safetyNet: yearProjection.safetyNet,
  });
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <span>Year {yearProjection.year}</span>
            </div>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                Modified
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6 p-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="edit">
              <div className="flex items-center space-x-1">
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Balance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Balance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Opening Balance</p>
                  <p className={`font-bold text-lg ${adjustedProjection.openingBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(adjustedProjection.openingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closing Balance</p>
                  <p className={`font-bold text-lg ${
                    isNegativeBalance ? 'text-red-600' : isLowBalance ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(adjustedProjection.closingBalance)}
                  </p>
                  {isNegativeBalance && (
                    <Badge variant="destructive" className="mt-1">
                      Deficit
                    </Badge>
                  )}
                  {isLowBalance && !isNegativeBalance && (
                    <Badge variant="outline" className="mt-1 text-yellow-600 border-yellow-600">
                      Low Balance
                    </Badge>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Collections</span>
                  <span className="font-medium text-green-600">
                    +{formatCurrency(adjustedProjection.collections)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(adjustedProjection.expenses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Safety Net</span>
                  <span className="font-medium text-orange-600">
                    -{formatCurrency(adjustedProjection.safetyNet)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collections Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Collections</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Housing Units</p>
                  <p className="font-medium">{model.housingUnits?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Fee/Unit</p>
                  <p className="font-medium">
                    {formatCurrency(model.monthlyReserveFeesPerHousingUnit)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inflation Rate</p>
                  <p className="font-medium">{model.inflationRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Years from Base</p>
                  <p className="font-medium">{yearProjection.year - model.fiscalYear}</p>
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Annual Collection</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(adjustedProjection.collections)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Details */}
          {hasExpenses ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span>Scheduled Expenses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adjustedProjection.expenseDetails.map((detail, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{detail.expense.name}</h4>
                        {detail.expense.sirs && (
                          <Badge variant="secondary" className="text-xs">SIRS</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Base Cost</p>
                          <p className="font-medium">{formatCurrency(detail.expense.cost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Inflated Cost</p>
                          <p className="font-medium text-red-600">{formatCurrency(detail.inflatedCost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expected Life</p>
                          <p className="font-medium">{detail.expense.expectedLife} years</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining Life</p>
                          <p className="font-medium">{detail.expense.remainingLife} years</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(adjustedProjection.expenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-gray-400" />
                  <span>Expenses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-4">
                  No scheduled expenses for this year
                </p>
              </CardContent>
            </Card>
          )}

          {/* Safety Net Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Safety Net</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Safety Net Rate</p>
                  <p className="font-medium">{model.safetyNetPercentage}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Applied to Expenses</p>
                  <p className="font-medium">{formatCurrency(adjustedProjection.expenses)}</p>
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Safety Net Amount</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(adjustedProjection.safetyNet)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {(isNegativeBalance || isLowBalance) && (
            <Card className={isNegativeBalance ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${isNegativeBalance ? 'text-red-600' : 'text-yellow-600'}`} />
                  <div>
                    <h4 className={`font-medium ${isNegativeBalance ? 'text-red-800' : 'text-yellow-800'}`}>
                      {isNegativeBalance ? 'Negative Balance Warning' : 'Low Balance Alert'}
                    </h4>
                    <p className={`text-sm ${isNegativeBalance ? 'text-red-700' : 'text-yellow-700'}`}>
                      {isNegativeBalance 
                        ? 'This year shows a deficit. Consider increasing reserve collections or adjusting the schedule of major expenses.'
                        : 'Balance is below the recommended threshold. Monitor cash flow carefully.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>

          <TabsContent value="edit" className="space-y-6 mt-6">
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
                        name="collections"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Collections ($)</FormLabel>
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
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      <p className="font-medium">Calculated Closing Balance:</p>
                      <p className={`text-lg font-bold ${adjustedProjection.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(adjustedProjection.closingBalance)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Opening Balance + Collections - Expenses - Safety Net
                      </p>
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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
