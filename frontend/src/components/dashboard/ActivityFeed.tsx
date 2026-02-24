import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, ListTodo, Calendar, Trophy, Plus, Edit, Trash2 } from 'lucide-react'
import type { ActivityItem } from '@/types/dashboard'
import { useActivityFeed } from '@/api/useActivityFeed'

const typeIcons = {
  checklist: CheckCircle2,
  todo: ListTodo,
  event: Calendar,
  achievement: Trophy,
}

const actionIcons = {
  created: Plus,
  completed: CheckCircle2,
  updated: Edit,
  deleted: Trash2,
}

const typeColors = {
  checklist: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  todo: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  event: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  achievement: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
}

interface ActivityFeedProps {
  limit?: number
}

export function ActivityFeed({ limit = 10 }: ActivityFeedProps) {
  const { data, isLoading, error } = useActivityFeed(1, limit)
  const activities = data?.results ?? []

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex animate-pulse gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        Unable to load activity feed
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-1" role="list" aria-label="Recent activity">
      {activities.map((activity) => (
        <ActivityItemRow key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

function ActivityItemRow({ activity }: { activity: ActivityItem }) {
  const TypeIcon = typeIcons[activity.type]
  const ActionIcon = actionIcons[activity.action]

  return (
    <div
      className="group flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      role="listitem"
    >
      <div className={`relative rounded-full p-2 ${typeColors[activity.type]}`}>
        <TypeIcon className="h-5 w-5" />
        <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 dark:bg-gray-800">
          <ActionIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
        {activity.description && (
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{activity.description}</p>
        )}
      </div>
      <time className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500" dateTime={activity.timestamp}>
        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
      </time>
    </div>
  )
}
