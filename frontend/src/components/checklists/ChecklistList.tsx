import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  CheckSquare,
  GripVertical,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ChecklistTemplate } from '@/types'
import { TagPills } from './TagPills'

interface ChecklistListProps {
  checklists: ChecklistTemplate[]
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
  selectedIds?: number[]
  onSelect?: (id: number, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  archived: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
}

const statusLabelKeys = {
  draft: 'status.draft',
  active: 'status.active',
  archived: 'status.archived',
} as const satisfies Record<'draft' | 'active' | 'archived', MessageKey>

export function ChecklistList({
  checklists,
  onDuplicate,
  onDelete,
  selectedIds = [],
  onSelect,
  onSelectAll,
}: ChecklistListProps) {
  const { t } = useI18n()
  const allSelected = checklists.length > 0 && selectedIds.length === checklists.length

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="grid grid-cols-[40px_1fr_120px_100px_80px_50px] gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll?.(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        <div>{t('checklists.titleLabel')}</div>
        <div>{t('common.status')}</div>
        <div>{t('checklists.items')}</div>
        <div>{t('checklists.uses')}</div>
        <div />
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {checklists.map((checklist, index) => (
          <motion.div
            key={checklist.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.5) }}
            className={`grid grid-cols-[40px_1fr_120px_100px_80px_50px] gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${
              selectedIds.includes(checklist.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <GripVertical size={16} className="text-gray-300 dark:text-gray-600 cursor-grab" />
              <input
                type="checkbox"
                checked={selectedIds.includes(checklist.id)}
                onChange={(e) => onSelect?.(checklist.id, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  to={`/checklists/${checklist.id}`}
                  className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                >
                  {checklist.title || checklist.name}
                </Link>
                {checklist.tags?.length > 0 && (
                  <div className="flex-shrink-0">
                    <TagPills tags={checklist.tags} maxVisible={2} size="sm" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[checklist.status || 'draft']}`}>
                {t(statusLabelKeys[checklist.status || 'draft'])}
              </span>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('checklists.itemsCount', { count: checklist.items?.length || 0 })}
            </div>

            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <CheckSquare size={14} />
              <span>{checklist.usage_count || 0}</span>
            </div>

            <div className="flex justify-end">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[140px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1 z-50"
                    sideOffset={5}
                    align="end"
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        to={`/checklists/${checklist.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none"
                      >
                        <Edit size={14} />
                        {t('common.edit')}
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <button
                        onClick={() => onDuplicate?.(checklist.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none w-full"
                      >
                        <Copy size={14} />
                        {t('checklists.duplicate')}
                      </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                    <DropdownMenu.Item asChild>
                      <button
                        onClick={() => onDelete?.(checklist.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none w-full"
                      >
                        <Trash2 size={14} />
                        {t('common.delete')}
                      </button>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
