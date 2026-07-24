import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, MonitorPlay, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Cinema, Screen } from '@shared/types/domain'
import {
  useAllCinemas,
  useAllScreens,
  useDeleteCinema,
  useDeleteScreen,
  useUpsertCinema,
  useUpsertScreen,
} from '@/hooks/useAdmin'
import { useCities } from '@/hooks/useCities'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/admin/DataTable'
import { ScreenLayoutEditor } from '@/components/admin/ScreenLayoutEditor'
import { generateId } from '@shared/lib/id'
import { enumerateSeats } from '@shared/lib/seatGrid'

interface CinemaFormState {
  name: string
  address: string
  cityId: string
}

function CinemaForm({
  initial,
  cities,
  onSubmit,
  onCancel,
  isSaving,
}: {
  initial?: Cinema
  cities: { id: string; name: string }[]
  onSubmit: (form: CinemaFormState) => void
  onCancel: () => void
  isSaving?: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [cityId, setCityId] = useState(initial?.cityId ?? cities[0]?.id ?? '')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !address.trim() || !cityId) return
    onSubmit({ name: name.trim(), address: address.trim(), cityId })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-mist-500">Cinema name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Aurora Cineplex — Example Mall"
          className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-mist-500">Address</label>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Street, area, city"
          className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-mist-500">City</label>
        <select
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
          className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
        >
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save cinema'}
        </Button>
      </div>
    </form>
  )
}

type AdminModal =
  | { type: 'none' }
  | { type: 'cinema-form'; cinema?: Cinema }
  | { type: 'screens-list'; cinema: Cinema }
  | { type: 'screen-form'; cinemaId: string; screen?: Screen; returnTo: Cinema }
  | { type: 'confirm-delete-cinema'; cinema: Cinema }
  | { type: 'confirm-delete-screen'; screen: Screen; returnTo: Cinema }

export default function TheatersPage() {
  const { data: cities = [] } = useCities()
  const { data: cinemas = [] } = useAllCinemas()
  const { data: screens = [] } = useAllScreens()
  const upsertCinema = useUpsertCinema()
  const deleteCinema = useDeleteCinema()
  const upsertScreen = useUpsertScreen()
  const deleteScreen = useDeleteScreen()

  // Only one Modal is ever mounted at a time — stacking two fixed-position
  // modals breaks their layering, so navigating between them (e.g. screens
  // list -> screen editor) replaces the modal rather than opening another.
  const [modal, setModal] = useState<AdminModal>({ type: 'none' })

  const cityById = new Map(cities.map((city) => [city.id, city]))

  function screensForCinema(cinemaId: string) {
    return screens.filter((s) => s.cinemaId === cinemaId)
  }

  function handleSaveCinema(form: CinemaFormState) {
    const existing = modal.type === 'cinema-form' ? modal.cinema : undefined
    const cinema: Cinema = {
      id: existing?.id ?? generateId('cinema'),
      cityId: form.cityId,
      name: form.name,
      address: form.address,
      screenIds: existing?.screenIds ?? [],
    }
    upsertCinema.mutate(cinema, { onSuccess: () => setModal({ type: 'none' }) })
  }

  function handleSaveScreen(screen: Screen) {
    const returnTo = modal.type === 'screen-form' ? modal.returnTo : undefined
    upsertScreen.mutate(screen, {
      onSuccess: () => setModal(returnTo ? { type: 'screens-list', cinema: returnTo } : { type: 'none' }),
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-mist-100">Theaters</h2>
        <Button size="sm" onClick={() => setModal({ type: 'cinema-form' })}>
          <Plus className="h-4 w-4" />
          Add cinema
        </Button>
      </div>

      <DataTable
        rows={cinemas}
        rowKey={(cinema) => cinema.id}
        emptyMessage="No cinemas yet. Add one to get started."
        columns={[
          {
            header: 'Cinema',
            render: (cinema) => (
              <div>
                <p className="font-medium text-mist-100">{cinema.name}</p>
                <p className="text-xs text-mist-500">{cinema.address}</p>
              </div>
            ),
          },
          { header: 'City', render: (cinema) => cityById.get(cinema.cityId)?.name ?? '—' },
          { header: 'Screens', render: (cinema) => screensForCinema(cinema.id).length },
          {
            header: 'Actions',
            className: 'text-right',
            render: (cinema) => (
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setModal({ type: 'screens-list', cinema })}
                  className="flex items-center gap-1 rounded-lg border border-ink-600 px-2.5 py-1.5 text-xs text-mist-200 hover:border-brand-400 hover:text-brand-300"
                >
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Screens
                </button>
                <button
                  onClick={() => setModal({ type: 'cinema-form', cinema })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-mist-400 hover:border-ink-500 hover:text-mist-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setModal({ type: 'confirm-delete-cinema', cinema })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-mist-400 hover:border-red-500/50 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modal.type === 'cinema-form'}
        onClose={() => setModal({ type: 'none' })}
        title={modal.type === 'cinema-form' && modal.cinema ? 'Edit cinema' : 'Add cinema'}
      >
        <CinemaForm
          initial={modal.type === 'cinema-form' ? modal.cinema : undefined}
          cities={cities}
          onSubmit={handleSaveCinema}
          onCancel={() => setModal({ type: 'none' })}
          isSaving={upsertCinema.isPending}
        />
      </Modal>

      <Modal
        open={modal.type === 'screens-list'}
        onClose={() => setModal({ type: 'none' })}
        title={modal.type === 'screens-list' ? `Screens — ${modal.cinema.name}` : 'Screens'}
        className="max-w-2xl"
      >
        {modal.type === 'screens-list' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setModal({ type: 'screen-form', cinemaId: modal.cinema.id, returnTo: modal.cinema })}>
                <Building2 className="h-4 w-4" />
                Add screen
              </Button>
            </div>
            <DataTable
              rows={screensForCinema(modal.cinema.id)}
              rowKey={(screen) => screen.id}
              emptyMessage="No screens yet."
              columns={[
                { header: 'Name', render: (screen) => <span className="font-medium text-mist-100">{screen.name}</span> },
                {
                  header: 'Layout',
                  render: (screen) =>
                    `${screen.layout.rows}×${screen.layout.cols} · ${enumerateSeats(screen.layout).length} seats`,
                },
                { header: 'Tiers', render: (screen) => screen.layout.tiers.map((t) => t.name).join(', ') },
                {
                  header: 'Actions',
                  className: 'text-right',
                  render: (screen) => (
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() =>
                          modal.type === 'screens-list' &&
                          setModal({ type: 'screen-form', cinemaId: screen.cinemaId, screen, returnTo: modal.cinema })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-mist-400 hover:border-ink-500 hover:text-mist-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          modal.type === 'screens-list' &&
                          setModal({ type: 'confirm-delete-screen', screen, returnTo: modal.cinema })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 text-mist-400 hover:border-red-500/50 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={modal.type === 'screen-form'}
        onClose={() => setModal(modal.type === 'screen-form' ? { type: 'screens-list', cinema: modal.returnTo } : { type: 'none' })}
        title={modal.type === 'screen-form' && modal.screen ? 'Edit screen' : 'Add screen'}
        className="max-w-xl"
      >
        {modal.type === 'screen-form' && (
          <ScreenLayoutEditor
            cinemaId={modal.cinemaId}
            initial={modal.screen}
            onSave={handleSaveScreen}
            onCancel={() => setModal({ type: 'screens-list', cinema: modal.returnTo })}
            isSaving={upsertScreen.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={modal.type === 'confirm-delete-cinema'}
        title="Delete cinema"
        message={
          modal.type === 'confirm-delete-cinema'
            ? `Delete ${modal.cinema.name}? This also removes its screens and shows.`
            : ''
        }
        onCancel={() => setModal({ type: 'none' })}
        isConfirming={deleteCinema.isPending}
        onConfirm={() => {
          if (modal.type === 'confirm-delete-cinema') {
            deleteCinema.mutate(modal.cinema.id, { onSuccess: () => setModal({ type: 'none' }) })
          }
        }}
      />

      <ConfirmDialog
        open={modal.type === 'confirm-delete-screen'}
        title="Delete screen"
        message={
          modal.type === 'confirm-delete-screen' ? `Delete ${modal.screen.name}? This also removes its shows.` : ''
        }
        onCancel={() => setModal(modal.type === 'confirm-delete-screen' ? { type: 'screens-list', cinema: modal.returnTo } : { type: 'none' })}
        isConfirming={deleteScreen.isPending}
        onConfirm={() => {
          if (modal.type === 'confirm-delete-screen') {
            const returnTo = modal.returnTo
            deleteScreen.mutate(modal.screen.id, { onSuccess: () => setModal({ type: 'screens-list', cinema: returnTo }) })
          }
        }}
      />
    </div>
  )
}
