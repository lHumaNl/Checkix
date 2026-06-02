import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, Result, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { isAxiosError } from 'axios'
import { useExecuteRunLink } from '@/api/useRunLinks'
import { useI18n } from '@/i18n'

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ detail?: string; error?: string }>(error)) {
    return error.response?.data?.detail ?? error.response?.data?.error ?? fallback
  }

  return fallback
}

export function RunLinkExecutePage() {
  const { t } = useI18n()
  const { uniqueId } = useParams<{ uniqueId: string }>()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const executeRunLink = useExecuteRunLink()
  const errorMessage = executeRunLink.error
    ? getErrorMessage(executeRunLink.error, t('runLinks.executeErrorFallback'))
    : null

  function handleExecute() {
    if (!uniqueId) return
    executeRunLink.mutate(uniqueId, {
      onSuccess: (result) => setSuccessMessage(result.detail ?? result.message),
    })
  }

  if (successMessage) {
    return (
      <RunLinkShell>
        <Result
          icon={<CheckCircleOutlined className="text-green-500" />}
          title={<Typography.Title level={1}>{t('runLinks.executeStartedTitle')}</Typography.Title>}
          subTitle={successMessage || t('runLinks.executeStartedDescription')}
        />
      </RunLinkShell>
    )
  }

  return (
    <RunLinkShell>
      <Result
        icon={<PlayCircleOutlined className="text-blue-500" />}
        title={<Typography.Title level={1}>{t('runLinks.executeTitle')}</Typography.Title>}
        subTitle={<RunLinkIdentity uniqueId={uniqueId} />}
      />
      {errorMessage && <Alert className="mb-6" message={errorMessage} showIcon type="error" />}
      <Typography.Paragraph className="text-center" type="secondary">
        {t('runLinks.executeDescription')}
      </Typography.Paragraph>
      <Button
        block
        icon={<PlayCircleOutlined />}
        loading={executeRunLink.isPending}
        onClick={handleExecute}
        size="large"
        type="primary"
      >
        {executeRunLink.isPending ? t('runLinks.executeStarting') : t('runLinks.executeStart')}
      </Button>
      <Typography.Paragraph className="!mb-0 mt-6 text-center text-xs" type="secondary">
        {t('runLinks.executePoweredBy')}{' '}
        <Link to="/" className="underline">Checkix</Link>
      </Typography.Paragraph>
    </RunLinkShell>
  )
}

function RunLinkIdentity({ uniqueId }: { uniqueId?: string }) {
  if (!uniqueId) return null

  return (
    <Space direction="vertical" size={8}>
      <Tag className="mx-auto max-w-full whitespace-normal break-all" color="blue">{uniqueId}</Tag>
    </Space>
  )
}

function RunLinkShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Card className="w-full max-w-md shadow-xl">
        {children}
      </Card>
    </main>
  )
}

export default RunLinkExecutePage
