import { Avatar, Button, Card, Rate, Space, Tag, Typography } from 'antd'
import { Download, User } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { CommunityTemplate } from '@/types'

const { Paragraph, Text, Title } = Typography

interface TemplateCardProps {
  template: CommunityTemplate
  onClick: () => void
  onDownload: () => void
  variant?: 'grid' | 'list'
}

const categoryColors: Record<string, string> = {
  travel: 'blue',
  work: 'default',
  health: 'green',
  home: 'gold',
  shopping: 'magenta',
  education: 'geekblue',
  fitness: 'orange',
  finance: 'cyan',
  productivity: 'purple',
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

const categoryLabelKeys: Record<string, MessageKey> = {
  travel: 'community.categoryTravel',
  work: 'community.categoryWork',
  health: 'community.categoryHealth',
  home: 'community.categoryHome',
  shopping: 'community.categoryShopping',
  education: 'community.categoryEducation',
  fitness: 'community.categoryFitness',
  finance: 'community.categoryFinance',
  productivity: 'community.categoryProductivity',
}

function getCategoryEmoji(category: string): string {
  return categoryEmojis[category] ?? '📋'
}

export function TemplateCard({ template, onClick, onDownload, variant = 'grid' }: TemplateCardProps) {
  const { t } = useI18n()
  const categoryColor = categoryColors[template.category] || 'default'
  const categoryLabel = categoryLabelKeys[template.category] ? t(categoryLabelKeys[template.category]) : template.category
  const cardClass = 'group h-full cursor-pointer overflow-hidden shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl'

  const handleDownloadClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onDownload()
  }

  if (variant === 'list') {
    return (
      <Card
        className="cursor-pointer shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
        onClick={onClick}
        styles={{ body: { padding: 16 } }}
      >
        <div className="flex items-center gap-4">
          <Avatar
            className="shrink-0 bg-gradient-to-br from-blue-500 to-cyan-400 text-2xl shadow-inner"
            shape="square"
            size={64}
          >
            {getCategoryEmoji(template.category)}
          </Avatar>
          <div className="min-w-0 flex-1">
            <Space size={6} className="mb-1 max-w-full" wrap>
              <Title level={5} className="truncate" style={{ margin: 0 }}>
                {template.title}
              </Title>
              <Tag color={categoryColor} className="m-0">{categoryLabel}</Tag>
            </Space>
            <Paragraph type="secondary" ellipsis style={{ marginBottom: 8 }}>
              {template.description}
            </Paragraph>
            <TemplateStats template={template} />
          </div>
          <Button type="primary" icon={<Download size={16} />} onClick={handleDownloadClick}>
            {t('common.download')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cardClass}
      onClick={onClick}
      cover={<TemplateCover category={template.category} />}
      styles={{ body: { padding: 16 } }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <Title level={5} ellipsis style={{ margin: 0 }}>
          {template.title}
        </Title>
        <Tag color={categoryColor} className="m-0 shrink-0">{categoryLabel}</Tag>
      </div>
      <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44, marginBottom: 12 }}>
        {template.description}
      </Paragraph>
      <TemplateStats template={template} />
      <Button
        block
        type="primary"
        className="mt-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
        icon={<Download size={16} />}
        onClick={handleDownloadClick}
      >
        {t('community.downloadTemplate')}
      </Button>
    </Card>
  )
}

function TemplateCover({ category }: { category: string }) {
  return (
    <div className="relative h-32 overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-blue-950/40 dark:via-cyan-950/20 dark:to-purple-950/40">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(37,99,235,.35),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(6,182,212,.32),transparent_30%)]" />
      <div className="relative flex h-full items-center justify-center text-5xl drop-shadow-sm">
        {getCategoryEmoji(category)}
      </div>
    </div>
  )
}

function TemplateStats({ template }: { template: CommunityTemplate }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <Text type="secondary" className="inline-flex min-w-0 items-center gap-1">
        <User size={14} />
        <span className="truncate">{template.author.username}</span>
      </Text>
      <Space size={10}>
        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Rate disabled allowHalf count={1} value={1} style={{ color: '#facc15', fontSize: 14 }} />
          <span>{template.rating.toFixed(1)}</span>
        </span>
        <Text type="secondary" className="inline-flex items-center gap-1">
          <Download size={14} />
          {template.download_count}
        </Text>
      </Space>
    </div>
  )
}

export default TemplateCard
