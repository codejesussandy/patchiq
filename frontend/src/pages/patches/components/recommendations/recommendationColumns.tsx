import { CheckCircleOutlined, CloseCircleOutlined, RocketOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RiskScoreDisplay } from '../../../../components/shared/RiskScoreDisplay';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import type { PatchRecommendation } from '../../../../types/patch-recommendation.types';
import { getSeverityColor } from './recommendationHelpers';

const { Text } = Typography;

interface RecommendationColumnsConfig {
  actionLoading: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDeploy: (id: string) => void;
  onNavigate: (path: string) => void;
}

export function buildRecommendationColumns({ actionLoading, onAccept, onReject, onDeploy, onNavigate }: RecommendationColumnsConfig): ColumnsType<PatchRecommendation> {
  return [
    {
      title: 'CVE ID', dataIndex: ['vulnerability', 'cveId'], key: 'cveId', width: 150,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Asset', dataIndex: ['asset', 'name'], key: 'assetName', width: 200,
      render: (text: string, record) => <a onClick={() => onNavigate(`/assets/${record.asset.id}`)}>{text}</a>,
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
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Affected Software', dataIndex: 'affectedSoftware', key: 'affectedSoftware', ellipsis: true,
      render: (text: string) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'Actions', key: 'actions', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'RECOMMENDED' && (
            <>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />} loading={actionLoading === record.id} onClick={() => onAccept(record.id)}>Accept</Button>
              <Button size="small" danger icon={<CloseCircleOutlined />} loading={actionLoading === record.id} onClick={() => onReject(record.id)}>Reject</Button>
            </>
          )}
          {record.status === 'ACCEPTED' && (
            <Button type="primary" size="small" icon={<RocketOutlined />} loading={actionLoading === record.id} onClick={() => onDeploy(record.id)}>Deploy</Button>
          )}
          {['DEPLOYED', 'VERIFIED', 'FAILED'].includes(record.status) && (
            <Button size="small" icon={<EyeOutlined />} onClick={() => onNavigate('/patches/deployed/deployed')}>View Deployment</Button>
          )}
          {record.status === 'REJECTED' && <Text type="secondary">Rejected</Text>}
        </Space>
      ),
    },
  ];
}
