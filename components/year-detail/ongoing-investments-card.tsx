'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationInvestment } from '@/lib/simulation';

interface OngoingInvestmentsCardProps {
  adjustedProjection: YearProjection;
  onLiquidateInvestment?: (investment: SimulationInvestment, startYear: number, currentYear: number) => void;
}

export function OngoingInvestmentsCard({ adjustedProjection, onLiquidateInvestment }: OngoingInvestmentsCardProps) {
  if (!adjustedProjection.simulationInvestmentDetails?.ongoingInvestments || 
      adjustedProjection.simulationInvestmentDetails.ongoingInvestments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <span>Ongoing Investments</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-600 mb-1">Total Interest Earned This Year</p>
          <p className="text-xl font-bold text-blue-600">
            {formatCurrency(adjustedProjection.simulationInvestmentDetails.totalInterest || 0)}
          </p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium text-blue-700">Active Investments</h4>
          {adjustedProjection.simulationInvestmentDetails.ongoingInvestments.map((ongoing, index) => {
            const yearsHeld = adjustedProjection.year - ongoing.startYear;
            const maturityYear = ongoing.startYear + ongoing.investment.terms;
            
            // Calculate current value for this specific year
            const currentValue = yearsHeld > 0 
              ? ongoing.investment.amountInvested * Math.pow(1 + ongoing.investment.annualInterestRate / 100, yearsHeld)
              : ongoing.investment.amountInvested;
            
            // Can only liquidate early if:
            // 1. Not in the year it was made (yearsHeld > 0)
            // 2. Not in the year it matures (yearsHeld < terms)
            const canLiquidateEarly = yearsHeld > 0 && 
              yearsHeld < ongoing.investment.terms;
            
            // Determine investment status
            let statusText = '';
            let statusColor = 'text-blue-600';
            
            if (yearsHeld === 0) {
              statusText = 'Just Started';
              statusColor = 'text-green-600';
            } else if (yearsHeld === ongoing.investment.terms) {
              statusText = 'Matures This Year';
              statusColor = 'text-orange-600';
            } else if (canLiquidateEarly) {
              statusText = 'Early Liquidation Available';
              statusColor = 'text-blue-600';
            } else {
              statusText = 'Growing';
              statusColor = 'text-blue-600';
            }
            
            return (
              <div key={index} className="border rounded-lg p-3 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">
                    {ongoing.investment.strategyName || `${ongoing.investment.investmentType} Investment`}
                  </h5>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {ongoing.investment.investmentType}
                    </Badge>
                    {canLiquidateEarly && onLiquidateInvestment && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLiquidateInvestment(ongoing.investment, ongoing.startYear, adjustedProjection.year)}
                        className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                        title="Liquidate Early (with penalty)"
                      >
                        Liquidate
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Original Amount</p>
                    <p className="font-medium">{formatCurrency(ongoing.investment.amountInvested)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Value ({adjustedProjection.year})</p>
                    <p className="font-medium text-blue-600">{formatCurrency(currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{ongoing.investment.annualInterestRate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Years Held</p>
                    <p className="font-medium">{yearsHeld} / {ongoing.investment.terms}</p>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                  <p className={`font-medium ${statusColor}`}>
                    {statusText}
                  </p>
                  <p className="text-blue-600">
                    Started: {ongoing.startYear} • 
                    Maturity: {maturityYear} • 
                    {canLiquidateEarly ? 'Early penalty applies' : yearsHeld === 0 ? 'Cannot liquidate yet' : yearsHeld === ongoing.investment.terms ? 'Will mature automatically' : 'Cannot liquidate early'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
