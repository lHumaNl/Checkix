import { useState } from 'react'
import { Search, Grid, List } from 'lucide-react'
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

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('community.searchTemplates')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        <CategoryFilter
          categories={categories.map(category => ({ ...category, label: t(category.labelKey) }))}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
              <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-md mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('community.noTemplates')}</p>
        </div>
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
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => onTemplateClick(template)}
              onDownload={() => onDownload(template)}
              variant="list"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TemplateMarketplace
