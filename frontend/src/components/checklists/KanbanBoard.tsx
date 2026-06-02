import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { ChecklistTemplate } from '@/types'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import { KanbanColumn } from './KanbanColumn'
import { SortableChecklistCard, ChecklistCard } from './SortableChecklistCard'

interface KanbanBoardProps {
  checklists: ChecklistTemplate[]
  onStatusChange?: (id: number, status: string) => void
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
  selectedIds?: number[]
  onSelect?: (id: number, selected: boolean) => void
}

const columns = [
  { id: 'draft', titleKey: 'status.draft', color: 'bg-gray-500' },
  { id: 'active', titleKey: 'status.active', color: 'bg-green-500' },
  { id: 'archived', titleKey: 'status.archived', color: 'bg-orange-500' },
] as const satisfies Array<{ id: 'draft' | 'active' | 'archived'; titleKey: MessageKey; color: string }>

export function KanbanBoard({
  checklists,
  onStatusChange,
  onDuplicate,
  onDelete,
  selectedIds = [],
  onSelect,
}: KanbanBoardProps) {
  const { t } = useI18n()
  const [items, setItems] = useState(() => ({
    draft: checklists.filter(c => c.status === 'draft'),
    active: checklists.filter(c => c.status === 'active'),
    archived: checklists.filter(c => c.status === 'archived'),
  }))
  const [activeId, setActiveId] = useState<number | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Sync props to state when checklists change - this is intentional for DND state management
    setItems({
      draft: checklists.filter(c => c.status === 'draft'),
      active: checklists.filter(c => c.status === 'active'),
      archived: checklists.filter(c => c.status === 'archived'),
    })
  }, [checklists])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const findColumnByItem = (id: number): string | undefined => {
    for (const [columnId, columnItems] of Object.entries(items)) {
      if (columnItems.some(item => item.id === id)) {
        return columnId
      }
    }
    return undefined
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragOver = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as number
    const overId = over.id as number | string

    const activeColumn = findColumnByItem(activeId)
    const overColumn = typeof overId === 'string' 
      ? overId 
      : findColumnByItem(overId as number)

    if (!activeColumn || !overColumn || activeColumn === overColumn) return

    setItems(prev => {
      const activeItems = prev[activeColumn as keyof typeof prev]
      const overItems = prev[overColumn as keyof typeof prev]

      const activeIndex = activeItems.findIndex(i => i.id === activeId)
      const activeItem = activeItems[activeIndex]

      const overIndex = typeof overId === 'string' 
        ? overItems.length 
        : overItems.findIndex(i => i.id === overId)

      const newActiveItems = activeItems.filter(i => i.id !== activeId)
      const newOverItems = [...overItems]
      newOverItems.splice(overIndex, 0, activeItem)

      return {
        ...prev,
        [activeColumn]: newActiveItems,
        [overColumn]: newOverItems,
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as number
    const overId = over.id as number | string

    const activeColumn = findColumnByItem(activeId)
    const overColumn = typeof overId === 'string' 
      ? overId 
      : findColumnByItem(overId as number)

    if (!activeColumn || !overColumn) return

    if (activeColumn === overColumn) {
      setItems(prev => {
        const columnItems = prev[activeColumn as keyof typeof prev]
        const oldIndex = columnItems.findIndex(i => i.id === activeId)
        const newIndex = typeof overId === 'string' 
          ? columnItems.length 
          : columnItems.findIndex(i => i.id === overId)

        return {
          ...prev,
          [activeColumn]: arrayMove(columnItems, oldIndex, newIndex),
        }
      })
    }

    if (activeColumn !== overColumn && onStatusChange) {
      onStatusChange(activeId, overColumn)
    }
  }

  const activeItem = activeId 
    ? checklists.find(c => c.id === activeId) 
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory sm:snap-none">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={t(column.titleKey)}
            color={column.color}
            items={items[column.id as keyof typeof items]}
          >
            <SortableContext
              items={items[column.id as keyof typeof items].map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence>
                {items[column.id as keyof typeof items].map(checklist => (
                  <SortableChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    selected={selectedIds.includes(checklist.id)}
                    onSelect={onSelect}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="opacity-90 rotate-3">
            <ChecklistCard
              checklist={activeItem}
              selected={selectedIds.includes(activeItem.id)}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
