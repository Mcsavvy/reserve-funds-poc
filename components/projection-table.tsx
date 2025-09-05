'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection } from '@/lib/simulation';
import { Model } from '@/lib/db-schemas';
import { cn } from '@/lib/utils';
import { Copy, Download } from 'lucide-react';

interface ProjectionTableProps {
  projections: YearProjection[];
  onYearClick: (year: YearProjection) => void;
  model: Model | null;
  simulationInvestments?: Record<number, any[]>;
}

const columnHelper = createColumnHelper<YearProjection>();

// Utility function to convert projections to CSV format
function projectionsToCSV(projections: YearProjection[], model: Model | null, simulationInvestments?: Record<number, any[]>): string {
  const headers = ['Year', 'Opening Balance', 'Collections', 'Total Expenses', 'Out-of-Pocket', 'Safety Net', 'Loans Taken', 'Loan Payments', 'Available to Invest', 'Invested Amount', 'Investment Liquidations', 'Projected Net Earnings', 'Loss in Purchase Power', 'Closing Balance'];
  const rows = projections.map(p => {
    const year = p.year;
    const yearInvestments = simulationInvestments?.[year] || [];
    const totalInvested = yearInvestments.reduce((sum, inv) => sum + inv.amountInvested, 0);
    const availableToInvest = Math.max(0, p.closingBalance - totalInvested);
    const liquidationsTotal = Array.isArray(p.investmentLiquidations) 
      ? p.investmentLiquidations.reduce((sum, liquidation) => sum + liquidation.liquidatedAmount, 0)
      : (p.investmentLiquidations || 0);
    const projectedNetEarnings = model ? (p.openingBalance * model.bankInterestRate / 100) : 0;
    const lossInPurchasePower = model ? (p.openingBalance * model.inflationRate / 100) : 0;
    const totalExpenses = p.expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    
    return [
      p.year,
      p.openingBalance,
      p.collections,
      totalExpenses,
      p.expenses,
      p.safetyNet,
      p.loansTaken || 0,
      p.loanPayments || 0,
      availableToInvest,
      totalInvested,
      liquidationsTotal,
      projectedNetEarnings,
      lossInPurchasePower,
      p.closingBalance
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csvContent;
}

// Utility function to copy table data to clipboard
async function copyTableToClipboard(projections: YearProjection[], model: Model | null, simulationInvestments?: Record<number, any[]>): Promise<void> {
  const headers = ['Year', 'Opening Balance', 'Collections', 'Total Expenses', 'Out-of-Pocket', 'Safety Net', 'Loans Taken', 'Loan Payments', 'Available to Invest', 'Invested Amount', 'Investment Liquidations', 'Projected Net Earnings', 'Loss in Purchase Power', 'Closing Balance'];
  const rows = projections.map(p => {
    const year = p.year;
    const yearInvestments = simulationInvestments?.[year] || [];
    const totalInvested = yearInvestments.reduce((sum, inv) => sum + inv.amountInvested, 0);
    const availableToInvest = Math.max(0, p.closingBalance - totalInvested);
    const liquidationsTotal = Array.isArray(p.investmentLiquidations) 
      ? p.investmentLiquidations.reduce((sum, liquidation) => sum + liquidation.liquidatedAmount, 0)
      : (p.investmentLiquidations || 0);
    const projectedNetEarnings = model ? (p.openingBalance * model.bankInterestRate / 100) : 0;
    const lossInPurchasePower = model ? (p.openingBalance * model.inflationRate / 100) : 0;
    const totalExpenses = p.expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
    
    return [
      p.year,
      formatCurrency(p.openingBalance),
      formatCurrency(p.collections),
      formatCurrency(totalExpenses),
      formatCurrency(p.expenses),
      formatCurrency(p.safetyNet),
      formatCurrency(p.loansTaken || 0),
      formatCurrency(p.loanPayments || 0),
      formatCurrency(availableToInvest),
      formatCurrency(totalInvested),
      formatCurrency(liquidationsTotal),
      formatCurrency(projectedNetEarnings),
      formatCurrency(lossInPurchasePower),
      formatCurrency(p.closingBalance)
    ];
  });
  
  const tableText = [headers, ...rows]
    .map(row => row.join('\t'))
    .join('\n');
  
  try {
    await navigator.clipboard.writeText(tableText);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = tableText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

export function ProjectionTable({ projections, onYearClick, model, simulationInvestments }: ProjectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCopying, setIsCopying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      await copyTableToClipboard(projections, model, simulationInvestments);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    } finally {
      setIsCopying(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const csvContent = projectionsToCSV(projections, model, simulationInvestments);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'projection-data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    columnHelper.accessor('year', {
      header: 'Year',
      cell: (info) => (
        <div className="font-medium">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('openingBalance', {
      header: 'Opening Balance',
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className={cn(
            "font-medium",
            value < 0 ? "text-red-600" : "text-gray-900"
          )}>
            {formatCurrency(value)}
          </div>
        );
      },
    }),
    columnHelper.accessor('collections', {
      header: 'Collections',
      cell: (info) => (
        <div className="text-green-600 font-medium">
          {formatCurrency(info.getValue())}
        </div>
      ),
    }),
    // New column: Total Expenses (before loan deduction)
    columnHelper.display({
      id: 'totalExpenses',
      header: 'Total Expenses',
      cell: (info) => {
        const projection = info.row.original;
        const totalExpenses = projection.expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
        const expenseCount = projection.expenseDetails.length;
        return (
          <div className="space-y-1">
            <div className="text-red-600 font-medium">
              {formatCurrency(totalExpenses)}
            </div>
            {expenseCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {expenseCount} item{expenseCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('expenses', {
      header: 'Out-of-Pocket',
      cell: (info) => {
        const value = info.getValue();
        const projection = info.row.original;
        const totalExpenses = projection.expenseDetails.reduce((sum, detail) => sum + detail.inflatedCost, 0);
        const loanAmount = projection.loansTaken || 0;
        
        // Show loan percentage if there's a loan
        const loanPercentage = totalExpenses > 0 && loanAmount > 0 
          ? ((loanAmount / totalExpenses) * 100).toFixed(1) 
          : null;
        
        return (
          <div className="space-y-1">
            <div className="text-orange-600 font-medium">
              {formatCurrency(value)}
            </div>
            {loanPercentage && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                {loanPercentage}% loan
              </Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('safetyNet', {
      header: 'Safety Net',
      cell: (info) => (
        <div className="text-orange-600 font-medium">
          {formatCurrency(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor('loansTaken', {
      header: 'Loans Taken',
      cell: (info) => {
        const value = info.getValue() || 0;
        return (
          <div className="space-y-1">
            <div className={cn(
              "font-medium",
              value > 0 ? "text-blue-600" : "text-gray-500"
            )}>
              {formatCurrency(value)}
            </div>
            {value > 0 && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                Loan
              </Badge>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('loanPayments', {
      header: 'Loan Payments',
      cell: (info) => {
        const value = info.getValue() || 0;
        const loanCount = info.row.original.loanDetails?.length || 0;
        return (
          <div className="space-y-1">
            <div className={cn(
              "font-medium",
              value > 0 ? "text-purple-600" : "text-gray-500"
            )}>
              {formatCurrency(value)}
            </div>
            {loanCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {loanCount} loan{loanCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        );
      },
    }),
    // New column: Available to Invest
    columnHelper.display({
      id: 'availableToInvest',
      header: 'Available to Invest',
      cell: (info) => {
        const year = info.row.original.year;
        const yearInvestments = simulationInvestments?.[year] || [];
        const totalInvested = yearInvestments.reduce((sum, inv) => sum + inv.amountInvested, 0);
        const availableToInvest = Math.max(0, info.row.original.closingBalance - totalInvested);
        
        return (
          <div className="space-y-1">
            <div className={cn(
              "font-medium",
              availableToInvest > 0 ? "text-emerald-600" : "text-gray-500"
            )}>
              {formatCurrency(availableToInvest)}
            </div>
            {availableToInvest > 0 && (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-600">
                Available
              </Badge>
            )}
          </div>
        );
      },
    }),
    // New column: Invested Amount
    columnHelper.display({
      id: 'investedAmount',
      header: 'Invested Amount',
      cell: (info) => {
        const year = info.row.original.year;
        const yearInvestments = simulationInvestments?.[year] || [];
        const investedAmount = yearInvestments.reduce((sum, inv) => sum + inv.amountInvested, 0);
        
        return (
          <div className="space-y-1">
            <div className={cn(
              "font-medium",
              investedAmount > 0 ? "text-blue-600" : "text-gray-500"
            )}>
              {formatCurrency(investedAmount)}
            </div>
            {investedAmount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {yearInvestments.length} investment{yearInvestments.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        );
      },
    }),
    // New column: Investment Liquidations
    columnHelper.accessor('investmentLiquidations', {
      header: 'Investment Liquidations',
      cell: (info) => {
        const value = info.getValue() || [];
        const investmentCount = info.row.original.investmentDetails?.length || 0;
        const liquidationsTotal = Array.isArray(value) 
          ? value.reduce((sum, liquidation) => sum + liquidation.liquidatedAmount, 0)
          : (value || 0);
        
        return (
          <div className="space-y-1">
            <div className={cn(
              "font-medium",
              liquidationsTotal > 0 ? "text-green-600" : "text-gray-500"
            )}>
              {formatCurrency(liquidationsTotal)}
            </div>
            {liquidationsTotal > 0 && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                {investmentCount > 0 ? `${investmentCount} matured` : 'Liquidated'}
              </Badge>
            )}
          </div>
        );
      },
    }),
    // New column: Projected Net Earnings
    columnHelper.display({
      id: 'projectedNetEarnings',
      header: 'Projected Net Earnings',
      cell: (info) => {
        const projectedEarnings = model ? (info.row.original.openingBalance * model.bankInterestRate / 100) : 0;
        return (
          <div className="text-emerald-600 font-medium">
            {formatCurrency(projectedEarnings)}
          </div>
        );
      },
    }),
    // New column: Loss in Purchase Power
    columnHelper.display({
      id: 'lossInPurchasePower',
      header: 'Loss in Purchase Power',
      cell: (info) => {
        const openingBalance = info.row.original.openingBalance;
        const lossInPurchasePower = model ? (openingBalance * model.inflationRate / 100) : 0;
        return (
          <div className="text-amber-600 font-medium">
            {formatCurrency(lossInPurchasePower)}
          </div>
        );
      },
    }),
    columnHelper.accessor('closingBalance', {
      header: 'Closing Balance',
      cell: (info) => {
        const value = info.getValue();
        const isNegative = value < 0;
        const isLow = value < 50000 && value >= 0; // Threshold for "low" balance
        
        return (
          <div className="space-y-1">
            <div className={cn(
              "font-bold",
              isNegative ? "text-red-600" : isLow ? "text-yellow-600" : "text-green-600"
            )}>
              {formatCurrency(value)}
            </div>
            {isNegative && (
              <Badge variant="destructive" className="text-xs">
                Deficit
              </Badge>
            )}
            {isLow && !isNegative && (
              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                Low
              </Badge>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: projections,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="relative rounded-md border">
      {/* Floating Action Buttons */}
      <div className="absolute -top-10 right-2 flex gap-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={isCopying || projections.length === 0}
          className="h-8 px-2 bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white shadow-sm"
        >
          <Copy className="h-3 w-3" />
          {isCopying ? 'Copying...' : ''}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={isExporting || projections.length === 0}
          className="h-8 px-2 bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white shadow-sm"
        >
          <Download className="h-3 w-3" />
          {isExporting ? 'Exporting...' : ''}
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' && ' ↑'}
                  {header.column.getIsSorted() === 'desc' && ' ↓'}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const projection = row.original;
              const isNegative = projection.closingBalance < 0;
              const isLow = projection.closingBalance < 50000 && projection.closingBalance >= 0;
              const hasExpenses = projection.expenseDetails.length > 0;
              const hasLoans = (projection.loansTaken || 0) > 0 || (projection.loanPayments || 0) > 0;
              const hasInvestments = (simulationInvestments?.[projection.year]?.length || 0) > 0;
              const liquidations = Array.isArray(projection.investmentLiquidations) ? projection.investmentLiquidations : [];
              const hasLiquidations = liquidations.length > 0;
              
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    "hover:bg-gray-50",
                    isNegative && "bg-red-50 hover:bg-red-100",
                    isLow && !isNegative && "bg-yellow-50 hover:bg-yellow-100",
                    hasExpenses && "border-l-4 border-l-blue-500",
                    hasLoans && !hasExpenses && "border-l-4 border-l-purple-500",
                    hasExpenses && hasLoans && "border-l-4 border-l-gradient-to-b border-l-blue-500",
                    hasInvestments && !hasExpenses && !hasLoans && "border-l-4 border-l-emerald-500",
                    hasLiquidations && !hasExpenses && !hasLoans && !hasInvestments && "border-l-4 border-l-green-500"
                  )}
                  onClick={() => onYearClick(projection)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No projection data available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
