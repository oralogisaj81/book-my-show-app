import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { Cinema, Show } from '@shared/types/domain'
import { formatShowDate, formatShowTime, localDateKey } from '@shared/lib/format'
import { cn } from '@/lib/cn'

interface ShowtimePickerProps {
  shows: Show[]
  cinemas: Cinema[]
}

export function ShowtimePicker({ shows, cinemas }: ShowtimePickerProps) {
  const dateGroups = useMemo(() => {
    const map = new Map<string, string>()
    for (const show of shows) {
      const key = localDateKey(show.startTime)
      if (!map.has(key)) map.set(key, show.startTime)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [shows])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const activeDate = selectedDate ?? dateGroups[0]?.[0]

  const cinemaById = useMemo(() => new Map(cinemas.map((c) => [c.id, c])), [cinemas])

  const groupedByCinema = useMemo(() => {
    const map = new Map<string, Show[]>()
    for (const show of shows) {
      if (localDateKey(show.startTime) !== activeDate) continue
      const list = map.get(show.cinemaId) ?? []
      list.push(show)
      map.set(show.cinemaId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    return map
  }, [shows, activeDate])

  if (dateGroups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 py-12 text-center">
        <p className="text-sm text-mist-400">No showtimes available in this city right now.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dateGroups.map(([dateKey, sampleIso]) => (
          <button
            key={dateKey}
            onClick={() => setSelectedDate(dateKey)}
            className={cn(
              'flex-shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
              dateKey === activeDate
                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                : 'border-ink-600 text-mist-400 hover:border-ink-500 hover:text-mist-200',
            )}
          >
            {formatShowDate(sampleIso)}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {groupedByCinema.size === 0 && (
          <p className="text-sm text-mist-400">No shows for this date. Try another date.</p>
        )}
        {Array.from(groupedByCinema.entries()).map(([cinemaId, cinemaShows]) => {
          const cinema = cinemaById.get(cinemaId)
          return (
            <div key={cinemaId} className="rounded-2xl border border-ink-700 bg-ink-850/40 p-4 sm:p-5">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                <div>
                  <h3 className="font-semibold text-mist-100">{cinema?.name ?? 'Cinema'}</h3>
                  <p className="text-xs text-mist-500">{cinema?.address}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {cinemaShows.map((show) => (
                  <Link
                    key={show.id}
                    to={`/book/${show.id}`}
                    className="rounded-lg border border-ink-600 px-3 py-2 text-center text-sm font-medium text-mist-200 transition-colors hover:border-brand-400 hover:bg-brand-500/10 hover:text-brand-300"
                  >
                    <span className="block">{formatShowTime(show.startTime)}</span>
                    <span className="block text-[10px] uppercase text-mist-500">{show.format}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
