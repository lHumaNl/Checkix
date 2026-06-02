import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Plus, GripVertical, Trash2 } from 'lucide-react'
import { Button, Checkbox, Col, Divider, Form, Input, Modal, Radio, Row, Select, Space, Tag, Typography } from 'antd'
import { useCreateChecklist, useUpdateChecklist } from '@/api/useChecklists'
import { useFolders } from '@/api/useFolders'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ChecklistItem, ChecklistTemplate } from '@/types'

const { Text } = Typography
const { TextArea } = Input

const CHECKLIST_STATUSES = ['draft', 'active', 'archived'] as const
const EXECUTION_MODES = ['free_order', 'sequential'] as const
const NO_FOLDER_VALUE = 'no-folder'

type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number]
type ExecutionMode = (typeof EXECUTION_MODES)[number]

interface ChecklistVersionDetail {
  items?: ChecklistItem[]
}

const statusLabelKeys = {
  draft: 'status.draft',
  active: 'status.active',
  archived: 'status.archived',
} as const satisfies Record<ChecklistStatus, MessageKey>

const executionModeLabelKeys = {
  free_order: 'checklists.freeOrder',
  sequential: 'checklists.sequential',
} as const satisfies Record<ExecutionMode, MessageKey>

function createSchema(titleRequiredMessage: string) {
  return z.object({
    title: z.string().min(1, titleRequiredMessage),
    description: z.string().nullable(),
    category: z.string().nullable(),
    tags: z.array(z.string()),
    folder_id: z.number().nullable(),
    execution_mode: z.enum(EXECUTION_MODES),
    status: z.enum(CHECKLIST_STATUSES),
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

function getVersionItems(checklist: ChecklistTemplate): ChecklistItem[] | undefined {
  const version = checklist.current_version as ChecklistVersionDetail | number | null | undefined
  return typeof version === 'object' ? version?.items : undefined
}

function createBlankItem(): FormData['items'][number] {
  return { content: '', description: '', is_required: false, estimated_time_seconds: null }
}

function getChecklistItems(checklist?: ChecklistTemplate): FormData['items'] {
  const items = checklist ? getVersionItems(checklist) : undefined
  if (!items?.length) return [createBlankItem()]

  return items.map(item => ({
    content: item.title || item.content || '',
    description: item.description || '',
    is_required: item.is_required ?? false,
    estimated_time_seconds: null,
  }))
}

function getDefaultValues(checklist?: ChecklistTemplate): FormData {
  return {
    title: checklist?.title || checklist?.name || '',
    description: checklist?.description ?? '',
    category: checklist?.category ?? '',
    tags: checklist?.tags ?? [],
    folder_id: checklist?.folder_id ?? null,
    execution_mode: checklist?.execution_mode ?? 'free_order',
    status: checklist?.status ?? 'draft',
    items: getChecklistItems(checklist),
  }
}

function buildItems(data: FormData) {
  return data.items
    .filter(item => item.content.trim() !== '')
    .map((item, index) => ({
      content: item.content,
      description: item.description || null,
      is_required: item.is_required,
      order: index,
    }))
}

export function ChecklistFormModal({ onClose, checklist }: ChecklistFormModalProps) {
  const { t } = useI18n()
  const createChecklist = useCreateChecklist()
  const updateChecklist = useUpdateChecklist()
  const { data: folders = [] } = useFolders()
  const isEdit = checklist !== undefined

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createSchema(t('checklists.validationTitleRequired'))),
    defaultValues: getDefaultValues(checklist),
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' })
  const [tagInput, setTagInput] = useState('')
  const tags = useWatch({ control, name: 'tags' }) ?? []
  const isPending = isEdit ? updateChecklist.isPending : createChecklist.isPending

  const folderOptions = useMemo(() => [
    { value: NO_FOLDER_VALUE, label: t('checklists.noFolder') },
    ...folders.map(folder => ({ value: String(folder.id), label: folder.name })),
  ], [folders, t])

  const statusOptions = CHECKLIST_STATUSES.map(status => ({
    value: status,
    label: t(statusLabelKeys[status]),
  }))

  const executionModeOptions = EXECUTION_MODES.map(mode => ({
    value: mode,
    label: t(executionModeLabelKeys[mode]),
  }))

  const addTag = () => {
    const nextTag = tagInput.trim()
    if (!nextTag || tags.includes(nextTag)) return
    setValue('tags', [...tags, nextTag], { shouldDirty: true })
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setValue('tags', tags.filter(currentTag => currentTag !== tag), { shouldDirty: true })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = fields.findIndex(field => field.id === active.id)
    const newIndex = fields.findIndex(field => field.id === over.id)
    move(oldIndex, newIndex)
  }

  const onSubmit = (data: FormData) => {
    if (checklist) {
      updateChecklist.mutate(
        { id: checklist.id, data: buildUpdatePayload(data) },
        createMutationOptions(t('checklists.updatedSuccess'), t('checklists.updateFailed'), onClose)
      )
      return
    }

    createChecklist.mutate(
      buildCreatePayload(data),
      createMutationOptions(t('checklists.createdSuccess'), t('checklists.createFailed'), onClose)
    )
  }

  return (
    <Modal
      open
      centered
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      title={<ModalTitle description={isEdit ? t('checklists.editDescription') : t('checklists.createDescription')} title={isEdit ? t('checklists.editTitle') : t('checklists.createTitle')} />}
      width={720}
      styles={{ body: { maxHeight: 'calc(90vh - 140px)', overflowY: 'auto', paddingTop: 8 } }}
    >
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          required
          label={t('checklists.titleLabel')}
          validateStatus={errors.title ? 'error' : undefined}
          help={errors.title?.message}
        >
          <Controller
            control={control}
            name="title"
            render={({ field }) => <Input {...field} placeholder={t('checklists.titlePlaceholder')} />}
          />
        </Form.Item>

        <Form.Item label={t('checklists.description')}>
          <Controller
            control={control}
            name="description"
            render={({ field }) => <TextArea {...field} value={field.value ?? ''} autoSize={{ minRows: 2, maxRows: 4 }} placeholder={t('checklists.optionalDescription')} />}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label={t('checklists.folder')}>
              <Controller
                control={control}
                name="folder_id"
                render={({ field }) => (
                  <Select
                    {...field}
                    showSearch
                    optionFilterProp="label"
                    options={folderOptions}
                    value={field.value === null ? NO_FOLDER_VALUE : String(field.value)}
                    onChange={value => field.onChange(value === NO_FOLDER_VALUE ? null : Number(value))}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={t('checklists.executionMode')}>
              <Controller
                control={control}
                name="execution_mode"
                render={({ field }) => <Select {...field} options={executionModeOptions} />}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label={t('checklists.tags')}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size={[4, 8]} wrap>
              {tags.map(tag => (
                <Tag key={tag} color="blue" closable onClose={() => removeTag(tag)}>
                  {tag}
                </Tag>
              ))}
            </Space>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={tagInput} onChange={event => setTagInput(event.target.value)} onPressEnter={event => { event.preventDefault(); addTag() }} placeholder={t('checklists.addTag')} />
              <Button onClick={addTag}>{t('common.add')}</Button>
            </Space.Compact>
          </Space>
        </Form.Item>

        <Form.Item required label={t('checklists.items')}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button type="dashed" icon={<Plus size={14} />} onClick={() => append(createBlankItem())}>
              {t('checklists.addItem')}
            </Button>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {fields.map((field, index) => (
                    <SortableItem
                      key={field.id}
                      id={field.id}
                      control={control}
                      errors={errors.items?.[index]}
                      index={index}
                      remove={remove}
                    />
                  ))}
                </Space>
              </SortableContext>
            </DndContext>
          </Space>
        </Form.Item>

        <Form.Item label={t('common.status')}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => <Radio.Group {...field} optionType="button" options={statusOptions} />}
          />
        </Form.Item>

        <Divider />
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            {getSubmitLabel(isEdit, isPending, t)}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

function buildUpdatePayload(data: FormData) {
  return {
    name: data.title,
    description: data.description || '',
    category: data.category || '',
    tags: data.tags,
    folder_id: data.folder_id || null,
    execution_mode: data.execution_mode,
    status: data.status,
  }
}

function buildCreatePayload(data: FormData) {
  const items = buildItems(data)
  return {
    ...buildUpdatePayload(data),
    items: items.length > 0 ? items : undefined,
  }
}

function createMutationOptions(successTitle: string, errorTitle: string, onClose: () => void) {
  return {
    onSuccess: () => {
      toast({ title: successTitle })
      onClose()
    },
    onError: (error: unknown) => {
      console.error('Failed to save checklist:', error)
      toast({ title: errorTitle, variant: 'destructive' as const })
    },
  }
}

function getSubmitLabel(isEdit: boolean, isPending: boolean, t: (key: MessageKey) => string) {
  if (isEdit) return isPending ? t('common.saving') : t('common.saveChanges')
  return isPending ? t('common.creating') : t('checklists.createTitle')
}

interface ModalTitleProps {
  title: string
  description: string
}

function ModalTitle({ title, description }: ModalTitleProps) {
  return (
    <Space direction="vertical" size={0}>
      <span>{title}</span>
      <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
        {description}
      </Text>
    </Space>
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
  control: Control<FormData>
  remove: (index: number) => void
  errors: FieldErrors<ItemFormData> | undefined
}

function SortableItem({ id, index, control, remove, errors }: SortableItemProps) {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
    >
      <Button {...attributes} {...listeners} type="text" size="small" icon={<GripVertical size={16} />} aria-label={t('checklists.items')} />
      <div className="flex-1 space-y-2">
        <Controller
          control={control}
          name={`items.${index}.content` as const}
          render={({ field }) => <Input {...field} size="small" status={errors?.content ? 'error' : undefined} placeholder={t('checklists.itemContent')} />}
        />
        {errors?.content?.message && <Text type="danger">{errors.content.message}</Text>}
        <Controller
          control={control}
          name={`items.${index}.description` as const}
          render={({ field }) => <Input {...field} value={field.value ?? ''} size="small" placeholder={t('checklists.optionalDescription')} />}
        />
      </div>
      <Controller
        control={control}
        name={`items.${index}.is_required` as const}
        render={({ field }) => <Checkbox checked={field.value} onChange={event => field.onChange(event.target.checked)}>{t('checklists.required')}</Checkbox>}
      />
      <Button danger type="text" size="small" icon={<Trash2 size={16} />} aria-label={t('common.delete')} onClick={() => remove(index)} />
    </motion.div>
  )
}
