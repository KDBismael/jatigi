'use client'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/** One series per chart: visitors and signups live on very different scales. */
export function DailyTrendChart({ title, data, dataKey, color, unit }: {
  title: string; data: { day: string; visitors: number; signups: number }[]
  dataKey: 'visitors' | 'signups'; color: string; unit: string
}) {
  const rows = data.map(d => ({ ...d, label: d.day.slice(8, 10) + '/' + d.day.slice(5, 7) }))
  const id = `trend-${dataKey}`
  // About six dated ticks whatever the period, without measuring text.
  const interval = Math.max(0, Math.ceil(rows.length / 6) - 1)
  return (
    <figure className="rounded-xl border border-gray-200 bg-white p-4">
      <figcaption className="mb-2 text-sm font-medium text-gray-700">{title}</figcaption>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f1f1f4" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={interval} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={48} />
          <Tooltip cursor={{ stroke: '#9ca3af', strokeWidth: 1 }} formatter={(v) => [`${v} ${unit}`, title]} labelFormatter={(l) => `Le ${l}`} />
          <Area type="linear" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 4 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  )
}
