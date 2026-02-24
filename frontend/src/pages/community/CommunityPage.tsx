import { useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { TemplateMarketplace, TemplatePreview } from '@/components/community'
import { useCommunityTemplates, useFeaturedTemplates, useDownloadTemplate } from '@/api/useCommunityTemplates'
import { toast } from '@/hooks/useToast'
import type { CommunityTemplate } from '@/types'

export function CommunityPage() {
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
    downloadMutation.mutate(template.id, {
      onSuccess: () => {
        toast({ title: 'Template downloaded successfully', variant: 'default' })
        setIsPreviewOpen(false)
      },
      onError: () => {
        toast({ title: 'Failed to download template', variant: 'destructive' })
      },
    })
  }

  if (templatesLoading || featuredLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading templates...</span>
        </div>
      </div>
    )
  }

  if (templatesError || featuredError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load templates</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {templatesErrorMsg?.message || 'A network error occurred. Please check your connection and try again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community Templates</h1>
          <p className="text-gray-600 dark:text-gray-400">Discover and download community-created checklists</p>
        </div>
      </div>

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
        onDownload={() => selectedTemplate && handleDownload(selectedTemplate)}
      />
    </div>
  )
}

export default CommunityPage
