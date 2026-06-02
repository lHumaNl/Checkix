import { useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Form,
  Input,
  List,
  Popconfirm,
  Progress,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import type { InputRef } from 'antd/es/input'
import {
  useCreateTodoItem,
  useCreateTodoList,
  useDeleteTodoItem,
  useDeleteTodoList,
  useTodoLists,
  useUpdateTodoItem,
  useUpdateTodoList,
} from '@/api/useTodos'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'
import type { TodoItem, TodoList } from '@/api/useTodos'
import type { MessageKey } from '@/i18n/messages'

const { Text, Title } = Typography

const PRIORITY_LABEL_KEYS: Record<TodoList['priority'], MessageKey> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
}

const PRIORITY_COLORS: Record<TodoList['priority'], string> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
}

const STATUS_LABEL_KEYS: Record<TodoList['status'], MessageKey> = {
  active: 'status.active',
  paused: 'status.paused',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
}

const STATUS_COLORS: Record<TodoList['status'], string> = {
  active: 'processing',
  paused: 'default',
  completed: 'success',
  cancelled: 'error',
}

const PRIORITY_OPTIONS: TodoList['priority'][] = ['low', 'medium', 'high']
const STATUS_OPTIONS: TodoList['status'][] = ['active', 'paused', 'completed', 'cancelled']

interface ListFormValues {
  name: string
  description?: string
  priority: TodoList['priority']
}

function TodoListSkeleton() {
  return (
    <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <Skeleton active paragraph={{ rows: 3 }} title={{ width: '35%' }} />
        </Card>
      ))}
    </Space>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  const { t } = useI18n()
  return (
    <Card>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size={4}>
            <Text strong>{hasSearch ? t('todos.noSearchMatch') : t('todos.noLists')}</Text>
            <Text type="secondary">{hasSearch ? t('todos.adjustSearch') : t('todos.createFirst')}</Text>
          </Space>
        }
      />
    </Card>
  )
}

function normalizeListForm(values: ListFormValues): ListFormValues {
  return {
    name: values.name.trim(),
    description: values.description?.trim() ?? '',
    priority: values.priority,
  }
}

interface ListDetailsFormProps {
  initialValues: ListFormValues
  isLoading: boolean
  title?: string
  onCancel: () => void
  onSubmit: (name: string, description: string, priority: TodoList['priority']) => void
}

function ListDetailsForm(props: ListDetailsFormProps) {
  const { initialValues, isLoading, onCancel, onSubmit, title } = props
  const { t } = useI18n()
  const [values, setValues] = useState(initialValues)

  const handleFinish = (submittedValues: ListFormValues) => {
    const normalized = normalizeListForm(submittedValues)
    if (!normalized.name) return
    onSubmit(normalized.name, normalized.description ?? '', normalized.priority)
  }

  return (
    <Card size="small" title={title} className="border-blue-200 dark:border-blue-900">
      <Form<ListFormValues>
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
        onValuesChange={(_, nextValues) => setValues(nextValues as ListFormValues)}
        requiredMark={false}
      >
        <Form.Item name="name" rules={[{ required: true, whitespace: true }]}>
          <Input autoFocus placeholder={t('todos.listName')} />
        </Form.Item>
        <Form.Item name="description">
          <Input placeholder={t('todos.descriptionOptional')} />
        </Form.Item>
        <Form.Item label={t('todos.priority')} name="priority">
          <Select options={PRIORITY_OPTIONS.map((value) => ({ value, label: t(PRIORITY_LABEL_KEYS[value]) }))} />
        </Form.Item>
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
          <Button
            disabled={!values.name?.trim() || isLoading}
            htmlType="submit"
            loading={isLoading}
            type="primary"
          >
            {isLoading ? t(title ? 'common.creating' : 'common.saving') : t(title ? 'common.create' : 'common.save')}
          </Button>
        </Space>
      </Form>
    </Card>
  )
}

function NewListForm(props: Omit<ListDetailsFormProps, 'initialValues' | 'title'>) {
  const { t } = useI18n()
  return (
    <ListDetailsForm
      {...props}
      title={t('todos.newTodoList')}
      initialValues={{ name: '', description: '', priority: 'medium' }}
    />
  )
}

function EditListForm({ list, ...props }: Omit<ListDetailsFormProps, 'initialValues'> & { list: TodoList }) {
  return (
    <ListDetailsForm
      {...props}
      initialValues={{ name: list.name, description: list.description ?? '', priority: list.priority }}
    />
  )
}

function PriorityTag({ priority }: { priority: TodoList['priority'] }) {
  const { t } = useI18n()
  return <Tag color={PRIORITY_COLORS[priority]}>{t(PRIORITY_LABEL_KEYS[priority])}</Tag>
}

function TodoItemRow({ item, listId }: { item: TodoItem; listId: number }) {
  const { t } = useI18n()
  const deleteItem = useDeleteTodoItem()
  const updateItem = useUpdateTodoItem()
  const isDone = item.status === 'completed' || item.is_completed

  const handleDelete = () => {
    deleteItem.mutate({ listId, itemId: item.id }, {
      onError: () => toast({ title: t('todos.itemDeleteFailed'), variant: 'destructive' }),
      onSuccess: () => toast({ title: t('todos.itemDeleted'), variant: 'default' }),
    })
  }

  const handleToggle = () => {
    const status: TodoItem['status'] = isDone ? 'pending' : 'completed'
    updateItem.mutate({ listId, itemId: item.id, data: { status } }, {
      onError: () => toast({ title: t('todos.itemUpdatedFailed'), variant: 'destructive' }),
    })
  }

  return (
    <List.Item
      actions={[
        <Popconfirm
          key="delete"
          cancelText={t('common.cancel')}
          description={t('todos.deleteItemConfirm', { title: item.title })}
          okButtonProps={{ danger: true, loading: deleteItem.isPending }}
          okText={t('common.delete')}
          onConfirm={handleDelete}
          title={t('todos.deleteItemTitle')}
        >
          <Button aria-label={t('todos.deleteItem')} danger icon={<DeleteOutlined />} type="text" />
        </Popconfirm>,
      ]}
    >
      <List.Item.Meta
        avatar={
          <Checkbox
            aria-label={isDone ? t('todos.markTodo') : t('todos.markDone')}
            checked={isDone}
            disabled={updateItem.isPending}
            onChange={handleToggle}
          />
        }
        title={
          <Space wrap>
            <Text delete={isDone} type={isDone ? 'secondary' : undefined}>{item.title}</Text>
            <PriorityTag priority={item.priority} />
          </Space>
        }
      />
    </List.Item>
  )
}

function AddItemInput({ listId }: { listId: number }) {
  const { t } = useI18n()
  const createItem = useCreateTodoItem()
  const inputRef = useRef<InputRef>(null)
  const [value, setValue] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const title = value.trim()
    if (!title) return
    createItem.mutate({ listId, payload: { title } }, {
      onError: () => toast({ title: t('todos.itemAddFailed'), variant: 'destructive' }),
      onSuccess: () => {
        setValue('')
        inputRef.current?.focus()
        toast({ title: t('todos.itemAdded'), variant: 'default' })
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <Input
        ref={inputRef}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t('todos.addItem')}
        value={value}
      />
      <Button
        aria-label={t('common.add')}
        disabled={!value.trim() || createItem.isPending}
        htmlType="submit"
        icon={<PlusOutlined />}
        loading={createItem.isPending}
        type="primary"
      />
    </form>
  )
}

function TodoItems({ items, listId }: { items: TodoItem[]; listId: number }) {
  const { t } = useI18n()
  return (
    <div className="pl-0 sm:pl-8">
      {items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('todos.noItems')} />
      ) : (
        <List dataSource={items} renderItem={(item) => <TodoItemRow item={item} listId={listId} />} />
      )}
      <AddItemInput listId={listId} />
    </div>
  )
}

function stopCardAction(event: MouseEvent<HTMLElement>) {
  event.stopPropagation()
}

function getItems(list: TodoList) {
  return Array.isArray(list.items) ? list.items : []
}

function getCompletedCount(list: TodoList, items: TodoItem[]) {
  return list.completed_items_count ?? items.filter((item) => item.is_completed || item.status === 'completed').length
}

function TodoListHeader({ list }: { list: TodoList }) {
  const { t } = useI18n()
  const items = getItems(list)
  const itemsCount = list.items_count ?? items.length
  const completedCount = getCompletedCount(list, items)

  return (
    <Space direction="vertical" size={8} style={{ display: 'flex' }}>
      <Space wrap size={[8, 4]}>
        {list.icon && <span aria-hidden="true">{list.icon}</span>}
        <Text strong>{list.name}</Text>
        <PriorityTag priority={list.priority} />
        <Tag color={STATUS_COLORS[list.status]}>{t(STATUS_LABEL_KEYS[list.status])}</Tag>
      </Space>
      {list.description && <Text type="secondary" ellipsis>{list.description}</Text>}
      <Space align="center" style={{ width: '100%' }}>
        <Progress percent={list.progress_percentage ?? 0} showInfo={false} size="small" style={{ flex: 1 }} />
        <Text type="secondary">{completedCount}/{itemsCount}</Text>
      </Space>
    </Space>
  )
}

function TodoListCard({ list }: { list: TodoList }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const deleteList = useDeleteTodoList()
  const updateList = useUpdateTodoList()
  const panelKey = String(list.id)
  const items = getItems(list)

  const handleDelete = () => {
    deleteList.mutate(list.id, {
      onError: () => toast({ title: t('todos.listDeleteFailed'), variant: 'destructive' }),
      onSuccess: () => toast({ title: t('todos.listDeleted'), variant: 'default' }),
    })
  }

  const handleEdit = (name: string, description: string, priority: TodoList['priority']) => {
    updateList.mutate({ id: list.id, data: { name, description: description || null, priority } }, {
      onError: () => toast({ title: t('todos.listUpdateFailed'), variant: 'destructive' }),
      onSuccess: () => {
        setEditing(false)
        toast({ title: t('todos.listUpdated'), variant: 'default' })
      },
    })
  }

  const actions = (
    <Space onClick={stopCardAction}>
      <Button
        aria-label={t('todos.editList')}
        icon={<EditOutlined />}
        onClick={() => { setEditing((current) => !current); setExpanded(false) }}
        type="text"
      />
      <Popconfirm
        cancelText={t('common.cancel')}
        description={t('todos.deleteListConfirm', { title: list.name })}
        okButtonProps={{ danger: true, loading: deleteList.isPending }}
        okText={t('common.delete')}
        onConfirm={handleDelete}
        title={t('todos.deleteListTitle')}
      >
        <Button aria-label={t('todos.deleteList')} danger icon={<DeleteOutlined />} type="text" />
      </Popconfirm>
    </Space>
  )

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <Collapse
        activeKey={expanded ? [panelKey] : []}
        bordered={false}
        collapsible="icon"
        expandIcon={({ isActive }) => (
          <Button
            aria-label={isActive ? t('todos.collapseList') : t('todos.expandList')}
            icon={isActive ? <UpOutlined /> : <DownOutlined />}
            size="small"
            type="text"
          />
        )}
        ghost
        items={[{
          key: panelKey,
          label: <TodoListHeader list={list} />,
          extra: actions,
          children: <TodoItems items={items} listId={list.id} />,
        }]}
        onChange={(keys) => setExpanded(Array.isArray(keys) ? keys.includes(panelKey) : keys === panelKey)}
      />
      {editing && (
        <div className="p-4 pt-0">
          <EditListForm list={list} onCancel={() => setEditing(false)} onSubmit={handleEdit} isLoading={updateList.isPending} />
        </div>
      )}
    </Card>
  )
}

export function TodosPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const { data, error, isLoading } = useTodoLists({ search, status: statusFilter })
  const createList = useCreateTodoList()
  const lists = Array.isArray(data) ? data : (data?.items ?? [])

  const handleCreate = (name: string, description: string, priority: TodoList['priority']) => {
    createList.mutate({ name, description: description || undefined, priority }, {
      onError: () => toast({ title: t('todos.listCreateFailed'), variant: 'destructive' }),
      onSuccess: () => {
        setShowNewForm(false)
        toast({ title: t('todos.listCreated'), variant: 'default' })
      },
    })
  }

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Card>
        <Space align="start" direction="horizontal" style={{ display: 'flex', justifyContent: 'space-between' }} wrap>
          <div>
            <Title level={2} style={{ margin: 0 }}>{t('todos.title')}</Title>
            <Text type="secondary">{t('todos.subtitle')}</Text>
          </div>
          <Button
            aria-label={t('todos.newList')}
            icon={<PlusOutlined />}
            onClick={() => setShowNewForm((value) => !value)}
            type="primary"
          >
            {t('todos.newList')}
          </Button>
        </Space>
      </Card>

      {showNewForm && <NewListForm onCancel={() => setShowNewForm(false)} onSubmit={handleCreate} isLoading={createList.isPending} />}

      <Card size="small">
        <Space wrap style={{ display: 'flex' }}>
          <Input
            allowClear
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('todos.searchLists')}
            prefix={<SearchOutlined />}
            style={{ flex: 1, minWidth: 240 }}
            value={search}
          />
          <Select
            aria-label={t('common.status')}
            onChange={setStatusFilter}
            options={[
              { value: '', label: t('common.allStatuses') },
              ...STATUS_OPTIONS.map((value) => ({ value, label: t(STATUS_LABEL_KEYS[value]) })),
            ]}
            style={{ minWidth: 180 }}
            value={statusFilter}
          />
        </Space>
      </Card>

      {error && <Alert message={t('common.failedRefresh')} showIcon type="error" />}
      {isLoading ? <TodoListSkeleton /> : lists.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
          {lists.map((list) => <TodoListCard key={list.id} list={list} />)}
        </Space>
      )}
    </Space>
  )
}

export default TodosPage
