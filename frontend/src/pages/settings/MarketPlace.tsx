import { useState } from 'react';
import { SearchOutlined, DeleteOutlined, EditOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { App, Input, Button, Typography, Space, Tooltip, Switch } from 'antd';
import { Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useIntegrations, useCreateIntegration, useUpdateIntegration, useDeleteIntegration, useToggleIntegrationStatus } from '../../hooks/useSettings';
import type { Integration } from '../../types/settings.types';
import { sanitizeInput } from '../../utils/sanitize';
import { IntegrationFormModal } from './components/IntegrationFormModal';

const { Title, Text } = Typography;

interface IntegrationWithKey extends Integration {
  key: string;
}

export const MarketPlace = () => {
  const { message } = App.useApp();
  const { data: rawIntegrations = [], isLoading: loading } = useIntegrations();
  const createIntegrationMutation = useCreateIntegration();
  const updateIntegrationMutation = useUpdateIntegration();
  const deleteIntegrationMutation = useDeleteIntegration();
  const toggleStatusMutation = useToggleIntegrationStatus();
  const deleteModal = useModal<IntegrationWithKey>();

  const integrations: IntegrationWithKey[] = Array.isArray(rawIntegrations)
    ? rawIntegrations.map((integration: Integration, index: number) => ({ ...integration, key: integration.id || String(index) }))
    : [];

  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [editingIntegration, setEditingIntegration] = useState<IntegrationWithKey | null>(null);
  const [drawerForm] = Form.useForm();
  const [pagination, setPagination] = useState<{ pageSize: number; current: number }>({ pageSize: 20, current: 1 });

  const handleCreateIntegration = () => { setEditingIntegration(null); setDrawerMode('create'); drawerForm.resetFields(); setDrawerVisible(true); };

  const handleEditIntegration = (integration: IntegrationWithKey) => {
    setEditingIntegration(integration); setDrawerMode('edit');
    drawerForm.setFieldsValue({ name: integration.name, description: integration.description, type: integration.type, enabled: integration.status, recipients: integration.recipients || [] });
    setDrawerVisible(true);
  };

  const handleViewIntegration = (integration: IntegrationWithKey) => {
    setEditingIntegration(integration); setDrawerMode('view');
    drawerForm.setFieldsValue({ name: integration.name, description: integration.description, type: integration.type, enabled: integration.status, recipients: integration.recipients || [] });
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => { setDrawerVisible(false); setEditingIntegration(null); drawerForm.resetFields(); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteIntegrationMutation.mutateAsync(deleteModal.selectedItem.id); message.success('Integration deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete integration'); }
  };

  const handleDrawerSubmit = async () => {
    try {
      const values = await drawerForm.validateFields();

      // Sanitize string fields to prevent XSS
      const sanitizedValues = {
        ...values,
        name: sanitizeInput(values.name),
        description: sanitizeInput(values.description),
        type: sanitizeInput(values.type),
      };

      if (editingIntegration && drawerMode === 'edit') { await updateIntegrationMutation.mutateAsync({ id: editingIntegration.id, data: sanitizedValues }); message.success('Integration updated successfully'); }
      else if (drawerMode === 'create') { await createIntegrationMutation.mutateAsync(sanitizedValues); message.success('Integration created successfully'); }
      handleDrawerClose();
    } catch { message.error(`Failed to ${editingIntegration && drawerMode === 'edit' ? 'update' : 'create'} integration`); }
  };

  const handleStatusChange = async (integration: IntegrationWithKey, status: boolean) => {
    try { await toggleStatusMutation.mutateAsync({ id: integration.id, status }); message.success(`Integration ${status ? 'enabled' : 'disabled'} successfully`); }
    catch { message.error('Failed to update integration status'); }
  };

  const handleExport = () => {
    const csvContent = [['Integration Name', 'Description', 'Integration Type', 'Status', 'Created By', 'Created On'],
      ...filteredIntegrations.map((i) => [i.name, i.description, i.type, i.status ? 'Enabled' : 'Disabled', i.createdBy, i.createdAt || ''])]
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'integrations.csv'; link.click();
    window.URL.revokeObjectURL(url); message.success('Integrations exported successfully');
  };

  const columns: ColumnsType<IntegrationWithKey> = [
    { title: 'Integration Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, record: IntegrationWithKey) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewIntegration(record); }} style={{ color: '#1890ff' }}>{record.name}</a> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Integration Type', dataIndex: 'type', key: 'type' },
    { title: 'Status', key: 'status', width: 80, render: (_, record) => <Switch checked={record.status} onChange={(checked) => handleStatusChange(record, checked)} /> },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy' },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt', render: (text: string) => {
      if (!text) return '\u2014'; const date = new Date(text); return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }},
    { title: 'Actions', key: 'actions', width: 100, align: 'right', render: (_, record) => (
      <Space>
        <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditIntegration(record)} /></Tooltip>
        <Tooltip title="Delete"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteModal.onOpen(record)} /></Tooltip>
      </Space>
    )},
  ];

  const filteredIntegrations = integrations.filter((i) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s) || i.type.toLowerCase().includes(s);
  });

  const paginatedData = filteredIntegrations.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Market Place</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Browse and install extensions</Text>
      </div>
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ flex: 1, maxWidth: '400px' }} value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPagination({ ...pagination, current: 1 }); }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Coming soon"><Button onClick={() => message.info('Coming soon')} disabled>Defaults</Button></Tooltip>
          <Tooltip title="Export"><Button icon={<DownloadOutlined />} onClick={handleExport} disabled={integrations.length === 0}>Export</Button></Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateIntegration}>Create</Button>
        </div>
      </div>

      <DataTable size="middle" columns={columns} data={paginatedData} rowKey="key" loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredIntegrations.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}\u2013${range[1]} of ${total} items` }}
        style={{ marginBottom: '24px' }} />

      <ConfirmModal title="Delete Integration" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteIntegrationMutation.isPending} confirmText="Delete" danger />

      <IntegrationFormModal open={drawerVisible} mode={drawerMode} form={drawerForm}
        onSubmit={handleDrawerSubmit} onClose={handleDrawerClose} onSwitchToEdit={() => setDrawerMode('edit')} />
    </div>
  );
};
