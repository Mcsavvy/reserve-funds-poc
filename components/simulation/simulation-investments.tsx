'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { SimulationInvestment } from '@/components/add-simulation-investment-dialog';

interface SimulationInvestmentsProps {
  simulationInvestments: Record<number, SimulationInvestment[]>;
  onRemoveInvestment: (year: number, investmentIndex: number) => void;
  onLiquidateInvestment?: (investment: SimulationInvestment, startYear: number, currentYear: number) => void;
  onUnliquidateInvestment?: (investment: SimulationInvestment, startYear: number) => void;
  currentYear?: number;
}

export function SimulationInvestments({ 
  simulationInvestments, 
  onRemoveInvestment,
  onLiquidateInvestment,
  onUnliquidateInvestment,
  currentYear
}: SimulationInvestmentsProps) {
  if (Object.keys(simulationInvestments).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Simulation Investments</CardTitle>
          <p className="text-sm text-muted-foreground">
            Investments added during simulation (not persisted to database)
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No simulation investments added yet. Click on any year in the projection table to add investments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulation Investments</CardTitle>
        <p className="text-sm text-muted-foreground">
          Investments added during simulation (not persisted to database). Use the year detail sidebar to liquidate investments.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(simulationInvestments).map(([yearStr, investments]) => (
            <div key={yearStr} className="border rounded-lg p-4">
              <h3 className="font-medium text-lg mb-3">Year {yearStr}</h3>
              <div className="space-y-3">
                {investments.map((investment, index) => {
                  const isLiquidated = investment.isLiquidated;
                  const yearsHeld = currentYear ? currentYear - parseInt(yearStr) : 0;
                  const canLiquidateEarly = currentYear && 
                    yearsHeld > 0 && 
                    yearsHeld < investment.terms && 
                    !isLiquidated;
                  
                  return (
                    <div 
                      key={index} 
                      className={`rounded-lg p-3 border ${
                        isLiquidated 
                          ? 'bg-gray-50 border-gray-300' 
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          {investment.strategyName || `${investment.investmentType} Investment`}
                          {isLiquidated && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Liquidated
                            </Badge>
                          )}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {investment.investmentType}
                          </Badge>
                          {!isLiquidated && (
                            <>
                              {canLiquidateEarly && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  Can Liquidate
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveInvestment(parseInt(yearStr), index)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                title="Remove Investment"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {isLiquidated && onUnliquidateInvestment && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onUnliquidateInvestment(investment, parseInt(yearStr))}
                              className="h-7 px-2 text-blue-600 hover:text-blue-700 border-blue-300"
                              title="Unliquidate Investment"
                            >
                              <TrendingUp className="h-3 w-3 rotate-180 mr-1" />
                              Unliquidate
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount Invested</p>
                          <p className="font-medium">{formatCurrency(investment.amountInvested)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Interest Rate</p>
                          <p className="font-medium">{investment.annualInterestRate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Terms</p>
                          <p className="font-medium">{investment.terms} years</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Maturity Year</p>
                          <p className="font-medium">{parseInt(yearStr) + investment.terms}</p>
                        </div>
                        {isLiquidated && investment.liquidatedAmount && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Liquidated Amount</p>
                              <p className="font-medium text-green-600">{formatCurrency(investment.liquidatedAmount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Liquidation Year</p>
                              <p className="font-medium">{investment.liquidationYear}</p>
                            </div>
                          </>
                        )}
                      </div>
                      {investment.note && (
                        <p className="text-xs text-gray-600 mt-2 italic">
                          {investment.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
