import type { SeatTier } from '@shared/types/domain'
import { formatCurrency } from '@shared/lib/format'

interface SeatLegendProps {
  tiers: SeatTier[]
}

export function SeatLegend({ tiers }: SeatLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      {tiers.map((tier) => (
        <div key={tier.id} className="flex items-center gap-2 text-xs text-mist-400">
          <span
            className="h-4 w-4 rounded-t-md rounded-b-[2px] border"
            style={{ borderColor: tier.color, backgroundColor: `${tier.color}1a` }}
          />
          {tier.name} · {formatCurrency(tier.price)}
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs text-mist-400">
        <span className="h-4 w-4 rounded-t-md rounded-b-[2px] bg-brand-500" />
        Selected
      </div>
      <div className="flex items-center gap-2 text-xs text-mist-400">
        <span className="h-4 w-4 rounded-t-md rounded-b-[2px] bg-ink-700/60" />
        Held
      </div>
      <div className="flex items-center gap-2 text-xs text-mist-400">
        <span className="h-4 w-4 rounded-t-md rounded-b-[2px] bg-ink-800" />
        Sold
      </div>
    </div>
  )
}
