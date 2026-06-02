import { Avatar, Button, Card, Space, Typography } from 'antd'
import { User, FileText } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { CommunityAuthor } from '@/types'

const { Paragraph, Text } = Typography

interface AuthorProfileProps {
  author: CommunityAuthor
  onFollow?: () => void
}

export function AuthorProfile({ author, onFollow }: AuthorProfileProps) {
  const { t } = useI18n()
  return (
    <Card className="bg-gray-50/80 dark:bg-gray-800/70" styles={{ body: { padding: 12 } }}>
      <div className="flex items-center gap-3">
        <Avatar
          icon={<User size={20} />}
          size={44}
          src={author.avatar_url}
          className="shrink-0 bg-gradient-to-br from-blue-500 to-cyan-400"
        >
          {author.username.charAt(0).toUpperCase()}
        </Avatar>
        <div className="min-w-0 flex-1">
          <Text strong className="block truncate">{author.username}</Text>
          {author.bio && (
            <Paragraph type="secondary" ellipsis style={{ marginBottom: 0 }}>
              {author.bio}
            </Paragraph>
          )}
        </div>
        <Space size={12} wrap className="justify-end">
          <Text type="secondary" className="inline-flex items-center gap-1 text-xs">
            <FileText size={12} />
            {t('community.templatesCount', { count: author.templates_count })}
          </Text>
          {onFollow && (
            <Button size="small" shape="round" onClick={onFollow}>
              {t('community.follow')}
            </Button>
          )}
        </Space>
      </div>
    </Card>
  )
}

export default AuthorProfile
