import { cn } from '@/lib/utils/cn'

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  children: React.ReactNode
  className?: string
}

export function Alert({ variant = 'default', children, className }: AlertProps) {
  const variants = {
    default: 'bg-gray-50 text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
    destructive: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4',
        variants[variant],
        className
      )}
      role="alert"
    >
      {children}
    </div>
  )
}

export function AlertTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)}>
      {children}
    </h5>
  )
}

export function AlertDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)}>
      {children}
    </div>
  )
}

