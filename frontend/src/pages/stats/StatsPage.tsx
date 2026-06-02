import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AppstoreOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  RiseOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, DatePicker, Empty, Flex, Progress, Skeleton, Space, Statistic, Table, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useOverallStats, useTopTemplates, useStatsByCategory, useRecentStats } from '@/api/useStats'
import { useExportStatsCSV } from '@/api/useCompletionData'
import { useI18n } from '@/i18n'

const { RangePicker } = DatePicker
const { Text, Title } = Typography

const DATE_FORMAT = 'YYYY-MM-DD'
const EMPTY_VALUE = '—'
const HIGH_RATE_THRESHOLD = 80
const MEDIUM_RATE_THRESHOLD = 50
const RECENT_ACTIVITY_LIMIT = 14
const PRESET_DAYS = [7, 30, 90]

type RangePickerValue = [Dayjs | null, Dayjs | null] | null

interface RecentDayRow {
  completed: number
  created: number
  date: string
  rate: number | null
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number
  sub?: string
  suffix?: string
}

function getDefaultRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(30, 'day'), dayjs()]
}

function formatDate(date: Dayjs): string {
  return date.format(DATE_FORMAT)
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function getRateTextType(rate: number | null): 'secondary' | 'success' | 'warning' | undefined {
  if (rate === null) return undefined
  if (rate >= HIGH_RATE_THRESHOLD) return 'success'
  if (rate >= MEDIUM_RATE_THRESHOLD) return 'warning'
  return 'secondary'
}

function StatCard({ icon, label, sub, suffix, value }: StatCardProps) {
  return (
    <Card style={{ height: '100%' }}>
      <Statistic prefix={icon} title={label} value={value} suffix={suffix} />
      {sub && <Text type="secondary">{sub}</Text>}
    </Card>
  )
}

function StatSkeletonGrid() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
        </Card>
      ))}
    </div>
  )
}

export function StatsPage() {
  const { t } = useI18n()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => getDefaultRange())
  const [appliedRange, setAppliedRange] = useState<[Dayjs, Dayjs]>(() => getDefaultRange())
  const appliedStart = formatDate(appliedRange[0])
  const appliedEnd = formatDate(appliedRange[1])

  const { data: overall, error: overallError, isLoading: overallLoading } = useOverallStats(appliedStart, appliedEnd)
  const { data: categoryStats, error: categoryError, isLoading: categoryLoading } = useStatsByCategory(appliedStart, appliedEnd)
  const { data: recentStats, error: recentError, isLoading: recentLoading } = useRecentStats(30)
  const { data: topTemplatesData, error: topError, isLoading: topLoading } = useTopTemplates(appliedStart, appliedEnd)
  const exportMutation = useExportStatsCSV()
  const hasError = Boolean(overallError || categoryError || recentError || topError)

  function applyRange() {
    if (dateRange[0].isAfter(dateRange[1], 'day')) return
    setAppliedRange(dateRange)
  }

  function handleRangeChange(value: RangePickerValue) {
    if (!value?.[0] || !value[1]) return
    setDateRange([value[0], value[1]])
  }

  function setPreset(days: number) {
    const nextRange: [Dayjs, Dayjs] = [dayjs().subtract(days, 'day'), dayjs()]
    setDateRange(nextRange)
    setAppliedRange(nextRange)
  }

  const topTemplates = topTemplatesData ?? []

  const categoryData = (categoryStats ?? [])
    .filter(c => c.total_instances && c.total_instances > 0)
    .sort((a, b) => (b.total_instances ?? 0) - (a.total_instances ?? 0))

  const recentByDay = (recentStats ?? []).reduce<Record<string, { created: number; completed: number }>>(
    (acc, s) => {
      const key = s.date
      if (!acc[key]) acc[key] = { created: 0, completed: 0 }
      acc[key].created += s.instances_created
      acc[key].completed += s.instances_completed
      return acc
    },
    {}
  )
  const recentRows: RecentDayRow[] = Object.entries(recentByDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(([date, vals]) => ({
      date,
      created: vals.created,
      completed: vals.completed,
      rate: vals.created > 0 ? clampPercent((vals.completed / vals.created) * 100) : null,
    }))

  const recentColumns: TableColumnsType<RecentDayRow> = [
    { title: t('stats.date'), dataIndex: 'date', key: 'date' },
    { title: t('stats.created'), dataIndex: 'created', key: 'created', align: 'right' },
    { title: t('stats.completed'), dataIndex: 'completed', key: 'completed', align: 'right' },
    {
      title: t('stats.rate'),
      dataIndex: 'rate',
      key: 'rate',
      align: 'right',
      render: (rate: number | null) => (
        <Text strong={rate !== null} type={getRateTextType(rate)}>
          {rate === null ? EMPTY_VALUE : `${rate}%`}
        </Text>
      ),
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Flex align="center" gap="middle" justify="space-between" wrap>
        <Title level={2} style={{ margin: 0 }}>{t('stats.title')}</Title>
        <Button
          icon={<DownloadOutlined />}
          loading={exportMutation.isPending}
          onClick={() => exportMutation.mutate({ startDate: appliedStart, endDate: appliedEnd })}
          type="primary"
        >
          {exportMutation.isPending ? t('stats.exporting') : t('dashboard.exportCsv')}
        </Button>
      </Flex>

      <Card>
        <Flex align="center" gap="small" wrap>
          <RangePicker
            allowClear={false}
            format={DATE_FORMAT}
            onChange={handleRangeChange}
            value={dateRange}
          />
          <Button onClick={applyRange} type="primary">{t('common.apply')}</Button>
          <Space wrap>
            {PRESET_DAYS.map(days => (
              <Button key={days} onClick={() => setPreset(days)}>
                {days}d
              </Button>
            ))}
          </Space>
        </Flex>
      </Card>

      {hasError && <Alert message={t('common.failedRefresh')} showIcon type="error" />}

      {overallLoading ? (
        <StatSkeletonGrid />
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <StatCard
            icon={<AppstoreOutlined />}
            label={t('stats.templatesUsed')}
            value={overall?.total_templates ?? 0}
          />
          <StatCard
            icon={<CheckCircleOutlined />}
            label={t('stats.instancesCreated')}
            value={overall?.total_instances_created ?? 0}
            sub={t('stats.inSelectedPeriod')}
          />
          <StatCard
            icon={<RiseOutlined />}
            label={t('stats.completed')}
            value={overall?.total_instances_completed ?? 0}
          />
          <StatCard
            icon={<BarChartOutlined />}
            label={t('stats.completionRate')}
            value={overall?.avg_completion_rate ?? 0}
            suffix="%"
          />
        </div>
      )}

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <Card title={<Space><TrophyOutlined />{t('stats.topTemplates')}</Space>}>
          {topLoading ? (
            <Skeleton active paragraph={{ rows: 5 }} title={false} />
          ) : topTemplates.length === 0 ? (
            <Empty description={t('stats.noPeriodData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
              {topTemplates.map((template, index) => (
                <div key={template.template_id}>
                  <Flex gap="small" justify="space-between" wrap>
                    <Text strong>#{index + 1} {template.template_name}</Text>
                    <Text type="secondary">{t('stats.runs', { count: template.total_instances })}</Text>
                  </Flex>
                  <Progress percent={clampPercent(template.completion_rate)} size="small" />
                </div>
              ))}
            </Space>
          )}
        </Card>

        <Card title={<Space><BarChartOutlined />{t('stats.byCategory')}</Space>}>
          {categoryLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          ) : categoryData.length === 0 ? (
            <Empty description={t('stats.noCategoryData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
              {categoryData.map(category => {
                const total = category.total_instances ?? 0
                const completed = category.total_completed ?? 0
                const rate = total > 0 ? (completed / total) * 100 : 0
                const label = category.community_template__category ?? t('stats.uncategorized')
                return (
                  <div key={label}>
                    <Flex justify="space-between" wrap>
                      <Text strong>{label}</Text>
                      <Text type="secondary">{completed}/{total}</Text>
                    </Flex>
                    <Progress percent={clampPercent(rate)} size="small" />
                  </div>
                )
              })}
            </Space>
          )}
        </Card>
      </div>

      <Card title={<Space><ClockCircleOutlined />{t('stats.recentActivity')}</Space>}>
        {recentLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : recentRows.length === 0 ? (
          <Empty description={t('stats.noRecentActivity')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table columns={recentColumns} dataSource={recentRows} pagination={false} rowKey="date" size="small" />
        )}
      </Card>
    </Space>
  )
}
