import { useState } from 'react';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  CloseOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Space,
  Tag,
  Typography,
  Button,
  Input,
  Row,
  Col,
  Badge,
  Progress,
  Tooltip,
} from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../components/shared/DataTable';
import { exportToCsv } from './csvExport';

const { Text } = Typography;

export interface TaskItem {
  id: string;
  agentName: string;
  agentOs: string;
  packageName?: string;
  status: string;
  errorMessage?: string | null;
  output?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  duration?: string | null;
  retryAttempt?: number;
  commandResult?: string | null;
}

export interface DeploymentSummary {
  name: string;
  status: string;
  progress: number;
  total: number;
  pending: number;
  succeeded: number;
  failed: number;
  type?: string;
  retryCount?: number;
  patches?: { patchId: string; title: string; software?: string; severity: string }[];
}

interface DeploymentTasksModalProps {
  open: boolean;
  onClose: () => void;
  summary: DeploymentSummary | null;
  tasks: TaskItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onRollback?: (task: TaskItem) => void;
  rollbackLoadingId?: string | null;
  showPackageColumn?: boolean;
  message: MessageInstance;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  SUCCESS: { color: 'green', icon: <CheckCircleOutlined /> },
  COMPLETED: { color: 'green', icon: <CheckCircleOutlined /> },
  FAILED: { color: 'red', icon: <CloseCircleOutlined /> },
  PENDING: { color: 'orange', icon: <ClockCircleOutlined /> },
  IN_PROGRESS: { color: 'blue', icon: <SyncOutlined spin /> },
};

const statusColor = (status: string) => {
  const colors: Record<string, string> = {
    COMPLETED: 'green',
    IN_PROGRESS: 'blue',
    PENDING: 'orange',
    FAILED: 'red',
    CANCELLED: 'default',
    SUCCESS: 'green',
  };
  return colors[status] || 'default';
};

const severityColor = (sev: string) => {
  const colors: Record<string, string> = {
    CRITICAL: 'red',
    HIGH: 'orange',
    MEDIUM: 'gold',
    LOW: 'blue',
    UNSPECIFIED: 'default',
  };
  return colors[sev] || 'default';
};

function osIcon(os: string) {
  const lower = (os || '').toLowerCase();
  if (lower.includes('windows')) return <WindowsOutlined style={{ color: '#1890ff' }} />;
  if (lower.includes('mac') || lower.includes('darwin')) return <AppleOutlined />;
  if (lower.includes('linux') || lower.includes('ubuntu')) return <LinuxOutlined style={{ color: '#f9a825' }} />;
  return null;
}

export function DeploymentTasksModal({
  open,
  onClose,
  summary,
  tasks,
  loading,
  onRefresh,
  onRollback,
  rollbackLoadingId,
  showPackageColumn = false,
  message,
}: DeploymentTasksModalProps) {
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      (task.agentName || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (task.packageName || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter = filter === 'All' || task.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    exportToCsv(
      filteredTasks,
      [
        { header: 'Agent', accessor: (t) => t.agentName },
        ...(showPackageColumn ? [{ header: 'Package', accessor: (t: TaskItem) => t.packageName || '' }] : []),
        { header: 'Status', accessor: (t) => t.status },
        { header: 'Error', accessor: (t) => t.errorMessage || '' },
        { header: 'Duration', accessor: (t) => t.duration || '' },
      ],
      'deployment_tasks',
      message,
    );
  };

  const columns: ColumnsType<TaskItem> = [
    {
      title: 'Endpoint',
      key: 'endpoint',
      render: (_: unknown, record: TaskItem) => (
        <Space>
          {osIcon(record.agentOs)}
          <Text>{record.agentName}</Text>
        </Space>
      ),
    },
    ...(showPackageColumn
      ? [{
          title: 'Package',
          dataIndex: 'packageName' as const,
          key: 'packageName',
          sorter: (a: TaskItem, b: TaskItem) => (a.packageName || '').localeCompare(b.packageName || ''),
        }]
      : []),
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_: unknown, record: TaskItem) => {
        const c = statusConfig[record.status] || { color: 'default', icon: null };
        return (
          <div>
            <Tag color={c.color} icon={c.icon}>{record.status}</Tag>
            {record.retryAttempt && record.retryAttempt > 0 && (
              <div style={{ marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Retry #{record.retryAttempt}</Text>
              </div>
            )}
            {record.errorMessage && (
              <div style={{ marginTop: 4 }}>
                <Text type="danger" style={{ fontSize: 11 }}>{record.errorMessage}</Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 100,
      render: (_: unknown, record: TaskItem) => {
        if (record.status === 'IN_PROGRESS') return <LoadingOutlined style={{ color: '#1890ff' }} />;
        return record.duration || '-';
      },
    },
    ...(onRollback
      ? [{
          title: 'Actions',
          key: 'actions',
          width: 80,
          render: (_: unknown, record: TaskItem) => (
            <Space>
              {(record.status === 'FAILED' || record.status === 'SUCCESS') && (
                <Tooltip title="Rollback">
                  <Button
                    type="text"
                    size="small"
                    icon={<RollbackOutlined />}
                    loading={rollbackLoadingId === record.id}
                    onClick={() => onRollback(record)}
                    style={{ color: record.status === 'FAILED' ? '#ff4d4f' : '#faad14' }}
                  />
                </Tooltip>
              )}
            </Space>
          ),
        }]
      : []),
  ];

  return (
    <Modal
      title={
        <Space>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ marginLeft: -16, marginRight: -8 }}
          />
          <Text strong style={{ fontSize: 16 }}>
            {summary?.name || 'Deployment Tasks'}
          </Text>
          {summary && <Tag color={statusColor(summary.status)}>{summary.status}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1200}
      footer={null}
      closable={false}
    >
      {summary && (
        <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <Progress
            percent={summary.progress}
            status={
              summary.status === 'FAILED' ? 'exception'
                : summary.status === 'COMPLETED' ? 'success'
                : 'active'
            }
            strokeWidth={10}
          />
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col><Space size={4}><Badge status="default" /><Text type="secondary">Total:</Text><Text strong>{summary.total}</Text></Space></Col>
            <Col><Space size={4}><Badge status="warning" /><Text type="secondary">Pending:</Text><Text strong>{summary.pending}</Text></Space></Col>
            <Col><Space size={4}><Badge status="success" /><Text type="secondary">Succeeded:</Text><Text strong style={{ color: '#52c41a' }}>{summary.succeeded}</Text></Space></Col>
            <Col><Space size={4}><Badge status="error" /><Text type="secondary">Failed:</Text><Text strong style={{ color: '#ff4d4f' }}>{summary.failed}</Text></Space></Col>
            {summary.type && (
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Type: <Tag style={{ marginRight: 0 }}>{summary.type.toUpperCase()}</Tag>
                </Text>
              </Col>
            )}
          </Row>
          {summary.patches && summary.patches.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">Patches: </Text>
              <Space size={4} wrap>
                {summary.patches.map((p, i) => (
                  <Tag key={i} color={severityColor(p.severity)}>
                    {p.patchId} - {p.software || p.title}
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 12, display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Input
            placeholder="Search tasks..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button.Group>
            {['All', 'SUCCESS', 'FAILED', 'PENDING', 'IN_PROGRESS'].map(f => (
              <Button key={f} type={filter === f ? 'primary' : 'default'} size="small" onClick={() => setFilter(f)}>
                {f}
              </Button>
            ))}
          </Button.Group>
        </div>
        <Space>
          {onRefresh && (
            <Button icon={<ReloadOutlined />} size="small" onClick={onRefresh} loading={loading}>
              Refresh
            </Button>
          )}
          <Button icon={<ExportOutlined />} size="small" onClick={handleExport}>
            Export
          </Button>
        </Space>
      </div>

      <DataTable
        columns={columns}
        data={filteredTasks}
        rowKey="id"
        size="small"
        pagination={false}
        expandable={{
          expandedRowRender: (record) => {
            const output = record.output;
            const error = record.errorMessage;
            if (!output && !error) return <Text type="secondary">No output available</Text>;
            return (
              <div style={{ padding: '4px 0' }}>
                {error && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong type="danger" style={{ fontSize: 16 }}>Error: </Text>
                    <Text type="danger" style={{ fontSize: 16 }}>{error}</Text>
                  </div>
                )}
                {output && (
                  <pre style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    fontSize: 16,
                    maxHeight: 300,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}>
                    {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                  </pre>
                )}
              </div>
            );
          },
          rowExpandable: () => true,
        }}
        scroll={{ x: 'max-content' }}
      />
    </Modal>
  );
}
