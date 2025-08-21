'use client';

import React from 'react';
import { ProjectionRow } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';

interface ProjectionChartsProps {
  projections: ProjectionRow[];
}

// Custom tooltip formatter for currency
const formatTooltipValue = (value: any, name: string) => {
  if (typeof value === 'number') {
    return [new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value), name];
  }
  return [value, name];
};

// Custom label formatter for the X-axis
const formatXAxisLabel = (value: any) => `Year ${value}`;

export function ProjectionCharts({ projections }: ProjectionChartsProps) {
  if (projections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Charts</CardTitle>
          <CardDescription>
            Configure parameters and expenses to see visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available for charts.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Projections Visualization</CardTitle>
        <CardDescription>
          Interactive charts showing different aspects of your financial projections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="balance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="balance">Balance Trend</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="expenses">Expenses & Collections</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="balance" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    tickFormatter={formatXAxisLabel}
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelFormatter={formatXAxisLabel}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="openingBalance" 
                    stroke="#8884d8" 
                    name="Opening Balance"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="closingBalance" 
                    stroke="#82ca9d" 
                    name="Closing Balance"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="provisionalEndBalance" 
                    stroke="#ffc658" 
                    name="Provisional End Balance"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    tickFormatter={formatXAxisLabel}
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelFormatter={formatXAxisLabel}
                  />
                  <Legend />
                  <Bar 
                    dataKey="totalMaintenanceCollected" 
                    fill="#82ca9d" 
                    name="Total Collections"
                  />
                  <Bar 
                    dataKey="futureExpensesInYear" 
                    fill="#ff7300" 
                    name="Future Expenses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="safetyNetTopUp" 
                    stroke="#8884d8" 
                    name="Safety Net Top-Up"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    tickFormatter={formatXAxisLabel}
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelFormatter={formatXAxisLabel}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="baseMaintenanceInflated" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    name="Base Maintenance"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="reserveContribution" 
                    stackId="1" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    name="Reserve Contribution"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="safetyNetTopUp" 
                    stackId="1" 
                    stroke="#ffc658" 
                    fill="#ffc658" 
                    name="Safety Net Top-Up"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    tickFormatter={formatXAxisLabel}
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={formatTooltipValue}
                    labelFormatter={formatXAxisLabel}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="closingBalance" 
                    fill="#82ca9d" 
                    stroke="#82ca9d"
                    fillOpacity={0.3}
                    name="Closing Balance"
                  />
                  <Bar 
                    dataKey="futureExpensesInYear" 
                    fill="#ff7300" 
                    name="Future Expenses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="loanRepayments" 
                    stroke="#8884d8" 
                    name="Loan Repayments"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Key metrics summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {projections.filter(p => p.closingBalance >= 0).length}
            </div>
            <div className="text-sm text-muted-foreground">Years with Positive Balance</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {projections.filter(p => p.futureExpensesInYear > 0).length}
            </div>
            <div className="text-sm text-muted-foreground">Years with Major Expenses</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {projections.filter(p => p.safetyNetTopUp > 0).length}
            </div>
            <div className="text-sm text-muted-foreground">Years Requiring Safety Net</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              {projections.filter(p => p.loanRepayments < 0).length}
            </div>
            <div className="text-sm text-muted-foreground">Years with Loan Payments</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
