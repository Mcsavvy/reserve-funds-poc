'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection } from '@/lib/simulation';

interface InvestmentLiquidationsCardProps {
  adjustedProjection: YearProjection;
}

export function InvestmentLiquidationsCard({ adjustedProjection }: InvestmentLiquidationsCardProps) {
  if (!adjustedProjection.investmentLiquidations || adjustedProjection.investmentLiquidations === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <span>Investment Liquidations</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center bg-green-50 rounded-lg p-3">
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(adjustedProjection.investmentLiquidations || 0)}
          </p>
          <p className="text-sm text-green-600 mt-1">
            Total liquidated this year
          </p>
        </div>
        
        {adjustedProjection.investmentDetails && adjustedProjection.investmentDetails.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-green-700">Investment Details</h4>
            {adjustedProjection.investmentDetails.map((liquidation, index) => (
              <div key={index} className="border rounded-lg p-3 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">{liquidation.investment.strategyName || `${liquidation.investment.investmentType} Investment`}</h5>
                  <Badge variant="secondary" className="text-xs">
                    {liquidation.investment.investmentType}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Amount</p>
                    <p className="font-medium">{formatCurrency(liquidation.originalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Liquidated Amount</p>
                    <p className="font-medium text-green-600">{formatCurrency(liquidation.liquidatedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest Earned</p>
                    <p className="font-medium text-green-600">{formatCurrency(liquidation.interestEarned)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Years Held</p>
                    <p className="font-medium">{liquidation.yearsHeld} years</p>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                  <p className="text-green-700 font-medium">Investment Matured</p>
                  <p className="text-green-600">
                    Started: {liquidation.investment.yearStarted} • 
                    Rate: {liquidation.investment.annualInterestRate}% • 
                    Terms: {liquidation.investment.terms} years
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
