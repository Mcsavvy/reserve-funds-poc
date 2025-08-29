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
import { CalendarDays, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Edit, CreditCard, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

// Schema for year-specific adjustments
const YearAdjustmentSchema = z.object({
  openingBalance: z.number(),
  collections: z.number().min(0, 'Collections cannot be negative'),
  expenses: z.number().min(0, 'Expenses cannot be negative'),
  safetyNet: z.number().min(0, 'Safety net cannot be negative'),
  loansTaken: z.number().min(0, 'Loans taken cannot be negative'),
  loanPayments: z.number().min(0, 'Loan payments cannot be negative'),
  monthlyFee: z.number().min(0, 'Monthly fee cannot be negative'),
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
      monthlyFee: currentMonthlyFeeForReset,
    };
    form.reset(defaultValues);
  }, [yearProjection, form, model.housingUnits]);

  // Watch form values to update adjusted projection
  const watchedValues = form.watch();
  
  // Calculate adjusted projection without causing re-renders
  const adjustedProjection = useMemo(() => {
    const { openingBalance, collections, expenses, safetyNet, loansTaken, loanPayments, monthlyFee } = watchedValues;
    
    // Calculate collections from monthly fee if it was changed
    const calculatedCollections = monthlyFee * 12 * (model.housingUnits || 1);
    const actualCollections = Math.abs(calculatedCollections - collections) < 0.01 ? collections : calculatedCollections;
    
    const closingBalance = openingBalance + actualCollections + loansTaken - expenses - safetyNet - loanPayments;
    
    return {
      ...yearProjection,
      openingBalance,
      collections: actualCollections,
      expenses,
      safetyNet,
      loansTaken,
      loanPayments,
      closingBalance,
    };
  }, [watchedValues, yearProjection, model.housingUnits]);

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
      monthlyFee: currentMonthlyFee,
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
    loansTaken: yearProjection.loansTaken || 0,
    loanPayments: yearProjection.loanPayments || 0,
    monthlyFee: currentMonthlyFee,
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
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loans Taken</span>
                  <span className="font-medium text-blue-600">
                    +{formatCurrency(adjustedProjection.loansTaken || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loan Payments</span>
                  <span className="font-medium text-purple-600">
                    -{formatCurrency(adjustedProjection.loanPayments || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Projected Net Earnings</span>
                  <span className="font-medium text-emerald-600">
                    +{formatCurrency(adjustedProjection.openingBalance * model.bankInterestRate / 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Loss in Purchase Power</span>
                  <span className="font-medium text-amber-600">
                    -{formatCurrency(adjustedProjection.openingBalance * model.inflationRate / 100)}
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
                        {detail.loanAmount > 0 && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Loan Amount</p>
                              <p className="font-medium text-blue-600">{formatCurrency(detail.loanAmount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Out-of-Pocket</p>
                              <p className="font-medium text-orange-600">{formatCurrency(detail.outOfPocketAmount)}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-muted-foreground">Expected Life</p>
                          <p className="font-medium">{detail.expense.expectedLife} years</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining Life</p>
                          <p className="font-medium">{detail.expense.remainingLife} years</p>
                        </div>
                      </div>
                      {detail.loanAmount > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                          <p className="text-blue-700 font-medium">Large Expense - Loan Applied</p>
                          <p className="text-blue-600">Threshold: {model.loanThresholdPercentage}% • Baseline: {formatCurrency(model.largeExpenseBaseline || 0)}</p>
                        </div>
                      )}
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

          {/* Loan Details */}
          {((adjustedProjection.loansTaken || 0) > 0 || (adjustedProjection.loanPayments || 0) > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span>Loan Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(adjustedProjection.loansTaken || 0) > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-700 mb-2">Loans Taken This Year</h4>
                    <div className="text-center bg-blue-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(adjustedProjection.loansTaken || 0)}
                      </p>
                      <div className="text-xs text-blue-600 mt-1">
                        <p>Loan Tenure: {model.loanTenureYears || 10} years</p>
                        <p>Interest Rate: {model.loanInterestRate || 5}%</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {(adjustedProjection.loanPayments || 0) > 0 && (
                  <div>
                    <h4 className="font-medium text-purple-700 mb-2">Loan Payments This Year</h4>
                    <div className="text-center bg-purple-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrency(adjustedProjection.loanPayments || 0)}
                      </p>
                      {adjustedProjection.loanDetails && adjustedProjection.loanDetails.length > 0 && (
                        <div className="text-xs text-purple-600 mt-2 space-y-1">
                          {adjustedProjection.loanDetails.map((loan, index) => (
                            <div key={index} className="flex justify-between">
                              <span>Loan from {loan.year}:</span>
                              <span>{formatCurrency(loan.payment)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

          {/* Financial Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <PiggyBank className="h-5 w-5 text-emerald-600" />
                <span>Financial Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bank Interest Rate</p>
                  <p className="font-medium">{model.bankInterestRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inflation Rate</p>
                  <p className="font-medium">{model.inflationRate}%</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="text-center bg-emerald-50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Projected Net Earnings</p>
                  <p className="text-xl font-bold text-emerald-600">
                    +{formatCurrency(adjustedProjection.openingBalance * model.bankInterestRate / 100)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Potential interest income on opening balance
                  </p>
                </div>
                <div className="text-center bg-amber-50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Loss in Purchase Power</p>
                  <p className="text-xl font-bold text-amber-600">
                    -{formatCurrency(adjustedProjection.openingBalance * model.inflationRate / 100)}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Value lost due to inflation
                  </p>
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net Financial Impact</p>
                <p className={`text-lg font-bold ${
                  (adjustedProjection.openingBalance * model.bankInterestRate / 100) - 
                  (adjustedProjection.openingBalance * model.inflationRate / 100) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(
                    (adjustedProjection.openingBalance * model.bankInterestRate / 100) - 
                    (adjustedProjection.openingBalance * model.inflationRate / 100)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Earnings minus inflation loss
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
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      <p className="font-medium">Calculated Closing Balance:</p>
                      <p className={`text-lg font-bold ${adjustedProjection.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(adjustedProjection.closingBalance)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Opening Balance + Collections + Loans Taken - Expenses - Safety Net - Loan Payments
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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
