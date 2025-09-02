'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection } from '@/lib/simulation';

interface InvestmentSummaryCardProps {
  adjustedProjection: YearProjection;
  onAddInvestment?: () => void;
}

export function InvestmentSummaryCard({ adjustedProjection, onAddInvestment }: InvestmentSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Investment Summary</span>
          </div>
          {onAddInvestment && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddInvestment}
              className="flex items-center space-x-1"
            >
              <Plus className="h-3 w-3" />
              <span>Add Investment</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Liquidations</p>
            <p className="font-bold text-green-600">
              {formatCurrency(
                adjustedProjection.investmentLiquidations?.reduce((sum, liquidation) => sum + liquidation.liquidatedAmount, 0) || 0
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Interest Earned</p>
            <p className="font-bold text-blue-600">
              {formatCurrency(adjustedProjection.simulationInvestmentDetails?.totalInterest || 0)}
            </p>
          </div>
        </div>
        
        {/* Ongoing Investments Summary */}
        {adjustedProjection.simulationInvestmentDetails?.ongoingInvestments && 
         adjustedProjection.simulationInvestmentDetails.ongoingInvestments.length > 0 && (
          <div className="pt-3 border-t">
            <h4 className="font-medium text-gray-700 mb-2">Ongoing Investments Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Invested</p>
                <p className="font-medium">
                  {formatCurrency(
                    adjustedProjection.simulationInvestmentDetails.ongoingInvestments.reduce(
                      (sum, ongoing) => sum + ongoing.investment.amountInvested, 0
                    )
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Value ({adjustedProjection.year})</p>
                <p className="font-medium text-blue-600">
                  {formatCurrency(
                    adjustedProjection.simulationInvestmentDetails.ongoingInvestments.reduce(
                      (sum, ongoing) => {
                        const yearsHeld = adjustedProjection.year - ongoing.startYear;
                        const currentValue = yearsHeld > 0 
                          ? ongoing.investment.amountInvested * Math.pow(1 + ongoing.investment.annualInterestRate / 100, yearsHeld)
                          : ongoing.investment.amountInvested;
                        return sum + currentValue;
                      }, 0
                    )
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
