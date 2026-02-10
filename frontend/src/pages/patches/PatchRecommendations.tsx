import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Table,
  Typography,
  Button,
  Space,
  Spin,
  Tag,
  Badge,
  Input,
  Select,
  App,
  Modal,
  Empty,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { patchRecommendationService } from '../../services/patch-recommendation.service';
import type {
  PatchRecommendation,
  PatchRecommendationDashboardStats,
} from '../../types/patch-recommendation.types';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Helper: Severity color mapping
const getSeverityColor = (severity: string): string => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return '#ff4d4f';
    case 'HIGH':
      return '#fa8c16';
    case 'MEDIUM':
      return '#faad14';
    case 'LOW':
      return '#52c41a';
    default:
      return '#d9d9d9';
  }
};

// Helper: Status badge color
const getStatusBadgeStatus = (
  status: string
): 'success' | 'processing' | 'error' | 'default' | 'warning' => {
  switch (status) {
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

// Helper: Format risk score
const formatRiskScore = (score: number | null): string => {
  if (!score) return '-';
  return score.toFixed(0);
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: number;
  color?: string;
  loading?: boolean;
}> = ({ title, value, color = '#1890ff', loading }) => (
  <Card style={{ textAlign: 'center', borderRadius: 8, height: '100%' }}>
    {loading ? (
      <Spin />
    ) : (
      <>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          {title}
        </Text>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>
          {value}
        </div>
      </>
    )}
  </Card>
);

export const PatchRecommendations = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [stats, setStats] = useState<PatchRecommendationDashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<PatchRecommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<PatchRecommendation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);

  // Modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, recsData] = await Promise.all([
        patchRecommendationService.getDashboardStats(),
        patchRecommendationService.listRecommendations({ limit: 1000 }),
      ]);
      setStats(statsData);
      setRecommendations(recsData.data);
      setFilteredRecommendations(recsData.data);
    } catch (error: any) {
      console.error('Failed to fetch recommendations:', error);
      message.error('Failed to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...recommendations];

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (rec) =>
          rec.vulnerability.cveId.toLowerCase().includes(search) ||
          rec.asset.name.toLowerCase().includes(search) ||
          rec.patch.patchId.toLowerCase().includes(search) ||
          rec.affectedSoftware?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((rec) => rec.status === statusFilter);
    }

    // Severity filter
    if (severityFilter.length > 0) {
      filtered = filtered.filter((rec) => severityFilter.includes(rec.severity));
    }

    setFilteredRecommendations(filtered);
  }, [searchText, statusFilter, severityFilter, recommendations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Action Handlers
  const handleAccept = async (id: string) => {
    Modal.confirm({
      title: 'Accept Recommendation',
      content: 'Are you sure you want to accept this patch recommendation?',
      onOk: async () => {
        setActionLoading(id);
        try {
          await patchRecommendationService.acceptRecommendation(id);
          message.success('Recommendation accepted');
          fetchData();
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
      fetchData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Failed to reject recommendation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeploy = async (id: string) => {
    Modal.confirm({
      title: 'Deploy Patch',
      content: 'This will create a deployment to install the recommended patch on the target asset. Continue?',
      okText: 'Deploy',
      onOk: async () => {
        setActionLoading(id);
        try {
          const result = await patchRecommendationService.deployRecommendation(id);
          const deployId = result.deployment?.deploymentId;
          Modal.success({
            title: 'Deployment Created',
            content: (
              <div>
                <p>Deployment <strong>{deployId || 'N/A'}</strong> has been created and is now in progress.</p>
                <p>You can track its status on the Patch Deployments page.</p>
              </div>
            ),
            okText: 'View Deployments',
            onOk: () => navigate('/patches/deployed/deployed'),
            cancelButtonProps: { style: { display: 'inline-block' } },
          });
          fetchData();
        } catch (error: any) {
          message.error(error?.response?.data?.message || 'Failed to deploy recommendation');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // Table columns
  const columns: ColumnsType<PatchRecommendation> = [
    {
      title: 'CVE ID',
      dataIndex: ['vulnerability', 'cveId'],
      key: 'cveId',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Asset',
      dataIndex: ['asset', 'name'],
      key: 'assetName',
      width: 200,
      render: (text: string, record) => (
        <a onClick={() => navigate(`/assets/${record.asset.id}`)}>
          {text}
        </a>
      ),
    },
    {
      title: 'Patch',
      dataIndex: ['patch', 'patchId'],
      key: 'patchId',
      width: 150,
      render: (text: string, record) => (
        <a onClick={() => navigate(`/patches/${record.patch.id}`)}>
          {text}
        </a>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity}</Tag>
      ),
      sorter: (a, b) => a.severity.localeCompare(b.severity),
    },
    {
      title: 'Risk Score',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 100,
      render: (score: number | null) => <Text>{formatRiskScore(score)}</Text>,
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
      title: 'Affected Software',
      dataIndex: 'affectedSoftware',
      key: 'affectedSoftware',
      ellipsis: true,
      render: (text: string) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
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
              onClick={() => handleDeploy(record.id)}
            >
              Deploy
            </Button>
          )}
          {['deployed', 'verified', 'failed'].includes(record.status) && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate('/patches/deployed/deployed')}
            >
              View Deployment
            </Button>
          )}
          {record.status === 'rejected' && (
            <Text type="secondary">Rejected</Text>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spin size="large" tip="Loading recommendations..." />
      </div>
    );
  }

  if (!stats) {
    return <Empty description="Failed to load recommendations" />;
  }

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Patch Recommendations
        </Title>
        <Button
          icon={<ReloadOutlined spin={refreshing} />}
          onClick={handleRefresh}
          loading={refreshing}
          type="primary"
        >
          Refresh
        </Button>
      </div>

      {/* Severity Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="Critical"
            value={stats.bySeverity.critical}
            color="#ff4d4f"
            loading={refreshing}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="High"
            value={stats.bySeverity.high}
            color="#fa8c16"
            loading={refreshing}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Medium"
            value={stats.bySeverity.medium}
            color="#faad14"
            loading={refreshing}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Low"
            value={stats.bySeverity.low}
            color="#52c41a"
            loading={refreshing}
          />
        </Col>
      </Row>

      {/* Status Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <StatCard
            title="Recommended"
            value={stats.byStatus.recommended}
            color="#faad14"
            loading={refreshing}
          />
        </Col>
        <Col xs={12} sm={8}>
          <StatCard
            title="Accepted"
            value={stats.byStatus.accepted}
            color="#1890ff"
            loading={refreshing}
          />
        </Col>
        <Col xs={12} sm={8}>
          <StatCard
            title="Deployed"
            value={stats.byStatus.deployed}
            color="#52c41a"
            loading={refreshing}
          />
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Space size="middle" wrap style={{ width: '100%' }}>
          <Input
            placeholder="Search CVE, Asset, Patch..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Filter by Status"
            value={statusFilter || undefined}
            onChange={setStatusFilter}
            style={{ width: 200 }}
            allowClear
          >
            <Select.Option value="recommended">Recommended</Select.Option>
            <Select.Option value="accepted">Accepted</Select.Option>
            <Select.Option value="rejected">Rejected</Select.Option>
            <Select.Option value="deployed">Deployed</Select.Option>
            <Select.Option value="verified">Verified</Select.Option>
            <Select.Option value="failed">Failed</Select.Option>
          </Select>
          <Select
            mode="multiple"
            placeholder="Filter by Severity"
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ minWidth: 200 }}
          >
            <Select.Option value="CRITICAL">Critical</Select.Option>
            <Select.Option value="HIGH">High</Select.Option>
            <Select.Option value="MEDIUM">Medium</Select.Option>
            <Select.Option value="LOW">Low</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Main Table */}
      <Card title="Recommendations" style={{ borderRadius: 8 }}>
        <Table
          dataSource={filteredRecommendations}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} recommendations`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

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

export default PatchRecommendations;
