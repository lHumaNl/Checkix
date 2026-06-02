import { useState } from 'react'
import { useForm, useFieldArray, useWatch, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { X, Plus, GripVertical, Trash2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useCreateChecklist, useUpdateChecklist } from '@/api/useChecklists'
import { useFolders } from '@/api/useFolders'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ChecklistItem, ChecklistTemplate } from '@/types'

interface ChecklistVersionDetail {
  items?: ChecklistItem[]
}

const statusLabelKeys = {
  draft: 'status.draft',
  active: 'status.active',
  archived: 'status.archived',
} as const satisfies Record<'draft' | 'active' | 'archived', MessageKey>

function createSchema(titleRequiredMessage: string) {
  return z.object({
    title: z.string().min(1, titleRequiredMessage),
    description: z.string().nullable(),
    category: z.string().nullable(),
    tags: z.array(z.string()),
    folder_id: z.number().nullable(),
    execution_mode: z.enum(['sequential', 'free_order']),
    status: z.enum(['draft', 'active', 'archived']),
    items: z.array(z.object({
      content: z.string(),
      description: z.string().nullable(),
      is_required: z.boolean(),
      estimated_time_seconds: z.number().nullable(),
    })),
  })
}

type FormData = z.infer<ReturnType<typeof createSchema>>

interface ChecklistFormModalProps {
  onClose: () => void
  checklist?: ChecklistTemplate
}

export function ChecklistFormModal({ onClose, checklist }: ChecklistFormModalProps) {
  const { t } = useI18n()
  const isEdit = !!checklist
  const createChecklist = useCreateChecklist()
  const updateChecklist = useUpdateChecklist()
  const { data: folders = [] } = useFolders()

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createSchema(t('checklists.validationTitleRequired'))),
    defaultValues: isEdit
      ? {
          title: checklist.title || checklist.name,
          description: checklist.description ?? '',
          category: checklist.category ?? '',
          tags: checklist.tags ?? [],
          folder_id: checklist.folder_id ?? null,
          execution_mode: checklist.execution_mode ?? 'free_order',
          status: checklist.status ?? 'draft',
          items: (() => {
            const version = checklist.current_version as ChecklistVersionDetail | number | null | undefined
            const items = typeof version === 'object' ? version?.items : undefined
            if (items?.length) {
              return items.map(item => ({
                content: item.title || item.content || '',
                description: item.description || '',
                is_required: item.is_required ?? false,
                estimated_time_seconds: null,
              }))
            }
            return [{ content: '', description: '', is_required: false, estimated_time_seconds: null }]
          })(),
        }
      : {
          title: '',
          description: '',
          category: '',
          tags: [],
          folder_id: null,
          execution_mode: 'free_order',
          status: 'draft',
          items: [{ content: '', description: '', is_required: false, estimated_time_seconds: null }],
        },
  })

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id)
      const newIndex = fields.findIndex(f => f.id === over.id)
      move(oldIndex, newIndex)
    }
  }

  const onSubmit = (data: FormData) => {
    const items = data.items
      .filter(item => item.content.trim() !== '')
      .map((item, index) => ({
        content: item.content,
        description: item.description || null,
        is_required: item.is_required,
        order: index,
      }))

    if (isEdit) {
      updateChecklist.mutate(
        {
           id: checklist.id,
           data: {
             name: data.title,
             description: data.description || '',
             category: data.category || '',
             tags: data.tags,
             folder_id: data.folder_id || null,
             execution_mode: data.execution_mode,
             status: data.status,
           },
         },
        {
          onSuccess: () => {
            toast({ title: t('checklists.updatedSuccess') })
            onClose()
          },
          onError: (error: unknown) => {
            console.error('Failed to update checklist:', error)
            toast({ title: t('checklists.updateFailed'), variant: 'destructive' })
          },
        }
      )
    } else {
      createChecklist.mutate(
        {
          name: data.title,
          description: data.description || '',
          category: data.category || '',
          tags: data.tags,
          folder_id: data.folder_id || null,
          execution_mode: data.execution_mode,
          status: data.status,
          items: items.length > 0 ? items : undefined,
        },
        {
          onSuccess: () => {
            toast({ title: t('checklists.createdSuccess') })
            onClose()
          },
          onError: (error: unknown) => {
            console.error('Failed to create checklist:', error)
            toast({ title: t('checklists.createFailed'), variant: 'destructive' })
          },
        }
      )
    }
  }

  const isPending = isEdit ? updateChecklist.isPending : createChecklist.isPending

  const [tagInput, setTagInput] = useState('')
  const tags = useWatch({ control, name: 'tags' }) ?? []

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue('tags', [...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setValue('tags', tags.filter(t => t !== tag))
  }

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEdit ? t('checklists.editTitle') : t('checklists.createTitle')}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400">
                {isEdit ? t('checklists.editDescription') : t('checklists.createDescription')}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('checklists.titleLabel')} *
                </label>
                <input
                  {...register('title')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('checklists.titlePlaceholder')}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('checklists.description')}
                </label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder={t('checklists.optionalDescription')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('checklists.folder')}
                  </label>
                  <select
                    {...register('folder_id', {
                      setValueAs: (value) => value === '' ? null : Number(value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('checklists.noFolder')}</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('checklists.executionMode')}
                  </label>
                  <select
                    {...register('execution_mode')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="free_order">{t('checklists.freeOrder')}</option>
                    <option value="sequential">{t('checklists.sequential')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('checklists.tags')}
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:opacity-70"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('checklists.addTag')}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {t('common.add')}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('checklists.items')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ content: '', description: '', is_required: false, estimated_time_seconds: null })}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900"
                  >
                    <Plus size={14} />
                    {t('checklists.addItem')}
                  </button>
                </div>

                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <SortableItem
                          key={field.id}
                          id={field.id}
                          index={index}
                          register={register}
                          remove={remove}
                          errors={errors.items?.[index]}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.status')}
                </label>
                <div className="flex gap-4">
                  {(['draft', 'active', 'archived'] as const).map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        {...register('status')}
                        value={status}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t(statusLabelKeys[status])}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isEdit
                  ? (isPending ? t('common.saving') : t('common.saveChanges'))
                  : (isPending ? t('common.creating') : t('checklists.createTitle'))}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ItemFormData {
  content: string
  description: string | null
  is_required: boolean
  estimated_time_seconds: number | null
}

interface SortableItemProps {
  id: string
  index: number
  register: UseFormRegister<FormData>
  remove: (index: number) => void
  errors: FieldErrors<ItemFormData> | undefined
}

function SortableItem({ id, index, register, remove, errors }: SortableItemProps) {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing mt-2"
      >
        <GripVertical size={16} />
      </button>

      <div className="flex-1 space-y-2">
        <input
          {...register(`items.${index}.content`)}
          placeholder={t('checklists.itemContent')}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors?.content?.message && (
          <p className="text-xs text-red-500">{errors.content.message}</p>
        )}
        <input
          {...register(`items.${index}.description`)}
          placeholder={t('checklists.optionalDescription')}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            {...register(`items.${index}.is_required`)}
            className="w-3 h-3 rounded border-gray-300 text-blue-600"
          />
          {t('checklists.required')}
        </label>
      </div>

      <button
        type="button"
        onClick={() => remove(index)}
        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )
}
