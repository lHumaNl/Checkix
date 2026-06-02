import { useState } from 'react'
import { DeleteOutlined, FilterOutlined, PlusOutlined, SearchOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Skeleton, Space, Switch, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useAssignments, useCreateAssignment, useDeleteAssignment, type Assignment } from '@/api/useAssignments'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

type AssignmentTypeFilter = '' | Assignment['assignment_type']
type AssigneeTypeFilter = '' | Assignment['assignee_type']

interface CreateFormValues {
  assignment_type: Assignment['assignment_type']
  assignee_type: Assignment['assignee_type']
  checklist_template: number | null
  checklist_item: number | null
  checklist_instance: number | null
  assignee_user: number | null
  assignee_group: number | null
  assignee_parameter: string
  is_exclusive: boolean
  auto_notify: boolean
}

const MIN_ID = 1
const EMPTY_TEXT = '—'

const defaultForm: CreateFormValues = {
  assignment_type: 'template',
  assignee_type: 'user',
  checklist_template: null,
  checklist_item: null,
  checklist_instance: null,
  assignee_user: null,
  assignee_group: null,
  assignee_parameter: '',
  is_exclusive: false,
  auto_notify: true,
}

const assignmentTypeLabels: Record<Assignment['assignment_type'], MessageKey> = {
  template: 'assignments.typeTemplate',
  item: 'assignments.typeItem',
  runtime: 'assignments.typeRuntime',
}

const assigneeTypeLabels: Record<Assignment['assignee_type'], MessageKey> = {
  user: 'assignments.assigneeUser',
  group: 'assignments.assigneeGroup',
  parameter: 'assignments.assigneeParameter',
  manager: 'assignments.assigneeManager',
}

const assignmentTagColors: Record<Assignment['assignment_type'], string> = {
  template: 'blue',
  item: 'purple',
  runtime: 'gold',
}

const assigneeTagColors: Record<Assignment['assignee_type'], string> = {
  user: 'green',
  group: 'geekblue',
  parameter: 'magenta',
  manager: 'orange',
}

const assignmentTypeOptions = typedOptions(assignmentTypeLabels)
const assigneeTypeOptions = typedOptions(assigneeTypeLabels)

function typedOptions<T extends string>(labels: Record<T, MessageKey>) {
  return Object.entries(labels) as Array<[T, MessageKey]>
}

function numericRule(message: string) {
  return [{ required: true, message }]
}

function textRule(message: string) {
  return [{ required: true, whitespace: true, message }]
}

function getResultCount(data: ReturnType<typeof useAssignments>['data'], fallback: number) {
  return data?.total ?? data?.count ?? fallback
}

function displayValue(value?: string | null) {
  return value?.trim() || EMPTY_TEXT
}

interface CreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateAssignmentModal({ open, onOpenChange }: CreateModalProps) {
  const { t } = useI18n()
  const [form] = Form.useForm<CreateFormValues>()
  const createMutation = useCreateAssignment()
  const assignmentType = Form.useWatch('assignment_type', form) ?? 'template'
  const assigneeType = Form.useWatch('assignee_type', form) ?? 'user'

  const closeModal = () => {
    form.resetFields()
    onOpenChange(false)
  }

  const handleSubmit = (values: CreateFormValues) => {
    createMutation.mutate(buildCreatePayload(values), {
      onSuccess: () => {
        toast({ title: t('assignments.created'), variant: 'default' })
        closeModal()
      },
      onError: () => {
        toast({ title: t('assignments.createFailed'), variant: 'destructive' })
      },
    })
  }

  return (
    <Modal
      open={open}
      title={t('assignments.new')}
      okText={t('assignments.new')}
      cancelText={t('common.cancel')}
      okButtonProps={{ icon: <PlusOutlined /> }}
      confirmLoading={createMutation.isPending}
      onOk={() => form.submit()}
      onCancel={closeModal}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={defaultForm}
        onFinish={handleSubmit}
        preserve
      >
        <Form.Item name="assignment_type" label={t('assignments.assignmentType')} required>
          <Select options={localizedOptions(assignmentTypeOptions, t)} />
        </Form.Item>

        <TargetField assignmentType={assignmentType} />

        <Form.Item name="assignee_type" label={t('assignments.assigneeType')} required>
          <Select options={localizedOptions(assigneeTypeOptions, t)} />
        </Form.Item>

        <AssigneeField assigneeType={assigneeType} />

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Form.Item name="is_exclusive" valuePropName="checked" style={{ marginBottom: 0 }}>
            <SwitchLabel
              title={t('assignments.exclusive')}
              note={t('assignments.exclusiveNote')}
            />
          </Form.Item>
          <Form.Item name="auto_notify" valuePropName="checked" style={{ marginBottom: 0 }}>
            <SwitchLabel
              title={t('assignments.autoNotify')}
              note={t('assignments.autoNotifyNote')}
            />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}

function buildCreatePayload(values: CreateFormValues) {
  const payload: Parameters<ReturnType<typeof useCreateAssignment>['mutate']>[0] = {
    assignment_type: values.assignment_type,
    assignee_type: values.assignee_type,
    is_exclusive: values.is_exclusive,
    auto_notify: values.auto_notify,
  }

  if (values.assignment_type === 'template') payload.checklist_template = Number(values.checklist_template)
  if (values.assignment_type === 'item') payload.checklist_item = Number(values.checklist_item)
  if (values.assignment_type === 'runtime') payload.checklist_instance = Number(values.checklist_instance)

  if (values.assignee_type === 'user') payload.assignee_user = Number(values.assignee_user)
  if (values.assignee_type === 'group') payload.assignee_group = Number(values.assignee_group)
  if (values.assignee_type === 'parameter') payload.assignee_parameter = values.assignee_parameter.trim()
  return payload
}

function localizedOptions<T extends string>(options: Array<[T, MessageKey]>, t: (key: MessageKey) => string) {
  return options.map(([value, labelKey]) => ({ value, label: t(labelKey) }))
}

function TargetField({ assignmentType }: { assignmentType: Assignment['assignment_type'] }) {
  const { t } = useI18n()
  if (assignmentType === 'item') {
    return <NumberField name="checklist_item" label={t('assignments.targetItemId')} message={t('assignments.validationItemRequired')} example={7} />
  }
  if (assignmentType === 'runtime') {
    return <NumberField name="checklist_instance" label={t('assignments.targetInstanceId')} message={t('assignments.validationInstanceRequired')} example={15} />
  }
  return <NumberField name="checklist_template" label={t('assignments.targetTemplateId')} message={t('assignments.validationTemplateRequired')} example={42} />
}

function AssigneeField({ assigneeType }: { assigneeType: Assignment['assignee_type'] }) {
  const { t } = useI18n()
  if (assigneeType === 'group') {
    return <NumberField name="assignee_group" label={t('assignments.groupId')} message={t('assignments.validationGroupRequired')} example={2} />
  }
  if (assigneeType === 'parameter') {
    return <ParameterField />
  }
  if (assigneeType === 'manager') {
    return <Alert type="info" showIcon message={t('assignments.managerRuntime')} />
  }
  return <NumberField name="assignee_user" label={t('assignments.userId')} message={t('assignments.validationUserRequired')} example={3} />
}

interface NumberFieldProps {
  name: keyof CreateFormValues
  label: string
  message: string
  example: number
}

function NumberField({ name, label, message, example }: NumberFieldProps) {
  const { t } = useI18n()
  return (
    <Form.Item name={name} label={label} rules={numericRule(message)} required>
      <InputNumber
        min={MIN_ID}
        placeholder={t('assignments.exampleNumber', { value: example })}
        style={{ width: '100%' }}
      />
    </Form.Item>
  )
}

function ParameterField() {
  const { t } = useI18n()
  return (
    <Form.Item
      name="assignee_parameter"
      label={t('assignments.parameterName')}
      rules={textRule(t('assignments.validationParameterRequired'))}
      required
    >
      <Input placeholder={t('assignments.exampleParameter')} />
    </Form.Item>
  )
}

interface SwitchLabelProps {
  title: string
  note: string
  checked?: boolean
  onChange?: (checked: boolean) => void
}

function SwitchLabel({ title, note, checked, onChange }: SwitchLabelProps) {
  return (
    <Space align="start">
      <Switch aria-label={title} checked={checked} onChange={onChange} />
      <span>
        {title}{' '}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          ({note})
        </Typography.Text>
      </span>
    </Space>
  )
}

export function AssignmentsPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<AssignmentTypeFilter>('')
  const [assigneeTypeFilter, setAssigneeTypeFilter] = useState<AssigneeTypeFilter>('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data, isError, isLoading } = useAssignments({
    search: search || undefined,
    assignment_type: assignmentTypeFilter || undefined,
    assignee_type: assigneeTypeFilter || undefined,
  })
  const deleteMutation = useDeleteAssignment()
  const assignments: Assignment[] = Array.isArray(data) ? data : (data?.items ?? [])
  const hasFilters = Boolean(search || assignmentTypeFilter || assigneeTypeFilter)
  const resultCount = getResultCount(data, assignments.length)

  const handleDelete = (assignment: Assignment) => {
    deleteMutation.mutate(assignment.id, {
      onSuccess: () => toast({ title: t('assignments.deleted'), variant: 'default' }),
      onError: () => toast({ title: t('assignments.deleteFailed'), variant: 'destructive' }),
    })
  }

  const columns: TableColumnsType<Assignment> = [
    {
      title: t('assignments.target'),
      dataIndex: 'target_display',
      render: (value: string) => <EllipsisText strong value={value} />,
    },
    {
      title: t('assignments.assignee'),
      dataIndex: 'assignee_display',
      render: (value: string) => <EllipsisText value={value} />,
    },
    {
      title: t('assignments.assignmentType'),
      dataIndex: 'assignment_type',
      render: (value: Assignment['assignment_type']) => (
        <Tag color={assignmentTagColors[value]}>{t(assignmentTypeLabels[value])}</Tag>
      ),
    },
    {
      title: t('assignments.assigneeType'),
      dataIndex: 'assignee_type',
      render: (value: Assignment['assignee_type']) => (
        <Tag color={assigneeTagColors[value]}>{t(assigneeTypeLabels[value])}</Tag>
      ),
    },
    {
      title: t('assignments.exclusive'),
      dataIndex: 'is_exclusive',
      render: (value: boolean) => <BooleanTag active={value} activeColor="red" />,
    },
    {
      title: t('assignments.notify'),
      dataIndex: 'auto_notify',
      render: (value: boolean) => <BooleanTag active={value} activeColor="green" onOff />,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      align: 'right',
      render: (_, assignment) => (
        <DeleteAction
          assignment={assignment}
          loading={deleteMutation.isPending}
          onConfirm={handleDelete}
        />
      ),
    },
  ]

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Typography.Title level={2} style={{ margin: 0 }}>
              {t('assignments.title')}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              {t('assignments.subtitle')}
            </Typography.Paragraph>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            {t('assignments.new')}
          </Button>
        </div>
      </Card>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <AssignmentFilters
            search={search}
            assignmentType={assignmentTypeFilter}
            assigneeType={assigneeTypeFilter}
            onSearchChange={setSearch}
            onAssignmentTypeChange={setAssignmentTypeFilter}
            onAssigneeTypeChange={setAssigneeTypeFilter}
          />
          {!isLoading && data ? <ResultCount count={resultCount} /> : null}
          {isError ? <Alert type="error" showIcon message={t('common.failedRefresh')} /> : null}
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={assignments}
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: <AssignmentsEmpty hasFilters={hasFilters} /> }}
            />
          )}
        </Space>
      </Card>

      <CreateAssignmentModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </Space>
  )
}

interface FilterProps {
  search: string
  assignmentType: AssignmentTypeFilter
  assigneeType: AssigneeTypeFilter
  onSearchChange: (value: string) => void
  onAssignmentTypeChange: (value: AssignmentTypeFilter) => void
  onAssigneeTypeChange: (value: AssigneeTypeFilter) => void
}

function AssignmentFilters(props: FilterProps) {
  const { t } = useI18n()
  return (
    <Space wrap style={{ width: '100%' }}>
      <Input
        aria-label={t('assignments.search')}
        value={props.search}
        prefix={<SearchOutlined />}
        placeholder={t('assignments.search')}
        onChange={event => props.onSearchChange(event.target.value)}
        style={{ minWidth: 260 }}
      />
      <Select
        aria-label={t('assignments.assignmentType')}
        value={props.assignmentType || undefined}
        allowClear
        placeholder={t('assignments.allTypes')}
        suffixIcon={<FilterOutlined />}
        options={localizedOptions(assignmentTypeOptions, t)}
        onChange={value => props.onAssignmentTypeChange((value ?? '') as AssignmentTypeFilter)}
        style={{ minWidth: 180 }}
      />
      <Select
        aria-label={t('assignments.assigneeType')}
        value={props.assigneeType || undefined}
        allowClear
        placeholder={t('assignments.allAssignees')}
        suffixIcon={<UserSwitchOutlined />}
        options={localizedOptions(assigneeTypeOptions, t)}
        onChange={value => props.onAssigneeTypeChange((value ?? '') as AssigneeTypeFilter)}
        style={{ minWidth: 190 }}
      />
    </Space>
  )
}

function ResultCount({ count }: { count: number }) {
  const { t } = useI18n()
  const label = count === 1 ? t('assignments.assignmentSingular') : t('assignments.assignmentPlural')
  return <Typography.Text type="secondary">{t('assignments.found', { count, label })}</Typography.Text>
}

function AssignmentsEmpty({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useI18n()
  return (
    <Empty
      description={hasFilters ? t('assignments.noMatch') : t('assignments.noAssignments')}
    >
      <Typography.Text type="secondary">
        {hasFilters ? t('assignments.adjustFilters') : t('assignments.createFirst')}
      </Typography.Text>
    </Empty>
  )
}

function EllipsisText({ value, strong = false }: { value?: string | null; strong?: boolean }) {
  const text = displayValue(value)
  return <Typography.Text strong={strong} ellipsis={{ tooltip: text }}>{text}</Typography.Text>
}

function BooleanTag({ active, activeColor, onOff = false }: { active: boolean; activeColor: string; onOff?: boolean }) {
  const { t } = useI18n()
  const label = onOff ? (active ? t('common.on') : t('common.off')) : (active ? t('common.yes') : t('common.no'))
  return <Tag color={active ? activeColor : 'default'}>{label}</Tag>
}

interface DeleteActionProps {
  assignment: Assignment
  loading: boolean
  onConfirm: (assignment: Assignment) => void
}

function DeleteAction({ assignment, loading, onConfirm }: DeleteActionProps) {
  const { t } = useI18n()
  return (
    <Popconfirm
      title={t('assignments.deleteTitle')}
      description={t('assignments.deleteConfirm', {
        target: displayValue(assignment.target_display),
        assignee: displayValue(assignment.assignee_display),
      })}
      okText={t('common.delete')}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: true, loading }}
      onConfirm={() => onConfirm(assignment)}
    >
      <Button
        danger
        type="text"
        aria-label={t('assignments.deleteTitle')}
        disabled={loading}
        icon={<DeleteOutlined />}
      />
    </Popconfirm>
  )
}

export default AssignmentsPage
