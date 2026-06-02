import { ConfigProvider } from 'antd'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { CommunityTemplate } from '@/types'
import { TemplateMarketplace } from './TemplateMarketplace'

const templates: CommunityTemplate[] = [
  {
    id: 1,
    title: 'Trip essentials',
    description: 'Pack documents and chargers',
    category: 'travel',
    tags: ['packing', 'airport'],
    author: { id: 1, username: 'maria', avatar_url: null, bio: null, templates_count: 4 },
    rating: 4.5,
    rating_count: 8,
    download_count: 120,
    items: [{ id: 1, template_id: 1, content: 'Passport', order: 1, is_required: true }],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Desk setup',
    description: 'Prepare the workspace for focus',
    category: 'work',
    tags: ['office', 'productivity'],
    author: { id: 2, username: 'alex', avatar_url: null, bio: null, templates_count: 7 },
    rating: 4.8,
    rating_count: 12,
    download_count: 88,
    items: [{ id: 2, template_id: 2, content: 'Clean keyboard', order: 1, is_required: false }],
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
]

function renderMarketplace(onDownload = vi.fn()) {
  return {
    onDownload,
    ...render(
      <ConfigProvider>
        <I18nProvider>
          <TemplateMarketplace
            templates={templates}
            featuredTemplates={[]}
            onTemplateClick={vi.fn()}
            onDownload={onDownload}
          />
        </I18nProvider>
      </ConfigProvider>
    ),
  }
}

describe('TemplateMarketplace', () => {
  it('filters templates by search text and category', async () => {
    renderMarketplace()

    await userEvent.type(screen.getByPlaceholderText('Search templates...'), 'desk')

    expect(screen.getByText('Desk setup')).toBeInTheDocument()
    expect(screen.queryByText('Trip essentials')).not.toBeInTheDocument()

    await userEvent.clear(screen.getByPlaceholderText('Search templates...'))
    await userEvent.click(screen.getByRole('button', { name: /Work/i }))

    expect(screen.getByText('Desk setup')).toBeInTheDocument()
    expect(screen.queryByText('Trip essentials')).not.toBeInTheDocument()
  })

  it('keeps download action wired to the selected template', async () => {
    const { onDownload } = renderMarketplace()

    await userEvent.click(screen.getAllByRole('button', { name: /Download Template/i })[0])

    expect(onDownload).toHaveBeenCalledWith(templates[0])
  })
})
