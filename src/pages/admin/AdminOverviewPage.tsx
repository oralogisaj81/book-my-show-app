import { Link } from 'react-router-dom'
import { BarChart3, Building2, CalendarClock, IndianRupee, Percent, Ticket } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAdmin'
import { StatCard } from '@/components/admin/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@shared/lib/format'

const QUICK_LINKS = [
  { to: '/admin/theaters', label: 'Manage theaters & screens', description: 'Add cinemas, configure seat layouts and pricing tiers', icon: Building2 },
  { to: '/admin/schedule', label: 'Schedule shows', description: 'Assign movies to screens and set showtimes', icon: CalendarClock },
  { to: '/admin/analytics', label: 'View analytics', description: 'Revenue trends, occupancy, and top-performing movies', icon: BarChart3 },
]

export default function AdminOverviewPage() {
  const { data: analytics, isLoading } = useAnalytics()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-mist-100">Welcome back</h2>
        <p className="mt-1 text-sm text-mist-400">Here's how CineHall is performing across all theaters.</p>
      </div>

      {isLoading || !analytics ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total revenue" value={formatCurrency(analytics.totalRevenue)} icon={IndianRupee} tone="teal" />
          <StatCard label="Bookings" value={analytics.totalBookings.toLocaleString()} icon={Ticket} tone="brand" />
          <StatCard
            label="Average occupancy"
            value={`${Math.round(analytics.averageOccupancy * 100)}%`}
            icon={Percent}
            tone="gold"
          />
          <StatCard
            label="Top movie"
            value={analytics.topMovies[0]?.title ?? '—'}
            icon={BarChart3}
            tone="brand"
          />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-mist-100">Quick actions</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group rounded-2xl border border-ink-700 bg-ink-850/40 p-5 transition-colors hover:border-brand-400"
            >
              <link.icon className="h-6 w-6 text-brand-400" />
              <p className="mt-3 font-medium text-mist-100 group-hover:text-brand-300">{link.label}</p>
              <p className="mt-1 text-xs text-mist-500">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
