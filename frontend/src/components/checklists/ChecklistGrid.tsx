import { motion } from 'framer-motion'
import type { ChecklistTemplate } from '@/types'
import { ChecklistCard } from './ChecklistCard'

interface ChecklistGridProps {
  checklists: ChecklistTemplate[]
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
  selectedIds?: number[]
  onSelect?: (id: number, selected: boolean) => void
}

export function ChecklistGrid({
  checklists,
  onDuplicate,
  onDelete,
  selectedIds = [],
  onSelect,
}: ChecklistGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
      {checklists.map((checklist, index) => (
        <motion.div
          key={checklist.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.5) }}
          className="h-full"
        >
          <ChecklistCard
            checklist={checklist}
            selected={selectedIds.includes(checklist.id)}
            onSelect={onSelect}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  )
}
