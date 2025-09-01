'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

interface LoanDetailsCardProps {
  adjustedProjection: YearProjection;
  model: SimulationParams;
}

export function LoanDetailsCard({ adjustedProjection, model }: LoanDetailsCardProps) {
  const hasLoanActivity = (adjustedProjection.loansTaken || 0) > 0 || (adjustedProjection.loanPayments || 0) > 0;

  if (!hasLoanActivity) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <span>Loan Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(adjustedProjection.loansTaken || 0) > 0 && (
          <div>
            <h4 className="font-medium text-blue-700 mb-2">Loans Taken This Year</h4>
            <div className="text-center bg-blue-50 rounded-lg p-3">
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(adjustedProjection.loansTaken || 0)}
              </p>
              <div className="text-xs text-blue-600 mt-1">
                <p>Loan Tenure: {model.loanTenureYears || 10} years</p>
                <p>Interest Rate: {model.loanInterestRate || 5}%</p>
              </div>
            </div>
          </div>
        )}
        
        {(adjustedProjection.loanPayments || 0) > 0 && (
          <div>
            <h4 className="font-medium text-purple-700 mb-2">Loan Payments This Year</h4>
            <div className="text-center bg-purple-50 rounded-lg p-3">
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(adjustedProjection.loanPayments || 0)}
              </p>
              {adjustedProjection.loanDetails && adjustedProjection.loanDetails.length > 0 && (
                <div className="text-xs text-purple-600 mt-2 space-y-1">
                  {adjustedProjection.loanDetails.map((loan, index) => (
                    <div key={index} className="flex justify-between">
                      <span>Loan from {loan.year}:</span>
                      <span>{formatCurrency(loan.payment)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
