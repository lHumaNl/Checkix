import { Tag, Tooltip } from 'antd'

interface TagPillsProps {
  tags: string[]
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
          key={tag}
          color={getColorForTag(tag, colorMap)}
          className={className}
          closable={removable}
          onClose={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove?.(tag)
          }}
        >
          {tag}
        </Tag>
      ))}
      {remainingCount > 0 && (
        <Tooltip title={hiddenTags.join(', ')}>
          <Tag className={className}>+{remainingCount}</Tag>
        </Tooltip>
      )}
    </div>
  )
}
