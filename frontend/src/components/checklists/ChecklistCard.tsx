import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  CheckSquare, 
  MoreVertical, 
  Folder, 
  Clock,
  Copy,
  Trash2,
  Edit,
  GripVertical
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ChecklistTemplate } from '@/types'
import { TagPills } from './TagPills'

interface ChecklistCardProps {
  checklist: ChecklistTemplate
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
  selected?: boolean
  onSelect?: (id: number, selected: boolean) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  archived: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
}

export function ChecklistCard({ 
  checklist, 
  onDuplicate, 
  onDelete,
  selected,
  onSelect,
  dragHandleProps,
  isDragging
}: ChecklistCardProps) {
  const totalItems = checklist.items_count ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      whileHover={{ y: isDragging ? 0 : -4, boxShadow: isDragging ? undefined : '0 12px 24px -8px rgba(0, 0, 0, 0.15)' }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-shadow h-full flex flex-col"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {dragHandleProps && (
              <div 
                {...dragHandleProps} 
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <GripVertical size={16} />
              </div>
            )}
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => {
                e.stopPropagation()
                onSelect?.(checklist.id, e.target.checked)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Link 
              to={`/checklists/${checklist.id}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {checklist.title || checklist.name}
            </Link>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <MoreVertical size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[160px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1 z-50"
                sideOffset={5}
              >
                <DropdownMenu.Item asChild>
                  <Link
                    to={`/checklists/${checklist.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none"
                  >
                    <Edit size={14} />
                    Edit
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <button
                    onClick={() => onDuplicate?.(checklist.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none w-full"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                <DropdownMenu.Item asChild>
                  <button
                    onClick={() => onDelete?.(checklist.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none w-full"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {checklist.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {checklist.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[checklist.status || 'draft']}`}>
            {checklist.status || 'draft'}
          </span>
          {checklist.tags?.length > 0 && (
            <TagPills tags={checklist.tags} maxVisible={3} size="sm" />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <CheckSquare size={14} />
            <span>{totalItems} items</span>
          </div>
          {checklist.folder_id && (
            <div className="flex items-center gap-1">
              <Folder size={14} />
              <span>In folder</span>
            </div>
          )}
          {checklist.execution_mode === 'sequential' && (
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Sequential</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
