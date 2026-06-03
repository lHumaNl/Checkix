import { useState } from 'react'
import { Alert, Button, Card, Empty, Input, Segmented, Skeleton, Space, Tooltip } from 'antd'
import { Plus, Grid3X3, Columns3, List } from 'lucide-react'
import { useChecklists, useBulkDeleteChecklists, useDuplicateChecklist, useDeleteChecklist, useUpdateChecklist } from '@/api/useChecklists'
import { ChecklistGrid } from '@/components/checklists/ChecklistGrid'
import { ChecklistList } from '@/components/checklists/ChecklistList'
import { KanbanBoard } from '@/components/checklists/KanbanBoard'
import { FilterSidebar } from '@/components/checklists/FilterSidebar'
import { BulkActionsToolbar } from '@/components/checklists/BulkActionsToolbar'
import { ChecklistFormModal } from './ChecklistFormModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/i18n'

type ViewMode = 'grid' | 'list' | 'kanban'

export function ChecklistsPage() {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const debouncedSearch = useDebounce(search, 300)

  const { data: checklistsData, isLoading, error } = useChecklists({
    folder_id: selectedFolderId,
    status: statusFilter,
    search: debouncedSearch,
    tags: selectedTags,
  })

  const bulkDelete = useBulkDeleteChecklists()
  const duplicate = useDuplicateChecklist()
  const deleteOne = useDeleteChecklist()
  const updateChecklist = useUpdateChecklist()

  const handleStatusChange = (id: number, status: string) => {
    updateChecklist.mutate(
      { id, data: { status: status as 'draft' | 'active' | 'archived' } },
      {
        onSuccess: () => {
          toast({ title: t('checklists.statusUpdated'), variant: 'default' })
        },
        onError: () => {
          toast({ title: t('checklists.statusUpdateFailed'), variant: 'destructive' })
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
    const ids = selectedIds
    bulkDelete.mutate(ids, {
      onSuccess: () => {
        setSelectedIds([])
        toast({ title: t('checklists.deletedMany', { count: ids.length }), variant: 'default' })
      },
      onError: () => {
        toast({ title: t('checklists.deleteManyFailed'), variant: 'destructive' })
      },
    })
  }

  const handleDuplicate = (id: number) => {
    duplicate.mutate(id, {
      onSuccess: () => {
        toast({ title: t('checklists.duplicated'), variant: 'default' })
      },
      onError: () => {
        toast({ title: t('checklists.duplicateFailed'), variant: 'destructive' })
      },
    })
  }

  const handleDelete = (id: number) => {
    setConfirmState({
      open: true,
      title: t('checklists.deleteTitle'),
      description: t('checklists.deleteOneConfirm'),
      onConfirm: () => {
        deleteOne.mutate(id, {
          onSuccess: () => {
            toast({ title: t('checklists.deleted'), variant: 'default' })
          },
          onError: () => {
            toast({ title: t('checklists.deleteFailed'), variant: 'destructive' })
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

  const viewOptions = (['grid', 'list', 'kanban'] as ViewMode[]).map(mode => {
    const Icon = viewIcons[mode]
    return {
      value: mode,
      label: (
        <Tooltip title={mode}>
          <span className="inline-flex min-h-[28px] items-center">
            <Icon size={18} />
          </span>
        </Tooltip>
      ),
    }
  })

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-4 lg:flex-row">
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

      <div className="flex w-full min-w-0 flex-1 flex-col">
        <Card className="mb-4 shadow-sm" styles={{ body: { padding: 16 } }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Space size={12} wrap>
              <h1 className="m-0 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                {t('checklists.title')}
              </h1>
              <Input.Search
                allowClear
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={setSearch}
                placeholder={t('common.search')}
                className="w-full sm:!w-72"
              />
            </Space>

            <Space wrap>
              <Segmented
                value={viewMode}
                onChange={(value) => setViewMode(value as ViewMode)}
                options={viewOptions}
              />
              <Button
                type={showFilters ? 'primary' : 'default'}
                onClick={() => setShowFilters(!showFilters)}
              >
                {t('common.filters')}
              </Button>
              <Button
                type="primary"
                icon={<Plus size={18} />}
                onClick={() => setShowCreateModal(true)}
              >
                {t('checklists.new')}
              </Button>
            </Space>
          </div>
        </Card>

        {error ? (
          <Alert
            showIcon
            type="error"
            message={t('common.serverError')}
            description={t('common.failedRefresh')}
          />
        ) : isLoading ? (
          <Card>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : filteredChecklists.length === 0 ? (
          <Card className="flex-1">
            <Empty
              description={t('checklists.noneFound')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('checklists.createFirst')}</p>
              <Button type="primary" icon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>
                {t('checklists.new')}
              </Button>
            </Empty>
          </Card>
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
            onClearSelection={handleClearSelection}
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
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={confirmState.onConfirm}
      />
    </div>
  )
}
