'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

interface BalanceOverviewCardProps {
  adjustedProjection: YearProjection;
  model: SimulationParams;
}

export function BalanceOverviewCard({ adjustedProjection, model }: BalanceOverviewCardProps) {
  const isNegativeBalance = adjustedProjection.closingBalance < 0;
  const isLowBalance = adjustedProjection.closingBalance < 50000 && adjustedProjection.closingBalance >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Balance Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Opening Balance</p>
            <p className={`font-bold text-lg ${adjustedProjection.openingBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(adjustedProjection.openingBalance)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Closing Balance</p>
            <p className={`font-bold text-lg ${
              isNegativeBalance ? 'text-red-600' : isLowBalance ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {formatCurrency(adjustedProjection.closingBalance)}
            </p>
            {isNegativeBalance && (
              <Badge variant="destructive" className="mt-1">
                Deficit
              </Badge>
            )}
            {isLowBalance && !isNegativeBalance && (
              <Badge variant="outline" className="mt-1 text-yellow-600 border-yellow-600">
                Low Balance
              </Badge>
            )}
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Collections</span>
            <span className="font-medium text-green-600">
              +{formatCurrency(adjustedProjection.collections)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Expenses</span>
            <span className="font-medium text-red-600">
              -{formatCurrency(adjustedProjection.expenses)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Safety Net</span>
            <span className="font-medium text-orange-600">
              -{formatCurrency(adjustedProjection.safetyNet)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Loans Taken</span>
            <span className="font-medium text-blue-600">
              +{formatCurrency(adjustedProjection.loansTaken || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Loan Payments</span>
            <span className="font-medium text-purple-600">
              -{formatCurrency(adjustedProjection.loanPayments || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Investment Liquidations</span>
            <span className="font-medium text-green-600">
              +{formatCurrency(adjustedProjection.investmentLiquidations || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Projected Net Earnings</span>
            <span className="font-medium text-emerald-600">
              +{formatCurrency(adjustedProjection.openingBalance * model.bankInterestRate / 100)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Loss in Purchase Power</span>
            <span className="font-medium text-amber-600">
              -{formatCurrency(adjustedProjection.openingBalance * model.inflationRate / 100)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
