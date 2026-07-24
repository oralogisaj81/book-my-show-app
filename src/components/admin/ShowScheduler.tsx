import { useMemo, useState } from 'react'
import type { Cinema, Movie, Screen, Show } from '@shared/types/domain'
import { Button } from '@/components/ui/Button'
import { generateId } from '@shared/lib/id'
import { localDateKey } from '@shared/lib/format'

interface ShowSchedulerProps {
  initial?: Show
  movies: Movie[]
  cinemas: Cinema[]
  screens: Screen[]
  existingShows: Show[]
  onSave: (show: Show) => void
  onCancel: () => void
  isSaving?: boolean
}

const FORMATS = ['2D', '3D', 'IMAX', '4DX']

function toDateInputValue(iso?: string): string {
  return localDateKey(iso ? new Date(iso) : new Date())
}

function toTimeInputValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ShowScheduler({
  initial,
  movies,
  cinemas,
  screens,
  existingShows,
  onSave,
  onCancel,
  isSaving,
}: ShowSchedulerProps) {
  const [movieId, setMovieId] = useState(initial?.movieId ?? movies[0]?.id ?? '')
  const [cinemaId, setCinemaId] = useState(initial?.cinemaId ?? cinemas[0]?.id ?? '')
  const [screenId, setScreenId] = useState(
    initial?.screenId ?? screens.find((s) => s.cinemaId === (initial?.cinemaId ?? cinemas[0]?.id))?.id ?? '',
  )
  const [date, setDate] = useState(toDateInputValue(initial?.startTime))
  const [time, setTime] = useState(toTimeInputValue(initial?.startTime))
  const [format, setFormat] = useState(initial?.format ?? '2D')

  const movie = movies.find((m) => m.id === movieId)
  const [language, setLanguage] = useState(initial?.language ?? movie?.languages[0] ?? 'English')
  const screen = screens.find((s) => s.id === screenId)
  const screensForCinema = screens.filter((s) => s.cinemaId === cinemaId)

  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const initialOverrides: Record<string, string> = {}
    if (initial) {
      for (const [k, v] of Object.entries(initial.priceOverrides)) initialOverrides[k] = String(v)
    }
    return initialOverrides
  })

  function handleCinemaChange(newCinemaId: string) {
    setCinemaId(newCinemaId)
    const first = screens.find((s) => s.cinemaId === newCinemaId)
    setScreenId(first?.id ?? '')
  }

  const startTime = useMemo(() => {
    const [hours, minutes] = time.split(':').map(Number)
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day, hours, minutes, 0, 0)
  }, [date, time])

  const overlapWarning = useMemo(() => {
    if (!screenId || !movie) return null
    const bufferMs = 30 * 60 * 1000
    const newStart = startTime.getTime()
    const newEnd = newStart + movie.durationMinutes * 60 * 1000 + bufferMs
    for (const s of existingShows) {
      if (s.screenId !== screenId) continue
      if (initial && s.id === initial.id) continue
      const otherMovie = movies.find((m) => m.id === s.movieId)
      const otherStart = new Date(s.startTime).getTime()
      const otherEnd = otherStart + (otherMovie?.durationMinutes ?? 120) * 60 * 1000 + bufferMs
      if (newStart < otherEnd && otherStart < newEnd) {
        return `Overlaps with "${otherMovie?.title ?? 'another show'}" on this screen at ${new Date(s.startTime).toLocaleString()}`
      }
    }
    return null
  }, [screenId, movie, startTime, existingShows, initial, movies])

  function handleSubmit() {
    if (!movieId || !cinemaId || !screenId) return
    const priceOverrides: Record<string, number> = {}
    for (const [tierId, value] of Object.entries(overrides)) {
      const num = Number(value)
      if (value.trim() !== '' && !Number.isNaN(num)) priceOverrides[tierId] = num
    }
    const show: Show = {
      id: initial?.id ?? generateId('show'),
      movieId,
      cinemaId,
      screenId,
      startTime: startTime.toISOString(),
      language,
      format,
      priceOverrides,
    }
    onSave(show)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-mist-500">Movie</label>
        <select
          value={movieId}
          onChange={(event) => {
            setMovieId(event.target.value)
            const nextMovie = movies.find((m) => m.id === event.target.value)
            if (nextMovie && !nextMovie.languages.includes(language)) setLanguage(nextMovie.languages[0])
          }}
          className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
        >
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-mist-500">Cinema</label>
          <select
            value={cinemaId}
            onChange={(event) => handleCinemaChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          >
            {cinemas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Screen</label>
          <select
            value={screenId}
            onChange={(event) => setScreenId(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          >
            {screensForCinema.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-mist-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Time</label>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-mist-500">Format</label>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Language</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          >
            {(movie?.languages ?? [language]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {overlapWarning && (
        <p className="rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs text-gold-300">
          {overlapWarning}
        </p>
      )}

      {screen && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mist-500">
            Price overrides (optional — leave blank to use screen default)
          </p>
          <div className="space-y-2">
            {screen.layout.tiers.map((tier) => (
              <div key={tier.id} className="flex items-center gap-3">
                <span className="w-24 flex-shrink-0 text-xs text-mist-300">{tier.name}</span>
                <input
                  type="number"
                  min={1}
                  placeholder={String(tier.price)}
                  value={overrides[tier.id] ?? ''}
                  onChange={(event) => setOverrides((prev) => ({ ...prev, [tier.id]: event.target.value }))}
                  className="h-9 flex-1 rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-ink-700 pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving || !movieId || !screenId}>
          {isSaving ? 'Saving…' : 'Save show'}
        </Button>
      </div>
    </div>
  )
}
