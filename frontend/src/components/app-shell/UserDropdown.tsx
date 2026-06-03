import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Dropdown, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

export function UserDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()
  const displayName = user?.full_name || user?.username || 'User'
  const items = createUserMenuItems(displayName, user?.email ?? undefined, navigate, logout, t)

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Button aria-label={t('common.userMenu')} className="!inline-flex !h-10 !items-center !justify-center !px-2 !leading-none" type="text">
        <span className="inline-flex min-w-0 items-center gap-2 leading-none">
          <Avatar src={user?.avatar_url || undefined}>{getInitials(displayName)}</Avatar>
          <span className="hidden max-w-32 truncate text-sm font-semibold leading-none text-gray-700 dark:text-gray-200 sm:inline">
            {displayName}
          </span>
        </span>
      </Button>
    </Dropdown>
  )
}

function createUserMenuItems(
  displayName: string,
  email: string | undefined,
  navigate: (path: string) => void,
  logout: () => void,
  t: (key: MessageKey) => string
): MenuProps['items'] {
  return [
    { key: 'identity', disabled: true, label: <UserIdentity name={displayName} email={email} /> },
    { type: 'divider' },
    { key: 'profile', icon: <UserCircle size={16} />, label: t('common.profile'), onClick: () => navigate('/profile') },
    { type: 'divider' },
    { key: 'logout', icon: <LogOut size={16} />, label: t('common.logout'), onClick: logout },
  ]
}

function UserIdentity({ name, email }: { name: string; email?: string }) {
  return (
    <div className="min-w-44 py-1">
      <Typography.Text strong>{name}</Typography.Text>
      {email && <Typography.Text className="block text-xs" type="secondary">{email}</Typography.Text>}
    </div>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
