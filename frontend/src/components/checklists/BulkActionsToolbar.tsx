import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trash2,
  FolderInput,
  Tag as TagIcon,
  X,
  Check,
  ChevronDown,
} from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useFolders } from '@/api/useFolders'
import { useTags } from '@/api/useTags'

interface BulkActionsToolbarProps {
  selectedCount: number
  totalCount: number
  onDelete: () => void
  onMoveToFolder: (folderId: number | null) => void
  onAddTags: (tags: string[]) => void
  onSelectAll: () => void
  onClearSelection: () => void
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onDelete,
  onMoveToFolder,
  onAddTags,
  onSelectAll,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const [newTags, setNewTags] = useState('')
  const { data: folders = [] } = useFolders()
  const { data: tags = [] } = useTags()

  if (selectedCount === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-lg">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>

        <div className="h-4 w-px bg-gray-700 dark:bg-gray-300" />

        <button
          onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
          className="text-sm hover:underline"
        >
          {selectedCount === totalCount ? 'Clear' : 'Select all'}
        </button>

        <div className="h-4 w-px bg-gray-700 dark:bg-gray-300" />

        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 dark:bg-gray-200 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors">
              <FolderInput size={16} />
              Move
              <ChevronDown size={14} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="min-w-[180px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1 z-50"
              sideOffset={5}
            >
              <button
                onClick={() => {
                  onMoveToFolder(null)
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                No Folder
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => {
                    onMoveToFolder(folder.id)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {folder.name}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 dark:bg-gray-200 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors">
              <TagIcon size={16} />
              Tag
              <ChevronDown size={14} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-3 z-50"
              sideOffset={5}
            >
              <div className="mb-2">
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Add tags (comma separated)"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {tags.slice(0, 6).map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => setNewTags(prev => prev ? `${prev}, ${tag.name}` : tag.name)}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (newTags.trim()) {
                    const tagList = newTags.split(',').map(t => t.trim()).filter(Boolean)
                    onAddTags(tagList)
                    setNewTags('')
                  }
                }}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Check size={14} />
                Add Tags
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 size={16} />
          Delete
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 hover:bg-gray-700 dark:hover:bg-gray-300 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  )
}
