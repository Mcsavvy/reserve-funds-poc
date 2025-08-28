'use client';

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Settings, ChevronLeft, ChevronRight, Play, Copy, ClipboardPaste } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/db-utils';
import { Model } from '@/lib/db-schemas';

interface ModelsTableProps {
  models: Model[];
  onEdit: (model: Model) => void;
  onDelete: (model: Model) => void;
  onManageExpenses: (model: Model) => void;
  onSimulate: (model: Model) => void;
  onCopy: (model: Model) => void;
  onPaste: () => void;
  canPaste?: boolean;
}

const columnHelper = createColumnHelper<Model>();

export function ModelsTable({ models, onEdit, onDelete, onManageExpenses, onSimulate, onCopy, onPaste, canPaste = false }: ModelsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = [
    columnHelper.accessor('name', {
      header: 'Model Name',
      cell: (info) => (
        <div className="font-medium">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('fiscalYear', {
      header: 'Fiscal Year',
      cell: (info) => (
        <Badge variant="outline">
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('housingUnits', {
      header: 'Housing Units',
      cell: (info) => {
        const value = info.getValue();
        return value ? value.toLocaleString() : 'N/A';
      },
    }),
    columnHelper.accessor('startingAmount', {
      header: 'Starting Amount',
      cell: (info) => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('monthlyReserveFeesPerHousingUnit', {
      header: 'Monthly Fees/Unit',
      cell: (info) => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('inflationRate', {
      header: 'Inflation Rate',
      cell: (info) => formatPercentage(info.getValue()),
    }),
    columnHelper.accessor('safetyNetPercentage', {
      header: 'Safety Net',
      cell: (info) => formatPercentage(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const model = info.row.original;
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSimulate(model)}
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Run Simulation"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(model)}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              title="Copy Model & Expenses"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onManageExpenses(model)}
              className="h-8 w-8 p-0"
              title="Manage Expenses"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(model)}
              className="h-8 w-8 p-0"
              title="Edit Model"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(model)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              title="Delete Model"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: models,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search and Paste */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search models..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onPaste}
          disabled={!canPaste}
          className="flex items-center space-x-2"
          title="Paste Model from Clipboard"
        >
          <ClipboardPaste className="h-4 w-4" />
          <span>Paste Model</span>
        </Button>
      </div>

      {/* Table */}
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-gray-50 group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No models found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
