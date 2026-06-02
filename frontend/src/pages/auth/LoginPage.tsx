import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { Sun, Moon, Monitor } from 'lucide-react'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/i18n'

const { Text, Title } = Typography

interface LoginFormValues {
  username: string
  password: string
}

export function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<LoginFormValues>()
  const { theme, cycleTheme } = useTheme()
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleSubmit = async ({ username, password }: LoginFormValues) => {
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        setError(axiosErr.response?.data?.detail || t('auth.invalidCredentials'))
      } else {
        setError(t('auth.loginFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const themeIcon = {
    light: <Sun size={18} />,
    dark: <Moon size={18} />,
    system: <Monitor size={18} />,
  }[theme]

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-950 sm:px-6 lg:px-8">
      <Space className="absolute right-4 top-4" align="center">
        <LanguageSelector />
        <Button
          type="text"
          shape="circle"
          onClick={cycleTheme}
          icon={themeIcon}
          aria-label={`${t('common.theme')}: ${theme}`}
          title={`${t('common.theme')}: ${theme}`}
        />
      </Space>

      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 6rem)' }}>
        <Card className="w-full max-w-md shadow-xl" styles={{ body: { padding: 32 } }}>
          <Space direction="vertical" size={24} className="w-full">
            <div className="text-center">
              <Title level={2} style={{ marginBottom: 4 }}>
                Checkix
              </Title>
              <Text type="secondary">{t('auth.signInTitle')}</Text>
            </div>

            {error && (
              <Alert type="error" showIcon message={error} />
            )}

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmit}
              onFinishFailed={() => setError('')}
            >
              <Form.Item
                label={t('auth.username')}
                name="username"
                rules={[{ required: true, whitespace: true, message: t('auth.usernameRequired') }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  autoComplete="username"
                  placeholder={t('auth.username')}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label={t('auth.password')}
                name="password"
                rules={[{ required: true, message: t('auth.passwordRequired') }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  autoComplete="current-password"
                  placeholder={t('auth.password')}
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                  {t('auth.signIn')}
                </Button>
              </Form.Item>
            </Form>
          </Space>
        </Card>
      </div>
    </div>
  )
}
