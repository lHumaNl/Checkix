import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Folder as FolderIcon, Plus, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Folder } from '@/types'

interface FolderTreeProps {
  folders: Folder[]
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
  onCreateFolder?: (parentId: number | null) => void
  onEditFolder?: (folder: Folder) => void
  onDeleteFolder?: (id: number) => void
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<number[]>([])

  const toggleExpand = (id: number) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const renderFolder = (folder: Folder, level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0
    const isExpanded = expandedIds.includes(folder.id)
    const isSelected = selectedFolderId === folder.id

    return (
      <div key={folder.id}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(folder.id)}
            className={`p-0.5 ${hasChildren ? 'hover:bg-gray-200 dark:hover:bg-gray-700' : ''} rounded`}
          >
            {hasChildren ? (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={14} className="text-gray-400" />
              </motion.div>
            ) : (
              <span className="w-[14px]" />
            )}
          </button>

          <button
            onClick={() => onSelectFolder(folder.id)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <FolderIcon size={16} className={isSelected ? 'text-blue-500' : 'text-gray-400'} />
            <span className="text-sm truncate">{folder.name}</span>
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity">
                <MoreHorizontal size={14} className="text-gray-400" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[120px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1 z-50"
                sideOffset={5}
              >
                <DropdownMenu.Item asChild>
                  <button
                    onClick={() => onCreateFolder?.(folder.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none w-full"
                  >
                    <Plus size={14} />
                    New Subfolder
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <button
                    onClick={() => onEditFolder?.(folder)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none w-full"
                  >
                    <Edit size={14} />
                    Rename
                  </button>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                <DropdownMenu.Item asChild>
                  <button
                    onClick={() => onDeleteFolder?.(folder.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none w-full"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </motion.div>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {folder.children!.map(child => renderFolder(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div
        onClick={() => onSelectFolder(null)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          selectedFolderId === null
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
      >
        <FolderIcon size={16} className={selectedFolderId === null ? 'text-blue-500' : 'text-gray-400'} />
        <span className="text-sm">All Folders</span>
      </div>

      {folders.map(folder => renderFolder(folder))}
    </div>
  )
}
