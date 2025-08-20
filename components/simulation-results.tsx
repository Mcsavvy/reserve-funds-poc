'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  DollarSignIcon,
  CalendarIcon,
  PiggyBankIcon,
  CreditCardIcon
} from 'lucide-react';
import { Model, ModelItem } from '@/lib/db-types';
import { 
  calculateFinancialProjections,
  generateFinancialSummary,
  calculateMonthlyLoanPayment,
  formatCurrency,
  formatPercentage
} from '@/lib/financial-simulator';
import { convertDbStrategyToData } from '@/lib/ltim-calculations';
import { useLtimStrategies } from '@/hooks/use-database';
import { FinancialSimulatorSettings } from '@/components/simulation-settings';

interface SimulationResultsProps {
  model: Model;
  modelItems: ModelItem[];
  settings: FinancialSimulatorSettings;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function SimulationResults({ model, modelItems, settings }: SimulationResultsProps) {
  const { items: strategies } = useLtimStrategies();
  
  const adjustedModel = useMemo(() => ({
    ...model,
    ...settings, // Override model values with settings
  }), [model, settings]);

  // Look up LTIM strategy if enabled
  const ltimStrategyData = useMemo(() => {
    if (!adjustedModel.ltim_enabled || !adjustedModel.ltim_strategy_id || adjustedModel.ltim_strategy_id === 'none') {
      return undefined;
    }
    
    const strategy = strategies.find(s => s.id === adjustedModel.ltim_strategy_id && s.active);
    return strategy ? convertDbStrategyToData(strategy) : undefined;
  }, [adjustedModel.ltim_enabled, adjustedModel.ltim_strategy_id, strategies]);

  const projections = useMemo(() => 
    calculateFinancialProjections(adjustedModel as Model, modelItems, settings.projectionYears, ltimStrategyData),
    [adjustedModel, modelItems, settings.projectionYears, ltimStrategyData]
  );

  const summary = useMemo(() => 
    generateFinancialSummary(projections),
    [projections]
  );

  const monthlyLoanPayment = useMemo(() =>
    calculateMonthlyLoanPayment(adjustedModel as Model),
    [adjustedModel]
  );

  // Chart data preparation for financial simulator
  const balanceChartData = projections.map(p => ({
    year: p.year,
    remainingAmount: p.remainingAmount,
    totalAvailable: p.totalAvailableToInvest,
    ltimAccumulated: p.projectedAccumulatedLTIMFunds,
  }));

  const financialFlowData = projections.map(p => ({
    year: p.year,
    netEarnings: p.netEarnings,
    compoundSavings: p.compoundValueOfSavings,
    ltimEarnings: p.projectedLTIMEarnings,
    purchasingPowerLoss: -p.lossInPurchasingPower, // Negative for chart
    loanPayments: -p.loanPayments, // Negative for chart
    expenses: -p.expenses, // Negative for chart (changed from spending to expenses)
  }));

  // Investment performance breakdown
  const investmentBreakdown = useMemo(() => {
    const totalEarnings = projections.reduce((sum, p) => sum + p.netEarnings, 0);
    const totalCompound = projections.reduce((sum, p) => sum + (p.compoundValueOfSavings - settings.investment_amount_compound), 0);
    const totalLTIM = summary.totalLTIMAccumulated;
    
    return [
      { name: 'Investment Returns', value: totalEarnings },
      { name: 'Compound Savings', value: Math.max(0, totalCompound) },
      { name: 'LTIM Returns', value: Math.max(0, totalLTIM) },
    ].filter(item => item.value > 0);
  }, [projections, summary, settings]);

  // Loan schedule data
  const loanScheduleData = settings.loan_amount > 0 ? projections.map(p => ({
    year: p.year,
    payment: p.loanPayments,
    monthlyPayment: monthlyLoanPayment,
  })) : [];

  const isHealthy = summary.finalRemainingAmount >= 0;
  const hasDeficit = summary.minRemainingAmount < 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Final Remaining</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.finalRemainingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              After {settings.projectionYears} years
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Min Remaining</CardTitle>
            {summary.minRemainingAmount >= 0 ? (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangleIcon className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.minRemainingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              In {summary.minRemainingAmountYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTIM Accumulated</CardTitle>
            <PiggyBankIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalLTIMAccumulated)}
            </div>
            <p className="text-xs text-muted-foreground">
              Long-term investment growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Loan Payment</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(monthlyLoanPayment)}
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.loan_amount > 0 ? `${settings.loan_term_years} year term` : 'No loan'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {hasDeficit && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Financial Deficit Detected:</strong> The remaining amount will go negative to {formatCurrency(summary.minRemainingAmount)}&nbsp;
            in {summary.minRemainingAmountYear}. Consider adjusting expenses, loan terms, or investment allocations.
          </AlertDescription>
        </Alert>
      )}

      {!isHealthy && !hasDeficit && (
        <Alert>
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Low Final Balance:</strong> The final remaining amount of {formatCurrency(summary.finalRemainingAmount)}&nbsp;
            may not provide adequate financial cushion. Consider reviewing your financial strategy.
          </AlertDescription>
        </Alert>
      )}

      {summary.totalPurchasingPowerLoss > summary.totalProjectedGains && (
        <Alert>
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Inflation Risk:</strong> Purchasing power loss ({formatCurrency(summary.totalPurchasingPowerLoss)})&nbsp;
            exceeds projected gains ({formatCurrency(summary.totalProjectedGains)}). Consider higher-yield investments.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Charts and Data */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial-flow">Financial Flow</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Remaining Amount Over Time</CardTitle>
              <CardDescription>
                Financial projection showing remaining amount and LTIM accumulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={balanceChartData}>
                    <defs>
                      <linearGradient id="remainingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'remainingAmount' ? 'Remaining Amount' : 
                        name === 'ltimAccumulated' ? 'LTIM Accumulated' : 'Total Available'
                      ]}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="remainingAmount" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#remainingGradient)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ltimAccumulated" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Projected Gains:</span>
                    <span className="font-medium text-green-600">{formatCurrency(summary.totalProjectedGains)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Expenses:</span>
                    <span className="font-medium text-red-600">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Loan Payments:</span>
                    <span className="font-medium text-red-600">{formatCurrency(summary.totalLoanPayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchasing Power Loss:</span>
                    <span className="font-medium text-red-600">{formatCurrency(summary.totalPurchasingPowerLoss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Remaining:</span>
                    <span className="font-medium">{formatCurrency(summary.averageRemainingAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investment Returns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={investmentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {investmentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial-flow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Annual Financial Flow</CardTitle>
              <CardDescription>
                Gains vs losses by year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(Math.abs(value))} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(Math.abs(value)), 
                        name === 'netEarnings' ? 'Investment Returns' :
                        name === 'compoundSavings' ? 'Compound Savings' :
                        name === 'ltimEarnings' ? 'LTIM Earnings' :
                        name === 'purchasingPowerLoss' ? 'Purchasing Power Loss' :
                        name === 'loanPayments' ? 'Loan Payments' : 'Spending'
                      ]}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Bar dataKey="netEarnings" fill="#10b981" name="netEarnings" />
                    <Bar dataKey="compoundSavings" fill="#3b82f6" name="compoundSavings" />
                    <Bar dataKey="ltimEarnings" fill="#8b5cf6" name="ltimEarnings" />
                    <Bar dataKey="purchasingPowerLoss" fill="#ef4444" name="purchasingPowerLoss" />
                    <Bar dataKey="loanPayments" fill="#f59e0b" name="loanPayments" />
                    <Bar dataKey="expenses" fill="#6b7280" name="expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Investment Allocation Breakdown</CardTitle>
              <CardDescription>
                How your funds are allocated across different investment vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(settings.total_amount_invested)}
                    </div>
                    <p className="text-sm text-gray-600">Direct Investments</p>
                    <p className="text-xs text-gray-500">{settings.annual_investment_return_rate}% return</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(settings.investment_amount_compound)}
                    </div>
                    <p className="text-sm text-gray-600">Compound Savings</p>
                    <p className="text-xs text-gray-500">{settings.bank_savings_interest_rate}% return</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {summary.totalLTIMAccumulated ? formatCurrency(summary.totalLTIMAccumulated) : '$0'}
                    </div>
                    <p className="text-sm text-gray-600">LTIM Allocation</p>
                    <p className="text-xs text-gray-500">{settings.ltim_return_rate}% return</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {settings.loan_amount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Loan Payment Schedule</CardTitle>
                <CardDescription>
                  Monthly payment breakdown for {settings.loan_term_years}-year loan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(settings.loan_amount)}
                      </div>
                      <p className="text-sm text-gray-600">Principal Amount</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(monthlyLoanPayment)}
                      </div>
                      <p className="text-sm text-gray-600">Monthly Payment</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">
                        {settings.annual_loan_interest_rate}%
                      </div>
                      <p className="text-sm text-gray-600">Interest Rate</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={loanScheduleData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Annual Payment']}
                          labelFormatter={(label) => `Year ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="payment" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Overall Performance</span>
                    <Badge variant={isHealthy ? "default" : "destructive"}>
                      {isHealthy ? "Positive" : "Negative"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Balance Stability</span>
                    <Badge variant={summary.minRemainingAmount >= 0 ? "default" : "destructive"}>
                      {summary.minRemainingAmount >= 0 ? "Stable" : "At Risk"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Investment Returns</span>
                    <Badge variant={summary.totalProjectedGains > 0 ? "default" : "secondary"}>
                      {summary.totalProjectedGains > 0 ? "Positive" : "Neutral"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Inflation Impact</span>
                    <Badge variant={summary.totalPurchasingPowerLoss < summary.totalProjectedGains ? "default" : "destructive"}>
                      {summary.totalPurchasingPowerLoss < summary.totalProjectedGains ? "Protected" : "At Risk"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {hasDeficit && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                      <p>Reduce expenses or increase investment allocations to prevent negative balance in {summary.minRemainingAmountYear}.</p>
                    </div>
                  )}
                  {summary.totalPurchasingPowerLoss > summary.totalProjectedGains && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p>Consider increasing investment return rates or allocating more funds to higher-yield investments to combat inflation.</p>
                    </div>
                  )}
                  {settings.loan_amount > 0 && summary.totalLoanPayments > summary.totalProjectedGains && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p>Loan payments exceed investment gains. Consider paying down the loan faster or increasing investment returns.</p>
                    </div>
                  )}
                  {isHealthy && summary.totalProjectedGains > summary.totalPurchasingPowerLoss && !hasDeficit && (
                    <div className="flex items-start space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>Financial plan is sound with positive projected outcomes and inflation protection.</p>
                    </div>
                  )}
                  {summary.totalLTIMAccumulated > 0 && (
                    <div className="flex items-start space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>LTIM strategy is working well with strong compound growth. Consider increasing allocation if possible.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
