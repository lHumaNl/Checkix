import { useState } from 'react'
import { Button, Card, Result, Skeleton, Typography } from 'antd'
import { TemplateMarketplace, TemplatePreview } from '@/components/community'
import { useCommunityTemplates, useFeaturedTemplates, useDownloadTemplate } from '@/api/useCommunityTemplates'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'
import type { CommunityTemplate } from '@/types'

const { Paragraph, Title } = Typography

export function CommunityPage() {
  const { t } = useI18n()
  const [selectedTemplate, setSelectedTemplate] = useState<CommunityTemplate | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const { data: templates = [], isLoading: templatesLoading, isError: templatesError, error: templatesErrorMsg } = useCommunityTemplates()
  const { data: featured = [], isLoading: featuredLoading, isError: featuredError } = useFeaturedTemplates()
  const downloadMutation = useDownloadTemplate()

  const handleTemplateClick = (template: CommunityTemplate) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
  }

  const handleDownload = async (template: CommunityTemplate) => {
    try {
      await downloadMutation.mutateAsync(template.id)
      toast({ title: t('community.downloaded'), variant: 'default' })
      setIsPreviewOpen(false)
    } catch {
      toast({ title: t('community.downloadFailed'), variant: 'destructive' })
    }
  }

  if (templatesLoading || featuredLoading) {
    return (
      <Card className="shadow-sm">
        <Skeleton active paragraph={{ rows: 10 }} title={{ width: '35%' }} />
        <span className="sr-only">{t('community.loadingTemplates')}</span>
      </Card>
    )
  }

  if (templatesError || featuredError) {
    return (
      <Card className="shadow-sm">
        <Result
          status="error"
          title={t('community.loadFailed')}
          subTitle={templatesErrorMsg?.message || t('community.networkError')}
          extra={<Button type="primary" onClick={() => window.location.reload()}>{t('common.retry')}</Button>}
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden shadow-sm" styles={{ body: { padding: 0 } }}>
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/30 dark:via-gray-900 dark:to-cyan-950/20" />
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10" />
          <div className="relative max-w-3xl">
            <Title level={1} className="text-2xl sm:text-3xl" style={{ marginBottom: 4 }}>
              {t('community.title')}
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t('community.subtitle')}
            </Paragraph>
          </div>
        </div>
      </Card>

      <TemplateMarketplace
        templates={templates}
        featuredTemplates={featured}
        onTemplateClick={handleTemplateClick}
        onDownload={handleDownload}
      />

      <TemplatePreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        template={selectedTemplate}
        onDownload={() => {
          if (selectedTemplate) return handleDownload(selectedTemplate)
        }}
      />
    </div>
  )
}

export default CommunityPage
