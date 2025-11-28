import { cn } from '@/lib/utils/cn'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2',
        'dark:border-gray-600 dark:bg-gray-800 dark:ring-offset-gray-900 dark:focus:ring-gray-400',
        className
      )}
      {...props}
    />
  )
}
