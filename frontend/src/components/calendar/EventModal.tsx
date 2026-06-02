import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs, { type Dayjs } from 'dayjs'
import { Calendar, Clock, Repeat, Link2, Palette, Bell } from 'lucide-react'
import { Button, Col, DatePicker, Form, Input, Modal, Radio, Row, Select, Space, Switch, TimePicker, Typography } from 'antd'
import type { CalendarEvent } from '@/types'
import { useChecklists } from '@/api/useChecklists'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const { Text } = Typography
const { TextArea } = Input

const DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm'
const DATE_FORMAT = 'YYYY-MM-DD'
const TIME_FORMAT = 'HH:mm'
const DEFAULT_EVENT_COLOR = '#3B82F6'
const DEFAULT_EVENT_TIME = '00:00'
const NO_REMINDER_VALUE = 'none'
const NO_TEMPLATE_VALUE = 'none'

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
  { value: 'custom', labelKey: 'event.typeCustom' },
  { value: 'checklist', labelKey: 'event.typeChecklist' },
  { value: 'todo', labelKey: 'event.typeTodo' },
] satisfies Array<{ value: EventFormData['event_type']; labelKey: MessageKey }>

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
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: createDefaultValues(defaultDate),
  })

  const isAllDay = useWatch({ control, name: 'all_day' })
  const selectedType = useWatch({ control, name: 'event_type' })

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description || '',
        start_datetime: formatDateTime(new Date(event.start_datetime)),
        end_datetime: formatDateTime(new Date(event.end_datetime ?? event.start_datetime)),
        all_day: event.all_day ?? false,
        color: event.color || DEFAULT_EVENT_COLOR,
        reminder_minutes_before: event.reminder_minutes_before ?? null,
        event_type: event.event_type || 'custom',
        checklist_template: event.checklist_template ?? null,
      })
    } else {
      reset(createDefaultValues(defaultDate))
    }
  }, [event, defaultDate, reset])

  if (!isOpen) return null

  const handleFormSubmit = async (data: EventFormData) => {
    await onSubmit(data)
    onClose()
  }

  const eventTypeOptions = eventTypes.map(type => ({
    value: type.value,
    label: t(type.labelKey),
  }))

  const checklistOptions = [
    { value: NO_TEMPLATE_VALUE, label: t('event.selectTemplate') },
    ...(checklistsData?.items ?? []).map(tpl => ({
      value: String(tpl.id),
      label: tpl.name || tpl.title,
    })),
  ]

  return (
    <Modal
      open={isOpen}
      centered
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      title={<ModalTitle description={event ? t('event.updateDetails') : t('event.createDetails')} title={event ? t('event.edit') : t('event.create')} />}
      width={640}
      styles={{ body: { maxHeight: 'calc(90vh - 140px)', overflowY: 'auto', paddingTop: 8 } }}
    >
      <Form layout="vertical" onFinish={handleSubmit(handleFormSubmit)}>
        <Form.Item required label={t('event.title')} validateStatus={errors.title ? 'error' : undefined} help={errors.title?.message}>
          <Controller control={control} name="title" render={({ field }) => <Input {...field} placeholder={t('event.titlePlaceholder')} />} />
        </Form.Item>

        <Form.Item label={t('event.description')} validateStatus={errors.description ? 'error' : undefined} help={errors.description?.message}>
          <Controller control={control} name="description" render={({ field }) => <TextArea {...field} value={field.value ?? ''} autoSize={{ minRows: 3, maxRows: 5 }} placeholder={t('event.descriptionPlaceholder')} />} />
        </Form.Item>

        <Form.Item label={t('event.allDay')}>
          <Controller control={control} name="all_day" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label={<FieldLabel icon={<Calendar size={14} />}>{t('event.start')}</FieldLabel>} validateStatus={errors.start_datetime ? 'error' : undefined} help={errors.start_datetime?.message}>
              <Controller control={control} name="start_datetime" render={({ field }) => <DateTimePicker allDay={isAllDay} onChange={field.onChange} value={field.value} />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={<FieldLabel icon={<Clock size={14} />}>{t('event.end')}</FieldLabel>} validateStatus={errors.end_datetime ? 'error' : undefined} help={errors.end_datetime?.message}>
              <Controller control={control} name="end_datetime" render={({ field }) => <DateTimePicker allDay={isAllDay} onChange={field.onChange} value={field.value} />} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label={t('event.type')}>
          <Controller control={control} name="event_type" render={({ field }) => <Select {...field} options={eventTypeOptions} />} />
        </Form.Item>

        <Form.Item label={<FieldLabel icon={<Palette size={14} />}>{t('event.color')}</FieldLabel>}>
          <Controller control={control} name="color" render={({ field }) => <ColorRadioGroup onChange={field.onChange} t={t} value={field.value ?? DEFAULT_EVENT_COLOR} />} />
        </Form.Item>

        <Form.Item label={<FieldLabel icon={<Bell size={14} />}>{t('event.reminder')}</FieldLabel>}>
          <Controller control={control} name="reminder_minutes_before" render={({ field }) => <ReminderSelect onChange={field.onChange} t={t} value={field.value} />} />
        </Form.Item>

        <Form.Item>
          <Button type="link" icon={<Repeat size={16} />} aria-expanded={showRecurrence} onClick={() => setShowRecurrence(!showRecurrence)}>
            {t('event.recurrence')}
          </Button>
        </Form.Item>

        {selectedType === 'checklist' && (
          <Form.Item label={<FieldLabel icon={<Link2 size={14} />}>{t('event.linkTemplate')}</FieldLabel>}>
            <Controller
              control={control}
              name="checklist_template"
              render={({ field }) => (
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={checklistOptions}
                  value={field.value === null ? NO_TEMPLATE_VALUE : String(field.value)}
                  onChange={value => field.onChange(value === NO_TEMPLATE_VALUE ? null : Number(value))}
                />
              )}
            />
          </Form.Item>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button onClick={onClose}>{t('event.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {event ? t('event.update') : t('event.submitCreate')}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

function createDefaultValues(defaultDate?: Date): EventFormData {
  const date = defaultDate ?? new Date()
  return {
    title: '',
    description: '',
    start_datetime: formatDateTime(date),
    end_datetime: formatDateTime(date),
    all_day: false,
    color: DEFAULT_EVENT_COLOR,
    reminder_minutes_before: null,
    event_type: 'custom',
    checklist_template: null,
  }
}

function formatDateTime(date: Date) {
  return dayjs(date).format(DATE_TIME_FORMAT)
}

function createEventSchema(t: Translate) {
  return eventSchemaBase.extend({
    title: z.string().min(1, t('event.validationTitleRequired')).max(200),
  }).refine((data) => {
    if (!data.start_datetime || !data.end_datetime) return true
    if (data.all_day) return isSameOrLaterDate(data.end_datetime, data.start_datetime)
    return new Date(data.end_datetime) > new Date(data.start_datetime)
  }, { message: t('event.validationEndAfterStart'), path: ['end_datetime'] })
}

function isSameOrLaterDate(endDateTime: string, startDateTime: string) {
  const endDate = dayjs(endDateTime).startOf('day')
  const startDate = dayjs(startDateTime).startOf('day')
  return endDate.isSame(startDate) || endDate.isAfter(startDate)
}

interface ModalTitleProps {
  title: string
  description: string
}

function ModalTitle({ title, description }: ModalTitleProps) {
  return (
    <Space direction="vertical" size={0}>
      <span>{title}</span>
      <Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
        {description}
      </Text>
    </Space>
  )
}

interface FieldLabelProps {
  icon: ReactNode
  children: ReactNode
}

function FieldLabel({ icon, children }: FieldLabelProps) {
  return (
    <Space size={4}>
      {icon}
      <span>{children}</span>
    </Space>
  )
}

interface DateTimePickerProps {
  allDay: boolean
  value: string
  onChange: (value: string) => void
}

function DateTimePicker({ allDay, value, onChange }: DateTimePickerProps) {
  return (
    <Space.Compact style={{ width: '100%' }}>
      <DateInput value={value} onChange={date => onChange(setDatePart(value, date))} />
      {!allDay && <TimeInput value={value} onChange={time => onChange(setTimePart(value, time))} />}
    </Space.Compact>
  )
}

function DateInput({ value, onChange }: { value: string; onChange: (date: Dayjs | null) => void }) {
  return <Form.Item noStyle><InputDatePicker value={getDateValue(value)} onChange={onChange} /></Form.Item>
}

function TimeInput({ value, onChange }: { value: string; onChange: (time: Dayjs | null) => void }) {
  return <Form.Item noStyle><InputTimePicker value={getTimeValue(value)} onChange={onChange} /></Form.Item>
}

function InputDatePicker(props: { value: Dayjs | null; onChange: (date: Dayjs | null) => void }) {
  return <DatePicker {...props} allowClear={false} format={DATE_FORMAT} style={{ width: '100%' }} />
}

function InputTimePicker(props: { value: Dayjs | null; onChange: (time: Dayjs | null) => void }) {
  return <TimePicker {...props} allowClear={false} format={TIME_FORMAT} style={{ width: '100%' }} />
}

function getDateValue(value: string) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

function getTimeValue(value: string) {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

function setDatePart(currentValue: string, date: Dayjs | null) {
  if (!date) return currentValue
  const time = getTimeValue(currentValue)?.format(TIME_FORMAT) ?? DEFAULT_EVENT_TIME
  return `${date.format(DATE_FORMAT)}T${time}`
}

function setTimePart(currentValue: string, time: Dayjs | null) {
  if (!time) return currentValue
  const date = getDateValue(currentValue)?.format(DATE_FORMAT) ?? dayjs().format(DATE_FORMAT)
  return `${date}T${time.format(TIME_FORMAT)}`
}

interface ColorRadioGroupProps {
  value: string
  onChange: (value: string) => void
  t: Translate
}

function ColorRadioGroup({ value, onChange, t }: ColorRadioGroupProps) {
  return (
    <Radio.Group value={value} onChange={event => onChange(event.target.value)}>
      <Space size={[8, 8]} wrap>
        {colorOptions.map(color => <ColorRadioButton key={color.value} color={color} t={t} />)}
      </Space>
    </Radio.Group>
  )
}

function ColorRadioButton({ color, t }: { color: (typeof colorOptions)[number]; t: Translate }) {
  return (
    <Radio.Button value={color.value}>
      <Space size={6}>
        <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color.value }} />
        {t(color.labelKey)}
      </Space>
    </Radio.Button>
  )
}

interface ReminderSelectProps {
  value: number | null
  onChange: (value: number | null) => void
  t: Translate
}

function ReminderSelect({ value, onChange, t }: ReminderSelectProps) {
  const options = reminderOptions.map(option => ({
    value: option.value === null ? NO_REMINDER_VALUE : String(option.value),
    label: t(option.labelKey),
  }))

  return (
    <Select
      options={options}
      value={value === null ? NO_REMINDER_VALUE : String(value)}
      onChange={nextValue => onChange(nextValue === NO_REMINDER_VALUE ? null : Number(nextValue))}
    />
  )
}

export default EventModal
