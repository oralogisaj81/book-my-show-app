import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalyticsSummary } from '@shared/types/domain'
import { formatCurrency } from '@shared/lib/format'

function formatDateShort(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function ChartTooltip({ active, payload, label, valueFormatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs shadow-card">
      <p className="mb-1 text-mist-400">{label}</p>
      <p className="font-semibold text-mist-100">{valueFormatter(payload[0].value)}</p>
    </div>
  )
}

interface RevenueTrendChartProps {
  data: AnalyticsSummary['revenueByDay']
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const chartData = data.map((d) => ({ ...d, label: formatDateShort(d.date) }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ddbb0" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3ddbb0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#161d35" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#737ea3', fontSize: 11 }}
          axisLine={{ stroke: '#161d35' }}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fill: '#737ea3', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
        />
        <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} cursor={{ stroke: '#323e63' }} />
        <Area type="monotone" dataKey="revenue" stroke="#3ddbb0" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface OccupancyChartProps {
  data: AnalyticsSummary['occupancyByCinema']
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.cinemaName.split('—')[0].trim(),
    occupancy: Math.round(d.occupancy * 1000) / 10,
  }))
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="#161d35" />
        <XAxis
          type="number"
          tick={{ fill: '#737ea3', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          unit="%"
          domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.2))]}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: '#9aa3c2', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip content={<ChartTooltip valueFormatter={(v: number) => `${v}% occupied`} />} cursor={{ fill: '#161d3560' }} />
        <Bar dataKey="occupancy" fill="#ff7a52" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}
