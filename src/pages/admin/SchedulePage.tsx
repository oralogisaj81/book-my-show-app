import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Show } from '@shared/types/domain'
import { useAllCinemas, useAllScreens, useAllShows, useDeleteShow, useUpsertShow } from '@/hooks/useAdmin'
import { useMovies } from '@/hooks/useMovies'
import { useCities } from '@/hooks/useCities'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/admin/DataTable'
import { ShowScheduler } from '@/components/admin/ShowScheduler'
import { formatShowDate, formatShowTime } from '@shared/lib/format'

type ScheduleModal = { type: 'none' } | { type: 'show-form'; show?: Show } | { type: 'confirm-delete'; show: Show }

const ALL = 'all'

export default function SchedulePage() {
  const { data: cities = [] } = useCities()
  const { data: cinemas = [] } = useAllCinemas()
  const { data: screens = [] } = useAllScreens()
  const { data: movies = [] } = useMovies()
  const { data: shows = [] } = useAllShows()
  const upsertShow = useUpsertShow()
  const deleteShow = useDeleteShow()

  const [modal, setModal] = useState<ScheduleModal>({ type: 'none' })
  const [cityFilter, setCityFilter] = useState(cities[0]?.id ?? ALL)
  const [cinemaFilter, setCinemaFilter] = useState(ALL)

  const movieById = useMemo(() => new Map(movies.map((m) => [m.id, m])), [movies])
  const cinemaById = useMemo(() => new Map(cinemas.map((c) => [c.id, c])), [cinemas])
  const screenById = useMemo(() => new Map(screens.map((s) => [s.id, s])), [screens])

  const cinemasInCity = useMemo(
    () => (cityFilter === ALL ? cinemas : cinemas.filter((c) => c.cityId === cityFilter)),
    [cinemas, cityFilter],
  )

  const filteredShows = useMemo(() => {
    return shows
      .filter((show) => {
        const cinema = cinemaById.get(show.cinemaId)
        if (cityFilter !== ALL && cinema?.cityId !== cityFilter) return false
        if (cinemaFilter !== ALL && show.cinemaId !== cinemaFilter) return false
        return true
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 200)
  }, [shows, cinemaById, cityFilter, cinemaFilter])

  function handleSaveShow(show: Show) {
    upsertShow.mutate(show, { onSuccess: () => setModal({ type: 'none' }) })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-mist-100">Show scheduling</h2>
        <Button size="sm" onClick={() => setModal({ type: 'show-form' })}>
          <Plus className="h-4 w-4" />
          Schedule a show
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={cityFilter}
          onChange={(event) => {
            setCityFilter(event.target.value)
            setCinemaFilter(ALL)
          }}
          className="h-9 rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
        >
          <option value={ALL}>All cities</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        <select
          value={cinemaFilter}
          onChange={(event) => setCinemaFilter(event.target.value)}
          className="h-9 rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
        >
          <option value={ALL}>All cinemas</option>
          {cinemasInCity.map((cinema) => (
            <option key={cinema.id} value={cinema.id}>
              {cinema.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        rows={filteredShows}
        rowKey={(show) => show.id}
        emptyMessage="No shows scheduled for this filter."
        columns={[
          {
            header: 'Movie',
            render: (show) => (
              <div>
                <p className="font-medium text-mist-100">{movieById.get(show.movieId)?.title ?? show.movieId}</p>
                <p className="text-xs text-mist-500">
                  {show.language} · {show.format}
                </p>
              </div>
            ),
          },
          {
            header: 'Cinema / Screen',
            render: (show) => (
              <div>
                <p className="text-mist-200">{cinemaById.get(show.cinemaId)?.name ?? show.cinemaId}</p>
                <p className="text-xs text-mist-500">{screenById.get(show.screenId)?.name ?? show.screenId}</p>
              </div>
            ),
          },
          {
            header: 'Date & time',
            render: (show) => (
              <span>
                {formatShowDate(show.startTime)}, {formatShowTime(show.startTime)}
              </span>
            ),
          },
          {
            header: 'Actions',
            className: 'text-right',
            render: (show) => (
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setModal({ type: 'show-form', show })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-mist-400 hover:border-ink-500 hover:text-mist-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setModal({ type: 'confirm-delete', show })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-mist-400 hover:border-red-500/50 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />
      {filteredShows.length === 200 && (
        <p className="mt-2 text-xs text-mist-500">Showing the first 200 matching shows — narrow the filters to see more precisely.</p>
      )}

      <Modal
        open={modal.type === 'show-form'}
        onClose={() => setModal({ type: 'none' })}
        title={modal.type === 'show-form' && modal.show ? 'Edit show' : 'Schedule a show'}
        className="max-w-xl"
      >
        {modal.type === 'show-form' && (
          <ShowScheduler
            initial={modal.show}
            movies={movies}
            cinemas={cinemas}
            screens={screens}
            existingShows={shows}
            onSave={handleSaveShow}
            onCancel={() => setModal({ type: 'none' })}
            isSaving={upsertShow.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={modal.type === 'confirm-delete'}
        title="Delete show"
        message={
          modal.type === 'confirm-delete'
            ? `Delete this ${movieById.get(modal.show.movieId)?.title ?? 'show'} screening? This cannot be undone.`
            : ''
        }
        onCancel={() => setModal({ type: 'none' })}
        isConfirming={deleteShow.isPending}
        onConfirm={() => {
          if (modal.type === 'confirm-delete') {
            deleteShow.mutate(modal.show.id, { onSuccess: () => setModal({ type: 'none' }) })
          }
        }}
      />
    </div>
  )
}
