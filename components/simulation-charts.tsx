'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection } from '@/lib/simulation';
import { WaterfallTimeline } from '@/components/ui/waterfall-timeline';

interface SimulationChartsProps {
  projections: YearProjection[];
  housingUnits: number;
}

export function SimulationCharts({ projections, housingUnits }: SimulationChartsProps) {
  // Prepare data for the waterfall chart (closing balance surplus/deficit)
  const balanceData = useMemo(() => {
    return projections.map(projection => {
      const closingBalance = projection.closingBalance;
      
      return {
        year: projection.year,
        value: closingBalance,
        // Additional data for potential future use
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
      {/* Top Chart - Closing Balance Surplus/Deficit (Waterfall Timeline) */}
      <div className="pt-6 bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Closing Balance Surplus/Deficit</h3>
        <WaterfallTimeline
          data={balanceData}
          height={320}
          formatValue={(n) => formatCurrency(n)}
          showYearGrid={false}
        />
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
