import { useMemo, useState } from 'react';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, RocketOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Row, Col, Card, Typography, Button, Space, Spin, Input, Select, App, Modal, Empty,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { BulkActionBar } from '../../components/shared/BulkActionBar';
import { DataTable } from '../../components/shared/DataTable';
import {
  usePatchRecommendations,
  usePatchRecommendationDashboardStats,
  useAcceptRecommendation,
  useRejectRecommendation,
  useDeployRecommendation,
  useBulkAcceptRecommendations,
  useBulkRejectRecommendations,
  useBulkDeployRecommendations,
} from '../../hooks/usePatchRecommendations';
import type { PatchRecommendation } from '../../types/patch-recommendation.types';
import { getErrorMessage } from '../../utils/error';
import { buildRecommendationColumns } from './components/recommendations/recommendationColumns';
import { StatCard } from './components/recommendations/StatCard';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const PatchRecommendations = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { data: stats = null, isLoading: statsLoading, isRefetching: statsRefetching } = usePatchRecommendationDashboardStats();
  const { data: recsData, isLoading: recsLoading, isRefetching: recsRefetching, refetch } = usePatchRecommendations({ limit: 1000 });
  const recommendations: PatchRecommendation[] = useMemo(() => recsData?.data || [], [recsData?.data]);
  const loading = statsLoading || recsLoading;
  const refreshing = statsRefetching || recsRefetching;
  const acceptMutation = useAcceptRecommendation();
  const rejectMutation = useRejectRecommendation();
  const deployMutation = useDeployRecommendation();
  const bulkAcceptMutation = useBulkAcceptRecommendations();
  const bulkRejectMutation = useBulkRejectRecommendations();
  const bulkDeployMutation = useBulkDeployRecommendations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkRejectModalVisible, setBulkRejectModalVisible] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const filteredRecommendations = useMemo(() => {
    let filtered = [...recommendations];
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((rec) =>
        rec.vulnerability.cveId.toLowerCase().includes(search) ||
        rec.asset.name.toLowerCase().includes(search) ||
        rec.patch.patchId.toLowerCase().includes(search) ||
        rec.affectedSoftware?.toLowerCase().includes(search));
    }
    if (statusFilter) filtered = filtered.filter((rec) => rec.status === statusFilter);
    if (severityFilter.length > 0) filtered = filtered.filter((rec) => severityFilter.includes(rec.severity));
    return filtered;
  }, [recommendations, searchText, statusFilter, severityFilter]);

  const handleAccept = async (id: string) => {
    Modal.confirm({
      title: 'Accept Recommendation',
      content: 'Are you sure you want to accept this patch recommendation?',
      onOk: async () => {
        setActionLoading(id);
        try { await acceptMutation.mutateAsync({ id }); message.success('Recommendation accepted'); }
        catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to accept recommendation')); }
        finally { setActionLoading(null); }
      },
    });
  };

  const handleReject = (id: string) => { setSelectedRecommendation(id); setRejectReason(''); setRejectModalVisible(true); };

  const handleRejectConfirm = async () => {
    if (!selectedRecommendation || !rejectReason.trim()) { message.warning('Please provide a reason for rejection'); return; }
    setActionLoading(selectedRecommendation);
    try {
      await rejectMutation.mutateAsync({ id: selectedRecommendation, reason: rejectReason });
      message.success('Recommendation rejected');
      setRejectModalVisible(false); setSelectedRecommendation(null); setRejectReason('');
    } catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to reject recommendation')); }
    finally { setActionLoading(null); }
  };

  const handleDeploy = async (id: string) => {
    Modal.confirm({
      title: 'Deploy Patch',
      content: 'This will create a deployment to install the recommended patch on the target asset. Continue?',
      okText: 'Deploy',
      onOk: async () => {
        setActionLoading(id);
        try {
          const result = await deployMutation.mutateAsync(id);
          const deployId = result.deployment?.deploymentId;
          Modal.success({
            title: 'Deployment Created',
            content: <div><p>Deployment <strong>{String(deployId) || 'N/A'}</strong> has been created and is now in progress.</p><p>You can track its status on the Patch Deployments page.</p></div>,
            okText: 'View Deployments',
            onOk: () => navigate('/patches/deployed/deployed'),
            cancelButtonProps: { style: { display: 'inline-block' } },
          });
        } catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to deploy recommendation')); }
        finally { setActionLoading(null); }
      },
    });
  };

  // Bulk action helpers
  const selectedItems = recommendations.filter((r) => selectedRowKeys.includes(r.id));
  const selectedRecommended = selectedItems.filter((r) => r.status === 'recommended');
  const selectedAccepted = selectedItems.filter((r) => r.status === 'accepted');

  const handleBulkAccept = async () => {
    if (selectedRecommended.length === 0) { message.warning('No recommendations in RECOMMENDED status selected'); return; }
    Modal.confirm({
      title: `Accept ${selectedRecommended.length} Recommendation(s)`,
      content: `Are you sure you want to accept ${selectedRecommended.length} patch recommendation(s)?`,
      onOk: async () => {
        setBulkLoading(true);
        try {
          const result = await bulkAcceptMutation.mutateAsync({ ids: selectedRecommended.map((r) => r.id) });
          message.success(`${result.accepted} recommendation(s) accepted${result.skipped ? `, ${result.skipped} skipped` : ''}`);
          setSelectedRowKeys([]);
        } catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to bulk accept')); }
        finally { setBulkLoading(false); }
      },
    });
  };

  const handleBulkReject = () => {
    if (selectedRecommended.length === 0) { message.warning('No recommendations in RECOMMENDED status selected'); return; }
    setBulkRejectReason('');
    setBulkRejectModalVisible(true);
  };

  const handleBulkRejectConfirm = async () => {
    if (!bulkRejectReason.trim()) { message.warning('Please provide a reason for rejection'); return; }
    setBulkLoading(true);
    try {
      const result = await bulkRejectMutation.mutateAsync({ ids: selectedRecommended.map((r) => r.id), reason: bulkRejectReason });
      message.success(`${result.rejected} recommendation(s) rejected${result.skipped ? `, ${result.skipped} skipped` : ''}`);
      setBulkRejectModalVisible(false);
      setSelectedRowKeys([]);
    } catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to bulk reject')); }
    finally { setBulkLoading(false); }
  };

  const handleBulkDeploy = async () => {
    if (selectedAccepted.length === 0) { message.warning('No recommendations in ACCEPTED status selected'); return; }
    Modal.confirm({
      title: `Deploy ${selectedAccepted.length} Patch(es)`,
      content: `This will create deployments for ${selectedAccepted.length} accepted recommendation(s). Continue?`,
      okText: 'Deploy All',
      onOk: async () => {
        setBulkLoading(true);
        try {
          const result = await bulkDeployMutation.mutateAsync(selectedAccepted.map((r) => r.id));
          Modal.success({
            title: 'Bulk Deployment Created',
            content: (
              <div>
                <p><strong>{result.deployed}</strong> patch(es) deployed across <strong>{result.deployments.length}</strong> deployment(s).</p>
                {result.skipped > 0 && <p>{result.skipped} recommendation(s) were skipped.</p>}
                <p>You can track status on the Patch Deployments page.</p>
              </div>
            ),
            okText: 'View Deployments',
            onOk: () => navigate('/patches/deployed/deployed'),
          });
          setSelectedRowKeys([]);
        } catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to bulk deploy')); }
        finally { setBulkLoading(false); }
      },
    });
  };

  const columns = buildRecommendationColumns({ actionLoading, onAccept: handleAccept, onReject: handleReject, onDeploy: handleDeploy, onNavigate: navigate });

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><Spin size="large" tip="Loading recommendations..." /></div>;
  }

  if (!stats) return <Empty description="Failed to load recommendations" />;

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Patch Recommendations</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>AI-recommended patches based on your environment</Text>
        </div>
        <Button icon={<ReloadOutlined spin={refreshing} />} onClick={() => refetch()} loading={refreshing} type="primary">Refresh</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}><StatCard title="Critical" value={stats.bySeverity.critical} color="#ff4d4f" loading={refreshing} /></Col>
        <Col xs={12} sm={6}><StatCard title="High" value={stats.bySeverity.high} color="#fa8c16" loading={refreshing} /></Col>
        <Col xs={12} sm={6}><StatCard title="Medium" value={stats.bySeverity.medium} color="#faad14" loading={refreshing} /></Col>
        <Col xs={12} sm={6}><StatCard title="Low" value={stats.bySeverity.low} color="#52c41a" loading={refreshing} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}><StatCard title="Recommended" value={stats.byStatus.recommended} color="#faad14" loading={refreshing} /></Col>
        <Col xs={12} sm={8}><StatCard title="Accepted" value={stats.byStatus.accepted} color="#1890ff" loading={refreshing} /></Col>
        <Col xs={12} sm={8}><StatCard title="Deployed" value={stats.byStatus.deployed} color="#52c41a" loading={refreshing} /></Col>
      </Row>

      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Space size="middle" wrap style={{ width: '100%' }}>
          <Input placeholder="Search CVE, Asset, Patch..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300 }} allowClear />
          <Select placeholder="Filter by Status" value={statusFilter || undefined} onChange={setStatusFilter} style={{ width: 200 }} allowClear>
            <Select.Option value="RECOMMENDED">Recommended</Select.Option>
            <Select.Option value="ACCEPTED">Accepted</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
            <Select.Option value="DEPLOYED">Deployed</Select.Option>
            <Select.Option value="VERIFIED">Verified</Select.Option>
            <Select.Option value="FAILED">Failed</Select.Option>
          </Select>
          <Select mode="multiple" placeholder="Filter by Severity" value={severityFilter} onChange={setSeverityFilter} style={{ minWidth: 200 }}>
            <Select.Option value="CRITICAL">Critical</Select.Option>
            <Select.Option value="HIGH">High</Select.Option>
            <Select.Option value="MEDIUM">Medium</Select.Option>
            <Select.Option value="LOW">Low</Select.Option>
          </Select>
        </Space>
      </Card>

      <BulkActionBar selectedCount={selectedRowKeys.length} onClear={() => setSelectedRowKeys([])}>
        {selectedRecommended.length > 0 && (
          <>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={bulkLoading} onClick={handleBulkAccept}>
              Accept {selectedRecommended.length}
            </Button>
            <Button size="small" danger icon={<CloseCircleOutlined />} loading={bulkLoading} onClick={handleBulkReject}>
              Reject {selectedRecommended.length}
            </Button>
          </>
        )}
        {selectedAccepted.length > 0 && (
          <Button size="small" type="primary" icon={<RocketOutlined />} loading={bulkLoading} onClick={handleBulkDeploy}>
            Deploy {selectedAccepted.length}
          </Button>
        )}
      </BulkActionBar>

      <Card title="Recommendations" style={{ borderRadius: 8 }}>
        <DataTable
          size="middle"
          data={filteredRecommendations}
          columns={columns}
          rowKey="id"
          selectable
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={(keys) => setSelectedRowKeys(keys)}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} recommendations` }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal title="Reject Recommendation" open={rejectModalVisible} onOk={handleRejectConfirm}
        onCancel={() => { setRejectModalVisible(false); setSelectedRecommendation(null); setRejectReason(''); }}
        confirmLoading={actionLoading === selectedRecommendation}>
        <p>Please provide a reason for rejecting this recommendation:</p>
        <TextArea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." />
      </Modal>

      <Modal title={`Reject ${selectedRecommended.length} Recommendation(s)`} open={bulkRejectModalVisible} onOk={handleBulkRejectConfirm}
        onCancel={() => setBulkRejectModalVisible(false)}
        confirmLoading={bulkLoading}>
        <p>Please provide a reason for rejecting {selectedRecommended.length} recommendation(s):</p>
        <TextArea rows={4} value={bulkRejectReason} onChange={(e) => setBulkRejectReason(e.target.value)} placeholder="Reason for rejection..." />
      </Modal>
    </div>
  );
};

export default PatchRecommendations;
