import { useState } from 'react'
import {
  CheckCircleOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  FireOutlined,
  RiseOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import {
  Row,
  Col,
  DatePicker,
  Button,
  Typography,
  Space,
  Spin,
  Result,
  Progress,
  Avatar,
  Tag,
  message,
  Card,
  Statistic,
} from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Dayjs } from 'dayjs'
import { useDashboardStats } from '@/api/useDashboardStats'
import {
  useStatsByDateRange,
  useExportStatsCSV,
} from '@/api/useCompletionData'
import { useI18n } from '@/i18n'
import {
  ActivityFeedSection,
  ActivityHeatmapSection,
  CompletionChartSection,
  CompletionTrendSection,
  QuickActionsFAB,
} from '@/components/dashboard/DashboardSections'

dayjs.extend(relativeTime)

const { Title, Text, Paragraph } = Typography
const { RangePicker } = DatePicker

function getDefaultDateRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(30, 'day'), dayjs()]
}

/* ------------------------------------------------------------------ */
/*  Main DashboardPage                                                */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()
  const { t } = useI18n()
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(
    () => getDefaultDateRange()
  )

  const startDate = dateRange[0].format('YYYY-MM-DD')
  const endDate = dateRange[1].format('YYYY-MM-DD')

  const { data: trendData } = useStatsByDateRange(startDate, endDate)
  const exportCSV = useExportStatsCSV()

  const [messageApi, contextHolder] = message.useMessage()

  const handleExport = () => {
    exportCSV.mutate(
      { startDate, endDate },
      {
        onSuccess: () => messageApi.success(t('dashboard.exportSuccess')),
        onError: () => messageApi.error(t('dashboard.exportError')),
      }
    )
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 480,
        }}
      >
        <Spin size="large" tip={t('dashboard.loading')}>
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Result
        status="warning"
        title={t('dashboard.errorTitle')}
        subTitle={t('dashboard.errorSubtitle')}
        style={{ padding: 48 }}
      />
    )
  }

  const totalChecklists = stats.total_checklists ?? stats.total_templates ?? 0
  const completedChecklists = stats.completed_checklists ?? stats.completed_today ?? 0
  const checklistPercent =
    totalChecklists > 0
      ? Math.round((completedChecklists / totalChecklists) * 100)
      : 0
  const totalTodos = stats.total_todos ?? 0
  const completedTodos = stats.completed_todos ?? 0
  const todoPercent =
    totalTodos > 0
      ? Math.round((completedTodos / totalTodos) * 100)
      : 0

  return (
    <div style={{ padding: '0 0 48px' }}>
      {contextHolder}

      {/* ---- Header ---- */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 24px' } }}>
        <Row justify="space-between" align="middle" gutter={[16, 12]}>
          <Col xs={24} sm={16}>
            <Title level={3} style={{ margin: 0 }}>
              {t('dashboard.title')}
            </Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              {t('dashboard.subtitle')}
            </Paragraph>
          </Col>
          <Col xs={24} sm={24}>
            <Space wrap>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]])
                  }
                }}
                format="YYYY-MM-DD"
                size="middle"
                allowClear={false}
              />
              <Button
                className="dark:!text-gray-100"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exportCSV.isPending}
              >
                {t('dashboard.exportCsv')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ---- Stats Row ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            <Statistic
              title={t('dashboard.completedChecklists')}
              value={stats.completed_checklists ?? stats.completed_today ?? 0}
              prefix={
                <Avatar
                  style={{ backgroundColor: '#f6ffed' }}
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  size={44}
                />
              }
            />
            <Space size={4} style={{ marginTop: 8 }}>
              <Tag color={(stats.weekly_change ?? 0) >= 0 ? 'success' : 'error'}>
                {(stats.weekly_change ?? 0) >= 0 ? '+' : ''}
                {stats.weekly_change ?? 0}%
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.vsLastWeek')}
              </Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            <Statistic
              title={t('dashboard.totalTodos')}
              value={stats.total_todos ?? 0}
              prefix={
                <Avatar
                  style={{ backgroundColor: '#e6f4ff' }}
                  icon={<UnorderedListOutlined style={{ color: '#1677ff' }} />}
                  size={44}
                />
              }
            />
            <Space size={4} style={{ marginTop: 8 }}>
              <Tag color="processing">+8%</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.vsLastWeek')}
              </Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            <Statistic
              title={t('dashboard.upcomingEvents')}
              value={stats.upcoming_events ?? stats.overdue_instances ?? 0}
              prefix={
                <Avatar
                  style={{ backgroundColor: '#f9f0ff' }}
                  icon={<CalendarOutlined style={{ color: '#722ed1' }} />}
                  size={44}
                />
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            <Statistic
              title={t('dashboard.currentStreak')}
              value={stats.streak_days ?? stats.active_instances ?? 0}
              suffix={t('dashboard.days')}
              prefix={
                <Avatar
                  style={{ backgroundColor: '#fff7e6' }}
                  icon={<FireOutlined style={{ color: '#fa8c16' }} />}
                  size={44}
                />
              }
            />
            <Space size={4} style={{ marginTop: 8 }}>
              <Tag color="warning">+5%</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.vsLastWeek')}
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ---- Charts Row 1 ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <RiseOutlined />
                <span>{t('dashboard.completionTrends')}</span>
              </Space>
            }
            style={{ height: '100%' }}
          >
            <CompletionChartSection />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.completionTrend')} style={{ height: '100%' }}>
            <CompletionTrendSection data={trendData ?? []} />
          </Card>
        </Col>
      </Row>

      {/* ---- Charts Row 2 ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={(
              <Space direction="vertical" size={0}>
                <span>{t('dashboard.activityHeatmap')}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('dashboard.activitySubtitle')}
                </Text>
              </Space>
            )}
            style={{ height: '100%' }}
          >
            <ActivityHeatmapSection />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.progressOverview')} style={{ height: '100%' }}>
            <Row
              justify="center"
              align="middle"
              gutter={[48, 24]}
              style={{ padding: '24px 0' }}
            >
              <Col style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={checklistPercent}
                  size={100}
                  strokeWidth={8}
                  strokeColor="#52c41a"
                  format={(pct) => (
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{pct}%</span>
                  )}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">{t('dashboard.checklists')}</Text>
                </div>
              </Col>
              <Col style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={todoPercent}
                  size={100}
                  strokeWidth={8}
                  strokeColor="#1677ff"
                  format={(pct) => (
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{pct}%</span>
                  )}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">{t('dashboard.todos')}</Text>
                </div>
              </Col>
              <Col style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={stats.completion_rate ?? stats.avg_completion_rate ?? 0}
                  size={100}
                  strokeWidth={8}
                  strokeColor="#722ed1"
                  format={(pct) => (
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{pct}%</span>
                  )}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">{t('dashboard.overall')}</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ---- Recent Activity ---- */}
      <Card title={t('dashboard.recentActivity')} style={{ marginBottom: 16 }}>
        <ActivityFeedSection limit={8} />
      </Card>

      {/* ---- Quick Actions FAB ---- */}
      <QuickActionsFAB />
    </div>
  )
}
