import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Table, Typography, Spin, Select, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { DashboardData } from '../types/dashboard.types';
import dashboardService from '../services/dashboard.service';

const { Title, Text } = Typography;

const COLORS = {
  critical: '#ff4d4f',
  high: '#fa8c16',
  medium: '#faad14',
  low: '#52c41a',
};

// Simple Stat Card
const StatCard: React.FC<{ title: string; value: number | string; suffix?: string }> = ({
  title,
  value,
  suffix,
}) => (
  <Card
    style={{
      textAlign: 'center',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      height: '100%',
      padding: '16px',
    }}
  >
    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
      {title}
    </Text>
    <div style={{ fontSize: 32, fontWeight: 700, color: '#1890ff' }}>
      {value}
      {suffix && <span style={{ fontSize: 16, marginLeft: 4 }}>{suffix}</span>}
    </div>
  </Card>
);

export const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const dashboardData = await dashboardService.getDashboardData();
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // CVE Table Columns
  const cveColumns = [
    {
      title: 'CVE',
      dataIndex: 'cve',
      key: 'cve',
      width: 120,
      render: (text: string) => (
        <a href={`https://nvd.nist.gov/vuln/detail/${text}`} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ),
    },
    {
      title: 'CVSS Score',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => <span>{score}</span>,
    },
    {
      title: 'Affected Endpoints',
      dataIndex: 'affectedEndpoints',
      key: 'affectedEndpoints',
      width: 120,
      render: (count: number) => <span>{count}</span>,
    },
  ];

  // Vulnerability by Published Date Table Columns
  const vulnTableColumns = [
    {
      title: 'Date Range',
      dataIndex: 'dateRange',
      key: 'dateRange',
    },
    {
      title: 'Critical',
      dataIndex: 'critical',
      key: 'critical',
      render: (value: number) => <span style={{ color: COLORS.critical, fontWeight: 600 }}>{value}</span>,
    },
    {
      title: 'High',
      dataIndex: 'high',
      key: 'high',
      render: (value: number) => <span style={{ color: COLORS.high, fontWeight: 600 }}>{value}</span>,
    },
    {
      title: 'Medium',
      dataIndex: 'medium',
      key: 'medium',
      render: (value: number) => <span style={{ color: COLORS.medium, fontWeight: 600 }}>{value}</span>,
    },
    {
      title: 'Low',
      dataIndex: 'low',
      key: 'low',
      render: (value: number) => <span style={{ color: COLORS.low, fontWeight: 600 }}>{value}</span>,
    },
  ];

  if (loading || !data) {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <Spin size="large" tip="Loading dashboard..." />
        </div>
      );
    }

    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Text type="danger">Failed to load dashboard data.</Text>
          <Button onClick={fetchDashboard} style={{ marginLeft: 16 }}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const PIE_COLORS_SET = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A', '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99'];

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          Executive Dashboard
        </Title>
        <Space>
          <Select defaultValue="all" style={{ width: 150 }}>
            <Select.Option value="all">All Endpoints</Select.Option>
            <Select.Option value="windows">Windows Only</Select.Option>
            <Select.Option value="linux">Linux Only</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={handleRefresh}
            loading={refreshing}
            type="primary"
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* KPI Cards - Row 1 */}
      {data && data.stats ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={12} sm={8} md={4} lg={4}>
            <StatCard title="Total Endpoints" value={data.stats.totalEndpoints || 0} />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <StatCard title="Total Linux Endpoints" value={data.stats.linuxEndpoints || 0} />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <StatCard title="Total Windows Endpoints" value={data.stats.windowsEndpoints || 0} />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <StatCard title="Total Apple Mac Endpoint" value={data.stats.macEndpoints || 0} />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <StatCard
              title="Total Vulnerability"
              value={data.stats.totalVulnerabilities || 0}
              suffix={`${data.stats.unmitigatedVulnerabilities || 0}`}
            />
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <StatCard title="Total Software" value={9063} />
          </Col>
        </Row>
      ) : null}

      {/* Main Content - Row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Vulnerability Classification */}
        <Col xs={24} lg={12}>
          <Card
            title="Vulnerability Classification"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
          >
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    { name: 'Total', critical: 45, high: 234, medium: 423, low: 156 },
                    { name: 'Non Exploit', critical: 32, high: 189, medium: 389, low: 89 },
                    { name: 'Exploit', critical: 28, high: 156, medium: 374, low: 70 },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="critical" stackId="a" fill={COLORS.critical} />
                  <Bar dataKey="high" stackId="a" fill={COLORS.high} />
                  <Bar dataKey="medium" stackId="a" fill={COLORS.medium} />
                  <Bar dataKey="low" stackId="a" fill={COLORS.low} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Top 10 Vulnerability by CVSS */}
        <Col xs={24} lg={12}>
          <Card
            title="Top 10 Vulnerability by CVSS"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
          >
            <Table
              dataSource={data.topVulnerabilities.byCVSS.slice(0, 10)}
              columns={cveColumns}
              pagination={false}
              size="small"
              rowKey="cve"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content - Row 2 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Platform wise Total Endpoints */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="Platform wise Total Endpoints"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.endpointDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.endpointDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS_SET[index % PIE_COLORS_SET.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Vulnerability by Published Date */}
        <Col xs={24} sm={12} lg={16}>
          <Card
            title="Vulnerability by Published Date"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Table
              dataSource={data.vulnerabilityByPublishedDateTable}
              columns={vulnTableColumns}
              pagination={false}
              size="small"
              rowKey="dateRange"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content - Row 3 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Expired Certificates */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="Expired Certificates"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.expiredCertificates}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.expiredCertificates.map((_, index) => (
                    <Cell key={`cert-${index}`} fill={PIE_COLORS_SET[index % PIE_COLORS_SET.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Malicious Processes by Platform */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="Malicious Processes by Platform"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.maliciousProcessesByPlatform}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.maliciousProcessesByPlatform.map((_, index) => (
                    <Cell key={`mal-${index}`} fill={PIE_COLORS_SET[index % PIE_COLORS_SET.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Total Vulnerability by Severity */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="Total Vulnerability by Severity"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Critical', value: 127 },
                  { name: 'High', value: 1181 },
                  { name: 'Medium', value: 1542 },
                  { name: 'Low', value: 315 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#722ed1" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Main Content - Row 4 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Total Software by Platform */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="Total Software by Platform"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.totalSoftwareByPlatform}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.totalSoftwareByPlatform.map((_, index) => (
                    <Cell key={`soft-${index}`} fill={PIE_COLORS_SET[index % PIE_COLORS_SET.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Risk Score by Endpoints */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="Risk Score by Endpoints"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.riskScoreByEndpoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <RechartsTooltip />
                <Bar dataKey="value" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Alert Count By Severity */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="Alert Count By Severity"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.alertCountBySeverity.map((item) => ({
                    ...item,
                    name: item.severity,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.alertCountBySeverity.map((_, index) => (
                    <Cell key={`alert-${index}`} fill={[COLORS.critical, COLORS.high, COLORS.medium, COLORS.low][index]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Main Content - Row 5 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Alert Severity Count by Platform */}
        <Col xs={24} lg={12}>
          <Card
            title="Alert Severity Count by Platform"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.alertSeverityCountByPlatform}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="critical" stackId="a" fill={COLORS.critical} />
                <Bar dataKey="high" stackId="a" fill={COLORS.high} />
                <Bar dataKey="medium" stackId="a" fill={COLORS.medium} />
                <Bar dataKey="low" stackId="a" fill={COLORS.low} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Alert Severity Count by Module */}
        <Col xs={24} lg={12}>
          <Card
            title="Alert Severity Count by Module"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.alertSeverityCountByModule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="module" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="critical" fill={COLORS.critical} />
                <Bar dataKey="high" fill={COLORS.high} />
                <Bar dataKey="medium" fill={COLORS.medium} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Day Wise Vulnerability Detection */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card
            title="Day Wise Vulnerability Detection Count"
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.dayWiseVulnerabilityDetection} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="day" type="category" width={70} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#722ed1" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <style>{`
        .ant-card {
          border: 1px solid #f0f0f0;
          border-radius: 8px;
        }
        .ant-table-thead > tr > th {
          background: #fafafa !important;
          border-bottom: 1px solid #f0f0f0;
        }
        .ant-table-tbody > tr:hover > td {
          background: #f5f5f5 !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
