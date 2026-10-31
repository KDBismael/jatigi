import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import styles from './subscription.module.css'
export function SubscriptionActionButton({ tone = 'neutral', className = '', ...props }: ComponentProps<typeof Button> & { tone?: 'neutral' | 'gold' | 'dark' | 'outline' }) {
  return <Button variant="secondary" data-tone={tone} className={`${styles.action} ${styles[tone]} ${className}`} {...props} />
}
