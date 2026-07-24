import { cn } from '@/lib/cn'

interface TabsProps<T extends string> {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full bg-ink-800 p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            value === tab.value ? 'bg-brand-500 text-white' : 'text-mist-400 hover:text-mist-100',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
