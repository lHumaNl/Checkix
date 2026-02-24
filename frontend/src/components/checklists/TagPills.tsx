import { X } from 'lucide-react'

interface TagPillsProps {
  tags: string[]
  maxVisible?: number
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: (tag: string) => void
  colorMap?: Record<string, string>
}

const defaultColors = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
]

function getColorForTag(tag: string, colorMap?: Record<string, string>): string {
  if (colorMap?.[tag]) return colorMap[tag]
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return defaultColors[Math.abs(hash) % defaultColors.length]
}

export function TagPills({
  tags,
  maxVisible = 3,
  size = 'md',
  removable = false,
  onRemove,
  colorMap,
}: TagPillsProps) {
  const visibleTags = tags.slice(0, maxVisible)
  const remainingCount = tags.length - maxVisible

  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-[10px]' 
    : 'px-2 py-0.5 text-xs'

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map(tag => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 ${sizeClasses} font-medium rounded-full ${getColorForTag(tag, colorMap)}`}
        >
          {tag}
          {removable && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(tag)
              }}
              className="hover:opacity-70"
            >
              <X size={size === 'sm' ? 10 : 12} />
            </button>
          )}
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center ${sizeClasses} font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  )
}
