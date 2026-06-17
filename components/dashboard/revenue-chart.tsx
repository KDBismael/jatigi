'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { RevenueByPeriod } from '@/types/analytics'
import { formatDate } from '@/lib/utils'

export function RevenueChart({ data }: { data: RevenueByPeriod[] }) {
  if (data.length === 0) {
    return <p className="text-center text-gray-400 py-8">Pas encore de données</p>
  }

  const formatted = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${Number(v).toLocaleString()} FCFA`} />
        <Legend />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Chiffre d'affaires"
          stroke="#6366f1"
          fill="url(#revenue)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="profit"
          name="Bénéfice net"
          stroke="#22c55e"
          fill="url(#profit)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
