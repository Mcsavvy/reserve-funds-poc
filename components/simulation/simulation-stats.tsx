'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, CreditCard, PiggyBank, TrendingUp as InvestmentIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { SimulationParams, YearProjection } from '@/lib/simulation';

interface SimulationStatsProps {
  stats: {
    finalBalance: number;
    minBalance: number;
    totalCollections: number;
    totalExpenses: number;
    negativeBalanceYears: number;
  } | null;
  extendedStats: {
    totalLargeExpenses: number;
    largeExpenseCount: number;
    totalLoanAmount: number;
    totalLoanPayments: number;
    yearsWithLoans: number;
    yearsWithLoanPayments: number;
    totalInvestmentLiquidations: number;
    yearsWithInvestmentLiquidations: number;
    averageLoanPerYear: number;
    netLoanImpact: number;
  } | null;
  simulationParams: SimulationParams | null;
}

export function SimulationStats({ stats, extendedStats, simulationParams }: SimulationStatsProps) {
  if (!stats || !extendedStats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
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
            At end of {simulationParams?.period || 0}-year period
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
            Over {simulationParams?.period || 0} years
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
            Over {simulationParams?.period || 0} years
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Investment Liquidations</CardTitle>
          <InvestmentIcon className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(extendedStats.totalInvestmentLiquidations)}
          </div>
          <p className="text-xs text-muted-foreground">
            {extendedStats.yearsWithInvestmentLiquidations} year{extendedStats.yearsWithInvestmentLiquidations > 1 ? 's' : ''} with liquidations
          </p>
          <p className="text-xs font-medium text-green-600">
            Total return from investments
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
