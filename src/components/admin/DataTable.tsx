import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Column<T> {
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
}

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No data yet' }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 py-12 text-center text-sm text-mist-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-700 bg-ink-850/60 text-xs uppercase tracking-wide text-mist-500">
            {columns.map((col) => (
              <th key={col.header} className={cn('px-4 py-3 font-medium', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-ink-800 last:border-0 hover:bg-ink-850/40">
              {columns.map((col) => (
                <td key={col.header} className={cn('px-4 py-3 align-middle', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
