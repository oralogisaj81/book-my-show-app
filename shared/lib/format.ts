import { format } from 'date-fns'

/** Local calendar-day key (YYYY-MM-DD) — never slice an ISO string directly, that reads the UTC date and drifts a day off near timezone boundaries. */
export function localDateKey(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatShowDate(iso: string): string {
  return format(new Date(iso), 'EEE, d MMM')
}

export function formatShowDateLong(iso: string): string {
  return format(new Date(iso), 'EEEE, d MMMM')
}

export function formatShowTime(iso: string): string {
  return format(new Date(iso), 'h:mm a')
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
