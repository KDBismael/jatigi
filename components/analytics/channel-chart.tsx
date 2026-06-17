'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ChannelStat } from '@/types/analytics'
import { CHANNEL_LABELS } from '@/lib/constants'

export function ChannelChart({ data }: { data: ChannelStat[] }) {
  if (data.length === 0) {
    return <p className="text-center text-gray-400 py-8">Pas encore de données</p>
  }

  const formatted = data.map((d) => ({
    ...d,
    name: CHANNEL_LABELS[d.channel],
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={formatted} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
        <Tooltip formatter={(v) => [`${Number(v)} commandes`, 'Commandes']} />
        <Bar dataKey="order_count" name="Commandes" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
