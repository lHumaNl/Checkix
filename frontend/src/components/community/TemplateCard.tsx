import { Download, Star, User } from 'lucide-react'
import type { CommunityTemplate } from '@/types'

interface TemplateCardProps {
  template: CommunityTemplate
  onClick: () => void
  onDownload: () => void
  variant?: 'grid' | 'list'
}

const categoryColors: Record<string, string> = {
  travel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  work: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  health: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  home: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  shopping: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  education: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  fitness: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  productivity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
}

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

export function TemplateCard({ template, onClick, onDownload, variant = 'grid' }: TemplateCardProps) {
  const categoryColor = categoryColors[template.category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'

  if (variant === 'list') {
    return (
      <div
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4"
        onClick={onClick}
      >
        <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center text-2xl">
          {getCategoryEmoji(template.category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">{template.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
              {template.category}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{template.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User size={12} />
              {template.author.username}
            </span>
            <span className="flex items-center gap-1">
              <Star size={12} />
              {template.rating.toFixed(1)} ({template.rating_count})
            </span>
            <span className="flex items-center gap-1">
              <Download size={12} />
              {template.download_count}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Download
        </button>
      </div>
    )
  }

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="h-32 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 flex items-center justify-center">
        <div className="text-4xl">
          {getCategoryEmoji(template.category)}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">{template.title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${categoryColor}`}>
            {template.category}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{template.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <User size={14} />
            {template.author.username}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <Star size={14} className="text-yellow-400" fill="currentColor" />
              <span className="text-gray-600 dark:text-gray-300">{template.rating.toFixed(1)}</span>
            </div>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Download size={14} />
              {template.download_count}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
          className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors opacity-0 group-hover:opacity-100"
        >
          Download Template
        </button>
      </div>
    </div>
  )
}

export default TemplateCard
