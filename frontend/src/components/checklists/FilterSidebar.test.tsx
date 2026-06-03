import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { FilterSidebar } from './FilterSidebar'

vi.mock('@/api/useTags', () => ({
  useTags: () => ({ data: [{ id: 1, name: 'ops' }] }),
}))

vi.mock('@/api/useFolders', () => ({
  useFolders: () => ({ data: [{ id: 10, name: 'Operations' }] }),
}))

function renderSidebar() {
  return render(
    <I18nProvider>
      <FilterSidebar
        search=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusChange={vi.fn()}
        selectedTags={[]}
        onTagsChange={vi.fn()}
        selectedFolderId={null}
        onFolderChange={vi.fn()}
      />
    </I18nProvider>
  )
}

describe('FilterSidebar', () => {
  it('renders as a page aside instead of an Ant Design layout sider', () => {
    const { container } = renderSidebar()

    const aside = screen.getByRole('complementary', { name: /filters/i })
    expect(aside).toHaveClass('lg:w-72', 'lg:flex-none')
    expect(container.querySelector('.ant-layout-sider')).not.toBeInTheDocument()
  })
})
