'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/db-utils';
import { OptimizationResult } from '@/lib/simulation';

interface OptimizationResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: OptimizationResult | null;
  onApply: (optimizedParams: OptimizationResult['optimizedParams']) => void;
}

export function OptimizationResultsDialog({
  open,
  onOpenChange,
  result,
  onApply
}: OptimizationResultsDialogProps) {
  const [isApplying, setIsApplying] = useState(false);

  if (!result) return null;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      onApply(result.optimizedParams);
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  };

  const isOptimal = Math.abs(result.changes.feeIncreasePercentage) < 0.1;
  const isIncrease = result.changes.feeIncrease > 0;
  const isDecrease = result.changes.feeIncrease < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isOptimal ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : isIncrease ? (
              <ArrowUpCircle className="h-5 w-5 text-blue-600" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-orange-600" />
            )}
            <span>Fee Optimization Results</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="summary" className="mt-6">
          <TabsList className={`grid w-full ${result.hasYearlyAdjustments ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            {result.hasYearlyAdjustments && (
              <TabsTrigger value="yearly">Year-by-Year</TabsTrigger>
            )}
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6 mt-6">
            {/* Fee Changes Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Optimized Fee Structure</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Base Monthly Fee</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(result.changes.originalMonthlyFee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {result.hasYearlyAdjustments ? 'Average Optimized Fee' : 'Optimized Monthly Fee'}
                    </p>
                    <p className={`text-xl font-bold ${
                      isIncrease ? 'text-blue-600' : isDecrease ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(result.changes.optimizedMonthlyFee)}
                    </p>
                    {result.hasYearlyAdjustments && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Across {result.yearlyAdjustments.length} adjusted years
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {result.hasYearlyAdjustments ? 'Average Change' : 'Change'}
                    </p>
                    <div className="space-y-1">
                      <p className={`text-lg font-bold ${
                        isIncrease ? 'text-blue-600' : isDecrease ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {result.changes.feeIncrease > 0 ? '+' : ''}
                        {formatCurrency(result.changes.feeIncrease)}
                      </p>
                      <Badge variant={isIncrease ? 'default' : isDecrease ? 'secondary' : 'outline'}>
                        {result.changes.feeIncreasePercentage > 0 ? '+' : ''}
                        {result.changes.feeIncreasePercentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Balance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Minimum Balance</p>
                    <p className={`font-bold text-lg ${
                      result.stats.minBalance < 0 ? 'text-red-600' : 
                      result.stats.minBalance < 50000 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(result.stats.minBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Maximum Balance</p>
                    <p className={`font-bold text-lg ${
                      result.stats.maxBalance > 500000 ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(result.stats.maxBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Final Balance</p>
                    <p className={`font-bold text-lg ${
                      result.stats.finalBalance < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(result.stats.finalBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    {result.stats.negativeBalanceYears === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">Deficit Years</p>
                      <p className="text-sm text-muted-foreground">
                        {result.stats.negativeBalanceYears} years with negative balance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Average Balance</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(result.stats.averageBalance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {result.hasYearlyAdjustments && (
            <TabsContent value="yearly" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Year-by-Year Fee Adjustments</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-4 text-sm font-medium border-b pb-2">
                      <div>Year</div>
                      <div className="text-center">Original Fee</div>
                      <div className="text-center">Optimized Fee</div>
                      <div className="text-center">Increase</div>
                      <div className="text-center">% Change</div>
                      <div>Reason</div>
                    </div>
                    
                    {result.yearlyAdjustments.map((adjustment) => (
                      <div key={adjustment.year} className="grid grid-cols-6 gap-4 text-sm py-2 border-b border-gray-100">
                        <div className="font-medium">{adjustment.year}</div>
                        <div className="text-center">{formatCurrency(adjustment.originalFee)}</div>
                        <div className="text-center font-medium text-blue-600">
                          {formatCurrency(adjustment.optimizedFee)}
                        </div>
                        <div className={`text-center font-medium ${
                          adjustment.feeIncrease > 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {adjustment.feeIncrease > 0 ? '+' : ''}
                          {formatCurrency(adjustment.feeIncrease)}
                        </div>
                        <div className={`text-center ${
                          adjustment.feeIncreasePercentage > 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {adjustment.feeIncreasePercentage > 0 ? '+' : ''}
                          {adjustment.feeIncreasePercentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">{adjustment.reason}</div>
                      </div>
                    ))}
                  </div>
                  
                  {result.yearlyAdjustments.length > 1 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Dynamic Optimization:</strong> Each year's fee is individually optimized to address specific deficits while respecting maximum allowable increases.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="comparison" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Before vs After Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium border-b pb-2">
                    <div>Metric</div>
                    <div className="text-center">Before</div>
                    <div className="text-center">After</div>
                  </div>
                  
                  {/* Add comparison rows here - would need original stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>Monthly Fee per Unit</div>
                    <div className="text-center">{formatCurrency(result.changes.originalMonthlyFee)}</div>
                    <div className="text-center font-medium">{formatCurrency(result.changes.optimizedMonthlyFee)}</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>Total Annual Collections</div>
                    <div className="text-center">-</div>
                    <div className="text-center font-medium">{formatCurrency(result.stats.totalCollections)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  <span>Optimization Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm">{recommendation}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={isApplying}
            className={isIncrease ? 'bg-blue-600 hover:bg-blue-700' : isDecrease ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {isApplying ? 'Applying...' : 'Apply Optimization'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
