import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tabs,
  Modal,
  Input,
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
  RocketOutlined,
  ReloadOutlined,
  BugOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import type { AssetRelatedPatch, AssetDeployment, PatchSummary } from '../../../../types/asset.types';
import type { PatchRecommendation } from '../../../../types/patch-recommendation.types';
import { assetService } from '../../../../services/asset.service';
import { patchService } from '../../../../services/patch.service';
import { patchRecommendationService } from '../../../../services/patch-recommendation.service';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface UnifiedPatchesTabProps {
  assetId: string;
  agentId?: string;
  patchSummary?: PatchSummary;
}

const getSeverityColor = (severity: string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'MEDIUM':
      return 'gold';
    case 'LOW':
      return 'green';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Installed':
    case 'verified':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'Missing':
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'Pending':
    case 'deployed':
    case 'accepted':
      return <SyncOutlined spin style={{ color: '#1890ff' }} />;
    case 'Failed':
    case 'rejected':
      return <WarningOutlined style={{ color: '#fa8c16' }} />;
    case 'recommended':
      return <BugOutlined style={{ color: '#faad14' }} />;
    default:
      return <ClockCircleOutlined />;
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'installed':
    case 'success':
    case 'verified':
      return 'success';
    case 'missing':
    case 'failed':
      return 'error';
    case 'pending':
    case 'deployed':
    case 'accepted':
      return 'processing';
    case 'recommended':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusBadgeStatus = (
  status: string
): 'success' | 'processing' | 'error' | 'default' | 'warning' => {
  switch (status?.toLowerCase()) {
    case 'verified':
      return 'success';
    case 'deployed':
    case 'accepted':
      return 'processing';
    case 'failed':
    case 'rejected':
      return 'error';
    case 'recommended':
      return 'warning';
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

export const UnifiedPatchesTab = ({ assetId, agentId, patchSummary: initialSummary }: UnifiedPatchesTabProps) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  // Patch data state
  const [patches, setPatches] = useState<AssetRelatedPatch[]>([]);
  const [deployments, setDeployments] = useState<AssetDeployment[]>([]);
  const [summary, setSummary] = useState<PatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<PatchRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  useEffect(() => {
    fetchPatchData();
    fetchRecommendations();
  }, [assetId]);

  const fetchPatchData = async () => {
    setLoading(true);
    try {
      const [patchesResult, deploymentsData] = await Promise.all([
        assetService.getAssetPatches(assetId),
        assetService.getAssetDeployments(assetId),
      ]);
      setPatches(patchesResult.data);
      setSummary(patchesResult.summary);
      setDeployments(deploymentsData);
    } catch {
      message.error('Failed to load patch information');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = useCallback(async () => {
    setRecommendationsLoading(true);
    try {
      const result = await patchRecommendationService.getAssetRecommendations(assetId);
      setRecommendations(result.data);
    } catch (error: any) {
      console.error('Failed to fetch recommendations:', error);
      // Don't show error message if recommendations service isn't available
    } finally {
      setRecommendationsLoading(false);
    }
  }, [assetId]);

  const handleDeploy = async (patchList: { id: string; name?: string }[]) => {
    if (!agentId) {
      message.warning('No agent connected to this asset');
      return;
    }
    setDeploying(true);
    try {
      await patchService.createDeployment({
        name: patchList.length === 1
          ? `Deploy ${patchList[0].name || 'Patch'}`
          : `Deploy ${patchList.length} Missing Patches`,
        targetAgentIds: [agentId],
        patches: patchList.map(p => ({ id: p.id })),
        skipApprovalCheck: true,
      });
      message.success(patchList.length === 1
        ? `Deployment created for ${patchList[0].name}`
        : `Deployment created for ${patchList.length} patches`);
      fetchPatchData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to create deployment');
    } finally {
      setDeploying(false);
    }
  };

  // Recommendation action handlers
  const handleAccept = async (id: string) => {
    Modal.confirm({
      title: 'Accept Recommendation',
      content: 'Are you sure you want to accept this patch recommendation?',
      onOk: async () => {
        setActionLoading(id);
        try {
          await patchRecommendationService.acceptRecommendation(id);
          message.success('Recommendation accepted');
          fetchRecommendations();
        } catch (error: any) {
          message.error(error?.response?.data?.message || 'Failed to accept recommendation');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleReject = (id: string) => {
    setSelectedRecommendation(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRecommendation || !rejectReason.trim()) {
      message.warning('Please provide a reason for rejection');
      return;
    }

    setActionLoading(selectedRecommendation);
    try {
      await patchRecommendationService.rejectRecommendation(
        selectedRecommendation,
        rejectReason
      );
      message.success('Recommendation rejected');
      setRejectModalVisible(false);
      setSelectedRecommendation(null);
      setRejectReason('');
      fetchRecommendations();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Failed to reject recommendation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeployRecommendation = async (id: string) => {
    if (!agentId) {
      message.warning('No agent connected to this asset');
      return;
    }

    setActionLoading(id);
    try {
      await patchRecommendationService.deployRecommendation(id);
      message.success('Deployment initiated successfully');
      fetchRecommendations();
      fetchPatchData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Failed to deploy recommendation');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const patchSummary = summary || initialSummary;

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

  // Separate patches by status
  const missingPatches = patches.filter((p) => p.status === 'Missing');
  const failedPatches = patches.filter((p) => p.status === 'Failed');
  const pendingPatches = patches.filter((p) => p.status === 'Pending');

  // Recommendation stats
  const criticalRecs = recommendations.filter((r) => r.severity === 'CRITICAL').length;
  const highRecs = recommendations.filter((r) => r.severity === 'HIGH').length;
  const mediumRecs = recommendations.filter((r) => r.severity === 'MEDIUM').length;
  const lowRecs = recommendations.filter((r) => r.severity === 'LOW').length;

  // Table columns for patches
  const patchColumns: ColumnsType<AssetRelatedPatch> = [
    {
      title: 'Patch',
      key: 'patch',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
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
              disabled={!agentId || deploying}
              loading={deploying}
              title={!agentId ? 'No agent connected to this asset' : undefined}
              onClick={() => handleDeploy([{ id: record.id, name: record.name }])}
            >
              Deploy
            </Button>
          );
        }
        return null;
      },
    },
  ];

  // Table columns for recommendations
  const recommendationColumns: ColumnsType<PatchRecommendation> = [
    {
      title: 'CVE ID',
      dataIndex: ['vulnerability', 'cveId'],
      key: 'cveId',
      width: 150,
      render: (text: string) => (
        <Space>
          <BugOutlined style={{ color: '#fa8c16' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Vulnerability',
      dataIndex: ['vulnerability', 'title'],
      key: 'vulnTitle',
      ellipsis: true,
      render: (text: string) => <Text>{text}</Text>,
    },
    {
      title: 'Patch',
      dataIndex: ['patch', 'patchId'],
      key: 'patchId',
      width: 150,
      render: (text: string, record) => (
        <a onClick={() => navigate(`/patches/${record.patch.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => <Tag color={getSeverityColor(severity)}>{severity}</Tag>,
      sorter: (a, b) => a.severity.localeCompare(b.severity),
    },
    {
      title: 'Risk Score',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 100,
      render: (score: number | null) => <Text>{score?.toFixed(0) || '—'}</Text>,
      sorter: (a, b) => (a.riskScore || 0) - (b.riskScore || 0),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Badge
          status={getStatusBadgeStatus(status)}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'recommended' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={actionLoading === record.id}
                onClick={() => handleAccept(record.id)}
              >
                Accept
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                loading={actionLoading === record.id}
                onClick={() => handleReject(record.id)}
              >
                Reject
              </Button>
            </>
          )}
          {record.status === 'accepted' && (
            <Button
              type="primary"
              size="small"
              icon={<RocketOutlined />}
              loading={actionLoading === record.id}
              onClick={() => handleDeployRecommendation(record.id)}
              disabled={!agentId}
            >
              Deploy
            </Button>
          )}
          {!['recommended', 'accepted'].includes(record.status) && (
            <Text type="secondary">—</Text>
          )}
        </Space>
      ),
    },
  ];

  // Deployment columns
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

  // Tab items
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined />
          Overview
        </span>
      ),
      children: (
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
                      <Space direction="vertical" size={4}>
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
        </div>
      ),
    },
    {
      key: 'recommendations',
      label: (
        <span>
          <BugOutlined />
          Vulnerability Remediation ({recommendations.length})
        </span>
      ),
      children: (
        <div>
          {/* Recommendation Summary */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Total Recommendations
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
                  {recommendations.length}
                </div>
              </Card>
            </Col>
            <Col span={4.5}>
              <Card style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Critical
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>
                  {criticalRecs}
                </div>
              </Card>
            </Col>
            <Col span={4.5}>
              <Card style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  High
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{highRecs}</div>
              </Card>
            </Col>
            <Col span={4.5}>
              <Card style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Medium
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>
                  {mediumRecs}
                </div>
              </Card>
            </Col>
            <Col span={4.5}>
              <Card style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Low
                </Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{lowRecs}</div>
              </Card>
            </Col>
          </Row>

          {/* Recommendations Table */}
          <Card
            title="CVE-Based Patch Recommendations"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchRecommendations}
                loading={recommendationsLoading}
                size="small"
              >
                Refresh
              </Button>
            }
          >
            {recommendationsLoading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Spin />
              </div>
            ) : recommendations.length > 0 ? (
              <Table
                dataSource={recommendations}
                columns={recommendationColumns}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 'max-content' }}
                size="small"
              />
            ) : (
              <Empty description="No patch recommendations for this asset" />
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'all-patches',
      label: (
        <span>
          <SafetyOutlined />
          All Patches ({patches.length})
        </span>
      ),
      children: (
        <Card
          title={
            <Space>
              <SafetyOutlined />
              <span>All Patches ({patches.length})</span>
            </Space>
          }
          size="small"
          extra={
            missingPatches.length > 0 && (
              <Button
                type="primary"
                icon={<DeploymentUnitOutlined />}
                disabled={!agentId || deploying}
                loading={deploying}
                title={!agentId ? 'No agent connected to this asset' : undefined}
                onClick={() => handleDeploy(missingPatches.map(p => ({ id: p.id, name: p.name })))}
              >
                Deploy All Missing ({missingPatches.length})
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
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          Deployment History ({deployments.length})
        </span>
      ),
      children: (
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
                  dataSource={deployments}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
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
                  style={{ marginTop: 16, maxHeight: 400, overflowY: 'auto' }}
                  items={deployments.slice(0, 10).map((deployment) => ({
                    color:
                      deployment.status === 'Success'
                        ? 'green'
                        : deployment.status === 'Failed'
                          ? 'red'
                          : 'blue',
                    children: (
                      <div>
                        <Space direction="vertical" size={0}>
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
      ),
    },
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="overview"
        items={tabItems}
        size="small"
      />

      {/* Reject Modal */}
      <Modal
        title="Reject Recommendation"
        open={rejectModalVisible}
        onOk={handleRejectConfirm}
        onCancel={() => {
          setRejectModalVisible(false);
          setSelectedRecommendation(null);
          setRejectReason('');
        }}
        confirmLoading={actionLoading === selectedRecommendation}
      >
        <p>Please provide a reason for rejecting this recommendation:</p>
        <TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
        />
      </Modal>
    </div>
  );
};
