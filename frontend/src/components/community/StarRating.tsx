import { Rate, Space, Typography } from 'antd'

const { Text } = Typography

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
  return (
    <Space size={4} className="leading-none">
      <Rate
        allowHalf
        disabled={!interactive}
        value={rating}
        onChange={onChange}
        style={{ color: '#facc15', fontSize: size }}
      />
      {showCount && count !== undefined && (
        <Text type="secondary" className="ml-1 text-sm">
          ({count})
        </Text>
      )}
    </Space>
  )
}

export default StarRating
