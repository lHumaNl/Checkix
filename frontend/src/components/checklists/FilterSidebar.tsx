import { AnimatePresence, motion } from 'framer-motion'
import { Button, Card, Empty, Input, Layout, List, Segmented, Space, Tag, Typography } from 'antd'
import { Folder, Tag as TagIcon } from 'lucide-react'
import { useTags } from '@/api/useTags'
import { useFolders } from '@/api/useFolders'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const { Sider } = Layout
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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full sm:w-72 sm:flex-shrink-0"
    >
      <Sider
        width="100%"
        theme="light"
        className="rounded-xl border border-gray-200 dark:border-gray-800"
        style={{ background: 'transparent' }}
      >
        <Card className="h-full" styles={{ body: { padding: 16 } }}>
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
              <Segmented
                block
                value={statusFilter}
                onChange={(value) => onStatusChange(value as string)}
                options={statuses.map(status => ({ value: status.value, label: t(status.labelKey) }))}
              />
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
      </Sider>
    </motion.div>
  )
}
