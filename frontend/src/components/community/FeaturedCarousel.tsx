import { useRef } from 'react'
import { Button, Carousel, Rate, Space, Tag, Typography } from 'antd'
import type { CarouselRef } from 'antd/es/carousel'
import { ChevronLeft, ChevronRight, Download, Star } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { CommunityTemplate } from '@/types'

const { Paragraph, Text, Title } = Typography

interface FeaturedCarouselProps {
  templates: CommunityTemplate[]
  onTemplateClick: (template: CommunityTemplate) => void
}

export function FeaturedCarousel({ templates, onTemplateClick }: FeaturedCarouselProps) {
  const { t } = useI18n()
  const carouselRef = useRef<CarouselRef | null>(null)

  if (templates.length === 0) return null

  const handlePrev = () => {
    carouselRef.current?.prev()
  }

  const handleNext = () => {
    carouselRef.current?.next()
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-blue-700 shadow-xl shadow-blue-950/10 dark:shadow-black/30">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(120deg,rgba(255,255,255,.35),transparent_35%),radial-gradient(circle_at_72%_28%,rgba(34,211,238,.5),transparent_30%),radial-gradient(circle_at_18%_72%,rgba(168,85,247,.45),transparent_30%)]" />
      <Carousel
        ref={carouselRef}
        autoplay
        dots
        className="relative"
      >
        {templates.map((template) => (
          <FeaturedSlide
            key={template.id}
            template={template}
            onTemplateClick={onTemplateClick}
          />
        ))}
      </Carousel>

      {templates.length > 1 && (
        <>
          <Button
            onClick={handlePrev}
            aria-label={t('community.previousTemplate')}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 border-white/30 bg-white/20 text-white backdrop-blur hover:bg-white/30"
            shape="circle"
            type="text"
          >
            <ChevronLeft size={24} />
          </Button>
          <Button
            onClick={handleNext}
            aria-label={t('community.nextTemplate')}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 border-white/30 bg-white/20 text-white backdrop-blur hover:bg-white/30"
            shape="circle"
            type="text"
          >
            <ChevronRight size={24} />
          </Button>
        </>
      )}
    </div>
  )
}

function FeaturedSlide({
  template,
  onTemplateClick,
}: {
  template: CommunityTemplate
  onTemplateClick: (template: CommunityTemplate) => void
}) {
  const { t } = useI18n()

  return (
    <div className="min-h-72 px-8 py-8 md:px-12">
      <div className="grid h-full items-center gap-6 md:grid-cols-[1.1fr_.9fr]">
        <div>
          <Tag className="mb-4 border-white/25 bg-white/20 text-white" icon={<Star size={12} fill="currentColor" />}>
            {t('community.featuredTemplate')}
          </Tag>
          <Title level={2} className="text-white" style={{ marginBottom: 8 }}>
            {template.title}
          </Title>
          <Paragraph className="max-w-2xl text-white/80" ellipsis={{ rows: 2 }}>
            {template.description}
          </Paragraph>
          <Space size={16} wrap className="mb-5 text-white/85">
            <Text className="text-white/85">{t('community.byAuthor', { author: template.author.username })}</Text>
            <span className="inline-flex items-center gap-1">
              <Rate disabled count={1} value={1} style={{ color: '#facc15', fontSize: 14 }} />
              {template.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1"><Download size={14} />{template.download_count}</span>
          </Space>
          <Button type="primary" ghost className="border-white text-white" onClick={() => onTemplateClick(template)}>
            {t('community.viewTemplate')}
          </Button>
        </div>
        <TemplateItemPreview template={template} />
      </div>
    </div>
  )
}

function TemplateItemPreview({ template }: { template: CommunityTemplate }) {
  const { t } = useI18n()

  return (
    <div className="hidden rounded-2xl border border-white/15 bg-white/15 p-4 backdrop-blur-md md:block">
      <div className="space-y-2">
        {template.items.slice(0, 5).map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 text-sm text-white/90">
            <span className="flex h-5 w-5 items-center justify-center rounded border border-white/35 text-[10px]">
              {index + 1}
            </span>
            <span className="truncate">{item.content}</span>
          </div>
        ))}
        {template.items.length > 5 && (
          <Text className="text-xs text-white/65">
            {t('community.moreItems', { count: template.items.length - 5 })}
          </Text>
        )}
      </div>
    </div>
  )
}

export default FeaturedCarousel
