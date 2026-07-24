import type { ScreenLayout, SeatState } from '@shared/types/domain'
import { rowLabel, tierForRow } from '@shared/lib/seatGrid'
import { cn } from '@/lib/cn'

interface SeatMapProps {
  layout: ScreenLayout
  seats: SeatState[]
  selectedSeatIds: Set<string>
  onToggleSeat: (seatId: string) => void
  disabled?: boolean
}

export function SeatMap({ layout, seats, selectedSeatIds, onToggleSeat, disabled }: SeatMapProps) {
  const seatByPosition = new Map<string, SeatState>()
  for (const seat of seats) seatByPosition.set(`${seat.row}-${seat.col}`, seat)

  const rows = Array.from({ length: layout.rows }, (_, i) => i)
  const cols = Array.from({ length: layout.cols }, (_, i) => i)

  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 w-full max-w-3xl">
        <div className="h-2 w-full rounded-[100%] bg-gradient-to-r from-transparent via-brand-500/70 to-transparent blur-[1px]" />
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.3em] text-mist-500">Screen this way</p>
      </div>

      <div className="w-full overflow-x-auto pb-4">
        <div className="inline-flex min-w-full flex-col items-center gap-1.5">
          {rows.map((row) => {
            const tier = tierForRow(layout, row)
            if (!tier) return null
            return (
              <div key={row} className="flex items-center gap-1.5">
                <span className="w-5 flex-shrink-0 text-right text-[11px] font-medium text-mist-500">
                  {rowLabel(row)}
                </span>
                <div className="flex items-center gap-1.5">
                  {cols.map((col) => {
                    const seatId = `${rowLabel(row)}${col + 1}`
                    if (layout.skipSeats.includes(seatId)) {
                      return <span key={col} className="h-6 w-6 flex-shrink-0" />
                    }
                    const seat = seatByPosition.get(`${row}-${col}`)
                    const isAisle = layout.aisleAfterCols.includes(col)
                    return (
                      <div key={col} className={cn('flex-shrink-0', isAisle && 'mr-3')}>
                        <SeatButton
                          seatId={seatId}
                          status={seat?.status ?? 'available'}
                          tierColor={tier.color}
                          selected={selectedSeatIds.has(seatId)}
                          disabled={disabled}
                          onToggle={() => onToggleSeat(seatId)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface SeatButtonProps {
  seatId: string
  status: SeatState['status']
  tierColor: string
  selected: boolean
  disabled?: boolean
  onToggle: () => void
}

function SeatButton({ seatId, status, tierColor, selected, disabled, onToggle }: SeatButtonProps) {
  const isBlocked = status === 'booked' || status === 'held'

  return (
    <button
      type="button"
      title={`Seat ${seatId}${isBlocked ? ' — unavailable' : ''}`}
      disabled={isBlocked || disabled}
      onClick={onToggle}
      className={cn(
        'h-6 w-6 rounded-t-md rounded-b-[3px] border transition-all duration-150',
        status === 'booked' && 'cursor-not-allowed border-ink-700 bg-ink-800',
        status === 'held' && !selected && 'cursor-not-allowed border-ink-600 bg-ink-700/60',
        status === 'available' && !selected && 'cursor-pointer border-current bg-current/10 hover:bg-current/25',
        selected && 'cursor-pointer scale-110 border-transparent bg-brand-500 shadow-[0_0_0_2px_rgba(255,90,54,0.35)]',
      )}
      style={!selected && status === 'available' ? { color: tierColor } : undefined}
    />
  )
}
