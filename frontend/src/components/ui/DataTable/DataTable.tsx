import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../Button'

export interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  sortable?: boolean
  pagination?: boolean
  pageSize?: number
  className?: string
  emptyMessage?: string
  onRowClick?: (row: T, index: number) => void
}

type SortDirection = 'asc' | 'desc' | null

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  sortable = false,
  pagination = false,
  pageSize = 10,
  className,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = React.useState(1)

  const handleSort = (key: string) => {
    if (!sortable) return
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) return data
    return [...data].sort((a, b) => {
      const aValue = a[sortKey as keyof T]
      const bValue = b[sortKey as keyof T]
      if (aValue === bValue) return 0
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      const comparison = aValue < bValue ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDirection])

  const paginatedData = React.useMemo(() => {
    if (!pagination) return sortedData
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, pagination, currentPage, pageSize])

  const totalPages = Math.ceil(data.length / pageSize)

  const getCellValue = (row: T, column: Column<T>): T[keyof T] => {
    if (typeof column.key === 'string' && column.key.includes('.')) {
      const keys = column.key.split('.')
      let value: unknown = row
      for (const key of keys) {
        value = (value as Record<string, unknown>)?.[key]
      }
      return value as T[keyof T]
    }
    return row[column.key as keyof T]
  }

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null
    if (sortKey !== column.key) {
      return <ChevronUp className="ml-1 h-4 w-4 opacity-30" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    )
  }

  return (
    <div className={cn('w-full overflow-auto', className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-[hsl(var(--muted))]/50 data-[state=selected]:bg-[hsl(var(--muted))]">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'h-10 px-2 text-left align-middle font-medium text-[hsl(var(--muted-foreground))] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
                  column.sortable && 'cursor-pointer select-none hover:text-[hsl(var(--foreground))]',
                  column.className
                )}
                onClick={() => column.sortable && handleSort(String(column.key))}
              >
                <div className="flex items-center">
                  {column.header}
                  {renderSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-[hsl(var(--muted-foreground))]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'border-b transition-colors hover:bg-[hsl(var(--muted))]/50 data-[state=selected]:bg-[hsl(var(--muted))]',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={cn(
                      'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
                      column.className
                    )}
                  >
                    {column.render
                      ? column.render(getCellValue(row, column), row, rowIndex)
                      : String(getCellValue(row, column) ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { DataTable }
