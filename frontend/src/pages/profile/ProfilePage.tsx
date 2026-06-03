import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import type { ReactNode } from 'react'
import { Building2, Clock, Globe, IdCard, KeyRound, Mail, Save, ShieldCheck, UsersRound } from 'lucide-react'
import { useChangePassword, useProfile, useUpdateProfile } from '@/api/useProfile'
import type { UserMe } from '@/api/useProfile'
import { toast } from '@/hooks/useToast'
import { languageOptions, useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import { buildUpdatePayload, type ProfileFormValues } from './profilePayload'

const { Text, Title } = Typography
const CARD_BODY_STYLE = { padding: 24 }
const MIN_PASSWORD_LENGTH = 8
const TIMEZONE_OPTIONS = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
]

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string

interface ProfileFormProps {
  initialValues: ProfileFormValues
  isSaving: boolean
  onSubmit: (values: ProfileFormValues) => void
  profile: UserMe
  t: Translate
}

interface PasswordFormValues {
  current_password: string
  new_password: string
  confirm_password: string
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card styles={{ body: CARD_BODY_STYLE }}>
        <Skeleton active avatar={{ size: 80 }} paragraph={{ rows: 2 }} />
      </Card>
      <Card styles={{ body: CARD_BODY_STYLE }}>
        <Skeleton active paragraph={{ rows: 8 }} title />
      </Card>
    </div>
  )
}

function ProfileSummary({ memberSince, profile, t }: { memberSince: string; profile: UserMe; t: Translate }) {
  const displayName = getDisplayName(profile)

  return (
    <Card styles={{ body: CARD_BODY_STYLE }}>
      <Space align="center" size={20}>
        <Avatar size={80} style={{ backgroundColor: '#2563eb', fontWeight: 700 }}>
          {getInitials(profile)}
        </Avatar>
        <Space direction="vertical" size={4} className="min-w-0">
          <Title level={4} style={{ margin: 0 }} ellipsis>
            {displayName}
          </Title>
          <Text type="secondary">@{profile.username}</Text>
          <Text type="secondary" className="inline-flex items-center gap-1 leading-none">
            <Clock size={12} aria-hidden="true" />
            <span>{t('profile.memberSince', { date: memberSince })}</span>
          </Text>
          {profile.profile?.department && (
            <DepartmentTag>{profile.profile.department}</DepartmentTag>
          )}
        </Space>
      </Space>
    </Card>
  )
}

function ProfileForm({ initialValues, isSaving, onSubmit, profile, t }: ProfileFormProps) {
  return (
    <Card styles={{ body: CARD_BODY_STYLE }}>
      <Form layout="vertical" requiredMark={false} initialValues={initialValues} onFinish={onSubmit}>
        <Title level={5}>{t('profile.personalInfo')}</Title>
        <Form.Item label={t('profile.email')} extra={t('profile.contactAdminEmail')}>
          <Input prefix={<Mail size={16} />} readOnly title={t('profile.emailLocked')} value={profile.email} />
        </Form.Item>

        <Divider />
        <Title level={5}>{t('profile.workDetails')}</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label={t('profile.department')} name="department">
              <Input prefix={<Building2 size={16} />} placeholder={t('profile.departmentPlaceholder')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label={t('profile.employeeId')} name="employee_id">
              <Input prefix={<IdCard size={16} />} placeholder={t('profile.employeeIdPlaceholder')} />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Title level={5}>{t('profile.localeSettings')}</Title>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label={t('profile.timezone')} name="timezone">
              <Select
                allowClear
                showSearch
                prefix={<Globe size={16} />}
                placeholder={t('profile.timezonePlaceholder')}
                optionFilterProp="label"
                options={TIMEZONE_OPTIONS.map(zone => ({ value: zone, label: zone }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label={t('common.language')} name="language">
              <Select
                allowClear
                showSearch
                placeholder={t('profile.languagePlaceholder')}
                optionFilterProp="label"
                options={languageOptions.map(({ code, label }) => ({ value: code, label }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button type="primary" htmlType="submit" icon={<Save size={16} />} loading={isSaving}>
            {isSaving ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

function AccountDetails({ memberSince, profile, t }: { memberSince: string; profile: UserMe; t: Translate }) {
  const items = [
    { key: 'username', label: t('profile.username'), children: `@${profile.username}` },
    { key: 'status', label: t('profile.accountStatus'), children: <StatusTag isActive={profile.is_active} t={t} /> },
    { key: 'memberSince', label: t('profile.memberSince', { date: '' }).trim(), children: memberSince },
    ...getLastLoginItem(profile, t),
  ]

  return (
    <Card title={t('profile.accountInfo')} styles={{ body: CARD_BODY_STYLE }}>
      <Descriptions column={{ xs: 1, sm: 2 }} items={items} />
    </Card>
  )
}

function AccessDetails({ profile, t }: { profile: UserMe; t: Translate }) {
  return (
    <Card title={<CardTitle icon={<ShieldCheck size={18} />} title={t('profile.access')} />} styles={{ body: CARD_BODY_STYLE }}>
      <Space direction="vertical" size={16} className="w-full">
        <AccessTags icon={<UsersRound size={16} />} items={profile.groups.map(formatGroup)} label={t('profile.groups')} t={t} />
        <AccessTags items={profile.permissions.map(permission => t(permissionLabelKeys[permission]))} label={t('profile.permissions')} t={t} />
        <AccessTags items={profile.capabilities} label={t('profile.capabilities')} t={t} />
      </Space>
    </Card>
  )
}

function PasswordChangeCard({ isSaving, onSubmit, t }: { isSaving: boolean; onSubmit: (values: PasswordFormValues) => void; t: Translate }) {
  const [form] = Form.useForm<PasswordFormValues>()
  return (
    <Card title={<CardTitle icon={<KeyRound size={18} />} title={t('profile.changePassword')} />} styles={{ body: CARD_BODY_STYLE }}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => onSubmit(values)}>
        <Form.Item label={t('profile.currentPassword')} name="current_password" rules={[{ required: true, message: t('profile.currentPasswordRequired') }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item label={t('profile.newPassword')} name="new_password" rules={getPasswordRules(t)}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item dependencies={['new_password']} label={t('profile.confirmPassword')} name="confirm_password" rules={getConfirmPasswordRules(t)}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button type="primary" htmlType="submit" icon={<KeyRound size={16} />} loading={isSaving}>{t('profile.updatePassword')}</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

function StatusTag({ isActive, t }: { isActive: boolean; t: Translate }) {
  return <Tag color={isActive ? 'success' : 'error'}>{isActive ? t('common.active') : t('common.inactive')}</Tag>
}

function DepartmentTag({ children }: { children: ReactNode }) {
  return (
    <Tag color="blue" className="!inline-flex !items-center gap-1 align-middle !leading-5">
      <Building2 className="block" size={12} aria-hidden="true" />
      <span>{children}</span>
    </Tag>
  )
}

export function ProfilePage() {
  const { language, t } = useI18n()
  const { data: profile, isLoading, isError } = useProfile()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()

  const handleSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(buildUpdatePayload(values))
      toast({ title: t('profile.updated'), variant: 'default' })
    } catch {
      toast({ title: t('profile.updateFailed'), variant: 'destructive' })
    }
  }

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword.mutateAsync({ current_password: values.current_password, new_password: values.new_password })
      toast({ title: t('profile.passwordUpdated'), variant: 'default' })
    } catch {
      toast({ title: t('profile.passwordUpdateFailed'), variant: 'destructive' })
    }
  }

  if (isLoading) return <ProfileSkeleton />
  if (isError) return <ProfileError t={t} />
  if (!profile) return null

  const memberSince = formatMemberSince(profile.date_joined, language, t)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader t={t} />
      <ProfileSummary memberSince={memberSince} profile={profile} t={t} />
      <ProfileForm
        initialValues={buildFormValues(profile)}
        isSaving={updateProfile.isPending}
        onSubmit={handleSubmit}
        profile={profile}
        t={t}
      />
      <AccessDetails profile={profile} t={t} />
      <PasswordChangeCard isSaving={changePassword.isPending} onSubmit={handlePasswordSubmit} t={t} />
      <AccountDetails memberSince={memberSince} profile={profile} t={t} />
    </div>
  )
}

const permissionLabelKeys = {
  manage_assignments: 'profile.permissionAssignments',
  manage_run_links: 'profile.permissionRunLinks',
  manage_webhooks: 'profile.permissionWebhooks',
} satisfies Record<string, MessageKey>

function AccessTags({ icon, items, label, t }: { icon?: ReactNode; items: string[]; label: string; t: Translate }) {
  return (
    <div>
      <Text strong className="mb-2 inline-flex items-center gap-1">{icon}{label}</Text>
      <div className="flex flex-wrap gap-2">{items.length ? items.map(item => <Tag key={item}>{item}</Tag>) : <Text type="secondary">{t('common.notAvailable')}</Text>}</div>
    </div>
  )
}

function CardTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <span className="inline-flex items-center gap-2">{icon}{title}</span>
}

function formatGroup(group: UserMe['groups'][number]) {
  return group.role ? `${group.name} · ${group.role}` : group.name
}

function getPasswordRules(t: Translate) {
  return [
    { required: true, message: t('profile.newPasswordRequired') },
    { min: MIN_PASSWORD_LENGTH, message: t('profile.passwordMinLength', { count: MIN_PASSWORD_LENGTH }) },
  ]
}

function getConfirmPasswordRules(t: Translate) {
  return [
    { required: true, message: t('profile.confirmPasswordRequired') },
    ({ getFieldValue }: { getFieldValue: (name: string) => string }) => ({
      validator(_: unknown, value: string) {
        return !value || getFieldValue('new_password') === value ? Promise.resolve() : Promise.reject(new Error(t('profile.passwordMismatch')))
      },
    }),
  ]
}

function PageHeader({ t }: { t: Translate }) {
  return (
    <div>
      <Title level={2} style={{ marginBottom: 4 }}>
        {t('profile.title')}
      </Title>
      <Text type="secondary">{t('profile.subtitle')}</Text>
    </div>
  )
}

function ProfileError({ t }: { t: Translate }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Alert type="error" showIcon message={t('profile.updateFailed')} description={t('common.failedRefresh')} />
    </div>
  )
}

function buildFormValues(profile: UserMe): ProfileFormValues {
  return {
    department: profile.profile?.department ?? '',
    employee_id: profile.profile?.employee_id ?? '',
    timezone: profile.profile?.timezone ?? '',
    language: profile.profile?.language || undefined,
  }
}

function getDisplayName(profile: UserMe) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
}

function getInitials(profile: UserMe) {
  const firstName = profile.first_name.trim()
  const lastName = profile.last_name.trim()
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  if (firstName) return firstName.slice(0, 2).toUpperCase()
  return profile.username.slice(0, 2).toUpperCase()
}

function formatMemberSince(date: string | null, language: string, t: Translate) {
  if (!date) return t('common.notAvailable')
  return new Date(date).toLocaleDateString(language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getLastLoginItem(profile: UserMe, t: Translate) {
  if (!profile.last_login) return []
  return [{ key: 'lastLogin', label: t('profile.lastLogin'), children: new Date(profile.last_login).toLocaleString() }]
}
