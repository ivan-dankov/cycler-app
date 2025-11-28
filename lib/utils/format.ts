import { format } from 'date-fns'

export function formatCurrency(amount: number): string {
  // Generic currency formatting - no locale assumptions
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  const formatted = absAmount.toFixed(2)
  return `${sign}${formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}
