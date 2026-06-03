import { Navigate, useLocation } from 'react-router-dom'
import { Result } from 'antd'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { hasPermission } from '@/components/app-shell/navConfig'
import type { PermissionName } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: PermissionName
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()
  const { t } = useI18n()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return (
      <Result
        status="403"
        title={t('errors.forbiddenTitle')}
        subTitle={t('errors.forbiddenSubtitle')}
      />
    )
  }

  return <>{children}</>
}
