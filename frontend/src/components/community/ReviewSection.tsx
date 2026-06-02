import { useState } from 'react'
import { Avatar, Button, Card, Empty, Input, List, Progress, Rate, Space, Typography } from 'antd'
import { Star, MessageSquare, Send } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { CommunityReview } from '@/types'

const { Paragraph, Text, Title } = Typography

interface ReviewSectionProps {
  reviews: CommunityReview[]
  onSubmitReview: (rating: number, comment: string) => void
}

export function ReviewSection({ reviews, onSubmitReview }: ReviewSectionProps) {
  const { t } = useI18n()
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmitReview(newRating, newComment)
      setNewComment('')
      setNewRating(5)
    } finally {
      setIsSubmitting(false)
    }
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
      <Title level={3} className="flex items-center gap-2" style={{ marginBottom: 0 }}>
        <MessageSquare size={22} />
        {t('community.reviewsCount', { count: reviews.length })}
      </Title>

      <div className="grid md:grid-cols-3 gap-6">
        <Card title={t('community.ratingDistribution')} className="shadow-sm">
          <Space direction="vertical" className="w-full" size={8}>
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-2">
                <Text type="secondary" className="w-4">{star}</Text>
                <Star size={14} className="text-yellow-400" fill="currentColor" />
                <Progress percent={percentage} showInfo={false} strokeColor="#facc15" size="small" />
                <Text type="secondary" className="w-8 text-xs">{count}</Text>
              </div>
            ))}
          </Space>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <Card title={t('community.writeReview')} className="shadow-sm">
            <Space align="center" className="mb-3" size={8}>
              <Text type="secondary">{t('community.yourRating')}</Text>
              <Rate allowHalf value={newRating} onChange={setNewRating} style={{ color: '#facc15' }} />
            </Space>
            <Input.TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('community.reviewPlaceholder')}
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button
                type="primary"
                icon={<Send size={14} />}
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!newComment.trim()}
              >
                {t('community.submitReview')}
              </Button>
            </div>
          </Card>

          {reviews.length === 0 ? (
            <Card><Empty description={t('community.noReviews')} image={Empty.PRESENTED_IMAGE_SIMPLE} /></Card>
          ) : (
            <List dataSource={reviews} renderItem={(review) => <ReviewItem review={review} />} />
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewItem({ review }: { review: CommunityReview }) {
  const { language } = useI18n()
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <List.Item className="border-0 p-0 pb-3">
      <Card className="w-full shadow-sm" styles={{ body: { padding: 16 } }}>
        <div className="flex items-start gap-3">
          <Avatar src={review.user.avatar_url} className="bg-gradient-to-br from-blue-500 to-cyan-400">
            {review.user.username.charAt(0).toUpperCase()}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Text strong>{review.user.username}</Text>
              <Text type="secondary" className="text-xs">{formatDate(review.created_at)}</Text>
            </div>
            <Rate disabled allowHalf value={review.rating} style={{ color: '#facc15', fontSize: 12 }} />
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>{review.comment}</Paragraph>
          </div>
        </div>
      </Card>
    </List.Item>
  )
}

export default ReviewSection
