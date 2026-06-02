import { useState } from 'react'
import { Card, Empty, Input, List as AntList, Segmented, Skeleton } from 'antd'
import { Grid, List } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { CommunityTemplate } from '@/types'
import { TemplateCard } from './TemplateCard'
import { CategoryFilter } from './CategoryFilter'
import { FeaturedCarousel } from './FeaturedCarousel'

interface TemplateMarketplaceProps {
  templates: CommunityTemplate[]
  featuredTemplates: CommunityTemplate[]
  onTemplateClick: (template: CommunityTemplate) => void
  onDownload: (template: CommunityTemplate) => void
  isLoading?: boolean
}

const categories = [
  { id: 'all', labelKey: 'community.categoryAll', icon: '🌟' },
  { id: 'travel', labelKey: 'community.categoryTravel', icon: '✈️' },
  { id: 'work', labelKey: 'community.categoryWork', icon: '💼' },
  { id: 'health', labelKey: 'community.categoryHealth', icon: '💪' },
  { id: 'home', labelKey: 'community.categoryHome', icon: '🏠' },
  { id: 'shopping', labelKey: 'community.categoryShopping', icon: '🛒' },
  { id: 'education', labelKey: 'community.categoryEducation', icon: '📚' },
  { id: 'fitness', labelKey: 'community.categoryFitness', icon: '🏋️' },
  { id: 'finance', labelKey: 'community.categoryFinance', icon: '💰' },
  { id: 'productivity', labelKey: 'community.categoryProductivity', icon: '⚡' },
] as const satisfies Array<{ id: string; labelKey: MessageKey; icon: string }>

export function TemplateMarketplace({
  templates,
  featuredTemplates,
  onTemplateClick,
  onDownload,
  isLoading,
}: TemplateMarketplaceProps) {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const categoryOptions = categories.map(category => ({ ...category, label: t(category.labelKey) }))
  const viewOptions = [
    {
      value: 'grid',
      label: <span className="inline-flex min-h-[28px] items-center"><Grid size={18} /></span>,
    },
    {
      value: 'list',
      label: <span className="inline-flex min-h-[28px] items-center"><List size={18} /></span>,
    },
  ]

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <FeaturedCarousel
        templates={featuredTemplates}
        onTemplateClick={onTemplateClick}
      />

      <Card className="shadow-sm" styles={{ body: { padding: 16 } }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Input.Search
            allowClear
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onSearch={setSearchQuery}
            placeholder={t('community.searchTemplates')}
            className="w-full lg:max-w-xl"
          />
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as 'grid' | 'list')}
            options={viewOptions}
          />
        </div>

        <CategoryFilter
          categories={categoryOptions}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </Card>

      {isLoading ? (
        <TemplateSkeletonGrid />
      ) : filteredTemplates.length === 0 ? (
        <Card><Empty description={t('community.noTemplates')} image={Empty.PRESENTED_IMAGE_SIMPLE} /></Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => onTemplateClick(template)}
              onDownload={() => onDownload(template)}
            />
          ))}
        </div>
      ) : (
        <AntList
          dataSource={filteredTemplates}
          split={false}
          className="space-y-2"
          renderItem={(template) => (
            <AntList.Item className="block border-0 p-0">
              <TemplateCard
                template={template}
                onClick={() => onTemplateClick(template)}
                onDownload={() => onDownload(template)}
                variant="list"
              />
            </AntList.Item>
          )}
        />
      )}
    </div>
  )
}

function TemplateSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="shadow-sm">
          <Skeleton active avatar paragraph={{ rows: 3 }} />
        </Card>
      ))}
    </div>
  )
}

export default TemplateMarketplace
