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
import { formatCurrency } from '@/lib/db-utils';
import { YearProjection } from '@/lib/simulation';
import { cn } from '@/lib/utils';

interface ProjectionTableProps {
  projections: YearProjection[];
  onYearClick: (year: YearProjection) => void;
}

const columnHelper = createColumnHelper<YearProjection>();

export function ProjectionTable({ projections, onYearClick }: ProjectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

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
    <div className="rounded-md border">
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
              
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    "hover:bg-gray-50",
                    isNegative && "bg-red-50 hover:bg-red-100",
                    isLow && !isNegative && "bg-yellow-50 hover:bg-yellow-100",
                    hasExpenses && "border-l-4 border-l-blue-500"
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
  );
}
