import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { StatsPage } from './StatsPage'

const mocks = vi.hoisted(() => ({
  exportStats: vi.fn(),
}))

vi.mock('@/api/useCompletionData', () => ({
  useExportStatsCSV: () => ({ isPending: false, mutate: mocks.exportStats }),
}))

vi.mock('@/api/useStats', () => ({
  useOverallStats: () => ({
    data: {
      avg_completion_rate: 75,
      recent_activity: [],
      top_templates: [],
      total_instances_completed: 3,
      total_instances_created: 4,
      total_templates: 2,
    },
    error: null,
    isLoading: false,
  }),
  useRecentStats: () => ({
    data: [{ date: '2026-06-02', instances_completed: 2, instances_created: 4, template__name: 'Safety Audit' }],
    error: null,
    isLoading: false,
  }),
  useStatsByCategory: () => ({
    data: [{ community_template__category: 'Quality', total_completed: 2, total_instances: 4 }],
    error: null,
    isLoading: false,
  }),
  useTopTemplates: () => ({
    data: [{ completed_instances: 3, completion_rate: 60, template_id: 1, template_name: 'Safety Audit', total_instances: 5 }],
    error: null,
    isLoading: false,
  }),
}))

beforeAll(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
    getPropertyValue: () => '',
  }) as unknown as CSSStyleDeclaration)
})

beforeEach(() => {
  mocks.exportStats.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-03T12:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function renderStatsPage() {
  return render(
    <I18nProvider>
      <StatsPage />
    </I18nProvider>
  )
}

describe('StatsPage', () => {
  it('renders stats sections with Ant Design-backed content', () => {
    renderStatsPage()

    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument()
    expect(screen.getByText('Templates used')).toBeInTheDocument()
    expect(screen.getByText('Top Templates')).toBeInTheDocument()
    expect(screen.getByText('By Category')).toBeInTheDocument()
    expect(screen.getByText(/Safety Audit/)).toBeInTheDocument()
    expect(screen.getByText('5 runs')).toBeInTheDocument()
    expect(screen.getByText('Quality')).toBeInTheDocument()
    expect(screen.getByText('2026-06-02')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument()
  })

  it('exports using the applied default date range', () => {
    renderStatsPage()

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }))

    expect(mocks.exportStats).toHaveBeenCalledWith({
      endDate: '2026-06-03',
      startDate: '2026-05-04',
    })
  })
})
