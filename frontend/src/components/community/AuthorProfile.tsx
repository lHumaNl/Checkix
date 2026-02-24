import { User, FileText } from 'lucide-react'
import type { CommunityAuthor } from '@/types'

interface AuthorProfileProps {
  author: CommunityAuthor
  onFollow?: () => void
}

export function AuthorProfile({ author, onFollow }: AuthorProfileProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
        {author.avatar_url ? (
          <img src={author.avatar_url} alt={author.username} className="w-full h-full object-cover" />
        ) : (
          <User size={20} className="text-white" />
        )}
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">{author.username}</div>
        {author.bio && (
          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{author.bio}</div>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <FileText size={12} />
        {author.templates_count} templates
      </div>
      {onFollow && (
        <button
          onClick={onFollow}
          className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          Follow
        </button>
      )}
    </div>
  )
}

export default AuthorProfile
