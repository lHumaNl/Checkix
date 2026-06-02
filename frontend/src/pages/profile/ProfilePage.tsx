import { useState } from 'react'
import { User, Mail, Building2, IdCard, Globe, Save, Clock } from 'lucide-react'
import { useProfile, useUpdateProfile } from '@/api/useProfile'
import type { UserMeUpdate } from '@/api/useProfile'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ firstName, lastName, username }: { firstName: string; lastName: string; username: string }) {
  const initials = (() => {
    const f = firstName.trim()
    const l = lastName.trim()
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase()
    if (f) return f.slice(0, 2).toUpperCase()
    return username.slice(0, 2).toUpperCase()
  })()

  return (
    <div className="w-20 h-20 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0">
      <span className="text-2xl font-bold text-white">{initials}</span>
    </div>
  )
}

// ─── Field ───────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}

function Field({ label, icon: Icon, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Icon size={14} className="text-gray-400 dark:text-gray-500" />
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'

const readonlyInputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed'

// ─── Page ────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { language, t } = useI18n()
  const { data: profile, isLoading, isError } = useProfile()
  const updateProfile = useUpdateProfile()

  const [form, setForm] = useState<{
    first_name: string
    last_name: string
    department: string
    employee_id: string
    timezone: string
    language: string
  } | null>(null)

  const formValues = form ?? {
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    department: profile?.profile?.department ?? '',
    employee_id: profile?.profile?.employee_id ?? '',
    timezone: profile?.profile?.timezone ?? '',
    language: profile?.profile?.language ?? '',
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(() => ({ ...formValues, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload: UserMeUpdate = {
      first_name: formValues.first_name || undefined,
      last_name: formValues.last_name || undefined,
    }

    const profileData: UserMeUpdate['profile'] = {}
    if (formValues.department) profileData.department = formValues.department
    if (formValues.employee_id) profileData.employee_id = formValues.employee_id
    if (formValues.timezone) profileData.timezone = formValues.timezone
    if (formValues.language) profileData.language = formValues.language

    if (Object.keys(profileData).length > 0) {
      payload.profile = profileData
    }

    try {
      await updateProfile.mutateAsync(payload)
      toast({ title: t('profile.updated'), variant: 'default' })
    } catch {
      toast({ title: t('profile.updateFailed'), variant: 'destructive' })
    }
  }

  if (isLoading) return <ProfileSkeleton />

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-400 font-medium">{t('profile.updateFailed')}</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">{t('common.failedRefresh')}</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
  const memberSince = profile.date_joined
    ? new Date(profile.date_joined).toLocaleDateString(language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : t('common.notAvailable')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('profile.subtitle')}
        </p>
      </div>

      {/* Identity card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-5">
          <Avatar
            firstName={profile.first_name}
            lastName={profile.last_name}
            username={profile.username}
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{displayName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.username}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Clock size={12} />
              <span>{t('profile.memberSince', { date: memberSince })}</span>
            </div>
            {profile.profile?.department && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 dark:text-blue-400">
                <Building2 size={12} />
                <span>{profile.profile.department}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5"
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.personalInfo')}</h3>

        {/* Name row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('profile.firstName')} icon={User}>
            <input
              type="text"
              name="first_name"
              value={formValues.first_name}
              onChange={handleChange}
              placeholder={t('profile.firstName')}
              className={inputClass}
            />
          </Field>
          <Field label={t('profile.lastName')} icon={User}>
            <input
              type="text"
              name="last_name"
              value={formValues.last_name}
              onChange={handleChange}
              placeholder={t('profile.lastName')}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Email (readonly) */}
        <Field label={t('profile.email')} icon={Mail}>
          <input
            type="email"
            value={profile.email}
            readOnly
            className={readonlyInputClass}
            title={t('profile.emailLocked')}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t('profile.contactAdminEmail')}
          </p>
        </Field>

        <hr className="border-gray-100 dark:border-gray-700" />

        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.workDetails')}</h3>

        {/* Department & Employee ID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('profile.department')} icon={Building2}>
            <input
              type="text"
              name="department"
              value={formValues.department}
              onChange={handleChange}
              placeholder={t('profile.departmentPlaceholder')}
              className={inputClass}
            />
          </Field>
          <Field label={t('profile.employeeId')} icon={IdCard}>
            <input
              type="text"
              name="employee_id"
              value={formValues.employee_id}
              onChange={handleChange}
              placeholder={t('profile.employeeIdPlaceholder')}
              className={inputClass}
            />
          </Field>
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.localeSettings')}</h3>

        {/* Timezone & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('profile.timezone')} icon={Globe}>
            <input
              type="text"
              name="timezone"
              value={formValues.timezone}
              onChange={handleChange}
              placeholder={t('profile.timezonePlaceholder')}
              className={inputClass}
            />
          </Field>
          <Field label={t('common.language')} icon={Globe}>
            <input
              type="text"
              name="language"
              value={formValues.language}
              onChange={handleChange}
              placeholder={t('profile.languagePlaceholder')}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <Save size={16} />
            {updateProfile.isPending ? t('common.saving') : t('common.saveChanges')}
          </button>
        </div>
      </form>

      {/* Read-only account info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.accountInfo')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('profile.username')}</span>
            <p className="text-gray-900 dark:text-white font-medium mt-0.5">@{profile.username}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('profile.accountStatus')}</span>
            <p className="mt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  profile.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {profile.is_active ? t('common.active') : t('common.inactive')}
              </span>
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('profile.memberSince', { date: '' }).trim()}</span>
            <p className="text-gray-900 dark:text-white font-medium mt-0.5">{memberSince}</p>
          </div>
          {profile.last_login && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('profile.lastLogin')}</span>
              <p className="text-gray-900 dark:text-white font-medium mt-0.5">
                {new Date(profile.last_login).toLocaleDateString(language, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
