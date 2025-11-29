import { cn } from '@/lib/utils/cn'

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  children: React.ReactNode
  className?: string
}

export function Alert({ variant = 'default', children, className }: AlertProps) {
  const variants = {
    default: 'bg-gray-50 text-gray-900 border-gray-200',
    destructive: 'bg-red-50 text-red-900 border-red-200',
    success: 'bg-green-50 text-green-900 border-green-200',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
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


