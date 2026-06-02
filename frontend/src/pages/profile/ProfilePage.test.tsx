import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserMe, UserMeUpdate } from '@/api/useProfile'
import { I18nProvider } from '@/i18n'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { buildUpdatePayload } from './profilePayload'

const profileRequests: UserMeUpdate[] = []

const profile: UserMe = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  last_login: '2024-01-02T12:00:00Z',
  profile: {
    id: 10,
    timezone: 'UTC',
    language: 'en',
    notification_preferences: null,
    ldap_dn: null,
    employee_id: 'EMP-100',
    department: 'Support',
    manager: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
}

vi.mock('@/api/useProfile', () => ({
  useProfile: () => ({ data: profile, isError: false, isLoading: false }),
  useUpdateProfile: () => ({
    isPending: false,
    mutateAsync: async (payload: UserMeUpdate) => {
      profileRequests.push(payload)
      return { ...profile, profile: { ...profile.profile, ...payload } }
    },
  }),
}))

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }))

function renderProfilePage() {
  return render(
    <I18nProvider>
      <ProfilePage />
    </I18nProvider>
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    profileRequests.length = 0
  })

  it('renders profile details and builds flat profile updates', () => {
    renderProfilePage()

    expect(screen.getByRole('heading', { name: /my profile/i })).toBeInTheDocument()
    expect(screen.getAllByText('@testuser')).toHaveLength(2)
    expect(buildUpdatePayload({
      department: 'Engineering',
      employee_id: 'EMP-100',
      timezone: 'UTC',
      language: 'en',
    })).toMatchObject({
      department: 'Engineering',
      employee_id: 'EMP-100',
      timezone: 'UTC',
      language: 'en',
    })
  })
})
