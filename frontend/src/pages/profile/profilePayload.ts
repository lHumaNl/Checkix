import type { UserMeUpdate } from '@/api/useProfile'

export interface ProfileFormValues {
  department: string
  employee_id: string
  timezone: string
  language?: string
}

type EditableProfileKey = 'department' | 'employee_id' | 'timezone' | 'language'

export function buildUpdatePayload(values: ProfileFormValues): UserMeUpdate {
  const payload: UserMeUpdate = {}
  setProfileField(payload, 'department', values.department)
  setProfileField(payload, 'employee_id', values.employee_id)
  setProfileField(payload, 'timezone', values.timezone)
  setProfileField(payload, 'language', values.language)
  return payload
}

function setProfileField(payload: UserMeUpdate, key: EditableProfileKey, value?: string) {
  if (value) payload[key] = value
}
