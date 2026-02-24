export interface User {
  id: number
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistTemplate {
  id: number
  title: string
  description: string | null
  category: string | null
  tags: string[]
  folder_id: number | null
  execution_mode: 'sequential' | 'free_order'
  status: 'draft' | 'active' | 'archived'
  user_id?: number
  icon?: string
  is_favorite?: boolean
  items_count?: number
  versions_count?: number
  tag_details?: { id: number; name: string; color: string }[]
  // Optional fields present only in detail (retrieve) view
  current_version?: Record<string, unknown>
  estimated_duration?: string | null
  // Legacy optional fields with graceful fallbacks in components
  usage_count?: number
  items?: ChecklistItem[]
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: number
  template_id: number
  content: string
  description: string | null
  order: number
  is_required: boolean
  estimated_time_seconds: number | null
}

export interface ChecklistItemInstance {
  id: number
  item: number | null
  title: string
  description: string
  order: number
  is_completed: boolean
  completed_at: string | null
  placeholder_value: string
  is_visible: boolean
  children: ChecklistItemInstance[]
}

export interface ChecklistInstance {
  id: number
  template: number | null
  template_name: string
  version: number | null
  name: string
  user: number
  user_username: string
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled' | 'paused'
  status_display: string
  started_at: string | null
  completed_at: string | null
  progress_percentage: number
  notes: string
  calendar_event: number | null
  item_instances: ChecklistItemInstance[]
  created_at: string
  updated_at: string
}

export interface Folder {
  id: number
  name: string
  parent_id: number | null
  user_id: number
  created_at: string
  updated_at: string
  children?: Folder[]
}

export interface Tag {
  id: number
  name: string
  color: string
  user_id: number
  created_at: string
}

export interface TodoList {
  id: number
  user_id: number
  title: string
  description: string | null
  color: string | null
  created_at: string
  updated_at: string
  items: TodoItem[]
}

export interface TodoItem {
  id: number
  list_id: number
  content: string
  is_completed: boolean
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: number
  user_id: number
  title: string
  description: string | null
  start_datetime: string
  end_datetime: string
  all_day: boolean
  color: string | null
  reminder_minutes_before: number | null
  event_type: 'checklist' | 'todo' | 'custom'
  checklist_template: number | null
  created_at: string
  updated_at: string
}

export interface CalendarEventCreate {
  title: string
  description?: string | null
  start_datetime: string
  end_datetime: string
  all_day?: boolean
  color?: string | null
  reminder_minutes_before?: number | null
  event_type?: 'checklist' | 'todo' | 'custom'
  checklist_template?: number | null
}

export interface CalendarEventUpdate {
  title?: string
  description?: string | null
  start_datetime?: string
  end_datetime?: string
  all_day?: boolean
  color?: string | null
  reminder_minutes_before?: number | null
  event_type?: 'checklist' | 'todo' | 'custom'
  checklist_template?: number | null
}

export interface CommunityTemplate {
  id: number
  title: string
  description: string | null
  category: string
  tags: string[]
  author: CommunityAuthor
  rating: number
  rating_count: number
  download_count: number
  items: CommunityTemplateItem[]
  created_at: string
  updated_at: string
}

export interface CommunityTemplateItem {
  id: number
  template_id: number
  content: string
  order: number
  is_required: boolean
}

export interface CommunityAuthor {
  id: number
  username: string
  avatar_url: string | null
  bio: string | null
  templates_count: number
}

export interface CommunityReview {
  id: number
  template_id: number
  user_id: number
  user: CommunityAuthor
  rating: number
  comment: string
  created_at: string
}

export interface ApiError {
  detail: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ChecklistTemplateCreate {
  title: string
  description?: string | null
  category?: string | null
  tags?: string[]
  folder_id?: number | null
  execution_mode?: 'sequential' | 'free_order'
  status?: 'draft' | 'active' | 'archived'
  icon?: string
  is_favorite?: boolean
  estimated_duration?: string | null
  items?: { content: string; description?: string | null; is_required?: boolean; order?: number }[]
}

export interface ChecklistTemplateUpdate {
  title?: string
  description?: string | null
  category?: string | null
  tags?: string[]
  folder_id?: number | null
  execution_mode?: 'sequential' | 'free_order'
  status?: 'draft' | 'active' | 'archived'
  icon?: string
  is_favorite?: boolean
  estimated_duration?: string | null
}

export interface ChecklistInstanceCreate {
  name: string
  template?: number
  version?: number
  notes?: string
}

export interface ChecklistResponseUpdate {
  is_checked?: boolean
  notes?: string | null
}

export interface FolderCreate {
  name: string
  parent_id?: number | null
}

export interface TagCreate {
  name: string
  color: string
}

export * from './dashboard'
