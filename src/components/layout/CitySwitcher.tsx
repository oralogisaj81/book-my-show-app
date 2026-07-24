import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { useCities } from '@/hooks/useCities'
import { useCityStore } from '@/store/cityStore'
import { cn } from '@/lib/cn'

export function CitySwitcher() {
  const [open, setOpen] = useState(false)
  const { data: cities = [] } = useCities()
  const { activeCityId, setActiveCityId } = useCityStore()
  const activeCity = cities.find((c) => c.id === activeCityId)

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800/60 px-3 py-1.5 text-sm font-medium text-mist-100 hover:border-ink-500"
      >
        <MapPin className="h-4 w-4 text-brand-400" />
        {activeCity?.name ?? 'Select city'}
        <ChevronDown className={cn('h-3.5 w-3.5 text-mist-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-48 rounded-xl border border-ink-600 bg-ink-850 p-1.5 shadow-card">
            {cities.map((city) => (
              <button
                key={city.id}
                onClick={() => {
                  setActiveCityId(city.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-700',
                  city.id === activeCityId ? 'text-brand-300' : 'text-mist-200',
                )}
              >
                {city.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
