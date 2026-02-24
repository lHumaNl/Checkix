import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { X, Calendar, Clock, Repeat, Link2, Palette, Bell } from 'lucide-react'
import type { CalendarEvent } from '@/types'
import { useChecklists } from '@/api/useChecklists'

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  start_datetime: z.string(),
  end_datetime: z.string(),
  all_day: z.boolean(),
  color: z.string().optional(),
  reminder_minutes_before: z.number().nullable(),
  event_type: z.enum(['checklist', 'todo', 'custom']),
  checklist_template: z.number().nullable(),
}).refine((data) => {
  if (data.start_datetime && data.end_datetime) {
    return new Date(data.end_datetime) > new Date(data.start_datetime)
  }
  return true
}, { message: 'End time must be after start time', path: ['end_datetime'] })

type EventFormData = z.infer<typeof eventSchema>

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event?: CalendarEvent | null
  onSubmit: (data: EventFormData) => Promise<void>
  defaultDate?: Date
}

const eventTypes = [
  { value: 'custom', label: 'Custom Event', color: 'purple' },
  { value: 'checklist', label: 'Checklist', color: 'blue' },
  { value: 'todo', label: 'Todo', color: 'green' },
]

const colorOptions = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
]

const reminderOptions = [
  { value: null, label: 'No reminder' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
]

export function EventModal({ isOpen, onClose, event, onSubmit, defaultDate }: EventModalProps) {
  const [showRecurrence, setShowRecurrence] = useState(false)
  const { data: checklistsData } = useChecklists({ status: 'active' })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
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

  const isAllDay = watch('all_day')
  const selectedType = watch('event_type')
  const selectedColor = watch('color')

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description || '',
        start_datetime: format(new Date(event.start_datetime || event.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_datetime: format(new Date(event.end_datetime || event.end_time), "yyyy-MM-dd'T'HH:mm"),
        all_day: event.all_day ?? event.is_all_day ?? false,
        color: event.color || '#3B82F6',
        reminder_minutes_before: event.reminder_minutes_before ?? event.reminder_minutes ?? null,
        event_type: event.event_type || 'custom',
        checklist_template: event.checklist_template ?? event.template_id ?? null,
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
              {event ? 'Edit Event' : 'New Event'}
            </h2>
            <p id="event-modal-description" className="text-sm text-gray-500 dark:text-gray-400">
              {event ? 'Update the event details below.' : 'Fill in the details to create a new event.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              {...register('title')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Event description"
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
              All day event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 <div className="flex items-center gap-1">
                   <Calendar size={14} />
                   Start
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
                   End
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
              Event Type
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
                    {type.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-1">
                <Palette size={14} />
                Color
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
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <div className="flex items-center gap-1">
                <Bell size={14} />
                Reminder
              </div>
            </label>
          <select
                {...register('reminder_minutes_before', {
                  setValueAs: (value) => value === '' ? null : Number(value)
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {reminderOptions.map((option) => (
                  <option key={option.label} value={option.value ?? ''}>
                    {option.label}
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
              Add recurrence (coming soon)
            </button>
          </div>

          {selectedType === 'checklist' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <div className="flex items-center gap-1">
                  <Link2 size={14} />
                  Link to Template
                </div>
              </label>
              <select
                {...register('checklist_template', {
                  setValueAs: (value) => value === '' ? null : Number(value)
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a template</option>
                {(checklistsData?.results ?? []).map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EventModal
