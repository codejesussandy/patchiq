import { Card, Row, Col, Progress, Badge, Space, Typography, Empty } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import type { PatchSummary, AssetRelatedPatch } from '../../../../types/asset.types';

const { Text } = Typography;

const CHART_COLORS = {
  installed: '#52c41a',
  missing: '#ff4d4f',
  pending: '#1890ff',
  failed: '#fa8c16',
};

interface PatchesSummaryCardsProps {
  patchSummary: PatchSummary | null;
  patches: AssetRelatedPatch[];
}

export const PatchesSummaryCards = ({ patchSummary, patches }: PatchesSummaryCardsProps) => {
  const chartData = patchSummary
    ? [
        { name: 'Installed', value: patchSummary.installed, color: CHART_COLORS.installed },
        { name: 'Missing', value: patchSummary.missing, color: CHART_COLORS.missing },
        { name: 'Pending', value: patchSummary.pending, color: CHART_COLORS.pending },
        { name: 'Failed', value: patchSummary.failed, color: CHART_COLORS.failed },
      ].filter((d) => d.value > 0)
    : [];

  const compliancePercent = patchSummary
    ? patchSummary.total > 0
      ? Math.round((patchSummary.installed / patchSummary.total) * 100)
      : 100
    : 0;

  const missingPatches = patches.filter((p) => p.status === 'MISSING');
  const failedPatches = patches.filter((p) => p.status === 'FAILED');
  const pendingPatches = patches.filter((p) => p.status === 'PENDING');

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col span={8}>
        <Card size="small">
          <Row gutter={16} align="middle">
            <Col span={12}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={compliancePercent}
                  width={100}
                  strokeColor={compliancePercent >= 90 ? '#52c41a' : compliancePercent >= 70 ? '#faad14' : '#ff4d4f'}
                  format={(percent) => (
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{percent}%</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>Compliance</div>
                    </div>
                  )}
                />
              </div>
            </Col>
            <Col span={12}>
              {patchSummary && (
                <Space orientation="vertical" size={4}>
                  <div><Badge status="success" text={<Text type="secondary">Installed: {patchSummary.installed}</Text>} /></div>
                  <div><Badge status="error" text={<Text type="secondary">Missing: {patchSummary.missing}</Text>} /></div>
                  <div><Badge status="processing" text={<Text type="secondary">Pending: {patchSummary.pending}</Text>} /></div>
                  <div><Badge status="warning" text={<Text type="secondary">Failed: {patchSummary.failed}</Text>} /></div>
                </Space>
              )}
            </Col>
          </Row>
        </Card>
      </Col>

      <Col span={8}>
        <Card size="small" title="Patch Distribution">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <RechartsTooltip formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} patches`, name ?? '']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty description="No patch data" style={{ height: 150 }} />
          )}
        </Card>
      </Col>

      <Col span={8}>
        <Card size="small" title="Quick Stats">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: missingPatches.filter((p) => p.severity === 'CRITICAL').length > 0 ? '#fff1f0' : '#f6ffed', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{missingPatches.filter((p) => p.severity === 'CRITICAL').length}</div>
                <Text type="secondary" style={{ fontSize: '11px' }}>Critical Missing</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: missingPatches.filter((p) => p.severity === 'HIGH').length > 0 ? '#fff7e6' : '#f6ffed', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{missingPatches.filter((p) => p.severity === 'HIGH').length}</div>
                <Text type="secondary" style={{ fontSize: '11px' }}>High Missing</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: '#f0f5ff', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{pendingPatches.length}</div>
                <Text type="secondary" style={{ fontSize: '11px' }}>Pending</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: failedPatches.length > 0 ? '#fff7e6' : '#f6ffed', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{failedPatches.length}</div>
                <Text type="secondary" style={{ fontSize: '11px' }}>Failed</Text>
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};
