import { useState } from 'react';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PlusOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Typography,
  Form,
  Tooltip,
  Spin,
  Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useAlertPolicies, useCreateAlertPolicy, useUpdateAlertPolicy, useDeleteAlertPolicy } from '../../hooks/useSettings';
import { sanitizeInput } from '../../utils/sanitize';
import { PolicyFormModal } from './components/PolicyFormModal';

const { Title } = Typography;

interface AlertConfiguration {
  id: string;
  name: string;
  type: string;
  channel: string;
  recipients: string;
  enabled: boolean;
  createdAt: string;
  description?: string;
  module?: string;
  severity?: string;
  scope?: string;
  endpoints?: string;
  conditions?: { id: string; attribute: string; condition: string; value: string }[];
  actions?: { id: string; name: string }[];
  remediations?: { id: string; name: string }[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

export const PolicyManagement = () => {
  const { message } = App.useApp();
  const { data: rawAlerts = [], isLoading: loading, refetch } = useAlertPolicies();
  const createAlertMutation = useCreateAlertPolicy();
  const updateAlertMutation = useUpdateAlertPolicy();
  const deleteAlertMutation = useDeleteAlertPolicy();
  const deleteModal = useModal<AlertConfiguration>();

  const alerts: AlertConfiguration[] = Array.isArray(rawAlerts)
    ? rawAlerts.map((alert: Record<string, unknown>, index: number) => ({
        id: (alert.id as string) || String(index),
        name: (alert.name as string) || '',
        type: (alert.type as string) || 'Email',
        channel: (alert.channel as string) || 'SMTP',
        recipients: Array.isArray(alert.recipients) ? alert.recipients.join(', ') : ((alert.recipients as string) || ''),
        enabled: alert.enabled !== false,
        createdAt: (alert.createdAt as string) || new Date().toISOString(),
        description: (alert.description as string) || '',
        module: (alert.module as string) || '',
        severity: Array.isArray(alert.severity) ? alert.severity.join(', ') : ((alert.severity as string) || ''),
        scope: (alert.scope as string) || '',
        endpoints: (alert.endpoints as string) || '',
        conditions: (alert.conditions as AlertConfiguration['conditions']) || [],
        actions: (alert.actions as AlertConfiguration['actions']) || [],
        remediations: (alert.remediations as AlertConfiguration['remediations']) || [],
      }))
    : [];

  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('view');
  const [editingAlert, setEditingAlert] = useState<AlertConfiguration | null>(null);
  const [conditions, setConditions] = useState<NonNullable<AlertConfiguration['conditions']>>([]);
  const [actions, setActions] = useState<NonNullable<AlertConfiguration['actions']>>([]);
  const [remediations, setRemediations] = useState<NonNullable<AlertConfiguration['remediations']>>([]);
  const [modalForm] = Form.useForm();
  const [pagination, setPagination] = useState({ pageSize: 20, current: 1 });

  const handleCreateAlert = () => {
    setEditingAlert(null);
    setModalMode('create');
    setConditions([]);
    setActions([]);
    setRemediations([]);
    modalForm.resetFields();
    modalForm.setFieldsValue({ enabled: true });
    setModalVisible(true);
  };

  const handleEditAlert = (alert: AlertConfiguration) => {
    setEditingAlert(alert);
    setModalMode('edit');
    setConditions(alert.conditions || []);
    setActions(alert.actions || []);
    setRemediations(alert.remediations || []);
    modalForm.setFieldsValue({
      name: alert.name, description: alert.description || '', type: alert.type, channel: alert.channel,
      recipients: alert.recipients, enabled: alert.enabled, module: alert.module || '',
      severity: alert.severity || '', scope: alert.scope || '', endpoints: alert.endpoints || '',
    });
    setModalVisible(true);
  };

  const handleViewAlert = (alert: AlertConfiguration) => {
    setEditingAlert(alert);
    setModalMode('view');
    modalForm.setFieldsValue({ name: alert.name, type: alert.type, channel: alert.channel, recipients: alert.recipients, enabled: alert.enabled });
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingAlert(null);
    setConditions([]);
    setActions([]);
    setRemediations([]);
    modalForm.resetFields();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      await deleteAlertMutation.mutateAsync(deleteModal.selectedItem.id);
      message.success('Alert configuration deleted successfully');
      deleteModal.onClose();
    } catch {
      message.error('Failed to delete alert configuration');
    }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await modalForm.validateFields();

      // Sanitize string fields to prevent XSS
      const sanitizedValues = {
        ...values,
        name: sanitizeInput(values.name),
        description: sanitizeInput(values.description),
        recipients: sanitizeInput(values.recipients),
      };

      // Sanitize dynamic array fields
      const sanitizedConditions = conditions.map(cond => ({
        ...cond,
        attribute: sanitizeInput(cond.attribute),
        condition: sanitizeInput(cond.condition),
        value: sanitizeInput(cond.value),
      }));

      const sanitizedActions = actions.map(action => ({
        ...action,
        name: sanitizeInput(action.name),
      }));

      const sanitizedRemediations = remediations.map(remediation => ({
        ...remediation,
        name: sanitizeInput(remediation.name),
      }));

      const payload = { ...sanitizedValues, conditions: sanitizedConditions, actions: sanitizedActions, remediations: sanitizedRemediations };
      if (modalMode === 'create') {
        await createAlertMutation.mutateAsync(payload);
        message.success('Alert configuration created successfully');
      } else if (editingAlert && modalMode === 'edit') {
        await updateAlertMutation.mutateAsync({ id: editingAlert.id, data: payload });
        message.success('Alert configuration updated successfully');
      }
      handleModalClose();
    } catch {
      message.error(modalMode === 'create' ? 'Failed to create alert configuration' : 'Failed to update alert configuration');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Type', 'Channel', 'Recipients', 'Enabled', 'Created At'],
      ...filteredAlerts.map((alert) => [alert.name, alert.type, alert.channel, alert.recipients, alert.enabled ? 'Yes' : 'No', formatDate(alert.createdAt)]),
    ].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alert-configurations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return alert.name.toLowerCase().includes(s) || alert.type.toLowerCase().includes(s) || alert.channel.toLowerCase().includes(s) || alert.recipients.toLowerCase().includes(s);
  });

  const columns: ColumnsType<AlertConfiguration> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: AlertConfiguration) => <a onClick={() => handleViewAlert(record)}>{text}</a> },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120, sorter: (a, b) => a.type.localeCompare(b.type) },
    { title: 'Channel', dataIndex: 'channel', key: 'channel', width: 120, sorter: (a, b) => a.channel.localeCompare(b.channel) },
    { title: 'Recipients', dataIndex: 'recipients', key: 'recipients', render: (text: string) => text || '—' },
    { title: 'Status', dataIndex: 'enabled', key: 'enabled', width: 100,
      render: (enabled: boolean) => <span style={{ color: enabled ? '#52c41a' : '#d9d9d9' }}>{enabled ? 'Enabled' : 'Disabled'}</span> },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt', width: 140,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(), render: (date: string) => formatDate(date) },
    { title: 'Actions', key: 'actions', width: 100, align: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} size="small" onClick={() => handleEditAlert(record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => deleteModal.onOpen(record)} /></Tooltip>
        </Space>
      ) },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}><Title level={2} style={{ margin: 0 }}>Alert Configurations</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ maxWidth: '400px' }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateAlert}>Create</Button>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <DataTable size="middle" columns={columns} data={filteredAlerts} rowKey="id" pagination={pagination}
          onChange={(newPagination) => setPagination(newPagination as typeof pagination)} style={{ background: '#fff' }}
          locale={{ emptyText: 'No alert configurations found' }} />
      </Spin>

      <ConfirmModal title="Delete Alert Configuration" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteAlertMutation.isPending} confirmText="Delete" danger />

      <PolicyFormModal open={modalVisible} mode={modalMode} form={modalForm}
        conditions={conditions} actions={actions} remediations={remediations}
        onConditionsChange={setConditions} onActionsChange={setActions} onRemediationsChange={setRemediations}
        onClose={handleModalClose} onSubmit={handleModalSubmit} onSwitchToEdit={() => setModalMode('edit')} />
    </div>
  );
};
