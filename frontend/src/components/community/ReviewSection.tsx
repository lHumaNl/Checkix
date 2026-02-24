import { useState } from 'react'
import { Star, MessageSquare, Send } from 'lucide-react'
import type { CommunityReview } from '@/types'
import { StarRating } from './StarRating'

interface ReviewSectionProps {
  reviews: CommunityReview[]
  onSubmitReview: (rating: number, comment: string) => void
}

export function ReviewSection({ reviews, onSubmitReview }: ReviewSectionProps) {
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setIsSubmitting(true)
    await onSubmitReview(newRating, newComment)
    setNewComment('')
    setNewRating(5)
    setIsSubmitting(false)
  }

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
    percentage: reviews.length > 0 
      ? (reviews.filter((r) => Math.round(r.rating) === star).length / reviews.length) * 100 
      : 0,
  }))

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <MessageSquare size={20} />
        Reviews ({reviews.length})
      </h3>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rating Distribution</h4>
          <div className="space-y-2">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-6">{star}</span>
                <Star size={14} className="text-yellow-400" fill="currentColor" />
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Write a Review</h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Your rating:</span>
              <StarRating rating={newRating} onChange={setNewRating} interactive size={20} />
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your experience with this template..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                <Send size={14} />
                Submit Review
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                No reviews yet. Be the first to review!
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewItem({ review }: { review: CommunityReview }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
          {review.user.avatar_url ? (
            <img src={review.user.avatar_url} alt={review.user.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xs font-medium">
              {review.user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-white">{review.user.username}</span>
            <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
          </div>
          <div className="flex items-center gap-1 my-1">
            <StarRating rating={review.rating} size={12} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
        </div>
      </div>
    </div>
  )
}

export default ReviewSection
