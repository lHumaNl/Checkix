import { useState, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { X, Calendar, Clock, Repeat, Link2, Palette, Bell } from 'lucide-react'
import type { CalendarEvent } from '@/types'
import { useChecklists } from '@/api/useChecklists'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const eventSchemaBase = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  start_datetime: z.string(),
  end_datetime: z.string(),
  all_day: z.boolean(),
  color: z.string().optional(),
  reminder_minutes_before: z.number().nullable(),
  event_type: z.enum(['checklist', 'todo', 'custom']),
  checklist_template: z.number().nullable(),
})

type EventFormData = z.infer<typeof eventSchemaBase>
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event?: CalendarEvent | null
  onSubmit: (data: EventFormData) => Promise<void>
  defaultDate?: Date
}

const eventTypes = [
  { value: 'custom', labelKey: 'event.typeCustom', color: 'purple' },
  { value: 'checklist', labelKey: 'event.typeChecklist', color: 'blue' },
  { value: 'todo', labelKey: 'event.typeTodo', color: 'green' },
] satisfies Array<{ value: EventFormData['event_type']; labelKey: MessageKey; color: string }>

const colorOptions = [
  { value: '#3B82F6', labelKey: 'event.colorBlue' },
  { value: '#10B981', labelKey: 'event.colorGreen' },
  { value: '#F59E0B', labelKey: 'event.colorYellow' },
  { value: '#EF4444', labelKey: 'event.colorRed' },
  { value: '#8B5CF6', labelKey: 'event.colorPurple' },
  { value: '#EC4899', labelKey: 'event.colorPink' },
] satisfies Array<{ value: string; labelKey: MessageKey }>

const reminderOptions = [
  { value: null, labelKey: 'event.noReminder' },
  { value: 5, labelKey: 'event.fiveMinutes' },
  { value: 15, labelKey: 'event.fifteenMinutes' },
  { value: 30, labelKey: 'event.thirtyMinutes' },
  { value: 60, labelKey: 'event.oneHour' },
  { value: 1440, labelKey: 'event.oneDay' },
] satisfies Array<{ value: number | null; labelKey: MessageKey }>

export function EventModal({ isOpen, onClose, event, onSubmit, defaultDate }: EventModalProps) {
  const [showRecurrence, setShowRecurrence] = useState(false)
  const { t } = useI18n()
  const validationSchema = useMemo(() => createEventSchema(t), [t])
  const { data: checklistsData } = useChecklists({ status: 'active' })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      title: '',
      description: '',
      start_datetime: format(defaultDate ?? new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_datetime: format(defaultDate ?? new Date(), "yyyy-MM-dd'T'HH:mm"),
      all_day: false,
      color: '#3B82F6',
      reminder_minutes_before: null,
      event_type: 'custom',
      checklist_template: null,
    },
  })

  const isAllDay = useWatch({ control, name: 'all_day' })
  const selectedType = useWatch({ control, name: 'event_type' })
  const selectedColor = useWatch({ control, name: 'color' })

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description || '',
        start_datetime: format(new Date(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
        end_datetime: format(new Date(event.end_datetime ?? event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
        all_day: event.all_day ?? false,
        color: event.color || '#3B82F6',
        reminder_minutes_before: event.reminder_minutes_before ?? null,
        event_type: event.event_type || 'custom',
        checklist_template: event.checklist_template ?? null,
      })
    } else if (defaultDate) {
      reset({
        title: '',
        description: '',
        start_datetime: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        end_datetime: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        all_day: false,
        color: '#3B82F6',
        reminder_minutes_before: null,
        event_type: 'custom',
        checklist_template: null,
      })
    }
  }, [event, defaultDate, reset])

  if (!isOpen) return null

  const handleFormSubmit = async (data: EventFormData) => {
    await onSubmit(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="event-modal-title" aria-describedby="event-modal-description">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 id="event-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {event ? t('event.edit') : t('event.create')}
            </h2>
            <p id="event-modal-description" className="text-sm text-gray-500 dark:text-gray-400">
              {event ? t('event.updateDetails') : t('event.createDetails')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('event.title')} *
            </label>
            <input
              {...register('title')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('event.titlePlaceholder')}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('event.description')}
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder={t('event.descriptionPlaceholder')}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="all_day"
              {...register('all_day')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="all_day" className="text-sm text-gray-700 dark:text-gray-300">
              {t('event.allDay')}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 <div className="flex items-center gap-1">
                   <Calendar size={14} />
                    {t('event.start')}
                 </div>
               </label>
               <input
                 type={isAllDay ? 'date' : 'datetime-local'}
                 {...register('start_datetime')}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 <div className="flex items-center gap-1">
                   <Clock size={14} />
                    {t('event.end')}
                 </div>
               </label>
               <input
                 type={isAllDay ? 'date' : 'datetime-local'}
                 {...register('end_datetime')}
                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               />
             </div>
           </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('event.type')}
            </label>
            <div className="flex gap-2">
              {eventTypes.map((type) => {
                const isSelected = selectedType === type.value
                const colorClasses = {
                  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
                  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                  green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                }
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue('event_type', type.value as EventFormData['event_type'])}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isSelected
                        ? colorClasses[type.color as keyof typeof colorClasses]
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t(type.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-1">
                <Palette size={14} />
                {t('event.color')}
              </div>
            </label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setValue('color', color.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    selectedColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={t(color.labelKey)}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <div className="flex items-center gap-1">
                <Bell size={14} />
                {t('event.reminder')}
              </div>
            </label>
          <select
                {...register('reminder_minutes_before', {
                  setValueAs: (value) => value === '' ? null : Number(value)
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {reminderOptions.map((option) => (
                  <option key={option.labelKey} value={option.value ?? ''}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowRecurrence(!showRecurrence)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Repeat size={16} />
              {t('event.recurrence')}
            </button>
          </div>

          {selectedType === 'checklist' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <div className="flex items-center gap-1">
                  <Link2 size={14} />
                  {t('event.linkTemplate')}
                </div>
              </label>
              <select
                {...register('checklist_template', {
                  setValueAs: (value) => value === '' ? null : Number(value)
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('event.selectTemplate')}</option>
                {(checklistsData?.items ?? []).map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name || tpl.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              {t('event.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              {event ? t('event.update') : t('event.submitCreate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function createEventSchema(t: Translate) {
  return eventSchemaBase.extend({
    title: z.string().min(1, t('event.validationTitleRequired')).max(200),
  }).refine((data) => {
    if (!data.start_datetime || !data.end_datetime) return true
    return new Date(data.end_datetime) > new Date(data.start_datetime)
  }, { message: t('event.validationEndAfterStart'), path: ['end_datetime'] })
}

export default EventModal
