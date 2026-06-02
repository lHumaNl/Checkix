import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { CommunityTemplate } from '@/types'
import { CommunityPage } from './CommunityPage'

const communityMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toast: vi.fn(),
  useCommunityTemplates: vi.fn(),
  useFeaturedTemplates: vi.fn(),
}))

vi.mock('@/api/useCommunityTemplates', () => ({
  useCommunityTemplates: communityMocks.useCommunityTemplates,
  useFeaturedTemplates: communityMocks.useFeaturedTemplates,
  useDownloadTemplate: () => ({ mutateAsync: communityMocks.mutateAsync, isPending: false }),
}))

vi.mock('@/hooks/useToast', () => ({ toast: communityMocks.toast }))

const templates: CommunityTemplate[] = [
  {
    id: 1,
    title: 'Trip essentials',
    description: 'Pack documents and chargers',
    category: 'travel',
    tags: ['packing'],
    author: { id: 1, username: 'maria', avatar_url: null, bio: null, templates_count: 4 },
    rating: 4.5,
    rating_count: 8,
    download_count: 120,
    items: [{ id: 1, template_id: 1, content: 'Passport', order: 1, is_required: true }],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
]

beforeAll(() => {
  const getComputedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element))
})

beforeEach(() => {
  communityMocks.mutateAsync.mockReset()
  communityMocks.toast.mockReset()
  communityMocks.useCommunityTemplates.mockReturnValue({ data: templates, isLoading: false, isError: false })
  communityMocks.useFeaturedTemplates.mockReturnValue({ data: [], isLoading: false, isError: false })
})

function renderCommunityPage() {
  render(
    <I18nProvider>
      <CommunityPage />
    </I18nProvider>
  )
}

describe('CommunityPage', () => {
  it('keeps preview open until download succeeds', async () => {
    const user = userEvent.setup()
    let resolveDownload: (value: unknown) => void = () => {}
    communityMocks.mutateAsync.mockReturnValue(new Promise(resolve => { resolveDownload = resolve }))
    renderCommunityPage()

    await user.click(screen.getByText('Trip essentials'))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Download Template/i }))

    expect(communityMocks.mutateAsync).toHaveBeenCalledWith(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await act(async () => resolveDownload({}))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(communityMocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Template downloaded successfully',
    }))
  })
})
