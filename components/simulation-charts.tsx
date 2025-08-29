'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection } from '@/lib/simulation';

interface SimulationChartsProps {
  projections: YearProjection[];
  housingUnits: number;
}

export function SimulationCharts({ projections, housingUnits }: SimulationChartsProps) {
  // Prepare data for the top stacked bar chart (financial flows)
  const financialData = useMemo(() => {
    return projections.map(projection => {
      const collections = projection.collections;
      const expenses = projection.expenses;
      const loansTaken = projection.loansTaken || 0;
      const loanPayments = projection.loanPayments || 0;
      
      // Calculate net cash flow
      const netCashFlow = collections - expenses + loansTaken - loanPayments;
      
      return {
        year: projection.year,
        collections: collections,
        expenses: expenses,
        loansTaken: loansTaken,
        loanPayments: loanPayments,
        netCashFlow: netCashFlow,
      };
    });
  }, [projections]);

  // Prepare data for the bottom bar chart (monthly fee collection)
  const feeData = useMemo(() => {
    return projections.map(projection => {
      const monthlyFee = projection.collections / (12 * housingUnits);
      return {
        year: projection.year,
        monthlyFee: monthlyFee,
        annualCollections: projection.collections,
      };
    });
  }, [projections, housingUnits]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl">
          <p className="font-semibold text-gray-900 mb-2">Year {label}</p>
          <div className="space-y-1">
            <p className="text-sm text-green-600">
              Collections: {formatCurrency(data?.collections || 0)}
            </p>
            <p className="text-sm text-red-600">
              Expenses: {formatCurrency(data?.expenses || 0)}
            </p>
            {(data?.loansTaken || 0) > 0 && (
              <p className="text-sm text-yellow-600">
                Loans Taken: {formatCurrency(data?.loansTaken || 0)}
              </p>
            )}
            {(data?.loanPayments || 0) > 0 && (
              <p className="text-sm text-blue-600">
                Loan Payments: {formatCurrency(data?.loanPayments || 0)}
              </p>
            )}
            <p className="text-sm text-gray-600 font-medium border-t pt-1">
              Net Cash Flow: {formatCurrency(data?.netCashFlow || 0)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const FeeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl">
          <p className="font-semibold text-gray-900 mb-2">Year {label}</p>
          <p className="text-sm text-green-600">
            Monthly Fee: {formatCurrency(data?.monthlyFee || 0)}
          </p>
          <p className="text-sm text-gray-600">
            Annual Collections: {formatCurrency(data?.annualCollections || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Top Chart - Financial Flows (Stacked Bar Chart) */}
      <div className="h-96 p-6 bg-gray-50 rounded-lg border">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={financialData}
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
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            {/* Collections - Dark Green */}
            <Bar 
              dataKey="collections" 
              name="Collections" 
              fill="#166534" 
              stackId="stack"
            />
            {/* Loans Taken - Yellow */}
            <Bar 
              dataKey="loansTaken" 
              name="Loans Taken" 
              fill="#f59e0b" 
              stackId="stack"
            />
            {/* Expenses - Light Green */}
            <Bar 
              dataKey="expenses" 
              name="Expenses" 
              fill="#22c55e" 
              stackId="stack"
            />
            {/* Loan Payments - Blue */}
            <Bar 
              dataKey="loanPayments" 
              name="Loan Payments" 
              fill="#3b82f6" 
              stackId="stack"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Chart - Monthly Fee Collection (Simple Bar Chart) */}
      <div className="h-80 p-6 bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Monthly fee collection</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={feeData}
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
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip content={<FeeTooltip />} />
            <Bar 
              dataKey="monthlyFee" 
              name="Monthly Fee" 
              fill="#166534"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
