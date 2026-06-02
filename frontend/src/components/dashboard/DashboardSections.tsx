import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Avatar, FloatButton, List, Result, Typography } from 'antd'
import dayjs from 'dayjs'
import { useActivityFeed } from '@/api/useActivityFeed'
import { useCompletionChart, useHeatmapData } from '@/api/useCompletionData'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ActivityItem } from '@/types/dashboard'

const { Text } = Typography
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string
type ChartPoint = { label: string; value: number }
type TrendChartPoint = { date: string; value: number; type: string }

const SVG_WIDTH = 640
const SVG_HEIGHT = 260
const SVG_PADDING = 28

export function ActivityFeedSection({ limit = 8 }: { limit?: number }) {
  const { data, isLoading, error } = useActivityFeed(1, limit)
  const { language, t } = useI18n()
  const activities = data?.items ?? []

  const typeIconMap: Record<ActivityItem['type'], React.ReactNode> = {
    checklist: <CheckCircleOutlined />,
    todo: <UnorderedListOutlined />,
    event: <CalendarOutlined />,
    achievement: <TrophyOutlined />,
  }

  const typeColorMap: Record<ActivityItem['type'], string> = {
    checklist: '#52c41a',
    todo: '#1677ff',
    event: '#722ed1',
    achievement: '#faad14',
  }

  const actionIconMap: Record<ActivityItem['action'], React.ReactNode> = {
    created: <PlusOutlined style={{ fontSize: 10 }} />,
    completed: <CheckOutlined style={{ fontSize: 10 }} />,
    updated: <EditOutlined style={{ fontSize: 10 }} />,
    deleted: <DeleteOutlined style={{ fontSize: 10 }} />,
  }

  if (error) {
    return <Result status="warning" title={t('dashboard.activityError')} style={{ padding: 24 }} />
  }

  return (
    <List
      loading={isLoading}
      dataSource={activities}
      locale={{ emptyText: t('dashboard.noActivity') }}
      renderItem={(item: ActivityItem) => (
        <List.Item style={{ padding: '8px 0' }}>
          <List.Item.Meta
            avatar={
              <div style={{ position: 'relative' }}>
                <Avatar icon={typeIconMap[item.type]} style={{ backgroundColor: typeColorMap[item.type] }} size={36} />
                <span className="dashboard-activity-action-icon">
                  {actionIconMap[item.action]}
                </span>
              </div>
            }
            title={<Text strong ellipsis style={{ maxWidth: 320 }}>{item.title}</Text>}
            description={item.description || undefined}
          />
          <Text type="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
            {dayjs(item.timestamp).locale(getDayjsLocale(language)).fromNow()}
          </Text>
        </List.Item>
      )}
    />
  )
}

export function CompletionChartSection() {
  const { data, isLoading, error } = useCompletionChart()
  const { isDark } = useTheme()
  const { t } = useI18n()
  const chartData = useMemo(
    () => (data ?? []).map((item) => ({ label: item.label ?? item.date, value: item.value })),
    [data]
  )

  if (error || (!isLoading && !data)) {
    return <Result status="warning" title={t('dashboard.chartError')} style={{ padding: 24 }} />
  }

  if (isLoading) return <ChartLoader height={SVG_HEIGHT} />
  if (chartData.length === 0) return <EmptyChartState message={t('dashboard.noData')} />
  return <AreaChartSvg data={chartData} color={isDark ? '#60a5fa' : '#1677ff'} />
}

export function CompletionTrendSection({ data }: {
  data: Array<{ date: string; instances_created: number; instances_completed: number }>
}) {
  const { isDark } = useTheme()
  const { t } = useI18n()
  const transformed = useMemo(() => createTrendSeries(data, t), [data, t])

  if (!data || data.length === 0) {
    return <EmptyChartState message={t('dashboard.noData')} />
  }

  return <LineChartSvg data={transformed} isDark={isDark} />
}

export function ActivityHeatmapSection() {
  const { data, isLoading, error } = useHeatmapData()
  const { isDark } = useTheme()
  const { language, t } = useI18n()
  const heatmapData = useMemo(
    () => (data ?? []).map((item) => ({ date: item.date, value: item.count })),
    [data]
  )

  if (error || (!isLoading && !data)) {
    return <Result status="warning" title={t('dashboard.heatmapError')} style={{ padding: 24 }} />
  }

  if (isLoading) return <ChartLoader height={160} />

  return (
    <div aria-label={t('dashboard.activityHeatmap')} role="img">
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">
        {heatmapData.map((item) => (
          <span
            key={item.date}
            title={`${dayjs(item.date).locale(getDayjsLocale(language)).format('YYYY-MM-DD')}: ${t('dashboard.activityCount', { count: item.value })}`}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: getHeatmapColor(item.value, isDark) }}
          />
        ))}
      </div>
      <HeatmapLegend isDark={isDark} t={t} />
    </div>
  )
}

export function QuickActionsFAB() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <FloatButton.Group trigger="click" type="primary" icon={<PlusOutlined />} tooltip={t('dashboard.quickActions')} style={{ right: 24, bottom: 24 }}>
      <FloatButton icon={<CheckCircleOutlined />} tooltip={t('dashboard.newChecklist')} onClick={() => navigate('/checklists')} />
      <FloatButton icon={<UnorderedListOutlined />} tooltip={t('dashboard.newTodo')} onClick={() => navigate('/todos')} />
      <FloatButton icon={<CalendarOutlined />} tooltip={t('dashboard.newEvent')} onClick={() => navigate('/calendar')} />
    </FloatButton.Group>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <Text type="secondary">{message}</Text>
    </div>
  )
}

function ChartLoader({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  )
}

function AreaChartSvg({ data, color }: { data: ChartPoint[]; color: string }) {
  const points = useMemo(() => createSvgPoints(data), [data])

  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  const baseline = SVG_HEIGHT - SVG_PADDING
  const area = `${line} ${points.at(-1)?.x},${baseline} ${points[0].x},${baseline}`

  return (
    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="h-[260px] w-full">
      <polygon points={area} fill={color} opacity="0.14" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="3" />
      {points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="3" fill={color} />)}
    </svg>
  )
}

function LineChartSvg({ data, isDark }: { data: TrendChartPoint[]; isDark: boolean }) {
  const colors = isDark ? ['#60a5fa', '#34d399'] : ['#1677ff', '#52c41a']
  const series = useMemo(() => groupSeries(data), [data])
  const maxValue = Math.max(1, ...data.map((item) => item.value))

  return (
    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="h-[280px] w-full">
      {series.map(({ name, items }, index) => (
        <polyline
          key={name}
          points={createSvgPoints(items, maxValue).map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={colors[index] ?? colors[0]}
          strokeWidth="3"
        />
      ))}
    </svg>
  )
}

function HeatmapLegend({ isDark, t }: { isDark: boolean; t: Translate }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span>{t('dashboard.weekdayMon')}</span>
      {[0, 1, 3, 5, 8].map((value) => (
        <span key={value} className="h-3 w-3 rounded-sm" style={{ backgroundColor: getHeatmapColor(value, isDark) }} />
      ))}
    </div>
  )
}

function createTrendSeries(data: Array<{ date: string; instances_created: number; instances_completed: number }>, t: Translate) {
  const created = data.map((item) => ({ date: item.date, value: item.instances_created, type: t('dashboard.trendCreated') }))
  const completed = data.map((item) => ({ date: item.date, value: item.instances_completed, type: t('dashboard.trendCompleted') }))
  return [...created, ...completed]
}

function createSvgPoints(data: ChartPoint[], maxValue?: number) {
  const max = maxValue ?? Math.max(1, ...data.map((item) => item.value))
  const step = data.length > 1 ? (SVG_WIDTH - SVG_PADDING * 2) / (data.length - 1) : 0

  return data.map((item, index) => ({
    label: item.label,
    x: SVG_PADDING + index * step,
    y: SVG_HEIGHT - SVG_PADDING - (item.value / max) * (SVG_HEIGHT - SVG_PADDING * 2),
  }))
}

function groupSeries(data: TrendChartPoint[]) {
  const series = new Map<string, ChartPoint[]>()

  data.forEach((item) => {
    series.set(item.type, [...(series.get(item.type) ?? []), { label: item.date, value: item.value }])
  })

  return Array.from(series.entries()).map(([name, items]) => ({ name, items }))
}

function getHeatmapColor(value: number, isDark: boolean) {
  const colors = isDark
    ? ['#1f2937', '#1e3a8a', '#1d4ed8', '#2563eb', '#60a5fa']
    : ['#f3f4f6', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb']
  const index = Math.min(colors.length - 1, Math.ceil(value / 2))
  return colors[index]
}

function getDayjsLocale(language: string) {
  return language === 'zh' ? 'zh-cn' : language
}
