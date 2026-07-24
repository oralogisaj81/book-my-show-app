import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuthStore } from '@/store/authStore'

const TABS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/theaters', label: 'Theaters & Screens', end: false },
  { to: '/admin/schedule', label: 'Show Scheduling', end: false },
  { to: '/admin/analytics', label: 'Analytics', end: false },
]

export default function AdminLayout() {
  const isAdmin = useAuthStore((state) => state.isAdmin)

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-mist-100">Admin console</h1>
      <nav className="mt-4 flex flex-wrap gap-1 border-b border-ink-700 pb-px">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand-500 text-mist-100'
                  : 'border-transparent text-mist-500 hover:text-mist-200',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="py-6">
        <Outlet />
      </div>
    </div>
  )
}
