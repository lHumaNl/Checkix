import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] p-8 text-center animate-in fade-in-50',
          className
        )}
      >
        {icon && <div className="mx-auto mb-4 text-[hsl(var(--muted-foreground))]">{icon}</div>}
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))] max-w-sm">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </div>
    )
  }
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
