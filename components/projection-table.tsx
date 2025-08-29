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
}

const columnHelper = createColumnHelper<YearProjection>();

// Utility function to convert projections to CSV format
function projectionsToCSV(projections: YearProjection[], model: Model | null): string {
  const headers = ['Year', 'Opening Balance', 'Collections', 'Expenses', 'Safety Net', 'Loans Taken', 'Loan Payments', 'Projected Net Earnings', 'Loss in Purchase Power', 'Closing Balance'];
  const rows = projections.map(p => [
    p.year,
    p.openingBalance,
    p.collections,
    p.expenses,
    p.safetyNet,
    p.loansTaken || 0,
    p.loanPayments || 0,
    model ? (p.openingBalance * model.bankInterestRate / 100) : 0,
    model ? (p.openingBalance * model.inflationRate / 100) : 0,
    p.closingBalance
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csvContent;
}

// Utility function to copy table data to clipboard
async function copyTableToClipboard(projections: YearProjection[], model: Model | null): Promise<void> {
  const headers = ['Year', 'Opening Balance', 'Collections', 'Expenses', 'Safety Net', 'Loans Taken', 'Loan Payments', 'Projected Net Earnings', 'Loss in Purchase Power', 'Closing Balance'];
  const rows = projections.map(p => [
    p.year,
    formatCurrency(p.openingBalance),
    formatCurrency(p.collections),
    formatCurrency(p.expenses),
    formatCurrency(p.safetyNet),
    formatCurrency(p.loansTaken || 0),
    formatCurrency(p.loanPayments || 0),
    formatCurrency(model ? (p.openingBalance * model.bankInterestRate / 100) : 0),
    formatCurrency(model ? (p.openingBalance * model.inflationRate / 100) : 0),
    formatCurrency(p.closingBalance)
  ]);
  
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

export function ProjectionTable({ projections, onYearClick, model }: ProjectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCopying, setIsCopying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      await copyTableToClipboard(projections, model);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    } finally {
      setIsCopying(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const csvContent = projectionsToCSV(projections, model);
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
    columnHelper.accessor('expenses', {
      header: 'Expenses',
      cell: (info) => {
        const value = info.getValue();
        const expenseCount = info.row.original.expenseDetails.length;
        return (
          <div className="space-y-1">
            <div className="text-red-600 font-medium">
              {formatCurrency(value)}
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
    // New column: Projected Net Earnings
    columnHelper.display({
      id: 'projectedNetEarnings',
      header: 'Projected Net Earnings',
      cell: (info) => {
        const openingBalance = info.row.original.openingBalance;
        const projectedEarnings = model ? (openingBalance * model.bankInterestRate / 100) : 0;
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
                    hasExpenses && hasLoans && "border-l-4 border-l-gradient-to-b border-l-blue-500"
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
