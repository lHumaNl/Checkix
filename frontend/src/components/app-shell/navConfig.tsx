import { Link } from 'react-router-dom'
import type { MenuDataItem, ProLayoutProps } from '@ant-design/pro-components'
import {
  BarChart3,
  Bell,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Link2,
  ListTodo,
  UserCheck,
  UserCircle,
  Users,
  Webhook,
} from 'lucide-react'
import type { MenuProps } from 'antd'
import type { MessageKey } from '@/i18n/messages'
import type { PermissionName, User } from '@/types'

type IconComponent = typeof LayoutDashboard

export interface NavItem {
  to: string
  labelKey: MessageKey
  icon: IconComponent
  extraMatches?: string[]
  permission?: PermissionName
}

export const navItems = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/checklists', labelKey: 'nav.checklists', icon: CheckSquare, extraMatches: ['/instances'] },
  { to: '/todos', labelKey: 'nav.todos', icon: ListTodo },
  { to: '/calendar', labelKey: 'nav.calendar', icon: Calendar },
  { to: '/community', labelKey: 'nav.community', icon: Users },
  { to: '/assignments', labelKey: 'nav.assignments', icon: UserCheck, permission: 'manage_assignments' },
  { to: '/run-links', labelKey: 'nav.runLinks', icon: Link2, permission: 'manage_run_links' },
  { to: '/webhooks', labelKey: 'nav.webhooks', icon: Webhook, permission: 'manage_webhooks' },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/profile', labelKey: 'nav.profile', icon: UserCircle },
] satisfies NavItem[]

export function getSelectedMenuKey(pathname: string) {
  return navItems.find((item) => isRouteActive(pathname, item))?.to ?? '/'
}

export function createProLayoutRoute(t: (key: MessageKey) => string, user: User | null): NonNullable<ProLayoutProps['route']> {
  return {
    path: '/',
    routes: getVisibleNavItems(user).map((item) => createRouteItem(item, t)),
  }
}

export function getCurrentNavItem(pathname: string) {
  return navItems.find((item) => isRouteActive(pathname, item)) ?? navItems[0]
}

export function getVisibleNavItems(user: User | null) {
  return navItems.filter((item) => canShowNavItem(item, user))
}

export function canShowNavItem(item: NavItem, user: User | null) {
  if (!item.permission) return true
  return hasPermission(user, item.permission)
}

export function hasPermission(user: User | null, permission: PermissionName) {
  return user?.permissions?.includes(permission) ?? false
}

export function createMenuItems(t: (key: MessageKey) => string): MenuProps['items'] {
  return navItems.map((item) => {
    const Icon = item.icon
    return {
      key: item.to,
      icon: <Icon size={18} aria-hidden="true" />,
      label: <Link to={item.to}>{t(item.labelKey)}</Link>,
    }
  })
}

function createRouteItem(item: NavItem, t: (key: MessageKey) => string): MenuDataItem {
  const Icon = item.icon
  return {
    key: item.to,
    path: item.to,
    name: t(item.labelKey),
    icon: <Icon size={18} aria-hidden="true" />,
  }
}

function isRouteActive(pathname: string, item: NavItem) {
  if (item.to === '/') return pathname === '/'
  const routeMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
  const extraMatch = item.extraMatches?.some((path) => pathname.startsWith(`${path}/`)) ?? false
  return routeMatch || extraMatch
}
