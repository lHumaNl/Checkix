import { useState } from 'react'
import { X, Download } from 'lucide-react'
import type { CommunityTemplate, CommunityTemplateItem } from '@/types'
import { StarRating } from './StarRating'
import { AuthorProfile } from './AuthorProfile'

const categoryEmojis: Record<string, string> = {
  travel: '✈️',
  work: '💼',
  health: '💪',
  home: '🏠',
  shopping: '🛒',
  education: '📚',
  fitness: '🏋️',
  finance: '💰',
  productivity: '⚡',
}

function getCategoryEmoji(category: string): string {
  return categoryEmojis[category] ?? '📋'
}

interface TemplatePreviewProps {
  isOpen: boolean
  onClose: () => void
  template: CommunityTemplate | null
  onDownload: () => void
}

export function TemplatePreview({ isOpen, onClose, template, onDownload }: TemplatePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  if (!isOpen || !template) return null

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await onDownload()
      onClose()
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Template Preview
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center text-3xl">
              {getCategoryEmoji(template.category)}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                {template.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{template.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <StarRating rating={template.rating} size={14} />
                  <span className="text-gray-600 dark:text-gray-300">
                    {template.rating.toFixed(1)} ({template.rating_count} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Download size={14} />
                  {template.download_count} downloads
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <AuthorProfile author={template.author} />
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Checklist Items ({template.items.length})
            </h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              {template.items.map((item: CommunityTemplateItem, index: number) => (
                <div key={item.id} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs">
                    {index + 1}
                  </div>
                  <span className={item.is_required ? 'font-medium' : ''}>
                    {item.content}
                    {item.is_required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {isDownloading ? 'Downloading...' : 'Download Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplatePreview
