import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

type StatCardTone = 'brand' | 'teal' | 'gold'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: StatCardTone
}

const toneClasses: Record<StatCardTone, string> = {
  brand: 'text-brand-400 bg-brand-500/10',
  teal: 'text-teal-400 bg-teal-500/10',
  gold: 'text-gold-400 bg-gold-500/10',
}

export function StatCard({ label, value, icon: Icon, tone = 'brand' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850/40 p-5">
      <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', toneClasses[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-mist-100">{value}</p>
      <p className="mt-1 text-xs text-mist-500">{label}</p>
    </div>
  )
}
