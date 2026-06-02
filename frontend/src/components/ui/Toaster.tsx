import { useEffect } from 'react'
import { notification } from 'antd'
import { useToast } from '@/hooks/useToast'

const TOAST_DURATION_SECONDS = 5

type NotificationApi = ReturnType<typeof notification.useNotification>[0]
type ToastItem = ReturnType<typeof useToast>['toasts'][number]

function createNotificationConfig(
  toastItem: ToastItem,
  onClose: (toastId: string) => void
) {
  const { action, description, id, title } = toastItem

  return {
    actions: action,
    description: title ? description : undefined,
    duration: TOAST_DURATION_SECONDS,
    key: id,
    message: title ?? description ?? '',
    onClose: () => onClose(id),
    placement: 'bottomRight',
  } as const
}

function openNotification(
  api: NotificationApi,
  toastItem: ToastItem,
  onClose: (toastId: string) => void
) {
  const { id, open, variant } = toastItem

  if (open === false) {
    api.destroy(id)
    return
  }

  const config = createNotificationConfig(toastItem, onClose)

  if (variant === 'destructive') {
    api.error(config)
    return
  }

  if (variant === 'success') {
    api.success(config)
    return
  }

  api.open(config)
}

export function Toaster() {
  const { dismiss, toasts } = useToast()
  const [api, contextHolder] = notification.useNotification()

  useEffect(() => {
    toasts.forEach((toastItem) => openNotification(api, toastItem, dismiss))
  }, [api, dismiss, toasts])

  return contextHolder
}
