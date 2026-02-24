import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
}

const variantStyles: Record<NonNullable<ProgressProps['variant']>, string> = {
  default: 'bg-[hsl(var(--primary))]',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
}

const sizeStyles: Record<NonNullable<ProgressProps['size']>, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'default', size = 'md', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div
        ref={ref}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--secondary))]',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <div
          className={cn('h-full w-full flex-1 transition-all duration-300 ease-in-out', variantStyles[variant])}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
