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
  // Prepare data for the top candlestick chart (closing balance surplus/deficit)
  const balanceData = useMemo(() => {
    return projections.map(projection => {
      const closingBalance = projection.closingBalance;
      const isSurplus = closingBalance >= 0;
      
      return {
        year: projection.year,
        // For candlestick effect: positive values go up, negative values go down
        surplus: isSurplus ? closingBalance : 0,
        deficit: !isSurplus ? Math.abs(closingBalance) : 0,
        closingBalance: closingBalance,
        // Additional data for tooltip
        collections: projection.collections,
        expenses: projection.expenses,
        loansTaken: projection.loansTaken || 0,
        loanPayments: projection.loanPayments || 0,
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

  const BalanceTooltip = ({ active, payload, label }: any) => {
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
            <p className={`text-sm font-medium border-t pt-1 ${data?.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Closing Balance: {formatCurrency(data?.closingBalance || 0)}
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
      {/* Top Chart - Closing Balance Surplus/Deficit (Candlestick Style) */}
      <div className="h-96 p-6 bg-gray-50 rounded-lg border">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={balanceData}
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
            <Tooltip content={<BalanceTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            {/* Surplus - Dark Green (positive values extending up) */}
            <Bar 
              dataKey="surplus" 
              name="Surplus" 
              fill="#166534" 
              stackId="balance"
            />
            {/* Deficit - Dark Red (negative values extending down) */}
            <Bar 
              dataKey="deficit" 
              name="Deficit" 
              fill="#dc2626" 
              stackId="balance"
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
