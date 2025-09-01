'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

interface ExpensesDetailsCardProps {
  adjustedProjection: YearProjection;
  model: SimulationParams;
}

export function ExpensesDetailsCard({ adjustedProjection, model }: ExpensesDetailsCardProps) {
  const hasExpenses = adjustedProjection.expenseDetails.length > 0;

  if (!hasExpenses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <TrendingDown className="h-5 w-5 text-gray-400" />
            <span>Expenses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No scheduled expenses for this year
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <TrendingDown className="h-5 w-5 text-red-600" />
          <span>Scheduled Expenses</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {adjustedProjection.expenseDetails.map((detail, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{detail.expense.name}</h4>
                {detail.expense.sirs && (
                  <Badge variant="secondary" className="text-xs">SIRS</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Base Cost</p>
                  <p className="font-medium">{formatCurrency(detail.expense.cost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inflated Cost</p>
                  <p className="font-medium text-red-600">{formatCurrency(detail.inflatedCost)}</p>
                </div>
                {detail.loanAmount > 0 && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Loan Amount</p>
                      <p className="font-medium text-blue-600">{formatCurrency(detail.loanAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Out-of-Pocket</p>
                      <p className="font-medium text-orange-600">{formatCurrency(detail.outOfPocketAmount)}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-muted-foreground">Expected Life</p>
                  <p className="font-medium">{detail.expense.expectedLife} years</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining Life</p>
                  <p className="font-medium">{detail.expense.remainingLife} years</p>
                </div>
              </div>
              {detail.loanAmount > 0 && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  <p className="text-blue-700 font-medium">Large Expense - Loan Applied</p>
                  <p className="text-blue-600">Threshold: {model.loanThresholdPercentage}% • Baseline: {formatCurrency(model.largeExpenseBaseline || 0)}</p>
                </div>
              )}
            </div>
          ))}
          <Separator />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(adjustedProjection.expenses)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
