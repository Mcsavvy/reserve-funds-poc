'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

interface FinancialInsightsCardProps {
  adjustedProjection: YearProjection;
  model: SimulationParams;
}

export function FinancialInsightsCard({ adjustedProjection, model }: FinancialInsightsCardProps) {
  const projectedEarnings = adjustedProjection.openingBalance * model.bankInterestRate / 100;
  const inflationLoss = adjustedProjection.openingBalance * model.inflationRate / 100;
  const netFinancialImpact = projectedEarnings - inflationLoss;

  return (
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
              +{formatCurrency(projectedEarnings)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              Potential interest income on opening balance
            </p>
          </div>
          <div className="text-center bg-amber-50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Loss in Purchase Power</p>
            <p className="text-xl font-bold text-amber-600">
              -{formatCurrency(inflationLoss)}
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
            netFinancialImpact >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(netFinancialImpact)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Earnings minus inflation loss
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
