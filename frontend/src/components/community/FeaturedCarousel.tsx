import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Download, Star } from 'lucide-react'
import type { CommunityTemplate } from '@/types'

interface FeaturedCarouselProps {
  templates: CommunityTemplate[]
  onTemplateClick: (template: CommunityTemplate) => void
}

export function FeaturedCarousel({ templates, onTemplateClick }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isAutoPlaying && templates.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % templates.length)
      }, 5000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAutoPlaying, templates.length])

  if (templates.length === 0) return null

  const handlePrev = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + templates.length) % templates.length)
  }

  const handleNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % templates.length)
  }

  const current = templates[currentIndex]

  return (
    <div 
      className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl overflow-hidden h-64"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ 
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>')`
        }}
      />
      
      <div className="relative h-full flex items-center p-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-white text-xs font-medium mb-3">
            <Star size={12} fill="currentColor" />
            Featured Template
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{current.title}</h2>
          <p className="text-white/80 mb-4 line-clamp-2">{current.description}</p>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-white/80 text-sm">by {current.author.username}</span>
            <span className="flex items-center gap-1 text-white/80 text-sm">
              <Star size={14} fill="currentColor" />
              {current.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1 text-white/80 text-sm">
              <Download size={14} />
              {current.download_count}
            </span>
          </div>
          <button
            onClick={() => onTemplateClick(current)}
            className="px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 transition-colors"
          >
            View Template
          </button>
        </div>

        <div className="hidden md:block flex-1">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="space-y-2">
              {current.items.slice(0, 5).map((item, i) => (
                <div key={item.id} className="flex items-center gap-2 text-white/90 text-sm">
                  <div className="w-4 h-4 rounded border border-white/30 flex items-center justify-center">
                    {i === 0 && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <span className="truncate">{item.content}</span>
                </div>
              ))}
              {current.items.length > 5 && (
                <div className="text-white/60 text-xs">
                  +{current.items.length - 5} more items
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {templates.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous template"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next template"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Template navigation">
        {templates.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setIsAutoPlaying(false)
              setCurrentIndex(i)
            }}
            aria-label={`Go to template ${i + 1}`}
            aria-selected={i === currentIndex}
            role="tab"
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default FeaturedCarousel
