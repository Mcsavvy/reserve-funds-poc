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
  AreaChart
} from 'recharts';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  DollarSignIcon,
  CalendarIcon 
} from 'lucide-react';
import { Model, ModelItem } from '@/lib/db-types';
import { 
  calculateReserveProjections,
  generateReserveSummary,
  calculateContributionAdequacy,
  formatCurrency,
  formatPercentage
} from '@/lib/reserve-calculations';

type SimulationSettings = {
  projectionYears: number;
  customInflationRate: number | null;
  customMonthlyFees: number | null;
  targetMinBalance: number;
  includeInterest: boolean;
};

interface SimulationResultsProps {
  model: Model;
  modelItems: ModelItem[];
  settings: SimulationSettings;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function SimulationResults({ model, modelItems, settings }: SimulationResultsProps) {
  const adjustedModel = useMemo(() => ({
    ...model,
    inflation_rate: settings.customInflationRate ?? model.inflation_rate,
    monthly_fees: settings.customMonthlyFees ?? model.monthly_fees,
    bank_int_rate: settings.includeInterest ? model.bank_int_rate : 0,
  }), [model, settings]);

  const projections = useMemo(() => 
    calculateReserveProjections(adjustedModel, modelItems, settings.projectionYears),
    [adjustedModel, modelItems, settings.projectionYears]
  );

  const summary = useMemo(() => 
    generateReserveSummary(projections),
    [projections]
  );

  const adequacyPercentage = useMemo(() => 
    calculateContributionAdequacy(adjustedModel, modelItems, settings.projectionYears),
    [adjustedModel, modelItems, settings.projectionYears]
  );

  // Chart data preparation
  const balanceChartData = projections.map(p => ({
    year: p.year,
    balance: p.endingBalance,
    income: p.income,
    expenses: p.expenses,
    targetMinBalance: settings.targetMinBalance,
  }));

  const cashFlowData = projections.map(p => ({
    year: p.year,
    income: p.income,
    expenses: p.expenses,
    netFlow: p.income - p.expenses,
  }));

  // Component replacement schedule
  const replacementSchedule = useMemo(() => {
    const schedule: { [year: number]: { items: any[], totalCost: number } } = {};
    
    projections.forEach(p => {
      if (p.items.length > 0) {
        schedule[p.year] = {
          items: p.items,
          totalCost: p.items.reduce((sum, item) => sum + item.cost, 0)
        };
      }
    });
    
    return schedule;
  }, [projections]);

  const replacementChartData = Object.entries(replacementSchedule).map(([year, data]) => ({
    year: parseInt(year),
    totalCost: data.totalCost,
    itemCount: data.items.length,
  }));

  // Expense breakdown by category
  const expensesByCategory = useMemo(() => {
    const categories: { [key: string]: number } = {};
    
    projections.forEach(p => {
      p.items.forEach(item => {
        const category = item.name.split(' ')[0]; // Simple categorization
        categories[category] = (categories[category] || 0) + item.cost;
      });
    });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 categories
  }, [projections]);

  const isHealthy = summary.minBalance >= settings.targetMinBalance;
  const hasDeficit = summary.needsLoan;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Final Balance</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.finalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              After {settings.projectionYears} years
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Min Balance</CardTitle>
            {summary.minBalance >= 0 ? (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangleIcon className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.minBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              In {summary.minBalanceYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funding Adequacy</CardTitle>
            {adequacyPercentage >= 100 ? (
              <TrendingUpIcon className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDownIcon className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(adequacyPercentage)}
            </div>
            <Progress value={Math.min(adequacyPercentage, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Over {settings.projectionYears} years
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {hasDeficit && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Funding Deficit Detected:</strong> The reserve fund will require a loan of up to {formatCurrency(summary.maxLoanAmount)} 
            to cover expenses. Consider increasing monthly contributions or adjusting the replacement schedule.
          </AlertDescription>
        </Alert>
      )}

      {!isHealthy && !hasDeficit && (
        <Alert>
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Below Target Balance:</strong> The minimum balance of {formatCurrency(summary.minBalance)} 
            falls below your target of {formatCurrency(settings.targetMinBalance)}. 
            Consider adjusting contributions or target balance.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Charts and Data */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="schedule">Replacement Schedule</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reserve Balance Over Time</CardTitle>
              <CardDescription>
                Projected fund balance with target minimum shown in red
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanceChartData}>
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Balance']}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#balanceGradient)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="targetMinBalance" 
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Annual Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Income:</span>
                    <span className="font-medium">{formatCurrency(summary.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Expenses:</span>
                    <span className="font-medium">{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Net Cash Flow:</span>
                    <span className={`font-medium ${summary.totalIncome - summary.totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.totalIncome - summary.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Balance:</span>
                    <span className="font-medium">{formatCurrency(summary.averageBalance)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expensesByCategory.map((entry, index) => (
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

        <TabsContent value="cash-flow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Annual Cash Flow</CardTitle>
              <CardDescription>
                Income vs expenses by year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net Flow'
                      ]}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Bar dataKey="income" fill="#10b981" name="income" />
                    <Bar dataKey="expenses" fill="#ef4444" name="expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Component Replacement Schedule</CardTitle>
              <CardDescription>
                Expected replacement costs by year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={replacementChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'totalCost' ? formatCurrency(value) : value,
                        name === 'totalCost' ? 'Total Cost' : 'Item Count'
                      ]}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Bar dataKey="totalCost" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Replacement Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(replacementSchedule).map(([year, data]) => (
                  <div key={year} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Year {year}</h4>
                      <Badge variant="secondary">
                        {data.items.length} item{data.items.length !== 1 ? 's' : ''} • {formatCurrency(data.totalCost)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {data.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name}</span>
                          <span className="font-medium">{formatCurrency(item.cost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(replacementSchedule).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No component replacements scheduled during this period.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                    <span>Funding Adequacy</span>
                    <Badge variant={adequacyPercentage >= 100 ? "default" : "destructive"}>
                      {formatPercentage(adequacyPercentage)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Balance Stability</span>
                    <Badge variant={summary.minBalance >= 0 ? "default" : "destructive"}>
                      {summary.minBalance >= 0 ? "Stable" : "At Risk"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Target Compliance</span>
                    <Badge variant={isHealthy ? "default" : "secondary"}>
                      {isHealthy ? "Compliant" : "Below Target"}
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
                  {adequacyPercentage < 100 && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p>Consider increasing monthly contributions to achieve 100% funding adequacy.</p>
                    </div>
                  )}
                  {summary.needsLoan && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                      <p>Plan for potential borrowing needs of up to {formatCurrency(summary.maxLoanAmount)}.</p>
                    </div>
                  )}
                  {!isHealthy && (
                    <div className="flex items-start space-x-2">
                      <AlertTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p>Review target minimum balance to ensure it aligns with operational needs.</p>
                    </div>
                  )}
                  {adequacyPercentage >= 100 && !hasDeficit && isHealthy && (
                    <div className="flex items-start space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>Reserve fund is well-funded and meets all target requirements.</p>
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
