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
import type { ChecklistItem } from '@/types'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

interface ChecklistVersionDetail {
  items?: ChecklistItem[]
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
} satisfies Record<keyof typeof statusColors, MessageKey>

const executionModeLabelKeys = {
  sequential: 'checklists.sequential',
  free_order: 'checklists.freeOrder',
} satisfies Record<string, MessageKey>

export function ChecklistDetailPage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const checklistId = id ? parseInt(id, 10) : undefined
  const hasInvalidChecklistId = checklistId !== undefined && isNaN(checklistId)
  const { data: checklist, isLoading } = useChecklist(checklistId)
  const deleteChecklist = useDeleteChecklist()
  const duplicateChecklist = useDuplicateChecklist()
  const createInstance = useCreateChecklistInstance()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (hasInvalidChecklistId) {
    return <Navigate to="/checklists" />
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (checklist) {
      deleteChecklist.mutate(checklist.id, {
        onSuccess: () => {
          toast({ title: t('checklists.deleted'), variant: 'default' })
          navigate('/checklists')
        },
        onError: () => {
          toast({ title: t('checklists.deleteFailed'), variant: 'destructive' })
        },
      })
    }
  }

  const handleDuplicate = () => {
    if (checklist) {
      duplicateChecklist.mutate(checklist.id, {
        onSuccess: (newChecklist) => {
          toast({ title: t('checklists.duplicated'), variant: 'default' })
          navigate(`/checklists/${newChecklist.id}`)
        },
        onError: () => {
          toast({ title: t('checklists.duplicateFailed'), variant: 'destructive' })
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
        {t('checklists.notFound')}
      </div>
    )
  }

  const version = checklist.current_version as ChecklistVersionDetail | number | null | undefined
  const versionItems = typeof version === 'object' ? version?.items ?? [] : []
  const detailItems = versionItems.length > 0 ? versionItems : checklist.items ?? []

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
              {checklist.title || checklist.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[checklist.status || 'draft']}`}>
                {t(statusLabelKeys[checklist.status || 'draft'])}
              </span>
              {checklist.execution_mode === 'sequential' && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                   {t('checklists.sequential')}
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
             {t('checklists.start')}
          </button>

          <button
            aria-label={t('common.edit')}
            onClick={() => setShowEditModal(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
          >
            <Edit size={20} />
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button aria-label={t('common.actions')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
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
                    {t('checklists.duplicate')}
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                <DropdownMenu.Item asChild>
                  <button
                    onClick={handleDelete}
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
                 <p className="text-xs text-gray-500 dark:text-gray-400">{t('checklists.items')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{checklist.items_count ?? detailItems.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Play size={16} className="text-gray-400" />
              <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400">{t('checklists.uses')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{checklist.usage_count || 0}</p>
              </div>
            </div>
            {checklist.category && (
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-gray-400" />
                <div>
                   <p className="text-xs text-gray-500 dark:text-gray-400">{t('checklists.category')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{checklist.category}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400">{t('checklists.mode')}</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {t(executionModeLabelKeys[checklist.execution_mode || 'free_order'])}
                </p>
              </div>
            </div>
          </div>
        </div>

        {checklist.tags?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon size={16} className="text-gray-400" />
               <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('checklists.tags')}</span>
            </div>
            <TagPills tags={checklist.tags} />
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
             {t('checklists.itemsTitle')}
          </h2>
          <div className="space-y-2">
            {detailItems.map((item, index) => (
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
                    {item.title || item.content}
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
        title={t('checklists.deleteTitle')}
        description={t('checklists.deleteOneConfirm')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
