import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS, STATUS_COLORS, type OrderStatus } from '@/lib/constants'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
}
