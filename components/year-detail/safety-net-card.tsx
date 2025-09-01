'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

interface SafetyNetCardProps {
  adjustedProjection: YearProjection;
  model: SimulationParams;
}

export function SafetyNetCard({ adjustedProjection, model }: SafetyNetCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span>Safety Net</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Safety Net Rate</p>
            <p className="font-medium">{model.safetyNetPercentage}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Applied to Expenses</p>
            <p className="font-medium">{formatCurrency(adjustedProjection.expenses)}</p>
          </div>
        </div>
        <Separator />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Safety Net Amount</p>
          <p className="text-xl font-bold text-orange-600">
            {formatCurrency(adjustedProjection.safetyNet)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
