import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AutoComplete, Input } from 'antd'
import type { BaseOptionType } from 'antd/es/select'
import { useSearch } from '@/api/useSearch'
import type { SearchResults } from '@/api/useSearch'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const MIN_SEARCH_LENGTH = 2
const SEARCH_POPUP_WIDTH = 352

interface SearchOption extends BaseOptionType {
  label: ReactNode
  path: string
  value: string
}

interface SearchGroup extends BaseOptionType {
  label: ReactNode
  options: SearchOption[]
}

const SearchInput = Input.Search

export function GlobalSearch({ className = 'w-28 sm:w-64 md:w-80' }: { className?: string }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: results } = useSearch(query)
  const options = useMemo(() => createSearchOptions(results, t), [results, t])

  const closeSearch = useCallback(() => setOpen(false), [])
  const handleNavigate = useCallback((path: string) => {
    navigate(path)
    setQuery('')
    closeSearch()
  }, [closeSearch, navigate])

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    setOpen(isSearchReady(nextQuery))
  }

  return (
    <AutoComplete
      className={className}
      open={open}
      options={options}
      popupMatchSelectWidth={SEARCH_POPUP_WIDTH}
      notFoundContent={<span className="px-2 py-1 text-sm text-gray-500">{t('common.noResults')}</span>}
      value={query}
      onBlur={closeSearch}
      onChange={handleQueryChange}
      onFocus={() => setOpen(isSearchReady(query))}
      onOpenChange={(nextOpen) => setOpen(nextOpen && isSearchReady(query))}
      onSelect={(_, option) => {
        const path = (option as unknown as SearchOption).path
        if (path) handleNavigate(path)
      }}
    >
      <SearchInput allowClear size="large" aria-label={t('common.search')} placeholder={t('common.search')} />
    </AutoComplete>
  )
}

function createSearchOptions(results: SearchResults | undefined, t: (key: MessageKey) => string): SearchGroup[] {
  return [
    createChecklistGroup(results, t),
    createTodoGroup(results, t),
    createFolderGroup(results, t),
    createTagGroup(results, t),
  ].filter((group): group is SearchGroup => Boolean(group?.options.length))
}

function createChecklistGroup(results: SearchResults | undefined, t: (key: MessageKey) => string): SearchGroup | null {
  if (!results?.checklists.length) return null
  return {
    label: <GroupLabel>{t('search.checklists')}</GroupLabel>,
    options: results.checklists.map((checklist) => ({
      value: `checklist:${checklist.id}`,
      path: `/checklists/${checklist.id}`,
      label: <ResultLabel title={checklist.name} subtitle={checklist.description ?? undefined} />,
    })),
  }
}

function createTodoGroup(results: SearchResults | undefined, t: (key: MessageKey) => string): SearchGroup | null {
  if (!results?.todos.length) return null
  return {
    label: <GroupLabel>{t('search.todos')}</GroupLabel>,
    options: results.todos.map((todo) => ({
      value: `todo:${todo.id}`,
      path: '/todos',
      label: <ResultLabel title={todo.name} meta={todo.status} />,
    })),
  }
}

function createFolderGroup(results: SearchResults | undefined, t: (key: MessageKey) => string): SearchGroup | null {
  if (!results?.folders.length) return null
  return {
    label: <GroupLabel>{t('search.folders')}</GroupLabel>,
    options: results.folders.map((folder) => ({
      value: `folder:${folder.id}`,
      path: '/checklists',
      label: <ResultLabel title={folder.name} />,
    })),
  }
}

function createTagGroup(results: SearchResults | undefined, t: (key: MessageKey) => string): SearchGroup | null {
  if (!results?.tags.length) return null
  return {
    label: <GroupLabel>{t('search.tags')}</GroupLabel>,
    options: results.tags.map((tag) => ({
      value: `tag:${tag.id}`,
      path: '/checklists',
      label: <ResultLabel title={`#${tag.name}`} />,
    })),
  }
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{children}</span>
}

function ResultLabel({ title, subtitle, meta }: { title: string; subtitle?: string; meta?: string }) {
  return (
    <span className="block py-1 text-sm text-gray-800 dark:text-gray-200">
      <span className="font-semibold">{title}</span>
      {meta && <span className="ml-2 text-xs text-gray-400">{meta}</span>}
      {subtitle && <span className="mt-0.5 block truncate text-xs text-gray-500">{subtitle}</span>}
    </span>
  )
}

function isSearchReady(query: string) {
  return query.trim().length >= MIN_SEARCH_LENGTH
}
