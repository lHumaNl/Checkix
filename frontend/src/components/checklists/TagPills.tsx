import { Tag, Tooltip } from 'antd'

interface TagPillsProps {
  tags: Array<string | { name: string; color?: string | null }>
  maxVisible?: number
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: (tag: string) => void
  colorMap?: Record<string, string>
}

const defaultColors = [
  'blue',
  'green',
  'purple',
  'orange',
  'magenta',
  'cyan',
]

function getColorForTag(tag: string, colorMap?: Record<string, string>): string {
  if (colorMap?.[tag]) return colorMap[tag]
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return defaultColors[Math.abs(hash) % defaultColors.length]
}

function getTagName(tag: string | { name: string }): string {
  return typeof tag === 'string' ? tag : tag.name
}

function getTagColor(tag: string | { name: string; color?: string | null }, colorMap?: Record<string, string>): string {
  if (typeof tag !== 'string' && tag.color) return tag.color
  return getColorForTag(getTagName(tag), colorMap)
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

  const className = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const hiddenTags = tags.slice(maxVisible)

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map(tag => (
        <Tag
          key={getTagName(tag)}
          color={getTagColor(tag, colorMap)}
          className={className}
          closable={removable}
          onClose={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove?.(getTagName(tag))
          }}
        >
          {getTagName(tag)}
        </Tag>
      ))}
      {remainingCount > 0 && (
        <Tooltip title={hiddenTags.map(getTagName).join(', ')}>
          <Tag className={className}>+{remainingCount}</Tag>
        </Tooltip>
      )}
    </div>
  )
}
