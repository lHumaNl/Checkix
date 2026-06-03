import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageContainer, ProLayout } from '@ant-design/pro-components'
import type { MenuDataItem } from '@ant-design/pro-components'
import { Breadcrumb } from 'antd'
import type { BreadcrumbProps, MenuProps } from 'antd'
import { GlobalSearch } from '@/components/app-shell/GlobalSearch'
import { LayoutSettingsDropdown } from '@/components/app-shell/LayoutSettingsDropdown'
import { ThemeSelector } from '@/components/app-shell/ThemeSelector'
import { UserDropdown } from '@/components/app-shell/UserDropdown'
import { useLayoutSettings } from '@/components/app-shell/useLayoutSettings'
import type { AppLayoutSettings } from '@/components/app-shell/useLayoutSettings'
import { createProLayoutRoute, getCurrentNavItem, getSelectedMenuKey } from '@/components/app-shell/navConfig'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

interface LayoutProps {
  children: ReactNode
}

const SIDEBAR_WIDTH = 280
const APP_TITLE = 'Checkix'

export function Layout({ children }: LayoutProps) {
  const { t } = useI18n()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { settings, setSettings } = useLayoutSettings()
  const route = useMemo(() => createProLayoutRoute(t, user), [t, user])
  const breadcrumb = useMemo(() => createBreadcrumb(location.pathname, t), [location.pathname, t])
  const selectedKeys = useMemo(() => [getSelectedMenuKey(location.pathname)], [location.pathname])
  const pageTitle = t(getCurrentNavItem(location.pathname).labelKey)
  const isSideLayout = settings.layout === 'side'
  const layoutClassName = isSideLayout ? 'checkix-pro-layout checkix-pro-layout--side min-h-screen' : 'checkix-pro-layout checkix-pro-layout--top min-h-screen'

  return (
    <ProLayout
      {...settings}
      route={route}
      location={{ pathname: location.pathname }}
      logo={<BrandMark />}
      title={APP_TITLE}
      siderWidth={SIDEBAR_WIDTH}
      menu={{ locale: false }}
      menuProps={{ selectedKeys, 'aria-label': t('shell.primaryNavigation') } as MenuProps}
      contentStyle={{ minHeight: '100vh', padding: 0 }}
      className={layoutClassName}
      menuItemRender={renderMenuItem}
      menuHeaderRender={(logo, title) => renderHeaderTitle(logo, title, t)}
      headerTitleRender={(logo, title) => renderHeaderTitle(logo, title, t)}
      onMenuHeaderClick={() => navigate('/')}
      actionsRender={false}
      rightContentRender={isSideLayout ? false : () => <HeaderControls settings={settings} onChange={setSettings} />}
      pageTitleRender={() => createPageTitle(location.pathname, t)}
    >
      {isSideLayout && <SideContentHeader title={pageTitle} breadcrumb={breadcrumb} settings={settings} onChange={setSettings} />}
      <PageContainer title={false} breadcrumb={isSideLayout ? undefined : breadcrumb}>
        {children}
      </PageContainer>
    </ProLayout>
  )
}

interface HeaderControlsProps {
  settings: AppLayoutSettings
  onChange: (settings: Partial<AppLayoutSettings>) => void
}

interface SideContentHeaderProps {
  title: string
  breadcrumb: BreadcrumbProps
  settings: AppLayoutSettings
  onChange: (settings: Partial<AppLayoutSettings>) => void
}

function SideContentHeader({ title, breadcrumb, settings, onChange }: SideContentHeaderProps) {
  return (
    <header className="checkix-content-header" data-testid="side-content-header">
      <div className="min-w-0">
        <Breadcrumb className="mb-1 text-xs" items={breadcrumb.items} />
        <h1 className="m-0 truncate text-2xl font-black tracking-tight text-gray-950 dark:text-white">{title}</h1>
      </div>
      <div className="checkix-content-header-actions flex min-w-0 justify-end" data-testid="side-header-actions">
        <HeaderControls settings={settings} onChange={onChange} />
      </div>
    </header>
  )
}

function HeaderControls({ settings, onChange }: HeaderControlsProps) {
  return (
    <div className="checkix-header-controls flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 px-2 sm:flex-nowrap sm:px-3">
      <GlobalSearch className="checkix-header-search order-last w-full sm:order-none sm:w-64 md:w-80" />
      <div className="checkix-header-action-cluster flex shrink-0 items-center gap-1 rounded-full border border-gray-200/80 bg-white/85 p-1 shadow-sm shadow-gray-950/5 backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/80">
        <LanguageSelector className="w-[4.5rem] sm:w-28" />
        <ThemeSelector />
        <LayoutSettingsDropdown settings={settings} onChange={onChange} />
        <UserDropdown />
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-base font-black text-white shadow-lg shadow-blue-600/30">
      C
    </span>
  )
}

function renderHeaderTitle(logo: ReactNode, title: ReactNode, t: (key: MessageKey) => string) {
  const titleText = typeof title === 'string' ? title : APP_TITLE

  return (
    <Link to="/" className="checkix-brand-link flex min-w-0 items-center gap-3" aria-label={APP_TITLE}>
      {logo}
      <span className="checkix-brand-copy flex min-w-0 flex-col justify-center leading-none">
        <span className="block truncate text-lg font-black leading-tight tracking-tight text-gray-950 dark:text-white">{titleText}</span>
        <span className="block truncate text-[11px] font-semibold uppercase leading-tight tracking-[0.18em] text-gray-400">
          {t('shell.subtitle')}
        </span>
      </span>
    </Link>
  )
}

function renderMenuItem(item: MenuDataItem, defaultDom: ReactNode) {
  return item.path ? <Link to={item.path}>{defaultDom}</Link> : defaultDom
}

function createBreadcrumb(pathname: string, t: (key: MessageKey) => string): BreadcrumbProps {
  return { items: createBreadcrumbItems(pathname, t) }
}

function createBreadcrumbItems(pathname: string, t: (key: MessageKey) => string): BreadcrumbProps['items'] {
  const currentItem = getCurrentNavItem(pathname)
  const dashboardTitle = t('nav.dashboard')
  if (currentItem.to === '/') return [{ title: dashboardTitle }]
  return [{ title: <Link to="/">{dashboardTitle}</Link> }, { title: t(currentItem.labelKey) }]
}

function createPageTitle(pathname: string, t: (key: MessageKey) => string) {
  return `${t(getCurrentNavItem(pathname).labelKey)} - ${APP_TITLE}`
}
