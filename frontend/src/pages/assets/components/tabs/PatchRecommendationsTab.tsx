import { useState } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  ReloadOutlined,
  EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Spin,
  Tag,
  App,
  Modal,
  Empty,
  Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../../components/shared/DataTable';
import { RiskScoreDisplay } from '../../../../components/shared/RiskScoreDisplay';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { patchRecommendationService } from '../../../../services/patch-recommendation.service';
import type { PatchRecommendation } from '../../../../types/patch-recommendation.types';
import { getErrorMessage } from '../../../../utils/error';

const { Text } = Typography;
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




interface PatchRecommendationsTabProps {
  assetId: string;
  agentId?: string;
}

export const PatchRecommendationsTab = ({ assetId, agentId }: PatchRecommendationsTabProps) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { data: recommendationsResult, isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ['patch-recommendations', 'asset', assetId],
    queryFn: () => patchRecommendationService.getAssetRecommendations(assetId),
    enabled: !!assetId });
  const recommendations: PatchRecommendation[] = recommendationsResult?.data || [];
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

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
        } catch (error: unknown) {
          message.error(getErrorMessage(error, 'Failed to accept recommendation'));
        } finally {
          setActionLoading(null);
        }
      } });
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
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to reject recommendation'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeploy = async (id: string) => {
    if (!agentId) {
      message.warning('No agent connected to this asset');
      return;
    }

    Modal.confirm({
      title: 'Deploy Patch',
      content: 'This will create a deployment to install the recommended patch on this asset. Continue?',
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
            onOk: () => navigate('/patches/deployed/deployed') });
          fetchData();
        } catch (error: unknown) {
          message.error(getErrorMessage(error, 'Failed to deploy recommendation'));
        } finally {
          setActionLoading(null);
        }
      } });
  };

  // Calculate summary stats
  const criticalCount = recommendations.filter((r) => r.severity === 'CRITICAL').length;
  const highCount = recommendations.filter((r) => r.severity === 'HIGH').length;
  const mediumCount = recommendations.filter((r) => r.severity === 'MEDIUM').length;
  const lowCount = recommendations.filter((r) => r.severity === 'LOW').length;

  // Table columns
  const columns: ColumnsType<PatchRecommendation> = [
    {
      title: 'CVE ID',
      dataIndex: ['vulnerability', 'cveId'],
      key: 'cveId',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text> },
    {
      title: 'Vulnerability',
      dataIndex: ['vulnerability', 'title'],
      key: 'vulnTitle',
      ellipsis: true,
      render: (text: string) => <Text>{text}</Text> },
    {
      title: 'Patch',
      dataIndex: ['patch', 'patchId'],
      key: 'patchId',
      width: 150,
      render: (text: string, record) => (
        <a onClick={() => navigate(`/patches/${record.patch.id}`)}>{text}</a>
      ) },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => <Tag color={getSeverityColor(severity)}>{severity}</Tag>,
      sorter: (a, b) => a.severity.localeCompare(b.severity) },
    {
      title: 'Risk Score',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 100,
      render: (score: number | null) => <RiskScoreDisplay score={score} size="small" />,
      sorter: (a, b) => (a.riskScore || 0) - (b.riskScore || 0),
      defaultSortOrder: 'descend' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <StatusBadge status={status} /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'RECOMMENDED' && (
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
          {record.status === 'ACCEPTED' && (
            <Button
              type="primary"
              size="small"
              icon={<RocketOutlined />}
              loading={actionLoading === record.id}
              onClick={() => handleDeploy(record.id)}
              disabled={!agentId}
            >
              Deploy
            </Button>
          )}
          {['DEPLOYED', 'VERIFIED', 'FAILED'].includes(record.status) && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate('/patches/deployed/deployed')}
            >
              View Deployment
            </Button>
          )}
          {record.status === 'REJECTED' && (
            <Text type="secondary">Rejected</Text>
          )}
        </Space>
      ) },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return <Empty description="No patch recommendations for this asset" />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Total Recommendations
            </Text>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
              {recommendations.length}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Critical
            </Text>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>
              {criticalCount}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              High
            </Text>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{highCount}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Card style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Medium
            </Text>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>
              {mediumCount}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Card style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Low
            </Text>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{lowCount}</div>
          </Card>
        </Col>
      </Row>

      {/* Recommendations Table */}
      <Card
        title="Patch Recommendations"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
            size="small"
          >
            Refresh
          </Button>
        }
      >
        <DataTable
          data={recommendations}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
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
