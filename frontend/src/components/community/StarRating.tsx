import { useId } from 'react'

interface StarRatingProps {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
  showCount?: boolean
  count?: number
}

export function StarRating({ 
  rating, 
  size = 16, 
  interactive = false, 
  onChange,
  showCount = false,
  count 
}: StarRatingProps) {
  const gradientId = useId()
  const stars = [1, 2, 3, 4, 5]
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  const handleClick = (star: number, e: React.MouseEvent) => {
    if (!interactive || !onChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const isHalf = x < rect.width / 2
    onChange(isHalf ? star - 0.5 : star)
  }

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => {
        const isFull = star <= fullStars
        const isHalf = star === fullStars + 1 && hasHalfStar

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={(e) => handleClick(star, e)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            style={{ width: size, height: size }}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isFull ? 'currentColor' : isHalf ? `url(#${gradientId})` : 'none'}
              stroke="currentColor"
              className={`w-full h-full ${isFull || isHalf ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
              strokeWidth={isFull || isHalf ? 0 : 2}
            >
              <defs>
                <linearGradient id={gradientId}>
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        )
      })}
      {showCount && count !== undefined && (
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
          ({count})
        </span>
      )}
    </div>
  )
}

export default StarRating
