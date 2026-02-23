import { useState } from 'react';
import {
  SafetyOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  DeploymentUnitOutlined,
  ReloadOutlined,
  BugOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  App,
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Spin,
  Empty,
  Timeline,
  Button,
  Tabs,
  Modal,
  Input,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetPatches, useAssetDeployments } from '../../../../hooks/useAssets';
import { patchRecommendationService } from '../../../../services/patch-recommendation.service';
import { patchService } from '../../../../services/patch.service';
import type { AssetRelatedPatch, AssetDeployment, PatchSummary } from '../../../../types/asset.types';
import type { PatchRecommendation } from '../../../../types/patch-recommendation.types';
import { getErrorMessage } from '../../../../utils/error';
import { createPatchColumns, createRecommendationColumns, deploymentColumns } from './unified-patches/patchColumns';
import { getStatusColor } from './unified-patches/patchHelpers';
import { PatchOverviewTab } from './unified-patches/PatchOverviewTab';

const { Text } = Typography;
const { TextArea } = Input;

interface UnifiedPatchesTabProps {
  assetId: string;
  agentId?: string;
  patchSummary?: PatchSummary;
}

export const UnifiedPatchesTab = ({ assetId, agentId, patchSummary: initialSummary }: UnifiedPatchesTabProps) => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const { data: patchesResult, isLoading: loadingPatches, refetch: refetchPatches } = useAssetPatches(assetId);
  const { data: deploymentsData, isLoading: loadingDeployments } = useAssetDeployments(assetId);
  const { data: recommendationsResult, isLoading: recommendationsLoading, refetch: fetchRecommendations } = useQuery({
    queryKey: ['patch-recommendations', 'asset', assetId],
    queryFn: () => patchRecommendationService.getAssetRecommendations(assetId),
    enabled: !!assetId,
  });

  const patches: AssetRelatedPatch[] = patchesResult?.data || [];
  const summary: PatchSummary | null = patchesResult?.summary || null;
  const deployments: AssetDeployment[] = deploymentsData || [];
  const recommendations: PatchRecommendation[] = recommendationsResult?.data || [];
  const loading = loadingPatches || loadingDeployments;

  const [deploying, setDeploying] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  const handleDeploy = async (patchList: { id: string; name?: string }[]) => {
    if (!agentId) { message.warning('No agent connected to this asset'); return; }
    setDeploying(true);
    try {
      await patchService.createDeployment({
        name: patchList.length === 1 ? `Deploy ${patchList[0].name || 'Patch'}` : `Deploy ${patchList.length} Missing Patches`,
        targetAgentIds: [agentId],
        patches: patchList.map(p => ({ id: p.id })),
        skipApprovalCheck: true,
      });
      message.success(patchList.length === 1 ? `Deployment created for ${patchList[0].name}` : `Deployment created for ${patchList.length} patches`);
      refetchPatches();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to create deployment'));
    } finally {
      setDeploying(false);
    }
  };

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
        } catch (error: unknown) {
          message.error(getErrorMessage(error, 'Failed to accept recommendation'));
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
    if (!selectedRecommendation || !rejectReason.trim()) { message.warning('Please provide a reason for rejection'); return; }
    setActionLoading(selectedRecommendation);
    try {
      await patchRecommendationService.rejectRecommendation(selectedRecommendation, rejectReason);
      message.success('Recommendation rejected');
      setRejectModalVisible(false);
      setSelectedRecommendation(null);
      setRejectReason('');
      fetchRecommendations();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to reject recommendation'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeployRecommendation = async (id: string) => {
    if (!agentId) { message.warning('No agent connected to this asset'); return; }
    setActionLoading(id);
    try {
      await patchRecommendationService.deployRecommendation(id);
      message.success('Deployment initiated successfully');
      fetchRecommendations();
      refetchPatches();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to deploy recommendation'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spin size="large" /></div>;
  }

  const patchSummary = summary || initialSummary;
  const missingPatches = patches.filter((p) => p.status === 'MISSING');
  const criticalRecs = recommendations.filter((r) => r.severity === 'CRITICAL').length;
  const highRecs = recommendations.filter((r) => r.severity === 'HIGH').length;
  const mediumRecs = recommendations.filter((r) => r.severity === 'MEDIUM').length;
  const lowRecs = recommendations.filter((r) => r.severity === 'LOW').length;

  const patchColumns = createPatchColumns({ agentId, deploying, onDeploy: handleDeploy });
  const recommendationColumns = createRecommendationColumns({
    agentId, actionLoading, onAccept: handleAccept, onReject: handleReject,
    onDeploy: handleDeployRecommendation, onNavigate: navigate,
  });

  const tabItems = [
    {
      key: 'overview',
      label: <span><DashboardOutlined /> Overview</span>,
      children: <PatchOverviewTab patchSummary={patchSummary || null} patches={patches} />,
    },
    {
      key: 'recommendations',
      label: <span><BugOutlined /> Vulnerability Remediation ({recommendations.length})</span>,
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}><Card style={{ textAlign: 'center' }}><Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Total Recommendations</Text><div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>{recommendations.length}</div></Card></Col>
            <Col span={4.5}><Card style={{ textAlign: 'center' }}><Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Critical</Text><div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>{criticalRecs}</div></Card></Col>
            <Col span={4.5}><Card style={{ textAlign: 'center' }}><Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>High</Text><div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{highRecs}</div></Card></Col>
            <Col span={4.5}><Card style={{ textAlign: 'center' }}><Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Medium</Text><div style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>{mediumRecs}</div></Card></Col>
            <Col span={4.5}><Card style={{ textAlign: 'center' }}><Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Low</Text><div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{lowRecs}</div></Card></Col>
          </Row>
          <Card title="CVE-Based Patch Recommendations" extra={<Button icon={<ReloadOutlined />} onClick={() => { void fetchRecommendations(); }} loading={recommendationsLoading} size="small">Refresh</Button>}>
            {recommendationsLoading ? <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
              : recommendations.length > 0 ? <DataTable data={recommendations} columns={recommendationColumns} rowKey="id" pagination={{ pageSize: 20 }} scroll={{ x: 'max-content' }} size="small" />
              : <Empty description="No patch recommendations for this asset" />}
          </Card>
        </div>
      ),
    },
    {
      key: 'all-patches',
      label: <span><SafetyOutlined /> All Patches ({patches.length})</span>,
      children: (
        <Card title={<Space><SafetyOutlined /><span>All Patches ({patches.length})</span></Space>} size="small"
          extra={missingPatches.length > 0 && (
            <Button type="primary" icon={<DeploymentUnitOutlined />} disabled={!agentId || deploying} loading={deploying}
              title={!agentId ? 'No agent connected to this asset' : undefined}
              onClick={() => handleDeploy(missingPatches.map(p => ({ id: p.id, name: p.name })))}>
              Deploy All Missing ({missingPatches.length})
            </Button>
          )}>
          {patches.length > 0
            ? <DataTable columns={patchColumns} data={patches} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true }} size="small" />
            : <Empty description="No patches found for this asset" />}
        </Card>
      ),
    },
    {
      key: 'history',
      label: <span><HistoryOutlined /> Deployment History ({deployments.length})</span>,
      children: (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title={<Space><HistoryOutlined /><span>Recent Deployments</span></Space>} size="small">
              {deployments.length > 0
                ? <DataTable columns={deploymentColumns} data={deployments} rowKey="id" pagination={{ pageSize: 10 }} size="small" />
                : <Empty description="No deployment history" />}
            </Card>
          </Col>
          <Col span={12}>
            <Card title={<Space><ClockCircleOutlined /><span>Deployment Timeline</span></Space>} size="small">
              {deployments.length > 0 ? (
                <Timeline style={{ marginTop: 16, maxHeight: 400, overflowY: 'auto' }}
                  items={deployments.slice(0, 10).map((deployment) => ({
                    color: deployment.status === 'COMPLETED' ? 'green' : deployment.status === 'FAILED' ? 'red' : 'blue',
                    children: (
                      <div>
                        <Space orientation="vertical" size={0}>
                          <Space>
                            <Text strong>{deployment.patchName}</Text>
                            <Tag color={getStatusColor(deployment.status)}>{deployment.status}</Tag>
                          </Space>
                          <Text type="secondary" style={{ fontSize: '16px' }}>{new Date(deployment.date).toLocaleString()}</Text>
                        </Space>
                      </div>
                    ),
                  }))} />
              ) : <Empty description="No deployment history" />}
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div>
      <Tabs defaultActiveKey="overview" items={tabItems} size="small" />
      <Modal title="Reject Recommendation" open={rejectModalVisible} onOk={handleRejectConfirm}
        onCancel={() => { setRejectModalVisible(false); setSelectedRecommendation(null); setRejectReason(''); }}
        confirmLoading={actionLoading === selectedRecommendation}>
        <p>Please provide a reason for rejecting this recommendation:</p>
        <TextArea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." />
      </Modal>
    </div>
  );
};
