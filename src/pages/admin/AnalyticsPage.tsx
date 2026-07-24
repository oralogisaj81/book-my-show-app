import { IndianRupee, Percent, Ticket, TrendingUp } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAdmin'
import { StatCard } from '@/components/admin/StatCard'
import { DataTable } from '@/components/admin/DataTable'
import { OccupancyChart, RevenueTrendChart } from '@/components/admin/AnalyticsCharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@shared/lib/format'

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics()

  if (isLoading || !analytics) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(analytics.totalRevenue)} icon={IndianRupee} tone="teal" />
        <StatCard label="Bookings" value={analytics.totalBookings.toLocaleString()} icon={Ticket} tone="brand" />
        <StatCard label="Seats sold" value={analytics.totalSeatsSold.toLocaleString()} icon={TrendingUp} tone="gold" />
        <StatCard
          label="Average occupancy"
          value={`${Math.round(analytics.averageOccupancy * 100)}%`}
          icon={Percent}
          tone="brand"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-700 bg-ink-850/40 p-5">
          <h3 className="mb-1 text-sm font-semibold text-mist-100">Revenue — last 14 days</h3>
          <p className="mb-4 text-xs text-mist-500">Confirmed bookings by booking date</p>
          <RevenueTrendChart data={analytics.revenueByDay} />
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-850/40 p-5">
          <h3 className="mb-1 text-sm font-semibold text-mist-100">Occupancy by cinema</h3>
          <p className="mb-4 text-xs text-mist-500">Seats sold vs. total capacity offered</p>
          <OccupancyChart data={analytics.occupancyByCinema} />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-mist-100">Top movies by revenue</h3>
        <DataTable
          rows={analytics.topMovies}
          rowKey={(row) => row.movieId}
          emptyMessage="No bookings yet."
          columns={[
            { header: 'Movie', render: (row) => <span className="font-medium text-mist-100">{row.title}</span> },
            { header: 'Tickets sold', render: (row) => row.ticketsSold.toLocaleString() },
            { header: 'Revenue', className: 'text-right', render: (row) => formatCurrency(row.revenue) },
          ]}
        />
      </div>
    </div>
  )
}
