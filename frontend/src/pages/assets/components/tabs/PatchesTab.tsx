import { useState, useEffect } from 'react';
import {
  App,
  Card,
  Row,
  Col,
  Tag,
  Table,
  Typography,
  Space,
  Spin,
  Empty,
  Progress,
  Timeline,
  Badge,
  Button,
} from 'antd';
import {
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  WarningOutlined,
  HistoryOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import type { AssetRelatedPatch, AssetDeployment, PatchSummary, Asset } from '../../../../types/asset.types';
import { assetService } from '../../../../services/asset.service';

const { Text } = Typography;

interface PatchesTabProps {
  assetId: string;
  patchSummary?: PatchSummary;
}

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'gold';
    case 'low':
      return 'green';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Installed':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'Missing':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'Pending':
      return <SyncOutlined spin style={{ color: '#1890ff' }} />;
    case 'Failed':
      return <WarningOutlined style={{ color: '#fa8c16' }} />;
    default:
      return <ClockCircleOutlined />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Installed':
    case 'Success':
      return 'success';
    case 'Missing':
    case 'Failed':
      return 'error';
    case 'Pending':
      return 'processing';
    default:
      return 'default';
  }
};

const CHART_COLORS = {
  installed: '#52c41a',
  missing: '#ff4d4f',
  pending: '#1890ff',
  failed: '#fa8c16',
};

export const PatchesTab = ({ assetId, patchSummary: initialSummary }: PatchesTabProps) => {
  const { message } = App.useApp();
  const [patches, setPatches] = useState<AssetRelatedPatch[]>([]);
  const [deployments, setDeployments] = useState<AssetDeployment[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatchData();
  }, [assetId]);

  const fetchPatchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patchesData, deploymentsData, assetData] = await Promise.all([
        assetService.getAssetPatches(assetId),
        assetService.getAssetDeployments(assetId),
        assetService.getAssetWithPatchDetails(assetId),
      ]);
      setPatches(patchesData);
      setDeployments(deploymentsData);
      setAsset(assetData);
    } catch (err) {
      console.error('Failed to fetch patch data:', err);
      setError('Failed to load patch information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Empty description={error} />;
  }

  const patchSummary = asset?.patchSummary || initialSummary;

  // Prepare chart data
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

  const patchColumns: ColumnsType<AssetRelatedPatch> = [
    {
      title: 'Patch',
      key: 'patch',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Space>
            {getStatusIcon(record.status)}
            <Text strong>{record.name}</Text>
          </Space>
          {record.kbNumber && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: 22 }}>
              {record.kbNumber}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      filters: [
        { text: 'Critical', value: 'CRITICAL' },
        { text: 'High', value: 'High' },
        { text: 'Medium', value: 'Medium' },
        { text: 'Low', value: 'Low' },
      ],
      onFilter: (value, record) => record.severity === value,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: 'Installed', value: 'Installed' },
        { text: 'Missing', value: 'Missing' },
        { text: 'Pending', value: 'Pending' },
        { text: 'Failed', value: 'Failed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Badge status={getStatusColor(status)} text={status} />
      ),
    },
    {
      title: 'Release Date',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 120,
      sorter: (a, b) => {
        if (!a.releaseDate || !b.releaseDate) return 0;
        return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
      },
      render: (date?: string) =>
        date ? new Date(date).toLocaleDateString() : '—',
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => {
        if (record.status === 'Missing' || record.status === 'Failed') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<DeploymentUnitOutlined />}
              onClick={() => message.info(`Deploy ${record.name} initiated`)}
            >
              Deploy
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const deploymentColumns: ColumnsType<AssetDeployment> = [
    {
      title: 'Patch',
      dataIndex: 'patchName',
      key: 'patchName',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={getStatusColor(status)} text={status} />
      ),
    },
  ];

  // Separate patches by status
  const missingPatches = patches.filter((p) => p.status === 'Missing');
  const failedPatches = patches.filter((p) => p.status === 'Failed');
  const pendingPatches = patches.filter((p) => p.status === 'Pending');

  return (
    <div>
      {/* Summary Cards */}
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
                    <div>
                      <Badge status="success" text={<Text type="secondary">Installed: {patchSummary.installed}</Text>} />
                    </div>
                    <div>
                      <Badge status="error" text={<Text type="secondary">Missing: {patchSummary.missing}</Text>} />
                    </div>
                    <div>
                      <Badge status="processing" text={<Text type="secondary">Pending: {patchSummary.pending}</Text>} />
                    </div>
                    <div>
                      <Badge status="warning" text={<Text type="secondary">Failed: {patchSummary.failed}</Text>} />
                    </div>
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
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  <RechartsTooltip
                    formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} patches`, name ?? '']}
                  />
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
                <Card
                  size="small"
                  style={{
                    textAlign: 'center',
                    background: missingPatches.filter((p) => p.severity === 'CRITICAL').length > 0 ? '#fff1f0' : '#f6ffed',
                    border: 'none',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                    {missingPatches.filter((p) => p.severity === 'CRITICAL').length}
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Critical Missing</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    textAlign: 'center',
                    background: missingPatches.filter((p) => p.severity === 'High').length > 0 ? '#fff7e6' : '#f6ffed',
                    border: 'none',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                    {missingPatches.filter((p) => p.severity === 'High').length}
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>High Missing</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ textAlign: 'center', background: '#f0f5ff', border: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                    {pendingPatches.length}
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Pending</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ textAlign: 'center', background: failedPatches.length > 0 ? '#fff7e6' : '#f6ffed', border: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                    {failedPatches.length}
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Failed</Text>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Patches Table */}
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>All Patches ({patches.length})</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          missingPatches.length > 0 && (
            <Button
              type="primary"
              icon={<DeploymentUnitOutlined />}
              onClick={() => message.info('Deploying all missing patches...')}
            >
              Deploy All Missing
            </Button>
          )
        }
      >
        {patches.length > 0 ? (
          <Table
            columns={patchColumns}
            dataSource={patches}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="small"
          />
        ) : (
          <Empty description="No patches found for this asset" />
        )}
      </Card>

      {/* Deployment History */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card
            title={
              <Space>
                <HistoryOutlined />
                <span>Recent Deployments</span>
              </Space>
            }
            size="small"
          >
            {deployments.length > 0 ? (
              <Table
                columns={deploymentColumns}
                dataSource={deployments.slice(0, 5)}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No deployment history" />
            )}
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>Deployment Timeline</span>
              </Space>
            }
            size="small"
          >
            {deployments.length > 0 ? (
              <Timeline
                style={{ marginTop: 16, maxHeight: 250, overflowY: 'auto' }}
                items={deployments.slice(0, 5).map((deployment) => ({
                  color:
                    deployment.status === 'Success'
                      ? 'green'
                      : deployment.status === 'Failed'
                        ? 'red'
                        : 'blue',
                  children: (
                    <div>
                      <Space orientation="vertical" size={0}>
                        <Space>
                          <Text strong>{deployment.patchName}</Text>
                          <Tag color={getStatusColor(deployment.status)}>{deployment.status}</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(deployment.date).toLocaleString()}
                        </Text>
                      </Space>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty description="No deployment history" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
