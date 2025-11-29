import { cn } from '@/lib/utils/cn'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string
}

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none text-gray-900',
        className
      )}
      {...props}
    />
  )
}

