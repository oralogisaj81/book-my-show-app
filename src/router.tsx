import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import HomePage from './pages/HomePage'
import MovieDetailPage from './pages/MovieDetailPage'
import SeatSelectionPage from './pages/SeatSelectionPage'
import CheckoutPage from './pages/CheckoutPage'
import ConfirmationPage from './pages/ConfirmationPage'
import AccountPage from './pages/AccountPage'

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'))
const TheatersPage = lazy(() => import('./pages/admin/TheatersPage'))
const SchedulePage = lazy(() => import('./pages/admin/SchedulePage'))
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'))

function AdminFallback() {
  return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-mist-500 sm:px-6">Loading admin console…</div>
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<AdminFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'movies/:movieId', element: <MovieDetailPage /> },
      { path: 'book/:showId', element: <SeatSelectionPage /> },
      { path: 'book/:showId/checkout', element: <CheckoutPage /> },
      { path: 'booking/:bookingId', element: <ConfirmationPage /> },
      { path: 'account', element: <AccountPage /> },
      {
        path: 'admin',
        element: withSuspense(<AdminLayout />),
        children: [
          { index: true, element: withSuspense(<AdminOverviewPage />) },
          { path: 'theaters', element: withSuspense(<TheatersPage />) },
          { path: 'schedule', element: withSuspense(<SchedulePage />) },
          { path: 'analytics', element: withSuspense(<AnalyticsPage />) },
        ],
      },
    ],
  },
])
