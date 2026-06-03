import { AnimatePresence, motion } from 'framer-motion'
import { Button, Card, Empty, Input, List, Space, Tag, Typography } from 'antd'
import { Folder, Tag as TagIcon } from 'lucide-react'
import { useTags } from '@/api/useTags'
import { useFolders } from '@/api/useFolders'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const { Text, Title } = Typography
const { CheckableTag } = Tag

interface FilterSidebarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  selectedFolderId: number | null
  onFolderChange: (id: number | null) => void
}

const statuses = [
  { value: 'all', labelKey: 'common.allStatuses' },
  { value: 'draft', labelKey: 'status.draft' },
  { value: 'active', labelKey: 'status.active' },
  { value: 'archived', labelKey: 'status.archived' },
] as const satisfies Array<{ value: string; labelKey: MessageKey }>

const statusTone = {
  all: 'bg-slate-400',
  draft: 'bg-amber-500',
  active: 'bg-emerald-500',
  archived: 'bg-gray-500',
} satisfies Record<string, string>

export function FilterSidebar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedTags,
  onTagsChange,
  selectedFolderId,
  onFolderChange,
}: FilterSidebarProps) {
  const { t } = useI18n()
  const { data: rawTags = [] } = useTags()
  const { data: rawFolders = [] } = useFolders()
  const tags = Array.isArray(rawTags) ? rawTags : []
  const folders = Array.isArray(rawFolders) ? rawFolders : []

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName))
    } else {
      onTagsChange([...selectedTags, tagName])
    }
  }

  const clearFilters = () => {
    onSearchChange('')
    onStatusChange('all')
    onTagsChange([])
    onFolderChange(null)
  }

  const hasFilters = search || statusFilter !== 'all' || selectedTags.length > 0 || selectedFolderId

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full min-w-0 lg:w-72 lg:flex-none"
      aria-label={t('common.filters')}
    >
      <Card className="h-full rounded-xl border border-gray-200 shadow-sm dark:border-gray-800" styles={{ body: { padding: 16 } }}>
        <Space direction="vertical" size={18} className="w-full">
          <div className="flex items-center justify-between">
            <Title level={5} style={{ margin: 0 }}>{t('common.filters')}</Title>
            {hasFilters && (
              <Button type="link" size="small" onClick={clearFilters}>
                {t('common.clearAll')}
              </Button>
            )}
          </div>

          <Space direction="vertical" size={8} className="w-full">
            <Text strong>{t('common.search')}</Text>
            <Input.Search
              allowClear
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onSearch={onSearchChange}
              placeholder={t('checklists.searchPlaceholder')}
            />
          </Space>

          <Space direction="vertical" size={8} className="w-full">
            <Text strong>{t('common.status')}</Text>
            <StatusFilter value={statusFilter} onChange={onStatusChange} />
          </Space>

          <Space direction="vertical" size={8} className="w-full">
            <Text strong className="inline-flex items-center gap-1">
              <TagIcon size={14} />
              {t('checklists.tags')}
            </Text>
            {tags.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.noResults')} />
            ) : (
              <div className="flex flex-wrap gap-1">
                <AnimatePresence>
                  {tags.map(tag => (
                    <motion.span
                      key={tag.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <CheckableTag
                        checked={selectedTags.includes(tag.name)}
                        onChange={() => toggleTag(tag.name)}
                      >
                        {tag.name}
                      </CheckableTag>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Space>

          <Space direction="vertical" size={8} className="w-full">
            <Text strong className="inline-flex items-center gap-1">
              <Folder size={14} />
              {t('checklists.folders')}
            </Text>
            <List
              size="small"
              dataSource={[{ id: null, name: t('checklists.allFolders') }, ...folders]}
              renderItem={(folder) => {
                const isSelected = selectedFolderId === folder.id
                return (
                  <List.Item className={isSelected ? 'rounded-lg bg-blue-50 dark:bg-blue-900/20' : 'rounded-lg'}>
                    <Button
                      type={isSelected ? 'link' : 'text'}
                      className="w-full justify-start"
                      icon={<Folder size={14} />}
                      onClick={() => onFolderChange(folder.id)}
                    >
                      {folder.name}
                    </Button>
                  </List.Item>
                )
              }}
            />
          </Space>
        </Space>
      </Card>
    </motion.aside>
  )
}

interface StatusFilterProps {
  value: string
  onChange: (value: string) => void
}

function StatusFilter({ value, onChange }: StatusFilterProps) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label={t('common.status')}>
      {statuses.map(status => (
        <button
          key={status.value}
          type="button"
          role="radio"
          aria-checked={value === status.value}
          className={getStatusButtonClass(value === status.value)}
          onClick={() => onChange(status.value)}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${statusTone[status.value]}`} />
          <span className="truncate">{t(status.labelKey)}</span>
        </button>
      ))}
    </div>
  )
}

function getStatusButtonClass(isSelected: boolean) {
  const baseClass = 'flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold transition'
  if (isSelected) return `${baseClass} border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/40 dark:text-blue-200`
  return `${baseClass} border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-blue-700`
}
