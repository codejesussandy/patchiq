import { ReloadOutlined } from '@ant-design/icons';
import { Row, Col, Card, Typography, Spin, Select, Button, Space } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DataTable } from '../components/shared/DataTable';
import { useDashboardData, useRefreshDashboard } from '../hooks/useDashboard';

const { Title, Text } = Typography;
const COLORS = { critical: '#ff4d4f', high: '#fa8c16', medium: '#faad14', low: '#52c41a' };
const PIE_COLORS_SET = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A', '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99'];

const StatCard: React.FC<{ title: string; value: number | string; suffix?: string }> = ({ title, value, suffix }) => (
  <Card style={{ textAlign: 'center', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%', padding: '16px' }}>
    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{title}</Text>
    <div style={{ fontSize: 32, fontWeight: 700, color: '#1890ff' }}>{value}{suffix && <span style={{ fontSize: 16, marginLeft: 4 }}>{suffix}</span>}</div>
  </Card>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode; height?: number }> = ({ title, children, height = 250 }) => (
  <Card title={title} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
    <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
  </Card>
);

const PieChartWidget: React.FC<{ data: { name?: string; value?: number }[]; colorKey?: string; dataKey?: string }> = ({ data, colorKey = 'cell', dataKey = 'value' }) => (
  <PieChart>
    <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey={dataKey}>
      {data.map((_, index) => <Cell key={`${colorKey}-${index}`} fill={PIE_COLORS_SET[index % PIE_COLORS_SET.length]} />)}
    </Pie>
    <RechartsTooltip />
  </PieChart>
);

const SeverityStackedBar: React.FC<{ data: unknown[]; xKey: string; height?: number; xAngle?: number; xHeight?: number; showLegend?: boolean }> = ({ data, xKey, _height = 250, xAngle, xHeight, showLegend = true }) => (
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey={xKey} {...(xAngle ? { angle: xAngle, textAnchor: 'end', height: xHeight } : {})} />
    <YAxis /><RechartsTooltip />{showLegend && <Legend />}
    <Bar dataKey="critical" stackId="a" fill={COLORS.critical} /><Bar dataKey="high" stackId="a" fill={COLORS.high} />
    <Bar dataKey="medium" stackId="a" fill={COLORS.medium} /><Bar dataKey="low" stackId="a" fill={COLORS.low} />
  </BarChart>
);

export const Dashboard = () => {
  const { data, isLoading: loading, refetch } = useDashboardData();
  const refreshMutation = useRefreshDashboard();
  const refreshing = refreshMutation.isPending;
  const handleRefresh = () => { refreshMutation.mutate(undefined, { onSuccess: () => { refetch(); } }); };

  const cveColumns = [
    { title: 'CVE', dataIndex: 'cve', key: 'cve', width: 120, render: (text: string) => <a href={`https://nvd.nist.gov/vuln/detail/${text}`} target="_blank" rel="noopener noreferrer">{text}</a> },
    { title: 'CVSS Score', dataIndex: 'score', key: 'score', width: 80, render: (score: number) => <span>{score}</span> },
    { title: 'Affected Endpoints', dataIndex: 'affectedEndpoints', key: 'affectedEndpoints', width: 120, render: (count: number) => <span>{count}</span> },
  ];

  const vulnTableColumns = [
    { title: 'Date Range', dataIndex: 'dateRange', key: 'dateRange' },
    { title: 'Critical', dataIndex: 'critical', key: 'critical', render: (v: number) => <span style={{ color: COLORS.critical, fontWeight: 600 }}>{v}</span> },
    { title: 'High', dataIndex: 'high', key: 'high', render: (v: number) => <span style={{ color: COLORS.high, fontWeight: 600 }}>{v}</span> },
    { title: 'Medium', dataIndex: 'medium', key: 'medium', render: (v: number) => <span style={{ color: COLORS.medium, fontWeight: 600 }}>{v}</span> },
    { title: 'Low', dataIndex: 'low', key: 'low', render: (v: number) => <span style={{ color: COLORS.low, fontWeight: 600 }}>{v}</span> },
  ];

  if (loading) return <Spin size="large" tip="Loading dashboard..."><div style={{ height: '400px' }} /></Spin>;
  if (!data) return <div style={{ padding: 24 }}><Card><Text type="danger">Failed to load dashboard data.</Text><Button onClick={() => refetch()} style={{ marginLeft: 16 }}>Retry</Button></Card></div>;

  const s = data.stats;
  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Executive Dashboard</Title>
        <Space>
          <Select defaultValue="all" style={{ width: 150 }}>
            <Select.Option value="all">All Endpoints</Select.Option><Select.Option value="windows">Windows Only</Select.Option><Select.Option value="linux">Linux Only</Select.Option>
          </Select>
          <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing} type="primary">Refresh</Button>
        </Space>
      </div>

      {s && (
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          {[['Total Endpoints', s.totalEndpoints], ['Total Linux Endpoints', s.linuxEndpoints], ['Total Windows Endpoints', s.windowsEndpoints],
            ['Total Apple Mac Endpoint', s.macEndpoints]].map(([title, val]) => (
            <Col xs={12} sm={8} md={4} lg={4} key={title as string}><StatCard title={title as string} value={(val as number) || 0} /></Col>
          ))}
          <Col xs={12} sm={8} md={4} lg={4}><StatCard title="Total Vulnerability" value={s.totalVulnerabilities || 0} suffix={`${s.unmitigatedVulnerabilities || 0}`} /></Col>
          <Col xs={12} sm={8} md={4} lg={4}><StatCard title="Total Software" value={data.totalSoftwareByPlatform?.reduce((sum, p) => sum + p.value, 0) || 0} /></Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <ChartCard title="Vulnerability Classification" height={280}>
            <BarChart data={[
              { name: 'Total', critical: s.criticalVulnerabilities || 0, high: s.highVulnerabilities || 0, medium: s.mediumVulnerabilities || 0, low: s.lowVulnerabilities || 0 },
              { name: 'Non Exploit', critical: s.nonExploitableVulnerabilities?.critical || 0, high: s.nonExploitableVulnerabilities?.high || 0, medium: s.nonExploitableVulnerabilities?.medium || 0, low: s.nonExploitableVulnerabilities?.low || 0 },
              { name: 'Exploit', critical: s.exploitableVulnerabilities?.critical || 0, high: s.exploitableVulnerabilities?.high || 0, medium: s.exploitableVulnerabilities?.medium || 0, low: s.exploitableVulnerabilities?.low || 0 },
            ]} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" /><RechartsTooltip /><Legend />
              <Bar dataKey="critical" stackId="a" fill={COLORS.critical} /><Bar dataKey="high" stackId="a" fill={COLORS.high} />
              <Bar dataKey="medium" stackId="a" fill={COLORS.medium} /><Bar dataKey="low" stackId="a" fill={COLORS.low} />
            </BarChart>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top 10 Vulnerability by CVSS" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
            <DataTable data={data.topVulnerabilities.byCVSS.slice(0, 10)} columns={cveColumns} pagination={false} size="small" rowKey="cve" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}><ChartCard title="Platform wise Total Endpoints"><PieChartWidget data={data.endpointDistribution} colorKey="cell" /></ChartCard></Col>
        <Col xs={24} sm={12} lg={16}>
          <Card title="Vulnerability by Published Date" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <DataTable data={data.vulnerabilityByPublishedDateTable} columns={vulnTableColumns} pagination={false} size="small" rowKey="dateRange" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}><ChartCard title="Expired Certificates"><PieChartWidget data={data.expiredCertificates} colorKey="cert" /></ChartCard></Col>
        <Col xs={24} sm={12} lg={8}><ChartCard title="Malicious Processes by Platform"><PieChartWidget data={data.maliciousProcessesByPlatform} colorKey="mal" /></ChartCard></Col>
        <Col xs={24} sm={12} lg={8}>
          <ChartCard title="Total Vulnerability by Severity">
            <BarChart data={[{ name: 'Critical', value: s.criticalVulnerabilities || 0 }, { name: 'High', value: s.highVulnerabilities || 0 }, { name: 'Medium', value: s.mediumVulnerabilities || 0 }, { name: 'Low', value: s.lowVulnerabilities || 0 }]}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><RechartsTooltip /><Bar dataKey="value" fill="#722ed1" />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}><ChartCard title="Total Software by Platform"><PieChartWidget data={data.totalSoftwareByPlatform} colorKey="soft" /></ChartCard></Col>
        <Col xs={24} sm={12} lg={8}>
          <ChartCard title="Risk Score by Endpoints">
            <BarChart data={data.riskScoreByEndpoints}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 10]} /><RechartsTooltip /><Bar dataKey="value" fill="#1890ff" /></BarChart>
          </ChartCard>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <ChartCard title="Alert Count By Severity">
            <PieChart>
              <Pie data={data.alertCountBySeverity.map((item) => ({ ...item, name: item.severity }))} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="count">
                {data.alertCountBySeverity.map((_, index) => <Cell key={`alert-${index}`} fill={[COLORS.critical, COLORS.high, COLORS.medium, COLORS.low][index]} />)}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}><ChartCard title="Alert Severity Count by Platform" height={300}><SeverityStackedBar data={data.alertSeverityCountByPlatform} xKey="platform" xAngle={-45} xHeight={80} /></ChartCard></Col>
        <Col xs={24} lg={12}>
          <ChartCard title="Alert Severity Count by Module" height={300}>
            <BarChart data={data.alertSeverityCountByModule}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="module" /><YAxis /><RechartsTooltip /><Legend />
              <Bar dataKey="critical" fill={COLORS.critical} /><Bar dataKey="high" fill={COLORS.high} /><Bar dataKey="medium" fill={COLORS.medium} />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <ChartCard title="Day Wise Vulnerability Detection Count" height={200}>
            <BarChart data={data.dayWiseVulnerabilityDetection} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="day" type="category" width={70} /><RechartsTooltip /><Bar dataKey="count" fill="#722ed1" />
            </BarChart>
          </ChartCard>
        </Col>
      </Row>

      <style>{`.ant-card { border: 1px solid #f0f0f0; border-radius: 8px; } .ant-table-thead > tr > th { background: #fafafa !important; border-bottom: 1px solid #f0f0f0; } .ant-table-tbody > tr:hover > td { background: #f5f5f5 !important; }`}</style>
    </div>
  );
};

export default Dashboard;
