import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ChecklistTemplate } from '@/types'
import { ChecklistCard } from './ChecklistCard'

export { ChecklistCard }

interface SortableChecklistCardProps {
  checklist: ChecklistTemplate
  selected?: boolean
  onSelect?: (id: number, selected: boolean) => void
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
}

export function SortableChecklistCard({
  checklist,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: SortableChecklistCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: checklist.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      aria-label={`${checklist.title} - ${checklist.status}`}
      className={`${isDragging ? 'z-50' : ''} ${isSorting ? '' : 'focus-within:ring-2 focus-within:ring-blue-500 rounded-xl'}`}
    >
      <ChecklistCard
        checklist={checklist}
        selected={selected}
        onSelect={onSelect}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
        isDragging={isDragging}
      />
    </div>
  )
}
