import { useState, useMemo } from 'react'
import {
  CheckCircleOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
  FireOutlined,
  RiseOutlined,
  DownloadOutlined,
  PlusOutlined,
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
  TrophyOutlined,
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
  List,
  Avatar,
  Tag,
  FloatButton,
  message,
} from 'antd'
import { ProCard, StatisticCard } from '@ant-design/pro-components'
import { Line, Area, Heatmap as HeatmapChart } from '@ant-design/charts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useDashboardStats } from '@/api/useDashboardStats'
import {
  useStatsByDateRange,
  useExportStatsCSV,
  useCompletionChart,
  useHeatmapData,
} from '@/api/useCompletionData'
import { useActivityFeed } from '@/api/useActivityFeed'
import type { ActivityItem } from '@/types/dashboard'

dayjs.extend(relativeTime)

const { Title, Text, Paragraph } = Typography
const { RangePicker } = DatePicker

function getDefaultDateRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(30, 'day'), dayjs()]
}

/* ------------------------------------------------------------------ */
/*  Inline sub-components                                             */
/* ------------------------------------------------------------------ */

/** Recent Activity list rendered with antd List */
function ActivityFeedSection({ limit = 8 }: { limit?: number }) {
  const { data, isLoading, error } = useActivityFeed(1, limit)
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
    return (
      <Result
        status="warning"
        title="Unable to load activity feed"
        style={{ padding: 24 }}
      />
    )
  }

  return (
    <List
      loading={isLoading}
      dataSource={activities}
      locale={{ emptyText: 'No recent activity' }}
      renderItem={(item: ActivityItem) => (
        <List.Item style={{ padding: '8px 0' }}>
          <List.Item.Meta
            avatar={
              <div style={{ position: 'relative' }}>
                <Avatar
                  icon={typeIconMap[item.type]}
                  style={{ backgroundColor: typeColorMap[item.type] }}
                  size={36}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 16,
                    height: 16,
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 1px #d9d9d9',
                    fontSize: 10,
                  }}
                >
                  {actionIconMap[item.action]}
                </span>
              </div>
            }
            title={
              <Text strong ellipsis style={{ maxWidth: 320 }}>
                {item.title}
              </Text>
            }
            description={item.description || undefined}
          />
          <Text type="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
            {dayjs(item.timestamp).fromNow()}
          </Text>
        </List.Item>
      )}
    />
  )
}

/** Completion area chart using @ant-design/charts */
function CompletionChartSection() {
  const { data, isLoading, error } = useCompletionChart()

  if (error || (!isLoading && !data)) {
    return (
      <Result
        status="warning"
        title="Unable to load chart data"
        style={{ padding: 24 }}
      />
    )
  }

  const config = {
    data: data ?? [],
    xField: 'label',
    yField: 'value',
    smooth: true,
    height: 260,
    loading: isLoading,
    style: {
      fill: 'linear-gradient(-90deg, #1677ff 0%, rgba(22, 119, 255, 0.05) 100%)',
      strokeWidth: 2,
      stroke: '#1677ff',
    },
    axis: {
      x: {
        labelAutoRotate: false,
      },
    },
    tooltip: {
      title: 'label',
    },
  }

  return <Area {...config} />
}

/** Completion trend line chart (Created vs Completed) */
function CompletionTrendSection({
  data,
}: {
  data: Array<{
    date: string
    instances_created: number
    instances_completed: number
  }>
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 280,
        }}
      >
        <Text type="secondary">No data available for the selected range</Text>
      </div>
    )
  }

  const transformed = useMemo(() => {
    const created = data.map((d) => ({
      date: d.date,
      value: d.instances_created,
      type: 'Created',
    }))
    const completed = data.map((d) => ({
      date: d.date,
      value: d.instances_completed,
      type: 'Completed',
    }))
    return [...created, ...completed]
  }, [data])

  const config = {
    data: transformed,
    xField: 'date',
    yField: 'value',
    colorField: 'type',
    height: 280,
    smooth: true,
    color: ['#1677ff', '#52c41a'],
    point: {
      shapeField: 'square',
      sizeField: 3,
    },
    interaction: {
      tooltip: {
        marker: false,
      },
    },
    style: {
      lineWidth: 2,
    },
  }

  return <Line {...config} />
}

/** Activity heatmap using @ant-design/charts Heatmap */
function ActivityHeatmapSection() {
  const { data, isLoading, error } = useHeatmapData()

  if (error || (!isLoading && !data)) {
    return (
      <Result
        status="warning"
        title="Unable to load heatmap data"
        style={{ padding: 24 }}
      />
    )
  }

  const heatmapData = useMemo(
    () =>
      (data ?? []).map((d) => ({
        date: d.date,
        value: d.count,
      })),
    [data]
  )

  const config = {
    data: heatmapData,
    xField: 'date',
    yField: (d: { date: string }) => {
      const dt = dayjs(d.date)
      return dt.day() === 0 ? 7 : dt.day()
    },
    colorField: 'value',
    height: 160,
    loading: isLoading,
    color: {
      type: 'sequential' as const,
      palette: 'Blues',
    },
    style: {
      maxWidth: 12,
      maxHeight: 12,
      inset: 1,
      radius: 2,
    },
    axis: {
      x: {
        labelFormatter: (d: string) => dayjs(d).format('MMM'),
      },
      y: {
        labelFormatter: (d: number) => {
          const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          return days[d] || ''
        },
      },
    },
    tooltip: {
      title: (d: { date: string; value: number }) =>
        `${d.date}: ${d.value} activities`,
    },
  }

  return <HeatmapChart {...config} />
}

/** Quick Actions FAB using antd FloatButton.Group */
function QuickActionsFAB() {
  const navigate = useNavigate()

  return (
    <FloatButton.Group
      trigger="click"
      type="primary"
      icon={<PlusOutlined />}
      tooltip="Quick actions"
      style={{ right: 24, bottom: 24 }}
      items={[
        {
          icon: <CheckCircleOutlined />,
          tooltip: 'New Checklist',
          onClick: () => navigate('/checklists'),
        },
        {
          icon: <UnorderedListOutlined />,
          tooltip: 'New Todo',
          onClick: () => navigate('/checklists'),
        },
        {
          icon: <CalendarOutlined />,
          tooltip: 'New Event',
          onClick: () => navigate('/calendar'),
        },
      ]}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Main DashboardPage                                                */
/* ------------------------------------------------------------------ */

export function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()
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
        onSuccess: () => messageApi.success('Stats exported successfully'),
        onError: () => messageApi.error('Export failed'),
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
        <Spin size="large" tip="Loading dashboard...">
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Result
        status="warning"
        title="Unable to load dashboard"
        subTitle="Please try refreshing the page"
        style={{ padding: 48 }}
      />
    )
  }

  const checklistPercent =
    stats.total_checklists > 0
      ? Math.round((stats.completed_checklists / stats.total_checklists) * 100)
      : 0
  const todoPercent =
    stats.total_todos > 0
      ? Math.round((stats.completed_todos / stats.total_todos) * 100)
      : 0

  return (
    <div style={{ padding: '0 0 48px' }}>
      {contextHolder}

      {/* ---- Header ---- */}
      <ProCard style={{ marginBottom: 16 }} bodyStyle={{ padding: '16px 24px' }}>
        <Row justify="space-between" align="middle" gutter={[16, 12]}>
          <Col xs={24} sm={16}>
            <Title level={3} style={{ margin: 0 }}>
              Dashboard
            </Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              Welcome back! Here&apos;s your overview.
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
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exportCSV.isPending}
              >
                Export CSV
              </Button>
            </Space>
          </Col>
        </Row>
      </ProCard>

      {/* ---- Stats Row ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard style={{ height: '100%' }}
            statistic={{
              title: 'Completed Checklists',
              value: stats.completed_checklists,
              icon: (
                <Avatar
                  style={{ backgroundColor: '#f6ffed' }}
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  size={44}
                />
              ),
              description: (
                <Space size={4}>
                  <Tag
                    color={stats.weekly_change >= 0 ? 'success' : 'error'}
                  >
                    {stats.weekly_change >= 0 ? '+' : ''}
                    {stats.weekly_change}%
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    vs last week
                  </Text>
                </Space>
              ),
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard style={{ height: '100%' }}
            statistic={{
              title: 'Total Todos',
              value: stats.total_todos,
              icon: (
                <Avatar
                  style={{ backgroundColor: '#e6f4ff' }}
                  icon={<UnorderedListOutlined style={{ color: '#1677ff' }} />}
                  size={44}
                />
              ),
              description: (
                <Space size={4}>
                  <Tag color="processing">+8%</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    vs last week
                  </Text>
                </Space>
              ),
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard style={{ height: '100%' }}
            statistic={{
              title: 'Upcoming Events',
              value: stats.upcoming_events,
              icon: (
                <Avatar
                  style={{ backgroundColor: '#f9f0ff' }}
                  icon={<CalendarOutlined style={{ color: '#722ed1' }} />}
                  size={44}
                />
              ),
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard style={{ height: '100%' }}
            statistic={{
              title: 'Current Streak',
              value: stats.streak_days ?? 0,
              suffix: 'days',
              icon: (
                <Avatar
                  style={{ backgroundColor: '#fff7e6' }}
                  icon={<FireOutlined style={{ color: '#fa8c16' }} />}
                  size={44}
                />
              ),
              description: (
                <Space size={4}>
                  <Tag color="warning">+5%</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    vs last week
                  </Text>
                </Space>
              ),
            }}
          />
        </Col>
      </Row>

      {/* ---- Charts Row 1 ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <Space>
                <RiseOutlined />
                <span>Completion Trends</span>
              </Space>
            }
            style={{ height: '100%' }}
          >
            <CompletionChartSection />
          </ProCard>
        </Col>
        <Col xs={24} lg={12}>
          <ProCard title="Completion Trend" style={{ height: '100%' }}>
            <CompletionTrendSection data={trendData ?? []} />
          </ProCard>
        </Col>
      </Row>

      {/* ---- Charts Row 2 ---- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <ProCard
            title="Activity Heatmap"
            subTitle="Your activity over the last year"
            style={{ height: '100%' }}
          >
            <ActivityHeatmapSection />
          </ProCard>
        </Col>
        <Col xs={24} lg={12}>
          <ProCard title="Progress Overview" style={{ height: '100%' }}>
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
                  <Text type="secondary">Checklists</Text>
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
                  <Text type="secondary">Todos</Text>
                </div>
              </Col>
              <Col style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={stats.completion_rate ?? 0}
                  size={100}
                  strokeWidth={8}
                  strokeColor="#722ed1"
                  format={(pct) => (
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{pct}%</span>
                  )}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Overall</Text>
                </div>
              </Col>
            </Row>
          </ProCard>
        </Col>
      </Row>

      {/* ---- Recent Activity ---- */}
      <ProCard title="Recent Activity" style={{ marginBottom: 16 }}>
        <ActivityFeedSection limit={8} />
      </ProCard>

      {/* ---- Quick Actions FAB ---- */}
      <QuickActionsFAB />
    </div>
  )
}
