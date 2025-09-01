'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection, SimulationParams } from '@/lib/simulation';

interface CollectionsDetailsCardProps {
  adjustedProjection: YearProjection;
  model: SimulationParams;
}

export function CollectionsDetailsCard({ adjustedProjection, model }: CollectionsDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <span>Collections</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Housing Units</p>
            <p className="font-medium">{model.housingUnits?.toLocaleString() || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly Fee/Unit</p>
            <p className="font-medium">
              {formatCurrency(model.monthlyReserveFeesPerHousingUnit)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Inflation Rate</p>
            <p className="font-medium">{model.inflationRate}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Years from Base</p>
            <p className="font-medium">{adjustedProjection.year - model.fiscalYear}</p>
          </div>
        </div>
        <Separator />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Annual Collection</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(adjustedProjection.collections)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
