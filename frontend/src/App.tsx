import { lazy, Suspense, useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme as antdTheme } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import 'dayjs/locale/es'
import 'dayjs/locale/de'
import 'dayjs/locale/fr'
import 'dayjs/locale/zh-cn'
import { AuthProvider } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/Toaster'
import { I18nProvider, useI18n } from '@/i18n'
import { useTheme } from '@/hooks/useTheme'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ChecklistsPage = lazy(() => import('@/pages/checklists/ChecklistsPage').then(m => ({ default: m.ChecklistsPage })))
const ChecklistDetailPage = lazy(() => import('@/pages/checklists/ChecklistDetailPage').then(m => ({ default: m.ChecklistDetailPage })))
const ChecklistInstancePage = lazy(() => import('@/pages/checklist-instance/ChecklistInstancePage').then(m => ({ default: m.ChecklistInstancePage })))
const CalendarPage = lazy(() => import('@/pages/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const CommunityPage = lazy(() => import('@/pages/community/CommunityPage').then(m => ({ default: m.CommunityPage })))
const TodosPage = lazy(() => import('@/pages/todos/TodosPage').then(m => ({ default: m.TodosPage })))
const AssignmentsPage = lazy(() => import('@/pages/assignments/AssignmentsPage').then(m => ({ default: m.AssignmentsPage })))
const RunLinksPage = lazy(() => import('@/pages/run-links/RunLinksPage').then(m => ({ default: m.RunLinksPage })))
const WebhooksPage = lazy(() => import('@/pages/webhooks/WebhooksPage').then(m => ({ default: m.WebhooksPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const StatsPage = lazy(() => import('@/pages/stats/StatsPage').then(m => ({ default: m.StatsPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })))
const RunLinkExecutePage = lazy(() => import('@/pages/run-links/RunLinkExecutePage').then(m => ({ default: m.RunLinkExecutePage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  )
}

function AppContent() {
  const { isDark } = useTheme()
  const { antdLocale, language } = useI18n()

  useEffect(() => {
    dayjs.locale(language === 'zh' ? 'zh-cn' : language)
  }, [language])

  const theme = useMemo(
    () => ({
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      cssVar: true,
      token: {
        colorPrimary: '#2563eb',
        borderRadius: 10,
        colorBgLayout: isDark ? '#030712' : '#f9fafb',
        colorBgContainer: isDark ? '#111827' : '#ffffff',
        colorBorder: isDark ? '#1f2937' : '#e5e7eb',
      },
      components: {
        Card: { colorBgContainer: isDark ? '#111827' : '#ffffff' },
        Table: { colorBgContainer: isDark ? '#111827' : '#ffffff' },
      },
    }),
    [isDark]
  )

  return (
    <ConfigProvider locale={antdLocale} theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={
                <Suspense fallback={<PageLoader />}>
                  <LoginPage />
                </Suspense>
              } />
              <Route path="/run/:uniqueId" element={
                <Suspense fallback={<PageLoader />}>
                  <RunLinkExecutePage />
                </Suspense>
              } />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={<DashboardPage />} />
                            <Route path="/checklists" element={<ChecklistsPage />} />
                            <Route path="/checklists/:id" element={<ChecklistDetailPage />} />
                            <Route path="/instances/:id" element={<ChecklistInstancePage />} />
                            <Route path="/todos" element={<TodosPage />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            <Route path="/community" element={<CommunityPage />} />
                            <Route
                              path="/assignments"
                              element={(
                                <ProtectedRoute requiredPermission="manage_assignments">
                                  <AssignmentsPage />
                                </ProtectedRoute>
                              )}
                            />
                            <Route
                              path="/run-links"
                              element={(
                                <ProtectedRoute requiredPermission="manage_run_links">
                                  <RunLinksPage />
                                </ProtectedRoute>
                              )}
                            />
                            <Route
                              path="/webhooks"
                              element={(
                                <ProtectedRoute requiredPermission="manage_webhooks">
                                  <WebhooksPage />
                                </ProtectedRoute>
                              )}
                            />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/stats" element={<StatsPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </Suspense>
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  )
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}

export default App
