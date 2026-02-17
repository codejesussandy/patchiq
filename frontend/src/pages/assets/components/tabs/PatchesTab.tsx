import { useState } from 'react';
import {
  SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, SyncOutlined, WarningOutlined,
  HistoryOutlined, DeploymentUnitOutlined,
} from '@ant-design/icons';
import {
  App, Card, Row, Col, Tag, Typography, Space, Spin, Empty, Badge, Timeline, Button,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetPatches, useAssetDeployments } from '../../../../hooks/useAssets';
import { patchService } from '../../../../services/patch.service';
import type { AssetRelatedPatch, AssetDeployment, PatchSummary } from '../../../../types/asset.types';
import { getErrorMessage } from '../../../../utils/error';
import { PatchesSummaryCards } from './PatchesSummaryCards';

const { Text } = Typography;

interface PatchesTabProps {
  assetId: string;
  agentId?: string;
  patchSummary?: PatchSummary;
}

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'critical': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'gold';
    case 'low': return 'green';
    default: return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'INSTALLED': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'MISSING': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'PENDING': return <SyncOutlined spin style={{ color: '#1890ff' }} />;
    case 'FAILED': return <WarningOutlined style={{ color: '#fa8c16' }} />;
    default: return <ClockCircleOutlined />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'INSTALLED': case 'SUCCESS': return 'success';
    case 'MISSING': case 'FAILED': return 'error';
    case 'PENDING': return 'processing';
    default: return 'default';
  }
};

export const PatchesTab = ({ assetId, agentId, patchSummary: initialSummary }: PatchesTabProps) => {
  const { message } = App.useApp();
  const { data: patchesResult, isLoading: loadingPatches, isError: patchesError, refetch: refetchPatches } = useAssetPatches(assetId);
  const { data: deploymentsData, isLoading: loadingDeployments } = useAssetDeployments(assetId);
  const [deploying, setDeploying] = useState(false);

  const patches: AssetRelatedPatch[] = patchesResult?.data || [];
  const summary: PatchSummary | null = patchesResult?.summary || null;
  const deployments: AssetDeployment[] = deploymentsData || [];

  const handleDeploy = async (patchList: { id: string; name?: string }[]) => {
    if (!agentId) { message.warning('No agent connected to this asset'); return; }
    setDeploying(true);
    try {
      await patchService.createDeployment({
        name: patchList.length === 1 ? `Deploy ${patchList[0].name || 'Patch'}` : `Deploy ${patchList.length} Missing Patches`,
        targetAgentIds: [agentId], patches: patchList.map(p => ({ id: p.id })), skipApprovalCheck: true,
      });
      message.success(patchList.length === 1 ? `Deployment created for ${patchList[0].name}` : `Deployment created for ${patchList.length} patches`);
      refetchPatches();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to create deployment'));
    } finally { setDeploying(false); }
  };

  if (loadingPatches || loadingDeployments) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spin size="large" /></div>;
  }
  if (patchesError) return <Empty description="Failed to load patch information" />;

  const patchSummary = summary || initialSummary;
  const missingPatches = patches.filter((p) => p.status === 'MISSING');

  const patchColumns: ColumnsType<AssetRelatedPatch> = [
    { title: 'Patch', key: 'patch', render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space>{getStatusIcon(record.status)}<Text strong>{record.name}</Text></Space>
          {record.kbNumber && <Text type="secondary" style={{ fontSize: '16px', marginLeft: 22 }}>{record.kbNumber}</Text>}
        </Space>
      ),
    },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', width: 100,
      filters: [{ text: 'Critical', value: 'CRITICAL' }, { text: 'High', value: 'HIGH' }, { text: 'Medium', value: 'MEDIUM' }, { text: 'Low', value: 'LOW' }],
      onFilter: (value, record) => record.severity === value,
      render: (severity: string) => <Tag color={getSeverityColor(severity)}>{severity}</Tag>,
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      filters: [{ text: 'Installed', value: 'INSTALLED' }, { text: 'Missing', value: 'MISSING' }, { text: 'Pending', value: 'PENDING' }, { text: 'Failed', value: 'FAILED' }],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => <Badge status={getStatusColor(status)} text={status} />,
    },
    { title: 'Release Date', dataIndex: 'publishedAt', key: 'publishedAt', width: 120,
      sorter: (a, b) => { if (!a.publishedAt || !b.publishedAt) return 0; return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(); },
      render: (date?: string) => date ? new Date(date).toLocaleDateString() : '\u2014',
    },
    { title: 'Action', key: 'action', width: 100,
      render: (_, record) => (record.status === 'MISSING' || record.status === 'FAILED') ? (
        <Button type="primary" size="small" icon={<DeploymentUnitOutlined />} disabled={!agentId || deploying} loading={deploying}
          title={!agentId ? 'No agent connected to this asset' : undefined}
          onClick={() => handleDeploy([{ id: record.id, name: record.name }])}>Deploy</Button>
      ) : null,
    },
  ];

  const deploymentColumns: ColumnsType<AssetDeployment> = [
    { title: 'Patch', dataIndex: 'patchName', key: 'patchName', render: (name: string) => <Text strong>{name}</Text> },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 150, sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(), defaultSortOrder: 'descend', render: (date: string) => new Date(date).toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (status: string) => <Badge status={getStatusColor(status)} text={status} /> },
  ];

  return (
    <div>
      {patchSummary && <PatchesSummaryCards patchSummary={patchSummary} patches={patches} />}

      <Card title={<Space><SafetyOutlined /><span>All Patches ({patches.length})</span></Space>} size="small" style={{ marginBottom: 16 }}
        extra={missingPatches.length > 0 && (
          <Button type="primary" icon={<DeploymentUnitOutlined />} disabled={!agentId || deploying} loading={deploying}
            title={!agentId ? 'No agent connected to this asset' : undefined}
            onClick={() => handleDeploy(missingPatches.map(p => ({ id: p.id, name: p.name })))}>Deploy All Missing</Button>
        )}>
        {patches.length > 0 ? (
          <DataTable columns={patchColumns} data={patches} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true }} size="small" />
        ) : (
          <Empty description="No patches found for this asset" />
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title={<Space><HistoryOutlined /><span>Recent Deployments</span></Space>} size="small">
            {deployments.length > 0 ? (
              <DataTable columns={deploymentColumns} data={deployments.slice(0, 5)} rowKey="id" pagination={false} size="small" />
            ) : (<Empty description="No deployment history" />)}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<Space><ClockCircleOutlined /><span>Deployment Timeline</span></Space>} size="small">
            {deployments.length > 0 ? (
              <Timeline style={{ marginTop: 16, maxHeight: 250, overflowY: 'auto' }}
                items={deployments.slice(0, 5).map((deployment) => ({
                  color: deployment.status === 'SUCCESS' ? 'green' : deployment.status === 'FAILED' ? 'red' : 'blue',
                  children: (
                    <div><Space direction="vertical" size={0}>
                      <Space><Text strong>{deployment.patchName}</Text><Tag color={getStatusColor(deployment.status)}>{deployment.status}</Tag></Space>
                      <Text type="secondary" style={{ fontSize: '16px' }}>{new Date(deployment.date).toLocaleString()}</Text>
                    </Space></div>
                  ),
                }))} />
            ) : (<Empty description="No deployment history" />)}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
