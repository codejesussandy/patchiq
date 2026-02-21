import { useState, useEffect } from 'react';
import {
  EyeOutlined,
  StopOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Space,
  Tag,
  Typography,
  Tooltip,
  Empty,
  Progress,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { usePatchDeployments, useCancelPatchDeployment, useRetryPatchDeployment, usePatchDeploymentStatus } from '../../hooks/usePatches';
import { getErrorMessage } from '../../utils/error';
import { JobToolbar, DeploymentTasksModal, exportToCsv } from './components';
import type { TaskItem as SharedTaskItem, DeploymentSummary } from './components';

const { Text, Title } = Typography;

type PatchDeploymentItem = {
  id: string;
  deploymentId: string;
  name: string;
  description: string | null;
  type: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  pending: number;
  succeeded: number;
  failed: number;
  total: number;
  progress: number;
  triggerType: string | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  patches: { patchId: string; title: string; severity: string; software?: string }[];
};

const statusColor = (status: string) => {
  const colors: Record<string, string> = { COMPLETED: 'green', IN_PROGRESS: 'blue', PENDING: 'orange', FAILED: 'red', CANCELLED: 'default' };
  return colors[status] || 'default';
};

const severityColor = (sev: string) => {
  const colors: Record<string, string> = { CRITICAL: 'red', HIGH: 'orange', MEDIUM: 'gold', LOW: 'blue', UNSPECIFIED: 'default' };
  return colors[sev] || 'default';
};

const normalizeTaskStatus = (status: string) => {
  const s = (status || 'pending').toLowerCase();
  if (s === 'completed' || s === 'success') return 'SUCCESS';
  if (s === 'failed') return 'FAILED';
  if (s === 'in_progress') return 'IN_PROGRESS';
  return 'PENDING';
};

const formatDuration = (startedAt: string | null, completedAt: string | null) => {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

export const PatchJobsDeployed = () => {
  const { message } = App.useApp();

  const retryModal = useModal<{ deploymentId: string; name: string }>();
  const cancelModal = useModal<{ deploymentId: string }>();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });

  // Debounce search to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: deployments = [], isLoading: loading, refetch: refetchDeployments } = usePatchDeployments({
    page: pagination.page,
    limit: pagination.pageSize,
    search: debouncedSearch || undefined,
  }) as unknown as { data: PatchDeploymentItem[]; isLoading: boolean; refetch: () => void };
  const cancelMutation = useCancelPatchDeployment();
  const retryMutation = useRetryPatchDeployment();
  const { data: detail = null, refetch: refetchDetail } = usePatchDeploymentStatus(selectedDeploymentId) as { data: any; refetch: () => void };

  // Auto-refresh detail when in progress
  useEffect(() => {
    if (!detailVisible || !detail) return;
    if (detail.status === 'COMPLETED' || detail.status === 'FAILED' || detail.status === 'CANCELLED') return;
    const interval = setInterval(() => { refetchDetail(); }, 5000);
    return () => clearInterval(interval);
  }, [detailVisible, detail, refetchDetail]);

  const handleView = (record: PatchDeploymentItem) => {
    setSelectedDeploymentId(record.deploymentId);
    setDetailVisible(true);
  };

  const handleRetry = (deploymentId: string, name: string) => {
    retryModal.onOpen({ deploymentId, name });
  };

  const handleRetryConfirm = async () => {
    if (!retryModal.selectedItem) return;
    retryMutation.mutate(retryModal.selectedItem.deploymentId, {
      onSuccess: (result) => {
        message.success(`Retry deployment ${result.deploymentId} created with ${result.tasksCreated} task(s)`);
        retryModal.onClose();
      },
      onError: (error: unknown) => message.error(getErrorMessage(error, 'Failed to retry deployment')),
    });
  };

  const handleCancel = (deploymentId: string) => {
    cancelModal.onOpen({ deploymentId });
  };

  const handleCancelConfirm = async () => {
    if (!cancelModal.selectedItem) return;
    cancelMutation.mutate(cancelModal.selectedItem.deploymentId, {
      onSuccess: () => {
        message.success('Deployment cancelled');
        cancelModal.onClose();
      },
      onError: (error: unknown) => message.error(getErrorMessage(error, 'Failed to cancel deployment')),
    });
  };

  const handleExport = () => {
    exportToCsv(
      deployments,
      [
        { header: 'ID', accessor: (d) => d.deploymentId },
        { header: 'Name', accessor: (d) => d.name },
        { header: 'Status', accessor: (d) => d.status },
        { header: 'Progress', accessor: (d) => `${d.progress}%` },
        { header: 'Succeeded', accessor: (d) => d.succeeded },
        { header: 'Failed', accessor: (d) => d.failed },
        { header: 'Total', accessor: (d) => d.total },
        { header: 'Trigger', accessor: (d) => d.triggerType || 'manual' },
        { header: 'Created', accessor: (d) => new Date(d.createdAt).toLocaleString() },
      ],
      'patch_deployments',
      message,
    );
  };

  // Convert detail tasks to shared TaskItem format
  const detailTasks: SharedTaskItem[] = (detail?.tasks || []).map((task: { id: string; assetName: string; assetOs: string; agentName: string; status: string; startedAt: string | null; completedAt: string | null; errorMessage: string | null; output: string | null; retryAttempt: number; command: { executedAt: string | null; completedAt: string | null; result: string | null; errorMessage: string | null } | null }) => ({
    id: task.id,
    agentName: task.assetName || task.agentName,
    agentOs: task.assetOs || '',
    status: normalizeTaskStatus(task.status),
    errorMessage: task.errorMessage || task.command?.errorMessage,
    output: task.output || task.command?.result,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    duration: formatDuration(task.startedAt || task.command?.executedAt || null, task.completedAt || task.command?.completedAt || null),
    retryAttempt: task.retryAttempt,
  }));

  const detailSummary: DeploymentSummary | null = detail ? {
    name: detail.name,
    status: detail.status,
    progress: detail.progress,
    total: detail.total,
    pending: detail.pending,
    succeeded: detail.succeeded,
    failed: detail.failed,
    retryCount: detail.retryCount,
    patches: detail.patches?.map((p: { patchId: string; title: string; software: string; severity: string }) => ({
      patchId: p.patchId,
      title: p.title,
      software: p.software,
      severity: p.severity,
    })),
  } : null;

  const columns: ColumnsType<PatchDeploymentItem> = [
    { title: 'ID', dataIndex: 'deploymentId', key: 'deploymentId', width: 140, sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId) },
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true, sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Patches', key: 'patches', width: 200,
      render: (_: unknown, record: PatchDeploymentItem) => (
        <Space size={4} wrap>
          {record.patches?.length > 0
            ? record.patches.map((p, i) => <Tag key={i} color={severityColor(p.severity)} style={{ margin: 0 }}>{p.patchId || p.title}</Tag>)
            : <Text type="secondary">-</Text>}
        </Space>
      ),
    },
    {
      title: 'Stage', dataIndex: 'status', key: 'status', width: 120,
      render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>,
      filters: [{ text: 'COMPLETED', value: 'COMPLETED' }, { text: 'IN_PROGRESS', value: 'IN_PROGRESS' }, { text: 'PENDING', value: 'PENDING' }, { text: 'FAILED', value: 'FAILED' }],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Progress', key: 'progress', width: 160,
      render: (_: unknown, record: PatchDeploymentItem) => (
        <div>
          <Progress percent={record.progress} size="small" status={record.status === 'FAILED' ? 'exception' : record.status === 'COMPLETED' ? 'success' : 'active'} format={(pct) => `${pct}%`} />
          <div style={{ fontSize: 11, color: '#999' }}>
            {record.succeeded}/{record.total} done
            {record.failed > 0 && <span style={{ color: '#ff4d4f' }}>, {record.failed} failed</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Trigger', dataIndex: 'triggerType', key: 'triggerType', width: 100,
      render: (trigger: string | null) => trigger ? <Tag>{trigger}</Tag> : <Text type="secondary">manual</Text>,
    },
    {
      title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 170,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_: unknown, record: PatchDeploymentItem) => (
        <Space>
          <Tooltip title="View Details"><Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); handleView(record); }} /></Tooltip>
          {(record.status === 'IN_PROGRESS' || record.status === 'PENDING') && (
            <Tooltip title="Cancel"><Button type="text" size="small" danger icon={<StopOutlined />} onClick={(e) => { e.stopPropagation(); handleCancel(record.deploymentId); }} /></Tooltip>
          )}
          {(record.status === 'FAILED' || record.status === 'CANCELLED') && (
            <Tooltip title="Retry"><Button type="text" size="small" icon={<RedoOutlined />} style={{ color: '#1890ff' }} onClick={(e) => { e.stopPropagation(); handleRetry(record.deploymentId, record.name); }} /></Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Patch Deployments</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Track and manage deployed patch jobs</Text>
      </div>
      <JobToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        onRefresh={() => refetchDeployments()}
        onExport={handleExport}
        loading={loading}
      />

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
        <DataTable
          columns={columns}
          data={deployments}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({ onClick: () => handleView(record), style: { cursor: 'pointer' } })}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: deployments.length, // Note: Backend should return total count
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            onChange: (page, pageSize) => {
              setPagination({ page, pageSize });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          }}
          scroll={{ x: 'max-content' }}
        />
      )}

      {/* Retry Confirmation */}
      <ConfirmModal
        title="Retry Deployment"
        description={`Re-deploy "${retryModal.selectedItem?.name}" with the same patches and targets?`}
        open={retryModal.open}
        onConfirm={handleRetryConfirm}
        onCancel={retryModal.onClose}
        loading={retryMutation.isPending}
        confirmText="Retry"
      />

      {/* Cancel Confirmation */}
      <ConfirmModal
        title="Cancel Deployment"
        description="Are you sure you want to cancel this deployment? Pending tasks will be cancelled."
        open={cancelModal.open}
        onConfirm={handleCancelConfirm}
        onCancel={cancelModal.onClose}
        loading={cancelMutation.isPending}
        confirmText="Cancel Deployment"
        danger
      />

      <DeploymentTasksModal
        open={detailVisible}
        onClose={() => { setDetailVisible(false); setSelectedDeploymentId(''); }}
        summary={detailSummary}
        tasks={detailTasks}
        onRefresh={() => refetchDetail()}
        message={message}
      />
    </div>
  );
};
