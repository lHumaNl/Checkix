import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Folder, Tag } from 'lucide-react'
import { useTags } from '@/api/useTags'
import { useFolders } from '@/api/useFolders'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

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
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full sm:w-64 sm:flex-shrink-0 bg-white dark:bg-gray-900 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 p-4 space-y-4 sm:space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('common.filters')}</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('common.clearAll')}
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('common.search')}
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('checklists.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('common.status')}
        </label>
        <div className="space-y-1">
          {statuses.map(status => (
            <button
              key={status.value}
              onClick={() => onStatusChange(status.value)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                statusFilter === status.value
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t(status.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Tag size={14} className="inline mr-1" />
          {t('checklists.tags')}
        </label>
        <div className="flex flex-wrap gap-1">
          <AnimatePresence>
            {tags.map(tag => (
              <motion.button
                key={tag.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => toggleTag(tag.name)}
                className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                  selectedTags.includes(tag.name)
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 ring-2 ring-blue-500'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tag.name}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Folder size={14} className="inline mr-1" />
          {t('checklists.folders')}
        </label>
        <div className="space-y-1">
          <button
            onClick={() => onFolderChange(null)}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
              selectedFolderId === null
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t('checklists.allFolders')}
          </button>
          {folders.map(folder => (
            <div key={folder.id}>
              <button
                onClick={() => onFolderChange(folder.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                  selectedFolderId === folder.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Folder size={14} />
                {folder.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  )
}
