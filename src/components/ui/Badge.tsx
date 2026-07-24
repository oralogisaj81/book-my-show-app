import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type BadgeTone = 'brand' | 'gold' | 'teal' | 'neutral'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  gold: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
  teal: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  neutral: 'bg-ink-700 text-mist-300 border-ink-500',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
