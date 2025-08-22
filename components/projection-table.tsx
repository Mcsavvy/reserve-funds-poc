'use client';

import React from 'react';
import { ProjectionRow } from '@/lib/types';
import { formatCurrency } from '@/lib/financial-calculator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ProjectionTableProps {
  projections: ProjectionRow[];
}

export function ProjectionTable({ projections }: ProjectionTableProps) {
  if (projections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Projections</CardTitle>
          <CardDescription>
            Configure parameters and expenses to see projections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No projections available. Please check your parameters and try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Projections</CardTitle>
        <CardDescription>
          Year-by-year financial projections based on your parameters and planned expenses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="min-w-[60px]">Year</TableHead>
                  <TableHead className="min-w-[120px]">Opening Balance</TableHead>
                  <TableHead className="min-w-[140px]">Base Maintenance (Inflated)</TableHead>
                  <TableHead className="min-w-[140px]">Expenses</TableHead>
                  <TableHead className="min-w-[130px]">Reserve Contribution</TableHead>
                  <TableHead className="min-w-[120px]">Loan Repayments</TableHead>
                  <TableHead className="min-w-[140px]">Collections w/o Safety Net</TableHead>
                  <TableHead className="min-w-[140px]">Provisional End Balance</TableHead>
                  <TableHead className="min-w-[120px]">Safety Net Target</TableHead>
                  <TableHead className="min-w-[120px]">Safety Net Top-Up</TableHead>
                  <TableHead className="min-w-[140px]">Total Maintenance Collected</TableHead>
                  <TableHead className="min-w-[120px]">Closing Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projections.map((row) => {
                  const isNegativeBalance = row.closingBalance < 0;
                  const hasLargeExpense = row.futureExpensesInYear > 0;
                  const hasLoanRepayment = row.loanRepayments < 0; // Loan repayments are negative
                  const isFeesCapped = row.feeIncreaseCapped;
                  
                  return (
                    <TableRow key={row.year} className={isNegativeBalance ? 'bg-red-50' : isFeesCapped ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {row.fiscalYear}
                          {hasLargeExpense && (
                            <Badge variant="destructive" className="text-xs">
                              Expense
                            </Badge>
                          )}
                          {isFeesCapped && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                              Fee Cap
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={row.openingBalance < 0 ? 'text-red-600' : ''}>
                        {formatCurrency(row.openingBalance)}
                      </TableCell>
                      <TableCell>{formatCurrency(row.baseMaintenanceInflated)}</TableCell>
                      <TableCell className={hasLargeExpense ? 'font-semibold text-red-600' : ''}>
                        {row.futureExpensesInYear > 0 ? formatCurrency(row.futureExpensesInYear) : '-'}
                      </TableCell>
                      <TableCell className={row.reserveContribution > 0 ? 'text-blue-600' : ''}>
                        {row.reserveContribution > 0 ? formatCurrency(row.reserveContribution) : '-'}
                      </TableCell>
                      <TableCell className={hasLoanRepayment ? 'text-orange-600' : ''}>
                        {hasLoanRepayment ? formatCurrency(row.loanRepayments) : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(row.collectionsWithoutSafetyNet)}</TableCell>
                      <TableCell className={row.provisionalEndBalance < 0 ? 'text-red-600' : ''}>
                        {formatCurrency(row.provisionalEndBalance)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatCurrency(row.safetyNetTarget)}
                      </TableCell>
                      <TableCell className={row.safetyNetTopUp > 0 ? 'text-orange-600 font-semibold' : ''}>
                        {row.safetyNetTopUp > 0 ? formatCurrency(row.safetyNetTopUp) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(row.totalMaintenanceCollected)}
                      </TableCell>
                      <TableCell className={`font-semibold ${isNegativeBalance ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(row.closingBalance)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Summary section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(projections[projections.length - 1]?.closingBalance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Final Balance ({projections[projections.length - 1]?.fiscalYear || 'N/A'})</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(projections.reduce((sum, row) => sum + row.totalMaintenanceCollected, 0))}
              </div>
              <p className="text-xs text-muted-foreground">Total Maintenance Collected</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(projections.reduce((sum, row) => sum + row.futureExpensesInYear, 0))}
              </div>
              <p className="text-xs text-muted-foreground">Total Future Expenses</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Legend */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Legend:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border"></div>
              <span>Negative Balance Year</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border"></div>
              <span>Fee Increase Capped</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">Expense</Badge>
              <span>Large Expense Year</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Fee Cap</Badge>
              <span>Fee Cap Applied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-600"></div>
              <span>Loan Payments</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
