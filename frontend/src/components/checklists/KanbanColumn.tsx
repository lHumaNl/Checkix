import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  items: { id: number }[]
  children: ReactNode
  onAddChecklist?: () => void
}

export function KanbanColumn({ id, title, color, items, children, onAddChecklist }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={`${title} column, ${items.length} items`}
      className={`flex-1 min-w-[280px] max-w-[360px] rounded-xl p-3 transition-colors ${
        isOver
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'bg-gray-50 dark:bg-gray-900/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded" aria-label={`${items.length} items`}>
          {items.length}
        </span>
      </div>
      <div className="space-y-3 min-h-[200px]" role="list">
        {children}
      </div>
      <button onClick={onAddChecklist} className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <Plus size={16} />
        Add checklist
      </button>
    </div>
  )
}
