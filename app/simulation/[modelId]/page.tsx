'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useModels, useExpenses } from '@/hooks/use-database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Zap, CreditCard, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { ProjectionTable } from '@/components/projection-table';
import { ModelEditSidebar } from '@/components/model-edit-sidebar';
import { YearDetailSidebar } from '@/components/year-detail-sidebar';
import { OptimizationResultsDialog } from '@/components/optimization-results-dialog';
import { generateProjections, getProjectionStats, applyYearAdjustments, optimizeCollectionFees, SimulationParams, YearProjection, OptimizationResult } from '@/lib/simulation';
import { Model } from '@/lib/db-schemas';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.modelId as string;
  
  const { models, getModel, updateModel } = useModels();
  const { expenses } = useExpenses(modelId);
  
  const [model, setModel] = useState<Model | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams | null>(null);
  const [isModelEditOpen, setIsModelEditOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<YearProjection | null>(null);
  const [yearAdjustments, setYearAdjustments] = useState<Record<number, any>>({});
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load model data
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const modelData = await getModel(modelId);
        if (modelData) {
          setModel(modelData);
          // Initialize simulation params with model data
          const { id, createdAt, updatedAt, ...simParams } = modelData;
          setSimulationParams(simParams);
        }
      } catch (error) {
        console.error('Failed to load model:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, [modelId, getModel]);

  // Generate projections when params or expenses change
  const projections = useMemo(() => {
    if (!simulationParams || !expenses) return [];
    let baseProjections = generateProjections(simulationParams, expenses);
    
    // Apply year adjustments and recalculate subsequent years
    if (Object.keys(yearAdjustments).length > 0) {
      baseProjections = applyYearAdjustments(baseProjections, yearAdjustments);
    }
    
    return baseProjections;
  }, [simulationParams, expenses, yearAdjustments]);

  // Calculate stats
  const stats = useMemo(() => {
    if (projections.length === 0) return null;
    return getProjectionStats(projections);
  }, [projections]);

  // Calculate large expense and loan stats
  const extendedStats = useMemo(() => {
    if (projections.length === 0 || !simulationParams) return null;
    
    let totalLargeExpenses = 0;
    let largeExpenseCount = 0;
    let totalLoanAmount = 0;
    let totalLoanPayments = 0;
    let yearsWithLoans = 0;
    let yearsWithLoanPayments = 0;
    
    projections.forEach(projection => {
      // Count large expenses
      projection.expenseDetails.forEach(detail => {
        if (detail.loanAmount > 0) {
          totalLargeExpenses += detail.inflatedCost;
          largeExpenseCount++;
        }
      });
      
      // Count loan activity
      if ((projection.loansTaken || 0) > 0) {
        totalLoanAmount += projection.loansTaken || 0;
        yearsWithLoans++;
      }
      
      if ((projection.loanPayments || 0) > 0) {
        totalLoanPayments += projection.loanPayments || 0;
        yearsWithLoanPayments++;
      }
    });
    
    return {
      totalLargeExpenses,
      largeExpenseCount,
      totalLoanAmount,
      totalLoanPayments,
      yearsWithLoans,
      yearsWithLoanPayments,
      averageLoanPerYear: yearsWithLoans > 0 ? totalLoanAmount / yearsWithLoans : 0,
      netLoanImpact: totalLoanAmount - totalLoanPayments
    };
  }, [projections, simulationParams]);

  const handleModelEdit = (updatedParams: SimulationParams) => {
    setSimulationParams(updatedParams);
  };

  const handleYearAdjustment = (year: number, adjustments: any) => {
    setYearAdjustments(prev => ({
      ...prev,
      [year]: adjustments
    }));
  };

  const handleOptimizeFees = async () => {
    if (!simulationParams || !expenses) return;
    
    setIsOptimizing(true);
    try {
      const result = optimizeCollectionFees(simulationParams, expenses);
      setOptimizationResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyOptimization = (optimizedParams: SimulationParams) => {
    if (!optimizationResult) return;
    
    // If there are yearly adjustments, convert them to year adjustments format
    if (optimizationResult.hasYearlyAdjustments) {
      const newYearAdjustments: Record<number, any> = {};
      
      optimizationResult.yearlyAdjustments.forEach(adjustment => {
        // Calculate the collections for this year based on the optimized fee
        const annualCollections = adjustment.optimizedFee * 12 * (simulationParams?.housingUnits || 1);
        newYearAdjustments[adjustment.year] = {
          collections: annualCollections
        };
      });
      
      setYearAdjustments(newYearAdjustments);
    } else {
      // For flat fee optimization, update the simulation params
      setSimulationParams(optimizedParams);
      setYearAdjustments({}); // Clear year adjustments
    }
    
    setOptimizationResult(null);
  };

  const handleSaveModel = async () => {
    if (!model || !simulationParams) return;
    
    try {
      await updateModel(model.id, simulationParams);
      // Update local model state
      setModel({ ...model, ...simulationParams });
    } catch (error) {
      console.error('Failed to save model:', error);
      alert('Failed to save model changes. Please try again.');
    }
  };

  const handleResetChanges = () => {
    if (!model) return;
    const { id, createdAt, updatedAt, ...simParams } = model;
    setSimulationParams(simParams);
    setYearAdjustments({}); // Clear any year-specific adjustments
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!model || !simulationParams) return false;
    
    // Compare simulation params with original model
    const { id, createdAt, updatedAt, ...originalParams } = model;
    const hasModelChanges = JSON.stringify(originalParams) !== JSON.stringify(simulationParams);
    const hasYearAdjustments = Object.keys(yearAdjustments).length > 0;
    
    return hasModelChanges || hasYearAdjustments;
  }, [model, simulationParams, yearAdjustments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading simulation...</div>
      </div>
    );
  }

  if (!model || !simulationParams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Model not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Simulation: {model.name}</h1>
                <p className="text-sm text-gray-500">
                  {model.fiscalYear} - {model.fiscalYear + model.period - 1} ({model.period} years)
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && (
                <>
                  <Button variant="outline" size="sm" onClick={handleResetChanges}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSaveModel}>
                    Save Changes
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOptimizeFees}
                disabled={isOptimizing}
                className="flex items-center space-x-2 text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Zap className="h-4 w-4" />
                <span>{isOptimizing ? 'Optimizing...' : 'Optimize Fees'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModelEditOpen(true)}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Model</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && extendedStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Final Balance</CardTitle>
                {stats.finalBalance >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.finalBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  At end of {model.period}-year period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Minimum Balance</CardTitle>
                {stats.negativeBalanceYears > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <DollarSign className="h-4 w-4 text-green-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.minBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.minBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lowest balance reached
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.totalCollections)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Over {model.period} years
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Over {model.period} years
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Large Expenses</CardTitle>
                <PiggyBank className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(extendedStats.totalLargeExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {extendedStats.largeExpenseCount} expenses over baseline
                </p>
                <p className="text-xs text-purple-600 font-medium">
                  Baseline: {formatCurrency(simulationParams?.largeExpenseBaseline || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loan Activity</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(extendedStats.totalLoanAmount)}
                  </div>
                  <div className="text-sm font-medium text-purple-600">
                    -{formatCurrency(extendedStats.totalLoanPayments)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Loans taken vs payments made
                </p>
                <p className="text-xs font-medium text-gray-700">
                  Net: {formatCurrency(extendedStats.netLoanImpact)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="projection" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projection">Projection</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="projection">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Year-by-Year Projection</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Click on any year to view and edit details
                    </p>
                  </div>
                  {stats && stats.negativeBalanceYears > 0 && (
                    <Badge variant="destructive">
                      {stats.negativeBalanceYears} year{stats.negativeBalanceYears > 1 ? 's' : ''} with negative balance
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ProjectionTable
                  projections={projections}
                  onYearClick={setSelectedYear}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Financial Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {projections.length > 0 && (
                  <div className="space-y-8">
                    <div className="h-96 p-6 bg-gray-50 rounded-lg border">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={projections.map(p => ({
                            year: p.year,
                            collections: p.collections,
                            expenses: p.expenses,
                            loansTaken: p.loansTaken || 0,
                            loanPayments: p.loanPayments || 0,
                            closingBalance: p.closingBalance,
                          }))}
                          margin={{
                            top: 30,
                            right: 40,
                            left: 40,
                            bottom: 30,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="year" 
                            label={{ value: 'Year', position: 'insideBottom', offset: -15 }}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            tickFormatter={(value) => formatCurrency(value)}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <Tooltip 
                            content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]?.payload;
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl">
                                    <p className="font-semibold text-gray-900 mb-2">Year {label}</p>
                                    <div className="space-y-1">
                                      <p className="text-sm text-blue-600">
                                        Collections: {formatCurrency(data?.collections || 0)}
                                      </p>
                                      <p className="text-sm text-red-600">
                                        Expenses: {formatCurrency(data?.expenses || 0)}
                                      </p>
                                      {(data?.loansTaken || 0) > 0 && (
                                        <p className="text-sm text-purple-600">
                                          Loans Taken: {formatCurrency(data?.loansTaken || 0)}
                                        </p>
                                      )}
                                      {(data?.loanPayments || 0) > 0 && (
                                        <p className="text-sm text-orange-600">
                                          Loan Payments: {formatCurrency(data?.loanPayments || 0)}
                                        </p>
                                      )}
                                      <p className="text-sm text-green-600 font-medium border-t pt-1">
                                        Closing Balance: {formatCurrency(data?.closingBalance || 0)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            verticalAlign="top" 
                            height={36}
                            wrapperStyle={{ paddingBottom: '20px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="collections"
                            name="Collections"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="expenses"
                            name="Expenses"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{ fill: '#ef4444', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, stroke: '#ef4444', strokeWidth: 2 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="loansTaken"
                            name="Loans Taken"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="loanPayments"
                            name="Loan Payments"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="closingBalance"
                            name="Closing Balance"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Collection Fee Change Graph */}
                    <div className="h-80 p-6 bg-gray-50 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Fee Year-over-Year Change</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={projections.map((p, index) => {
                            if (index === 0) {
                              return {
                                year: p.year,
                                feeChange: 0,
                                monthlyFee: p.collections / (12 * (simulationParams?.housingUnits || 1))
                              };
                            }
                            const prevCollections = projections[index - 1].collections;
                            const currentCollections = p.collections;
                            const prevMonthlyFee = prevCollections / (12 * (simulationParams?.housingUnits || 1));
                            const currentMonthlyFee = currentCollections / (12 * (simulationParams?.housingUnits || 1));
                            const feeChange = prevMonthlyFee > 0 ? ((currentMonthlyFee - prevMonthlyFee) / prevMonthlyFee) * 100 : 0;
                            
                            return {
                              year: p.year,
                              feeChange: feeChange,
                              monthlyFee: currentMonthlyFee
                            };
                          })}
                          margin={{
                            top: 20,
                            right: 40,
                            left: 40,
                            bottom: 20,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="year" 
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            tickFormatter={(value) => `${value.toFixed(1)}%`}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <Tooltip 
                            content={({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]?.payload;
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl">
                                    <p className="font-semibold text-gray-900 mb-2">Year {label}</p>
                                    <p className="text-sm mb-1 text-purple-600">
                                      Fee Change: {data?.feeChange.toFixed(2)}%
                                    </p>
                                    <p className="text-sm mb-1 text-gray-600">
                                      Monthly Fee: {formatCurrency(data?.monthlyFee || 0)}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="feeChange"
                            name="Fee Change %"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                      <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {formatCurrency(Math.max(...projections.map(p => p.collections)))}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Peak Collections</div>
                      </div>
                      <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-3xl font-bold text-red-600 mb-2">
                          {formatCurrency(Math.max(...projections.map(p => p.expenses)))}
                        </div>
                        <div className="text-sm text-red-700 font-medium">Peak Expenses</div>
                      </div>
                      <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {formatCurrency(Math.max(...projections.map(p => p.loansTaken || 0)))}
                        </div>
                        <div className="text-sm text-purple-700 font-medium">Peak Loans Taken</div>
                      </div>
                      <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {formatCurrency(Math.max(...projections.map(p => p.loanPayments || 0)))}
                        </div>
                        <div className="text-sm text-orange-700 font-medium">Peak Loan Payments</div>
                      </div>
                      <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {formatCurrency(Math.max(...projections.map(p => p.closingBalance)))}
                        </div>
                        <div className="text-sm text-green-700 font-medium">Peak Balance</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Scenario features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Sidebars */}
      <ModelEditSidebar
        open={isModelEditOpen}
        onOpenChange={setIsModelEditOpen}
        model={simulationParams}
        onSave={handleModelEdit}
      />

      {selectedYear && (
        <YearDetailSidebar
          open={!!selectedYear}
          onOpenChange={(open: boolean) => !open && setSelectedYear(null)}
          yearProjection={selectedYear}
          model={simulationParams}
          onYearAdjustment={handleYearAdjustment}
        />
      )}

      <OptimizationResultsDialog
        open={!!optimizationResult}
        onOpenChange={(open) => !open && setOptimizationResult(null)}
        result={optimizationResult}
        onApply={handleApplyOptimization}
      />
    </div>
  );
}
