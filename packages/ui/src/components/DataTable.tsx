import * as React from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '../utils/cn';

export interface ColumnDef<T> {
  id: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (props: { row: T; value: unknown }) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  searchQuery?: string;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  pageSize?: number;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  pageSize = 10,
  selectedIds,
  onSelectionChange,
  emptyMessage = 'No data available',
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = React.useState(1);

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colId);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    const col = columns.find((c) => c.id === sortColumn);
    if (!col || !col.accessorKey) return data;

    const key = col.accessorKey;
    return [...data].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      if (valA == null && valB == null) return 0;
      if (valA == null) return sortDirection === 'asc' ? -1 : 1;
      if (valB == null) return sortDirection === 'asc' ? 1 : -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [data, sortColumn, sortDirection, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const allPageSelected =
    paginatedData.length > 0 &&
    selectedIds &&
    paginatedData.every((item) => selectedIds.has(keyExtractor(item)));

  const handleToggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (allPageSelected) {
      paginatedData.forEach((item) => next.delete(keyExtractor(item)));
    } else {
      paginatedData.forEach((item) => next.add(keyExtractor(item)));
    }
    onSelectionChange(next);
  };

  const handleToggleRow = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-x-auto rounded-[24px] border border-slate-100 bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {onSelectionChange && (
                <th className="py-3.5 pl-5 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={handleToggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  onClick={() => col.sortable && handleSort(col.id)}
                  className={cn(
                    'py-3.5 px-4 select-none',
                    col.sortable ? 'cursor-pointer hover:text-slate-800' : '',
                    col.className,
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortColumn === col.id ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                  className="py-12 text-center text-slate-400 font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const key = keyExtractor(row);
                const isSelected = selectedIds?.has(key);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors hover:bg-slate-50/80',
                      isSelected ? 'bg-blue-50/40' : '',
                      onRowClick ? 'cursor-pointer' : '',
                    )}
                  >
                    {onSelectionChange && (
                      <td className="py-3 pl-5 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected || false}
                          onClick={(e) => handleToggleRow(e, key)}
                          readOnly
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const value = col.accessorKey ? row[col.accessorKey] : undefined;
                      return (
                        <td key={col.id} className={cn('py-3 px-4 text-slate-700', col.className)}>
                          {col.cell ? col.cell({ row, value }) : (value as React.ReactNode)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{sortedData.length}</span> results
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

