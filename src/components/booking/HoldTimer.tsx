import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { formatCountdown } from '@shared/lib/format'
import { cn } from '@/lib/cn'

interface HoldTimerProps {
  expiresAt: string
  onExpire: () => void
  className?: string
}

export function HoldTimer({ expiresAt, onExpire, className }: HoldTimerProps) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      setRemaining(ms)
      if (ms <= 0) {
        clearInterval(id)
        onExpire()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpire])

  const isLow = remaining < 60_000

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium',
        isLow ? 'animate-pulse border-red-500/40 bg-red-500/10 text-red-400' : 'border-brand-500/30 bg-brand-500/10 text-brand-300',
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {formatCountdown(remaining)}
    </div>
  )
}
