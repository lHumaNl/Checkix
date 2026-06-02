import { ExclamationCircleOutlined } from '@ant-design/icons'
import { Button, Modal, Space, Typography } from 'antd'
import { useI18n } from '@/i18n'

const CONFIRM_DIALOG_WIDTH = 425

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
}

interface ConfirmDialogContentProps {
  description?: string
  isDestructive: boolean
  title: string
}

interface ConfirmDialogFooterProps {
  cancelLabel: string
  confirmLabel: string
  isDestructive: boolean
  onCancel: () => void
  onConfirm: () => void
}

function ConfirmDialogContent({
  description,
  isDestructive,
  title,
}: ConfirmDialogContentProps) {
  return (
    <Space align="start" size={12}>
      {isDestructive && <ExclamationCircleOutlined className="mt-1 text-xl text-red-500" />}
      <div>
        <Typography.Title className="mb-1" level={5}>
          {title}
        </Typography.Title>
        {description && (
          <Typography.Paragraph className="mb-0" type="secondary">
            {description}
          </Typography.Paragraph>
        )}
      </div>
    </Space>
  )
}

function ConfirmDialogFooter({
  cancelLabel,
  confirmLabel,
  isDestructive,
  onCancel,
  onConfirm,
}: ConfirmDialogFooterProps) {
  return (
    <Space>
      <Button onClick={onCancel}>{cancelLabel}</Button>
      <Button danger={isDestructive} type="primary" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </Space>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useI18n()
  const isDestructive = variant === 'destructive'
  const resolvedConfirmLabel = confirmLabel ?? t('common.yes')
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel')
  const handleCancel = () => onOpenChange(false)

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Modal
      centered
      destroyOnHidden
      footer={
        <ConfirmDialogFooter
          cancelLabel={resolvedCancelLabel}
          confirmLabel={resolvedConfirmLabel}
          isDestructive={isDestructive}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      }
      onCancel={handleCancel}
      open={open}
      title={null}
      width={CONFIRM_DIALOG_WIDTH}
    >
      <ConfirmDialogContent
        description={description}
        isDestructive={isDestructive}
        title={title}
      />
    </Modal>
  )
}
