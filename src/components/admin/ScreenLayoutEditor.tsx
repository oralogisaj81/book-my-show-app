import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Screen, SeatTier } from '@shared/types/domain'
import { Button } from '@/components/ui/Button'
import { generateId } from '@shared/lib/id'

interface ScreenLayoutEditorProps {
  cinemaId: string
  initial?: Screen
  onSave: (screen: Screen) => void
  onCancel: () => void
  isSaving?: boolean
}

interface TierDraft {
  key: string
  id: string
  name: string
  price: number
  color: string
  rows: number
}

const DEFAULT_COLORS = ['#3ddbb0', '#ffcb47', '#ff7a52', '#7bb0ff']

function tiersFromLayout(screen?: Screen): TierDraft[] {
  if (!screen) {
    return [
      { key: generateId(), id: 'classic', name: 'Classic', price: 180, color: '#3ddbb0', rows: 5 },
      { key: generateId(), id: 'premium', name: 'Premium', price: 280, color: '#ffcb47', rows: 2 },
    ]
  }
  return screen.layout.tiers.map((tier) => ({
    key: generateId(),
    id: tier.id,
    name: tier.name,
    price: tier.price,
    color: tier.color,
    rows: tier.rowEnd - tier.rowStart + 1,
  }))
}

export function ScreenLayoutEditor({ cinemaId, initial, onSave, onCancel, isSaving }: ScreenLayoutEditorProps) {
  const [name, setName] = useState(initial?.name ?? 'Screen 1')
  const [cols, setCols] = useState(initial?.layout.cols ?? 12)
  const [features, setFeatures] = useState((initial?.features ?? []).join(', '))
  const [tiers, setTiers] = useState<TierDraft[]>(() => tiersFromLayout(initial))

  const totalRows = tiers.reduce((sum, t) => sum + t.rows, 0)
  const totalSeats = totalRows * cols

  function updateTier(key: string, patch: Partial<TierDraft>) {
    setTiers((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)))
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      {
        key: generateId(),
        id: `tier-${prev.length + 1}`,
        name: 'New Tier',
        price: 200,
        color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length],
        rows: 2,
      },
    ])
  }

  function removeTier(key: string) {
    setTiers((prev) => (prev.length > 1 ? prev.filter((t) => t.key !== key) : prev))
  }

  function handleSubmit() {
    let cursor = 0
    const builtTiers: SeatTier[] = tiers.map((t) => {
      const rowStart = cursor
      const rowEnd = cursor + t.rows - 1
      cursor += t.rows
      return { id: t.id, name: t.name, price: t.price, color: t.color, rowStart, rowEnd }
    })
    const screen: Screen = {
      id: initial?.id ?? generateId('screen'),
      cinemaId,
      name,
      features: features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
      layout: {
        rows: cursor,
        cols,
        aisleAfterCols: initial?.layout.aisleAfterCols ?? [],
        aisleAfterRows: [],
        tiers: builtTiers,
        skipSeats: initial?.layout.skipSeats ?? [],
      },
    }
    onSave(screen)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-mist-500">Screen name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Columns (seats per row)</label>
          <input
            type="number"
            min={4}
            max={30}
            value={cols}
            onChange={(event) => setCols(Number(event.target.value))}
            className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none focus:border-brand-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-mist-500">Features (comma separated)</label>
        <input
          value={features}
          onChange={(event) => setFeatures(event.target.value)}
          placeholder="Dolby Atmos, IMAX"
          className="h-10 w-full rounded-lg border border-ink-600 bg-ink-800/60 px-3 text-sm text-mist-100 outline-none placeholder:text-mist-500 focus:border-brand-400"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-mist-500">Seat tiers (front to back)</p>
          <button onClick={addTier} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
            <Plus className="h-3.5 w-3.5" />
            Add tier
          </button>
        </div>
        <div className="mb-1.5 grid grid-cols-[1fr_80px_60px_36px_28px] gap-2 px-2 text-[10px] uppercase tracking-wide text-mist-500">
          <span>Name</span>
          <span>Price</span>
          <span>Rows</span>
          <span>Color</span>
          <span />
        </div>
        <div className="space-y-2">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className="grid grid-cols-[1fr_80px_60px_36px_28px] items-center gap-2 rounded-lg border border-ink-700 p-2"
            >
              <input
                value={tier.name}
                onChange={(event) => updateTier(tier.key, { name: event.target.value })}
                className="h-8 rounded-md border border-ink-600 bg-ink-800/60 px-2 text-xs text-mist-100 outline-none"
              />
              <input
                type="number"
                min={1}
                value={tier.price}
                onChange={(event) => updateTier(tier.key, { price: Number(event.target.value) })}
                className="h-8 rounded-md border border-ink-600 bg-ink-800/60 px-2 text-xs text-mist-100 outline-none"
              />
              <input
                type="number"
                min={1}
                max={15}
                value={tier.rows}
                onChange={(event) => updateTier(tier.key, { rows: Number(event.target.value) })}
                className="h-8 rounded-md border border-ink-600 bg-ink-800/60 px-2 text-xs text-mist-100 outline-none"
              />
              <input
                type="color"
                value={tier.color}
                onChange={(event) => updateTier(tier.key, { color: event.target.value })}
                className="h-8 w-9 cursor-pointer rounded-md border border-ink-600 bg-ink-800/60"
              />
              <button
                onClick={() => removeTier(tier.key)}
                disabled={tiers.length <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-md text-mist-500 hover:bg-ink-700 hover:text-red-400 disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-mist-500">
          {totalRows} rows × {cols} cols = {totalSeats} seats total
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-ink-700 pt-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
          {isSaving ? 'Saving…' : 'Save screen'}
        </Button>
      </div>
    </div>
  )
}
