'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { YearProjection } from '@/lib/simulation';

interface WarningsCardProps {
  adjustedProjection: YearProjection;
}

export function WarningsCard({ adjustedProjection }: WarningsCardProps) {
  const isNegativeBalance = adjustedProjection.closingBalance < 0;
  const isLowBalance = adjustedProjection.closingBalance < 50000 && adjustedProjection.closingBalance >= 0;

  if (!isNegativeBalance && !isLowBalance) {
    return null;
  }

  return (
    <Card className={isNegativeBalance ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-2">
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${isNegativeBalance ? 'text-red-600' : 'text-yellow-600'}`} />
          <div>
            <h4 className={`font-medium ${isNegativeBalance ? 'text-red-800' : 'text-yellow-800'}`}>
              {isNegativeBalance ? 'Negative Balance Warning' : 'Low Balance Alert'}
            </h4>
            <p className={`text-sm ${isNegativeBalance ? 'text-red-700' : 'text-yellow-700'}`}>
              {isNegativeBalance 
                ? 'This year shows a deficit. Consider increasing reserve collections or adjusting the schedule of major expenses.'
                : 'Balance is below the recommended threshold. Monitor cash flow carefully.'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
