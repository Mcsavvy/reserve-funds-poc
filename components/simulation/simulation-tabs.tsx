'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/db-utils';
import { ProjectionTable } from '@/components/projection-table';
import { SimulationCharts } from '@/components/simulation-charts';
import { SimulationInvestments } from '@/components/simulation';
import { SimulationParams, YearProjection } from '@/lib/simulation';
import { Model } from '@/lib/db-schemas';
import { SimulationInvestment } from '@/components/add-simulation-investment-dialog';

interface SimulationTabsProps {
  projections: YearProjection[];
  stats: {
    negativeBalanceYears: number;
  } | null;
  simulationParams: SimulationParams | null;
  simulationInvestments: Record<number, SimulationInvestment[]>;
  onYearClick: (year: YearProjection) => void;
  onRemoveInvestment: (year: number, investmentIndex: number) => void;
  onLiquidateInvestment?: (investment: SimulationInvestment, startYear: number, currentYear: number) => void;
  onUnliquidateInvestment?: (investment: SimulationInvestment, startYear: number) => void;
}

export function SimulationTabs({ 
  projections, 
  stats, 
  simulationParams, 
  simulationInvestments,
  onYearClick,
  onRemoveInvestment,
  onLiquidateInvestment,
  onUnliquidateInvestment
}: SimulationTabsProps) {
  return (
    <Tabs defaultValue="projection" className="space-y-6">
      <TabsList>
        <TabsTrigger value="projection">Projection</TabsTrigger>
        <TabsTrigger value="analysis">Analysis</TabsTrigger>
        <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
      </TabsList>

      <TabsContent value="projection">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Year-by-Year Projection</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click on any year to view and edit details
                </p>
              </div>
              {stats && stats.negativeBalanceYears > 0 && (
                <Badge variant="destructive">
                  {stats.negativeBalanceYears} year{stats.negativeBalanceYears > 1 ? 's' : ''} with negative balance
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ProjectionTable
              projections={projections}
              onYearClick={onYearClick}
              model={simulationParams as any} // TODO: Fix type mismatch
              simulationInvestments={simulationInvestments}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analysis">
        <Card>
          <CardHeader>
            <CardTitle>Financial Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {projections.length > 0 && (
              <div className="space-y-8">
                <SimulationCharts 
                  projections={projections}
                  housingUnits={simulationParams?.housingUnits || 1}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                  <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {formatCurrency(Math.max(...projections.map(p => p.collections)))}
                    </div>
                    <div className="text-sm text-blue-700 font-medium">Peak Collections</div>
                  </div>
                  <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {formatCurrency(Math.max(...projections.map(p => p.expenses)))}
                    </div>
                    <div className="text-sm text-red-700 font-medium">Peak Expenses</div>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {formatCurrency(Math.max(...projections.map(p => p.loansTaken || 0)))}
                    </div>
                    <div className="text-sm text-purple-700 font-medium">Peak Loans Taken</div>
                  </div>
                  <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {formatCurrency(Math.max(...projections.map(p => p.loanPayments || 0)))}
                    </div>
                    <div className="text-sm text-orange-700 font-medium">Peak Loan Payments</div>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {formatCurrency(Math.max(...projections.map(p => p.investmentLiquidations || 0)))}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Peak Investment Liquidations</div>
                  </div>
                  <div className="text-center p-6 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-3xl font-bold text-emerald-600 mb-2">
                      {formatCurrency(Math.max(...projections.map(p => p.closingBalance)))}
                    </div>
                    <div className="text-sm text-emerald-700 font-medium">Peak Balance</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="scenarios">
        <SimulationInvestments
          simulationInvestments={simulationInvestments}
          onRemoveInvestment={onRemoveInvestment}
          onLiquidateInvestment={onLiquidateInvestment}
          onUnliquidateInvestment={onUnliquidateInvestment}
          currentYear={projections.length > 0 ? projections[0].year : undefined}
        />
      </TabsContent>
    </Tabs>
  );
}
