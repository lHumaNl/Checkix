import { useState, useRef } from 'react'
import { Plus, Grid3X3, Columns3, List, Search } from 'lucide-react'
import { useChecklists, useBulkDeleteChecklists, useMoveChecklistsToFolder, useAddTagsToChecklists, useDuplicateChecklist, useDeleteChecklist, useUpdateChecklist } from '@/api/useChecklists'
import { ChecklistGrid } from '@/components/checklists/ChecklistGrid'
import { ChecklistList } from '@/components/checklists/ChecklistList'
import { KanbanBoard } from '@/components/checklists/KanbanBoard'
import { FilterSidebar } from '@/components/checklists/FilterSidebar'
import { BulkActionsToolbar } from '@/components/checklists/BulkActionsToolbar'
import { ChecklistFormModal } from './ChecklistFormModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import { useDebounce } from '@/hooks/useDebounce'
import { ChecklistsSkeleton } from '@/components/skeletons/ChecklistsSkeleton'

type ViewMode = 'grid' | 'list' | 'kanban'

export function ChecklistsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const debouncedSearch = useDebounce(search, 300)

  const { data: checklistsData, isLoading } = useChecklists({
    folder_id: selectedFolderId,
    status: statusFilter,
    search: debouncedSearch,
    tags: selectedTags,
  })

  const bulkDelete = useBulkDeleteChecklists()
  const moveToFolders = useMoveChecklistsToFolder()
  const addTags = useAddTagsToChecklists()
  const duplicate = useDuplicateChecklist()
  const deleteOne = useDeleteChecklist()
  const updateChecklist = useUpdateChecklist()

  const handleStatusChange = (id: number, status: string) => {
    updateChecklist.mutate(
      { id, data: { status: status as 'draft' | 'active' | 'archived' } },
      {
        onSuccess: () => {
          toast({ title: 'Status updated', variant: 'default' })
        },
        onError: () => {
          toast({ title: 'Failed to update status', variant: 'destructive' })
        },
      }
    )
  }

  const checklists = checklistsData?.items || []
  const filteredChecklists = checklists

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds(prev =>
      selected ? [...prev, id] : prev.filter(i => i !== id)
    )
  }

  const handleSelectAll = () => {
    setSelectedIds(filteredChecklists.map(c => c.id))
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const handleBulkDelete = () => {
    setConfirmState({
      open: true,
      title: 'Delete checklists',
      description: `Are you sure you want to delete ${selectedIds.length} checklists? This action cannot be undone.`,
      onConfirm: () => {
        const ids = selectedIdsRef.current
        bulkDelete.mutate(ids, {
          onSuccess: () => {
            setSelectedIds([])
            toast({ title: `${ids.length} checklists deleted`, variant: 'default' })
          },
          onError: () => {
            toast({ title: 'Failed to delete checklists', variant: 'destructive' })
          },
        })
      },
    })
  }

  const handleMoveToFolder = (folderId: number | null) => {
    moveToFolders.mutate(
      { ids: selectedIds, folder_id: folderId },
      {
        onSuccess: () => {
          setSelectedIds([])
          toast({ title: 'Checklists moved', variant: 'default' })
        },
      }
    )
  }

  const handleAddTags = (tags: string[]) => {
    addTags.mutate(
      { ids: selectedIds, tags },
      {
        onSuccess: () => {
          setSelectedIds([])
          toast({ title: 'Tags added', variant: 'default' })
        },
      }
    )
  }

  const handleDuplicate = (id: number) => {
    duplicate.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Checklist duplicated', variant: 'default' })
      },
      onError: () => {
        toast({ title: 'Failed to duplicate checklist', variant: 'destructive' })
      },
    })
  }

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      title: 'Delete checklist',
      description: 'Are you sure you want to delete this checklist? This action cannot be undone.',
      onConfirm: () => {
        deleteOne.mutate(id, {
          onSuccess: () => {
            toast({ title: 'Checklist deleted', variant: 'default' })
          },
          onError: () => {
            toast({ title: 'Failed to delete checklist', variant: 'destructive' })
          },
        })
      },
    })
  }

  const viewIcons = {
    grid: Grid3X3,
    list: List,
    kanban: Columns3,
  }

  return (
    <div className="flex h-full">
      {showFilters && (
        <FilterSidebar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          selectedFolderId={selectedFolderId}
          onFolderChange={setSelectedFolderId}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Checklists
            </h1>
            <div className="relative flex-1 sm:flex-none">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['grid', 'list', 'kanban'] as ViewMode[]).map(mode => {
                const Icon = viewIcons[mode]
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                      viewMode === mode
                        ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`hidden sm:block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Filters
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">New Checklist</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <ChecklistsSkeleton />
        ) : filteredChecklists.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Plus size={32} />
            </div>
            <p className="text-lg font-medium mb-1">No checklists found</p>
            <p className="text-sm">Create your first checklist to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <ChecklistGrid
            checklists={filteredChecklists}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ) : viewMode === 'list' ? (
          <ChecklistList
            checklists={filteredChecklists}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        ) : (
          <KanbanBoard
            checklists={filteredChecklists}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      <BulkActionsToolbar
        selectedCount={selectedIds.length}
        totalCount={filteredChecklists.length}
        onDelete={handleBulkDelete}
        onMoveToFolder={handleMoveToFolder}
        onAddTags={handleAddTags}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {showCreateModal && (
        <ChecklistFormModal
          onClose={() => setShowCreateModal(false)}
        />
      )}

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmState.onConfirm}
      />
    </div>
  )
}
