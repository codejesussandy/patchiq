import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  DeploymentUnitOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { Space, Tag, Typography, Badge, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RiskScoreDisplay } from '../../../../../components/shared/RiskScoreDisplay';
import type { AssetRelatedPatch, AssetDeployment } from '../../../../../types/asset.types';
import type { PatchRecommendation } from '../../../../../types/patch-recommendation.types';
import { getSeverityColor, getStatusIcon, getStatusColor, getStatusBadgeStatus } from './patchHelpers';

const { Text } = Typography;

interface PatchColumnDeps {
  agentId?: string;
  deploying: boolean;
  onDeploy: (patchList: { id: string; name?: string }[]) => void;
}

export const createPatchColumns = ({ agentId, deploying, onDeploy }: PatchColumnDeps): ColumnsType<AssetRelatedPatch> => [
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
          <Text type="secondary" style={{ fontSize: '16px', marginLeft: 22 }}>{record.kbNumber}</Text>
        )}
      </Space>
    ),
  },
  {
    title: 'Severity', dataIndex: 'severity', key: 'severity', width: 100,
    filters: [
      { text: 'Critical', value: 'CRITICAL' },
      { text: 'High', value: 'HIGH' },
      { text: 'Medium', value: 'MEDIUM' },
      { text: 'Low', value: 'LOW' },
    ],
    onFilter: (value, record) => record.severity === value,
    render: (severity: string) => <Tag color={getSeverityColor(severity)}>{severity}</Tag>,
  },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 100,
    filters: [
      { text: 'Installed', value: 'INSTALLED' },
      { text: 'Missing', value: 'MISSING' },
      { text: 'Pending', value: 'PENDING' },
      { text: 'Failed', value: 'FAILED' },
    ],
    onFilter: (value, record) => record.status === value,
    render: (status: string) => <Badge status={getStatusColor(status)} text={status} />,
  },
  {
    title: 'Release Date', dataIndex: 'publishedAt', key: 'publishedAt', width: 120,
    sorter: (a, b) => {
      if (!a.publishedAt || !b.publishedAt) return 0;
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    },
    render: (date?: string) => date ? new Date(date).toLocaleDateString() : '\u2014',
  },
  {
    title: 'Action', key: 'action', width: 100,
    render: (_, record) => {
      if (record.status === 'MISSING' || record.status === 'FAILED') {
        return (
          <Button
            type="primary" size="small" icon={<DeploymentUnitOutlined />}
            disabled={!agentId || deploying} loading={deploying}
            title={!agentId ? 'No agent connected to this asset' : undefined}
            onClick={() => onDeploy([{ id: record.id, name: record.name }])}
          >
            Deploy
          </Button>
        );
      }
      return null;
    },
  },
];

interface RecommendationColumnDeps {
  agentId?: string;
  actionLoading: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDeploy: (id: string) => void;
  onNavigate: (path: string) => void;
}

export const createRecommendationColumns = ({
  agentId, actionLoading, onAccept, onReject, onDeploy, onNavigate,
}: RecommendationColumnDeps): ColumnsType<PatchRecommendation> => [
  {
    title: 'CVE ID', dataIndex: ['vulnerability', 'cveId'], key: 'cveId', width: 150,
    render: (text: string) => <Space><BugOutlined style={{ color: '#fa8c16' }} /><Text strong>{text}</Text></Space>,
  },
  {
    title: 'Vulnerability', dataIndex: ['vulnerability', 'title'], key: 'vulnTitle', ellipsis: true,
    render: (text: string) => <Text>{text}</Text>,
  },
  {
    title: 'Patch', dataIndex: ['patch', 'patchId'], key: 'patchId', width: 150,
    render: (text: string, record) => <a onClick={() => onNavigate(`/patches/${record.patch.id}`)}>{text}</a>,
  },
  {
    title: 'Severity', dataIndex: 'severity', key: 'severity', width: 100,
    render: (severity: string) => <Tag color={getSeverityColor(severity)}>{severity}</Tag>,
    sorter: (a, b) => a.severity.localeCompare(b.severity),
  },
  {
    title: 'Risk Score', dataIndex: 'riskScore', key: 'riskScore', width: 100,
    render: (score: number | null) => <RiskScoreDisplay score={score} size="small" />,
    sorter: (a, b) => (a.riskScore || 0) - (b.riskScore || 0),
    defaultSortOrder: 'descend',
  },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 120,
    render: (status: string) => (
      <Badge status={getStatusBadgeStatus(status)} text={status.charAt(0).toUpperCase() + status.slice(1)} />
    ),
  },
  {
    title: 'Actions', key: 'actions', width: 220, fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        {record.status === 'recommended' && (
          <>
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} loading={actionLoading === record.id} onClick={() => onAccept(record.id)}>
              Accept
            </Button>
            <Button size="small" danger icon={<CloseCircleOutlined />} loading={actionLoading === record.id} onClick={() => onReject(record.id)}>
              Reject
            </Button>
          </>
        )}
        {record.status === 'accepted' && (
          <Button type="primary" size="small" icon={<RocketOutlined />} loading={actionLoading === record.id} onClick={() => onDeploy(record.id)} disabled={!agentId}>
            Deploy
          </Button>
        )}
        {!['RECOMMENDED', 'ACCEPTED'].includes(record.status) && <Text type="secondary">{'\u2014'}</Text>}
      </Space>
    ),
  },
];

export const deploymentColumns: ColumnsType<AssetDeployment> = [
  { title: 'Patch', dataIndex: 'patchName', key: 'patchName', render: (name: string) => <Text strong>{name}</Text> },
  {
    title: 'Date', dataIndex: 'date', key: 'date', width: 150,
    sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    defaultSortOrder: 'descend',
    render: (date: string) => new Date(date).toLocaleString(),
  },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 100,
    render: (status: string) => <Badge status={getStatusColor(status)} text={status} />,
  },
];
