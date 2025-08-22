'use client';

import React, { useState, useMemo } from 'react';
import { ModelParameters, Expense, defaultParameters, defaultExpenses, OptimizationResult } from '@/lib/types';
import { calculateProjections, optimizeFees } from '@/lib/financial-calculator';
import { ParameterForm } from '@/components/parameter-form';
import { ExpenseManager } from '@/components/expense-manager';
import { ProjectionTable } from '@/components/projection-table';
import { ProjectionCharts } from '@/components/projection-charts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, Settings, DollarSign, Zap } from 'lucide-react';

export default function HomePage() {
  const [parameters, setParameters] = useState<ModelParameters>(defaultParameters);
  const [expenses, setExpenses] = useState<Expense[]>(defaultExpenses);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Memoize callbacks to prevent infinite re-renders
  const handleParametersChange = React.useCallback((newParameters: ModelParameters) => {
    setParameters(newParameters);
    // Clear optimization when parameters change
    setOptimizationResult(null);
  }, []);

  const handleExpensesChange = React.useCallback((newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    // Clear optimization when expenses change
    setOptimizationResult(null);
  }, []);

  // Handle fee optimization
  const handleOptimizeFees = React.useCallback(async () => {
    setIsOptimizing(true);
    try {
      // Use setTimeout to allow UI to update before heavy calculation
      setTimeout(() => {
        const result = optimizeFees(parameters, expenses);
        setOptimizationResult(result);
        setIsOptimizing(false);
      }, 100);
    } catch (error) {
      console.error('Optimization failed:', error);
      setIsOptimizing(false);
    }
  }, [parameters, expenses]);

  // Clear optimization
  const handleClearOptimization = React.useCallback(() => {
    setOptimizationResult(null);
  }, []);

  // Calculate projections whenever parameters or expenses change
  const projectionResults = useMemo(() => {
    try {
      return calculateProjections(parameters, expenses);
    } catch (error) {
      console.error('Error calculating projections:', error);
      return null;
    }
  }, [parameters, expenses]);

  // Use optimization results if available, otherwise use regular projections
  const projections = optimizationResult?.projections || projectionResults?.projections || [];

  // Calculate some key metrics
  const finalBalance = projections[projections.length - 1]?.closingBalance || 0;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountUsdToday, 0);
  const yearsWithNegativeBalance = projections.filter(p => p.closingBalance < 0).length;
  const totalCollections = projections.reduce((sum, row) => sum + row.totalMaintenanceCollected, 0);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Reserve Fund Financial Model
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl">
            Plan and analyze your society's maintenance fund with comprehensive financial projections. 
            Configure parameters, add future expenses, and see real-time projections and visualizations.
          </p>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-2xl font-bold text-green-600">
                    ${(finalBalance / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Final Balance ({parameters.fiscalYear + parameters.horizon - 1})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-2xl font-bold">
                    ${(totalCollections / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Collections
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <p className="text-2xl font-bold text-red-600">
                    ${(totalExpenses / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Planned Expenses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {yearsWithNegativeBalance}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Risk Years
                  </p>
                </div>
                <Badge variant={yearsWithNegativeBalance > 0 ? "destructive" : "default"}>
                  {yearsWithNegativeBalance > 0 ? "Warning" : "Good"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Optimization Controls */}
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Fee Optimization</h3>
                    <p className="text-sm text-muted-foreground">
                      {optimizationResult 
                        ? `Optimized fees applied • Savings: ${(optimizationResult.totalSavings / 1000).toFixed(0)}K over ${parameters.horizon} years`
                        : 'Optimize monthly fees to minimize costs while maintaining positive balances'
                      }
                    </p>
                  </div>
                  {optimizationResult && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Zap className="h-3 w-3 mr-1" />
                      Optimized
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {optimizationResult && (
                    <Button 
                      variant="outline" 
                      onClick={handleClearOptimization}
                    >
                      Use Original Fees
                    </Button>
                  )}
                  <Button 
                    onClick={handleOptimizeFees}
                    disabled={isOptimizing}
                    className="min-w-[140px]"
                  >
                    {isOptimizing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Optimize Monthly Fees
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ParameterForm 
                parameters={parameters} 
                onParametersChange={handleParametersChange}
              />
              <ExpenseManager 
                expenses={expenses} 
                onExpensesChange={handleExpensesChange}
                maxYear={parameters.horizon}
              />
            </div>
          </TabsContent>

          <TabsContent value="projections" className="space-y-6">
            <ProjectionTable projections={projections} />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <ProjectionCharts projections={projections} />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial Health Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Health Analysis</CardTitle>
                  <CardDescription>
                    Assessment of your financial planning based on projections.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Health:</span>
                      <Badge variant={finalBalance > 0 ? "default" : "destructive"}>
                        {finalBalance > 0 ? "Healthy" : "At Risk"}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Years with Negative Balance:</span>
                      <span className={`font-semibold ${yearsWithNegativeBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {yearsWithNegativeBalance} / {parameters.horizon}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Expense Coverage:</span>
                      <span className="font-semibold">
                        {totalCollections > totalExpenses ? 'Adequate' : 'Insufficient'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Safety Net Usage:</span>
                      <span className="font-semibold">
                        {projections.filter(p => p.safetyNetTopUp > 0).length} years
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                  <CardDescription>
                    Suggestions to improve your financial planning.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {finalBalance < 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          <strong>Critical:</strong> Your final balance is negative. Consider increasing base maintenance fees or reducing planned expenses.
                        </p>
                      </div>
                    )}
                    
                    {yearsWithNegativeBalance > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <strong>Warning:</strong> You have {yearsWithNegativeBalance} years with negative balances. Consider adjusting your safety net percentage or loan terms.
                        </p>
                      </div>
                    )}

                    {projections.filter(p => p.safetyNetTopUp > 0).length > parameters.horizon * 0.3 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Info:</strong> Safety net is triggered frequently. Consider increasing base maintenance or reserve contributions.
                        </p>
                      </div>
                    )}

                    {finalBalance > 0 && yearsWithNegativeBalance === 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">
                          <strong>Excellent:</strong> Your financial plan looks healthy with positive balances throughout the projection period.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
