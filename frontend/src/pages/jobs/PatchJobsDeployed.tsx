import { useState, useEffect, useCallback } from 'react';
import {
  App,
  Input,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Modal,
  Row,
  Col,
  Progress,
  Badge,
  Tooltip,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  StopOutlined,
  RedoOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
} from '@ant-design/icons';
import { patchService } from '../../services/patch.service';

const { Text } = Typography;

// ============================================
// Types
// ============================================

type PatchDeploymentItem = {
  id: string;
  deploymentId: string;
  name: string;
  description: string | null;
  type: string;
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  pending: number;
  succeeded: number;
  failed: number;
  total: number;
  progress: number;
  triggerType: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  patches: { patchId: string; title: string; severity: string }[];
};

type TaskItem = {
  id: string;
  assetName: string;
  assetOs: string;
  agentName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  output: string | null;
  retryAttempt: number;
  rollbackAvailable: boolean;
  command: {
    id: string;
    status: string;
    executedAt: string | null;
    completedAt: string | null;
    result: string | null;
    errorMessage: string | null;
  } | null;
};

type DeploymentDetail = {
  id: string;
  deploymentId: string;
  name: string;
  description: string | null;
  type: string;
  stage: string;
  pending: number;
  succeeded: number;
  failed: number;
  total: number;
  progress: number;
  retryCount: number;
  autoRollback: boolean;
  triggerType: string | null;
  createdAt: string;
  completedAt: string | null;
  patches: { id: string; patchId: string; title: string; software: string; severity: string }[];
  tasks: TaskItem[];
};

// ============================================
// Component
// ============================================

export const PatchJobsDeployed = () => {
  const { message } = App.useApp();

  const [searchText, setSearchText] = useState('');
  const [deployments, setDeployments] = useState<PatchDeploymentItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<DeploymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tasksSearch, setTasksSearch] = useState('');
  const [tasksFilter, setTasksFilter] = useState('All');

  // ============================================
  // Data fetching
  // ============================================

  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await patchService.listPatchDeployments();
      setDeployments(data);
    } catch (error) {
      console.error('Failed to fetch patch deployments:', error);
      message.error('Failed to load patch deployments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (deploymentId: string) => {
    setDetailLoading(true);
    try {
      const data = await patchService.getPatchDeploymentStatus(deploymentId);
      setDetail(data);
    } catch (error) {
      console.error('Failed to fetch deployment detail:', error);
      message.error('Failed to load deployment details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // Auto-refresh detail when in progress
  useEffect(() => {
    if (!detailVisible || !detail) return;
    if (detail.stage === 'COMPLETED' || detail.stage === 'FAILED' || detail.stage === 'CANCELLED') return;

    const interval = setInterval(() => {
      fetchDetail(detail.deploymentId);
    }, 5000);
    return () => clearInterval(interval);
  }, [detailVisible, detail?.stage, detail?.deploymentId, fetchDetail]);

  // ============================================
  // Handlers
  // ============================================

  const handleView = async (record: PatchDeploymentItem) => {
    setDetailVisible(true);
    setTasksSearch('');
    setTasksFilter('All');
    await fetchDetail(record.deploymentId);
  };

  const handleRetry = async (deploymentId: string, name: string) => {
    Modal.confirm({
      title: 'Retry Deployment',
      content: `Re-deploy "${name}" with the same patches and targets?`,
      okText: 'Retry',
      onOk: async () => {
        try {
          const result = await patchService.retryPatchDeployment(deploymentId);
          message.success(`Retry deployment ${result.deploymentId} created with ${result.tasksCreated} task(s)`);
          fetchDeployments();
        } catch (error: any) {
          message.error(error?.response?.data?.message || 'Failed to retry deployment');
        }
      },
    });
  };

  const handleCancel = async (deploymentId: string) => {
    Modal.confirm({
      title: 'Cancel Deployment',
      content: 'Are you sure you want to cancel this deployment? Pending tasks will be cancelled.',
      okText: 'Cancel Deployment',
      okType: 'danger',
      onOk: async () => {
        try {
          await patchService.cancelPatchDeployment(deploymentId);
          message.success('Deployment cancelled');
          fetchDeployments();
          if (detail?.deploymentId === deploymentId) {
            fetchDetail(deploymentId);
          }
        } catch (error: any) {
          message.error(error?.response?.data?.message || 'Failed to cancel deployment');
        }
      },
    });
  };

  // ============================================
  // Helpers
  // ============================================

  const stageColor = (stage: string) => {
    const colors: Record<string, string> = {
      COMPLETED: 'green',
      IN_PROGRESS: 'blue',
      PENDING: 'orange',
      FAILED: 'red',
      CANCELLED: 'default',
    };
    return colors[stage] || 'default';
  };

  const severityColor = (sev: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'red',
      High: 'orange',
      Medium: 'gold',
      Low: 'blue',
      UNSPECIFIED: 'default',
    };
    return colors[sev] || 'default';
  };

  const normalizeTaskStatus = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'completed' || s === 'success') return 'SUCCESS';
    if (s === 'failed') return 'FAILED';
    if (s === 'in_progress') return 'IN_PROGRESS';
    return 'PENDING';
  };

  const osIcon = (os: string) => {
    const lower = (os || '').toLowerCase();
    if (lower.includes('windows')) return <WindowsOutlined style={{ color: '#0078d4' }} />;
    if (lower.includes('mac') || lower.includes('darwin')) return <AppleOutlined />;
    if (lower.includes('linux') || lower.includes('ubuntu')) return <LinuxOutlined style={{ color: '#f9a825' }} />;
    return null;
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return null;
    const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  // ============================================
  // Columns
  // ============================================

  const columns: ColumnsType<PatchDeploymentItem> = [
    {
      title: 'ID',
      dataIndex: 'deploymentId',
      key: 'deploymentId',
      width: 140,
      sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Patches',
      key: 'patches',
      width: 200,
      render: (_: any, record: PatchDeploymentItem) => (
        <Space size={4} wrap>
          {record.patches?.length > 0
            ? record.patches.map((p, i) => (
                <Tag key={i} color={severityColor(p.severity)} style={{ margin: 0 }}>
                  {p.patchId || p.title}
                </Tag>
              ))
            : <Text type="secondary">-</Text>
          }
        </Space>
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      width: 120,
      render: (stage: string) => <Tag color={stageColor(stage)}>{stage}</Tag>,
      filters: [
        { text: 'COMPLETED', value: 'COMPLETED' },
        { text: 'IN_PROGRESS', value: 'IN_PROGRESS' },
        { text: 'PENDING', value: 'PENDING' },
        { text: 'FAILED', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.stage === value,
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 160,
      render: (_: any, record: PatchDeploymentItem) => (
        <div>
          <Progress
            percent={record.progress}
            size="small"
            status={record.stage === 'FAILED' ? 'exception' : record.stage === 'COMPLETED' ? 'success' : 'active'}
            format={(pct) => `${pct}%`}
          />
          <div style={{ fontSize: 11, color: '#999' }}>
            {record.succeeded}/{record.total} done
            {record.failed > 0 && <span style={{ color: '#ff4d4f' }}>, {record.failed} failed</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Trigger',
      dataIndex: 'triggerType',
      key: 'triggerType',
      width: 100,
      render: (trigger: string | null) => trigger ? <Tag>{trigger}</Tag> : <Text type="secondary">manual</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: PatchDeploymentItem) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); handleView(record); }} />
          </Tooltip>
          {(record.stage === 'IN_PROGRESS' || record.stage === 'PENDING') && (
            <Tooltip title="Cancel">
              <Button type="text" size="small" danger icon={<StopOutlined />} onClick={(e) => { e.stopPropagation(); handleCancel(record.deploymentId); }} />
            </Tooltip>
          )}
          {(record.stage === 'FAILED' || record.stage === 'CANCELLED') && (
            <Tooltip title="Retry">
              <Button type="text" size="small" icon={<RedoOutlined />} style={{ color: '#1890ff' }} onClick={(e) => { e.stopPropagation(); handleRetry(record.deploymentId, record.name); }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const filtered = deployments.filter(d =>
    d.name.toLowerCase().includes(searchText.toLowerCase()) ||
    d.deploymentId.toLowerCase().includes(searchText.toLowerCase())
  );

  // Task filtering
  const filteredTasks = (detail?.tasks || []).filter(task => {
    const status = normalizeTaskStatus(task.status);
    const matchesSearch =
      (task.assetName || '').toLowerCase().includes(tasksSearch.toLowerCase()) ||
      (task.agentName || '').toLowerCase().includes(tasksSearch.toLowerCase());
    const matchesFilter = tasksFilter === 'All' || status === tasksFilter;
    return matchesSearch && matchesFilter;
  });

  // Task columns
  const taskColumns: ColumnsType<TaskItem> = [
    {
      title: 'Endpoint',
      key: 'endpoint',
      render: (_: any, record: TaskItem) => (
        <Space>
          {osIcon(record.assetOs)}
          <Text>{record.assetName}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_: any, record: TaskItem) => {
        const status = normalizeTaskStatus(record.status);
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          SUCCESS: { color: 'green', icon: <CheckCircleOutlined /> },
          FAILED: { color: 'red', icon: <CloseCircleOutlined /> },
          PENDING: { color: 'orange', icon: <ClockCircleOutlined /> },
          IN_PROGRESS: { color: 'blue', icon: <SyncOutlined spin /> },
        };
        const c = config[status] || { color: 'default', icon: null };
        return (
          <div>
            <Tag color={c.color} icon={c.icon}>{status}</Tag>
            {record.retryAttempt > 0 && (
              <div style={{ marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Retry #{record.retryAttempt}</Text>
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
      render: (_: any, record: TaskItem) => {
        if (normalizeTaskStatus(record.status) === 'IN_PROGRESS') return <LoadingOutlined style={{ color: '#1890ff' }} />;
        const started = record.startedAt || record.command?.executedAt;
        const completed = record.completedAt || record.command?.completedAt;
        return formatDuration(started, completed) || '-';
      },
    },
    {
      title: 'Result',
      key: 'result',
      ellipsis: true,
      render: (_: any, record: TaskItem) => {
        const err = record.errorMessage || record.command?.errorMessage;
        const output = record.output || record.command?.result;
        if (err) return <Text type="danger" style={{ fontSize: 12 }}>{err}</Text>;
        if (output) {
          const text = typeof output === 'string' ? output : JSON.stringify(output);
          const isUpToDate = /already (up to date|installed)|no available upgrade|no newer package/i.test(text);
          return (
            <Text type={isUpToDate ? 'warning' : 'success'} style={{ fontSize: 12 }}>
              {isUpToDate ? `✓ Already up to date` : text.length > 80 ? text.slice(0, 80) + '…' : text}
            </Text>
          );
        }
        return '-';
      },
    },
  ];

  // ============================================
  // Render
  // ============================================

  return (
    <div>
      {/* Top Controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search deployments..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetchDeployments()} loading={loading}>
          Refresh
        </Button>
        <Button icon={<ExportOutlined />} onClick={() => {
          if (filtered.length === 0) { message.warning('No data to export'); return; }
          const csv = [
            'ID,Name,Stage,Progress,Succeeded,Failed,Total,Trigger,Created',
            ...filtered.map(d => `${d.deploymentId},"${d.name}",${d.stage},${d.progress}%,${d.succeeded},${d.failed},${d.total},${d.triggerType || 'manual'},${new Date(d.createdAt).toLocaleString()}`),
          ].join('\n');
          const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `patch_deployments_${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          message.success('Exported');
        }}>
          Export
        </Button>
      </div>

      {/* Table */}
      {deployments.length === 0 && !loading ? (
        <Empty
          description={
            <span>
              No patch deployments yet. Deploy patches from{' '}
              <Text strong>Patches &gt; All Patches &gt; Patch Details &gt; Deploy</Text>
            </span>
          }
        />
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({ onClick: () => handleView(record), style: { cursor: 'pointer' } })}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
          }}
          scroll={{ x: 'max-content' }}
        />
      )}

      {/* Deployment Detail Modal */}
      <Modal
        title={
          <Space>
            <Text strong style={{ fontSize: 16 }}>{detail?.name || 'Deployment Details'}</Text>
            {detail && <Tag color={stageColor(detail.stage)}>{detail.stage}</Tag>}
          </Space>
        }
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetail(null); }}
        width={1100}
        footer={detail && (detail.stage === 'FAILED' || detail.stage === 'CANCELLED') ? [
          <Button key="close" onClick={() => { setDetailVisible(false); setDetail(null); }}>Close</Button>,
          <Button key="retry" type="primary" icon={<RedoOutlined />} onClick={() => { handleRetry(detail.deploymentId, detail.name); setDetailVisible(false); setDetail(null); }}>Retry Deployment</Button>,
        ] : null}
      >
        {detailLoading && !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}><SyncOutlined spin style={{ fontSize: 24 }} /></div>
        ) : detail ? (
          <>
            {/* Progress summary */}
            <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <Progress
                percent={detail.progress}
                status={detail.stage === 'FAILED' ? 'exception' : detail.stage === 'COMPLETED' ? 'success' : 'active'}
                strokeWidth={10}
              />
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col><Space size={4}><Badge status="default" /><Text type="secondary">Total:</Text><Text strong>{detail.total}</Text></Space></Col>
                <Col><Space size={4}><Badge status="warning" /><Text type="secondary">Pending:</Text><Text strong>{detail.pending}</Text></Space></Col>
                <Col><Space size={4}><Badge status="success" /><Text type="secondary">Succeeded:</Text><Text strong style={{ color: '#52c41a' }}>{detail.succeeded}</Text></Space></Col>
                <Col><Space size={4}><Badge status="error" /><Text type="secondary">Failed:</Text><Text strong style={{ color: '#ff4d4f' }}>{detail.failed}</Text></Space></Col>
                {detail.retryCount > 1 && (
                  <Col><Text type="secondary">Retries: {detail.retryCount}</Text></Col>
                )}
              </Row>
              {detail.patches.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">Patches: </Text>
                  <Space size={4} wrap>
                    {detail.patches.map((p, i) => (
                      <Tag key={i} color={severityColor(p.severity)}>
                        {p.patchId} - {p.software || p.title}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>

            {/* Task controls */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Input
                  placeholder="Search tasks..."
                  prefix={<SearchOutlined />}
                  style={{ width: 250 }}
                  value={tasksSearch}
                  onChange={(e) => setTasksSearch(e.target.value)}
                />
                <Button.Group>
                  {['All', 'SUCCESS', 'FAILED', 'PENDING', 'IN_PROGRESS'].map(f => (
                    <Button key={f} type={tasksFilter === f ? 'primary' : 'default'} size="small" onClick={() => setTasksFilter(f)}>
                      {f === 'All' ? 'All' : f}
                    </Button>
                  ))}
                </Button.Group>
              </div>
              <Button icon={<ReloadOutlined />} size="small" onClick={() => detail && fetchDetail(detail.deploymentId)}>
                Refresh
              </Button>
            </div>

            {/* Tasks table */}
            <Table
              columns={taskColumns}
              dataSource={filteredTasks}
              rowKey="id"
              size="small"
              pagination={false}
              expandable={{
                expandedRowRender: (record) => {
                  const output = record.output || record.command?.result;
                  const error = record.errorMessage || record.command?.errorMessage;
                  if (!output && !error) return <Text type="secondary">No output available</Text>;
                  return (
                    <div style={{ padding: '4px 0' }}>
                      {error && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong type="danger" style={{ fontSize: 12 }}>Error: </Text>
                          <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>
                        </div>
                      )}
                      {output && (
                        <pre style={{
                          background: '#f5f5f5',
                          padding: 12,
                          borderRadius: 4,
                          fontSize: 12,
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
              }}
            />
          </>
        ) : null}
      </Modal>
    </div>
  );
};
