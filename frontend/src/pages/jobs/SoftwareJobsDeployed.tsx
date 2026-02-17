import { useState, useEffect } from 'react';
import { EyeOutlined } from '@ant-design/icons';
import { App, Button, Space, Tag, Typography } from 'antd';
import { Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useLocation } from 'react-router-dom';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import {
  useSoftwareDeployments, useCreateSoftwareDeployment, useTriggerRollback,
  useSoftwarePackages, useSoftwareBundles, useSoftwareAgents, useSoftwareDeployment,
} from '../../hooks/useJobs';
import { useModal } from '../../hooks/useModal';
import {
  type SoftwareDeployment, type SoftwareDeploymentTask,
} from '../../services/softwareJobs.service';
import type { SoftwarePackage, HubBundle } from '../../types/hub.types';
import { getErrorMessage } from '../../utils/error';
import { sanitizeInput } from '../../utils/sanitize';
import { JobToolbar, DeploymentStatusCell, DeploymentTasksModal, exportToCsv } from './components';
import type { TaskItem as SharedTaskItem, DeploymentSummary } from './components';
import { CreateSoftwareDeploymentModal } from './components/CreateSoftwareDeploymentModal';

interface LocationState {
  createDeployment?: boolean;
  selectedPackage?: { id: string; packageId: string; name: string; displayName: string; version: string; installSource: string; hasBundle: boolean };
}

const { Text } = Typography;

type DeployedItem = {
  id: string; deploymentId: string; name: string;
  type: 'INSTALL' | 'UNINSTALL' | 'UPGRADE';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  pending: { current: number; total: number };
  succeeded: { current: number; total: number };
  failed: { current: number; total: number };
  createdBy: string; createdOn: string;
};

const convertDeployment = (d: SoftwareDeployment): DeployedItem => ({
  id: d.id, deploymentId: d.deploymentId, name: d.name,
  type: d.type.toUpperCase() as DeployedItem['type'], status: d.status as DeployedItem['status'],
  pending: { current: d.pending, total: d.total }, succeeded: { current: d.succeeded, total: d.total },
  failed: { current: d.failed, total: d.total },
  createdBy: d.createdBy || 'System', createdOn: new Date(d.createdAt).toLocaleString(),
});

const convertTask = (t: SoftwareDeploymentTask): SharedTaskItem => {
  let duration: string | undefined;
  if (t.startedAt && t.completedAt) {
    const ms = new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
    if (ms < 1000) duration = `${ms}ms`;
    else if (ms < 60000) duration = `${(ms / 1000).toFixed(1)}s`;
    else duration = `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }
  return {
    id: t.id, agentName: t.agentName || t.agentId, agentOs: t.agentOs || 'linux',
    packageName: t.packageName, status: (t.status || 'PENDING'), errorMessage: t.errorMessage,
    startedAt: t.startedAt ? new Date(t.startedAt).toLocaleString() : undefined,
    completedAt: t.completedAt ? new Date(t.completedAt).toLocaleString() : undefined,
    duration, output: t.executionOutput || '',
  };
};

export const SoftwareJobsDeployed = () => {
  const { message } = App.useApp();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const rollbackModal = useModal<SharedTaskItem>();
  const [searchText, setSearchText] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [deploymentType, setDeploymentType] = useState<'INSTALL' | 'UNINSTALL' | 'UPGRADE'>('INSTALL');
  const [selectionType, setSelectionType] = useState<'application' | 'bundle'>('application');
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [tasksModalVisible, setTasksModalVisible] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<DeployedItem | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [navigationHandled, setNavigationHandled] = useState(false);

  const { data: rawDeployments, isLoading: loading, refetch: refetchDeployments } = useSoftwareDeployments();
  const createDeploymentMutation = useCreateSoftwareDeployment();
  const rollbackMutation = useTriggerRollback();
  const { data: rawPackages = [] } = useSoftwarePackages();
  const { data: rawBundles = [] } = useSoftwareBundles();
  const { data: rawAgents = [] } = useSoftwareAgents();

  const deployedItems: DeployedItem[] = (rawDeployments || []).map(convertDeployment);
  const applications = rawPackages.map((p: SoftwarePackage) => ({
    key: p.id, id: p.id, deploymentId: p.packageId, name: p.name, title: p.displayName,
    os: [p.platform === 'macos' ? 'Mac' : p.platform === 'windows' ? 'Windows' : 'Linux'], installSource: p.installSource,
  }));
  const bundles = rawBundles.map((b: HubBundle) => ({
    key: b.id, bundleId: b.bundleId, name: b.name,
    os: [b.platform === 'macos' ? 'Mac' : b.platform === 'windows' ? 'Windows' : 'Linux'],
  }));
  const agents = rawAgents.map((a: { id: string; agentId: string; hostname: string; osType: string; status: string }) => ({
    key: a.id, id: a.id, agentId: a.agentId, hostname: a.hostname, osType: a.osType, status: a.status,
  }));
  const transferItems = selectionType === 'application'
    ? applications.map(a => ({ key: a.key, title: `${a.deploymentId}: ${a.title}`, subtitle: `(${a.installSource})`, os: a.os }))
    : bundles.map(b => ({ key: b.key, title: `${b.bundleId}: ${b.name}`, os: b.os }));

  const { data: deploymentDetailData, refetch: refetchDeploymentDetail } = useSoftwareDeployment(selectedDeployment?.deploymentId || '');
  const tasks: SharedTaskItem[] = (deploymentDetailData?.tasks || []).map(convertTask);
  const deploymentSummary: DeploymentSummary | null = deploymentDetailData ? {
    name: deploymentDetailData.name, status: deploymentDetailData.status || 'PENDING',
    progress: deploymentDetailData.progress ?? 0,
    total: deploymentDetailData.total ?? (deploymentDetailData.tasks?.length || 0),
    pending: deploymentDetailData.pending ?? 0, succeeded: deploymentDetailData.succeeded ?? 0,
    failed: deploymentDetailData.failed ?? 0, type: deploymentDetailData.type || 'install',
  } : null;

  const handleRollback = (task: SharedTaskItem) => { if (!selectedDeployment) return; rollbackModal.onOpen(task); };
  const handleRollbackConfirm = async () => {
    if (!rollbackModal.selectedItem || !selectedDeployment) return;
    rollbackMutation.mutate(
      { deploymentId: selectedDeployment.deploymentId, taskId: rollbackModal.selectedItem.id, options: { force: false } },
      {
        onSuccess: (result) => { message.success(`Rollback initiated (Command ID: ${result.commandId.slice(0, 8)}...)`); refetchDeploymentDetail(); rollbackModal.onClose(); },
        onError: (error: unknown) => { message.error(getErrorMessage(error, 'Failed to trigger rollback')); },
      }
    );
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- one-time navigation state sync */
  useEffect(() => {
    if (navigationHandled || applications.length === 0 || !locationState?.createDeployment) return;
    const selectedPkg = locationState.selectedPackage;
    if (selectedPkg) {
      const matchingApp = applications.find((app: { id: string; deploymentId: string }) => app.id === selectedPkg.id || app.deploymentId === selectedPkg.packageId);
      if (matchingApp) {
        setSelectedApplications([matchingApp.key]);
        form.setFieldsValue({ deploymentName: `Deploy ${selectedPkg.displayName || selectedPkg.name}`, description: `Deployment of ${selectedPkg.displayName || selectedPkg.name} v${selectedPkg.version}` });
        setCreateModalVisible(true); setNavigationHandled(true);
        message.info(`Package "${selectedPkg.displayName || selectedPkg.name}" pre-selected. Choose target agents and publish.`);
      }
    }
  }, [applications, locationState, navigationHandled, form]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!tasksModalVisible || !selectedDeployment) return;
    if (deploymentSummary?.status === 'COMPLETED' || deploymentSummary?.status === 'FAILED') return;
    const interval = setInterval(() => { refetchDeploymentDetail(); }, 5000);
    return () => clearInterval(interval);
  }, [tasksModalVisible, selectedDeployment, deploymentSummary?.status, refetchDeploymentDetail]);

  const handleView = (record: DeployedItem) => { setSelectedDeployment(record); setTasksModalVisible(true); };
  const handleRefresh = async () => { await refetchDeployments(); message.success('Data refreshed successfully'); };
  const handleExport = () => {
    const items = filteredItems.length > 0 ? filteredItems : deployedItems;
    exportToCsv(items, [
      { header: 'ID', accessor: (i) => i.deploymentId }, { header: 'Name', accessor: (i) => i.name },
      { header: 'Type', accessor: (i) => i.type }, { header: 'Status', accessor: (i) => i.status },
      { header: 'Pending', accessor: (i) => `${i.pending.current}/${i.pending.total}` },
      { header: 'Succeeded', accessor: (i) => `${i.succeeded.current}/${i.succeeded.total}` },
      { header: 'Failed', accessor: (i) => `${i.failed.current}/${i.failed.total}` },
      { header: 'Created By', accessor: (i) => i.createdBy }, { header: 'Created On', accessor: (i) => i.createdOn },
    ], 'software_deployed_jobs', message);
  };
  const handleCreate = () => { setCreateModalVisible(true); form.resetFields(); setSelectedApplications([]); setDeploymentType('INSTALL'); setSelectionType('application'); setSelectedAgents([]); };
  const handleSubmit = async () => {
    try {
      await form.validateFields(); const values = form.getFieldsValue();
      const selectedPackage = applications.find((a: { key: string }) => selectedApplications.includes(a.key));
      if (!selectedPackage && selectionType === 'application') { message.error('Please select a package'); return; }
      if (selectedAgents.length === 0) { message.error('Please select at least one target agent'); return; }

      // Sanitize string fields to prevent XSS
      const sanitizedValues = {
        name: sanitizeInput(values.deploymentName),
        description: sanitizeInput(values.description),
      };

      createDeploymentMutation.mutate({
        name: sanitizedValues.name, description: sanitizedValues.description, type: deploymentType, targetAgentIds: selectedAgents,
        package: selectedPackage ? { name: selectedPackage.name, source: selectedPackage.installSource, version: 'latest' } : { name: 'bundle-install', source: 'bundle' },
        retryCount: parseInt(values.retryCount, 10) || 1, notifyOnComplete: true,
      }, {
        onSuccess: (result) => { message.success(`Deployment ${result.deploymentId} created with ${result.tasksCreated} tasks`); setCreateModalVisible(false); form.resetFields(); setSelectedApplications([]); setSelectedAgents([]); },
        onError: (error: unknown) => { message.error(getErrorMessage(error, 'Failed to create deployment')); },
      });
    } catch { /* form validation failed */ }
  };
  const handleCancel = () => { setCreateModalVisible(false); form.resetFields(); setSelectedApplications([]); setSelectedAgents([]); };

  const columns: ColumnsType<DeployedItem> = [
    { title: 'ID', dataIndex: 'deploymentId', key: 'deploymentId', sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (type: string) => <Tag color="green" style={{ margin: 0 }}>{type}</Tag>,
      filters: [{ text: 'INSTALL', value: 'INSTALL' }, { text: 'UNINSTALL', value: 'UNINSTALL' }, { text: 'UPGRADE', value: 'UPGRADE' }], onFilter: (value, record) => record.type === value },
    { title: 'Stage', dataIndex: 'status', key: 'status', render: (status: string) => { const colors: Record<string, string> = { COMPLETED: 'green', IN_PROGRESS: 'orange', INSTALLED: 'blue', FAILED: 'red' }; return <Tag color={colors[status] || 'default'}>{status}</Tag>; },
      filters: [{ text: 'COMPLETED', value: 'COMPLETED' }, { text: 'IN_PROGRESS', value: 'IN_PROGRESS' }, { text: 'INSTALLED', value: 'INSTALLED' }, { text: 'FAILED', value: 'FAILED' }], onFilter: (value, record) => record.status === value },
    { title: 'Pending', dataIndex: 'pending', key: 'pending', align: 'center', render: (p: { current: number; total: number }) => <DeploymentStatusCell current={p.current} total={p.total} backgroundColor="#fff7e6" /> },
    { title: 'Succeeded', dataIndex: 'succeeded', key: 'succeeded', align: 'center', render: (s: { current: number; total: number }) => <DeploymentStatusCell current={s.current} total={s.total} backgroundColor="#f6ffed" /> },
    { title: 'Failed', dataIndex: 'failed', key: 'failed', align: 'center', render: (f: { current: number; total: number }) => <DeploymentStatusCell current={f.current} total={f.total} backgroundColor="#fff1f0" /> },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', sorter: (a, b) => a.createdBy.localeCompare(b.createdBy) },
    { title: 'Created On', dataIndex: 'createdOn', key: 'createdOn', sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
      render: (text: string, record: DeployedItem) => (<Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}><Text>{text}</Text><Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); handleView(record); }} /></Space>) },
  ];

  const filteredItems = deployedItems.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) || item.deploymentId.toLowerCase().includes(searchText.toLowerCase()) || item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <JobToolbar searchText={searchText} onSearchChange={setSearchText} onRefresh={handleRefresh} onExport={handleExport} onCreate={handleCreate} loading={loading} />
      <DataTable columns={columns} data={filteredItems} rowKey="id" loading={loading}
        onRow={(record) => ({ onClick: () => handleView(record), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
        scroll={{ x: 'max-content' }} />

      <CreateSoftwareDeploymentModal open={createModalVisible} form={form} deploymentType={deploymentType} selectionType={selectionType}
        selectedApplications={selectedApplications} selectedAgents={selectedAgents} agents={agents} transferItems={transferItems}
        onDeploymentTypeChange={setDeploymentType} onSelectionTypeChange={setSelectionType}
        onSelectedApplicationsChange={setSelectedApplications} onSelectedAgentsChange={setSelectedAgents}
        onSubmit={handleSubmit} onCancel={handleCancel} />

      <ConfirmModal title="Confirm Rollback"
        description={rollbackModal.selectedItem ? `Are you sure you want to rollback the installation for ${rollbackModal.selectedItem.agentName}${rollbackModal.selectedItem.packageName ? ` (${rollbackModal.selectedItem.packageName})` : ''}? This will attempt to uninstall or revert to the previous version.` : 'Are you sure you want to rollback this installation?'}
        open={rollbackModal.open} onConfirm={handleRollbackConfirm} onCancel={rollbackModal.onClose} loading={rollbackMutation.isPending} confirmText="Rollback" danger />

      <DeploymentTasksModal open={tasksModalVisible} onClose={() => { setTasksModalVisible(false); setSelectedDeployment(null); }}
        summary={deploymentSummary} tasks={tasks} loading={false} onRefresh={() => refetchDeploymentDetail()} onRollback={handleRollback}
        rollbackLoadingId={rollbackMutation.isPending ? 'loading' : null} showPackageColumn message={message} />
    </div>
  );
};
