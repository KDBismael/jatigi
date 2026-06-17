import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'blue' | 'yellow'
}

const accentClasses = {
  green: 'text-green-600',
  red: 'text-red-600',
  blue: 'text-indigo-600',
  yellow: 'text-yellow-600',
}

export function StatCard({ label, value, sub, accent = 'blue' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${accentClasses[accent]}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
