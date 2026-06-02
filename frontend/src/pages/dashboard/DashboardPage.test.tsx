import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { DashboardPage } from './DashboardPage'

vi.mock('@/api/useDashboardStats', () => ({
  useDashboardStats: () => ({
    data: {
      active_instances: 1,
      avg_completion_rate: 70,
      completed_checklists: 3,
      completed_today: 1,
      completed_todos: 4,
      completion_rate: 75,
      overdue_instances: 0,
      streak_days: 5,
      total_checklists: 6,
      total_templates: 6,
      total_todos: 8,
      upcoming_events: 2,
      weekly_change: 12,
    },
    error: null,
    isLoading: false,
  }),
}))

vi.mock('@/api/useCompletionData', () => ({
  useCompletionChart: () => ({ data: [{ label: 'Mon', value: 3 }], error: null, isLoading: false }),
  useExportStatsCSV: () => ({ isPending: false, mutate: vi.fn() }),
  useHeatmapData: () => ({ data: [{ count: 2, date: '2026-06-01' }], error: null, isLoading: false }),
  useStatsByDateRange: () => ({ data: [{ date: '2026-06-01', instances_completed: 2, instances_created: 3 }] }),
}))

vi.mock('@/api/useActivityFeed', () => ({
  useActivityFeed: () => ({ data: { items: [] }, error: null, isLoading: false }),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ cycleTheme: vi.fn(), isDark: false, theme: 'light' }),
}))

const ENGLISH_DASHBOARD_LABELS = [
  'Dashboard',
  'Upcoming Events',
  'Current Streak',
  'Completion Trends',
  'Export CSV',
]

function renderDashboardInRussian() {
  localStorage.setItem('language', 'ru')
  render(
    <I18nProvider>
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    </I18nProvider>
  )
}

describe('DashboardPage i18n', () => {
  it('renders dashboard chrome with Russian labels instead of English fallbacks', () => {
    renderDashboardInRussian()

    expect(screen.getByRole('heading', { name: '\u041e\u0431\u0437\u043e\u0440' })).toBeInTheDocument()
    expect(screen.getByText('\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0441\u043e\u0431\u044b\u0442\u0438\u044f')).toBeInTheDocument()
    expect(screen.getByText('\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0441\u0435\u0440\u0438\u044f')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\u042d\u043a\u0441\u043f\u043e\u0440\u0442 CSV/ })).toBeInTheDocument()

    for (const label of ENGLISH_DASHBOARD_LABELS) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })
})
