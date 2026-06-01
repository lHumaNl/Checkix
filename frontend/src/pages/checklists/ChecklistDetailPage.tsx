import { useState } from 'react'
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Play,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Folder,
  Clock,
  CheckSquare,
  Tag as TagIcon,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useChecklist, useDeleteChecklist, useDuplicateChecklist } from '@/api/useChecklists'
import { useCreateChecklistInstance } from '@/api/useChecklistInstances'
import { TagPills } from '@/components/checklists/TagPills'
import { ChecklistFormModal } from './ChecklistFormModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import { ChecklistDetailSkeleton } from '@/components/skeletons/ChecklistDetailSkeleton'

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  archived: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
}

export function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const checklistId = id ? parseInt(id, 10) : undefined
  if (checklistId !== undefined && isNaN(checklistId)) {
    return <Navigate to="/checklists" />
  }
  const { data: checklist, isLoading } = useChecklist(checklistId)
  const deleteChecklist = useDeleteChecklist()
  const duplicateChecklist = useDuplicateChecklist()
  const createInstance = useCreateChecklistInstance()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (checklist) {
      deleteChecklist.mutate(checklist.id, {
        onSuccess: () => {
          toast({ title: 'Checklist deleted', variant: 'default' })
          navigate('/checklists')
        },
        onError: () => {
          toast({ title: 'Failed to delete checklist', variant: 'destructive' })
        },
      })
    }
  }

  const handleDuplicate = () => {
    if (checklist) {
      duplicateChecklist.mutate(checklist.id, {
        onSuccess: (newChecklist) => {
          toast({ title: 'Checklist duplicated', variant: 'default' })
          navigate(`/checklists/${newChecklist.id}`)
        },
        onError: () => {
          toast({ title: 'Failed to duplicate checklist', variant: 'destructive' })
        },
      })
    }
  }

  const handleStartInstance = () => {
    if (checklist) {
      createInstance.mutate(
        { name: checklist.name || checklist.title, template: Number(checklist.id) },
        {
          onSuccess: (instance) => {
            navigate(`/instances/${instance.id}`)
          },
        }
      )
    }
  }

  if (isLoading) {
    return <ChecklistDetailSkeleton />
  }

  if (!checklist) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Checklist not found
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/checklists"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {checklist.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[checklist.status || 'draft']}`}>
                {checklist.status || 'draft'}
              </span>
              {checklist.execution_mode === 'sequential' && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  Sequential
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartInstance}
            disabled={checklist.status !== 'active'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Play size={16} />
            Start
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
          >
            <Edit size={20} />
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <MoreVertical size={20} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[140px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1 z-50"
                sideOffset={5}
              >
                <DropdownMenu.Item asChild>
                  <button
                    onClick={handleDuplicate}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none w-full"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                <DropdownMenu.Item asChild>
                  <button
                    onClick={handleDelete}
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
      </div>

      <div className="space-y-6">
        {checklist.description && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-gray-600 dark:text-gray-400">{checklist.description}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Items</p>
                <p className="font-medium text-gray-900 dark:text-white">{checklist.items_count ?? (checklist as Record<string, unknown>).current_version?.items?.length ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Play size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Uses</p>
                <p className="font-medium text-gray-900 dark:text-white">{checklist.usage_count || 0}</p>
              </div>
            </div>
            {checklist.category && (
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                  <p className="font-medium text-gray-900 dark:text-white">{checklist.category}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Mode</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {checklist.execution_mode?.replace('_', ' ') || 'free order'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {checklist.tags?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</span>
            </div>
            <TagPills tags={checklist.tags} />
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Checklist Items
          </h2>
          <div className="space-y-2">
            {((checklist as Record<string, unknown>).current_version as { items?: { id: string; title: string; description?: string; is_required: boolean }[] } | undefined)?.items?.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded text-sm text-gray-500 dark:text-gray-400">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.title}
                    {item.is_required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {showEditModal && (
        <ChecklistFormModal
          onClose={() => setShowEditModal(false)}
          checklist={checklist}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete checklist"
        description="Are you sure you want to delete this checklist? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
