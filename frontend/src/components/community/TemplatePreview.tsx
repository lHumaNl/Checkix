import { useState } from 'react'
import { Avatar, Button, Card, List, Modal, Rate, Space, Tag, Typography } from 'antd'
import { Download } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { CommunityTemplate, CommunityTemplateItem } from '@/types'
import { AuthorProfile } from './AuthorProfile'

const { Paragraph, Text, Title } = Typography

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
  onDownload: () => Promise<void> | void
}

export function TemplatePreview({ isOpen, onClose, template, onDownload }: TemplatePreviewProps) {
  const { t } = useI18n()
  const [isDownloading, setIsDownloading] = useState(false)

  if (!isOpen || !template) return null

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await onDownload()
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={t('community.templatePreview')}
      width={760}
      footer={[
        <Button key="cancel" onClick={onClose}>{t('common.cancel')}</Button>,
        <Button key="download" type="primary" icon={<Download size={16} />} loading={isDownloading} onClick={handleDownload}>
          {isDownloading ? t('community.downloading') : t('community.downloadTemplate')}
        </Button>,
      ]}
    >
      <div className="space-y-5">
        <Card className="overflow-hidden" styles={{ body: { padding: 0 } }}>
          <div className="flex gap-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 p-5 dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-purple-950/30">
            <Avatar shape="square" size={72} className="bg-white/70 text-4xl shadow-sm dark:bg-white/10">
              {getCategoryEmoji(template.category)}
            </Avatar>
            <div className="min-w-0 flex-1">
              <Title level={3} style={{ marginBottom: 4 }}>{template.title}</Title>
              <Paragraph type="secondary" style={{ marginBottom: 8 }}>{template.description}</Paragraph>
              <Space size={[12, 4]} wrap>
                <Rate disabled allowHalf value={template.rating} style={{ color: '#facc15', fontSize: 14 }} />
                <Text>{template.rating.toFixed(1)} ({t('community.reviewsCount', { count: template.rating_count })})</Text>
                <Text type="secondary" className="inline-flex items-center gap-1">
                  <Download size={14} />
                  {t('community.downloadsCount', { count: template.download_count })}
                </Text>
              </Space>
            </div>
          </div>
        </Card>

        <AuthorProfile author={template.author} />
        <TemplateItems items={template.items} />
        <TemplateTags tags={template.tags} />
      </div>
    </Modal>
  )
}

function TemplateItems({ items }: { items: CommunityTemplateItem[] }) {
  const { t } = useI18n()

  return (
    <Card title={t('checklistInstance.itemsCountTitle', { count: items.length })} styles={{ body: { padding: 0 } }}>
      <List
        dataSource={items}
        renderItem={(item, index) => (
          <List.Item className="px-4">
            <Space align="start">
              <Text type="secondary" className="inline-flex h-6 w-6 items-center justify-center rounded border text-xs">
                {index + 1}
              </Text>
              <Text strong={item.is_required}>
                {item.content}{item.is_required && <Text type="danger"> *</Text>}
              </Text>
            </Space>
          </List.Item>
        )}
      />
    </Card>
  )
}

function TemplateTags({ tags }: { tags: string[] }) {
  const { t } = useI18n()

  return (
    <div>
      <Text strong className="mb-2 block">{t('checklists.tags')}</Text>
      <Space size={[6, 6]} wrap>
        {tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
      </Space>
    </div>
  )
}

export default TemplatePreview
