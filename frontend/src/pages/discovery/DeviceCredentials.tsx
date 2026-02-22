import { useState } from 'react';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { App, Input, Button, Modal, Form, Space, Typography, Tooltip, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useCredentials, useCreateCredential, useUpdateCredential, useDeleteCredential, useTestCredential } from '../../hooks/useDiscovery';
import { useModal } from '../../hooks/useModal';
import type { DeviceCredential, CredentialFilterState } from '../../types/discovery.types';
import { ColumnFilterModal } from '../settings/components/ColumnFilterModal';

const { Title, Text } = Typography;

const DEFAULT_FILTERS: CredentialFilterState = { showId: true, showName: true, showType: true, showUsername: true, showLastUsed: true };
const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' }, { key: 'showName', label: 'Show Name' }, { key: 'showType', label: 'Show Type' },
  { key: 'showUsername', label: 'Show Username' }, { key: 'showLastUsed', label: 'Show Last Used' },
];

export const DeviceCredentials = () => {
  const { message } = App.useApp();
  const { data: rawCredentials = [], isLoading: loading, refetch } = useCredentials();
  const credentials: DeviceCredential[] = Array.isArray(rawCredentials) ? rawCredentials : [];
  const createCredentialMutation = useCreateCredential();
  const updateCredentialMutation = useUpdateCredential();
  const deleteCredentialMutation = useDeleteCredential();
  const testCredentialMutation = useTestCredential();
  const deleteModal = useModal<DeviceCredential>();

  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<CredentialFilterState>(DEFAULT_FILTERS);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingCred, setEditingCred] = useState<DeviceCredential | null>(null);
  const [viewingCred, setViewingCred] = useState<DeviceCredential | null>(null);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const handleCreate = () => { setEditingCred(null); form.resetFields(); setModalVisible(true); };
  const handleEdit = (cred: DeviceCredential) => { setEditingCred(cred); form.setFieldsValue(cred); setModalVisible(true); };
  const handleViewItem = (cred: DeviceCredential) => { setViewingCred(cred); setIsViewModalEditing(false); setShowPassword(false); viewForm.setFieldsValue(cred); setViewModalVisible(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteCredentialMutation.mutateAsync(deleteModal.selectedItem.id); message.success('Credential deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete credential'); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCred) { await updateCredentialMutation.mutateAsync({ id: editingCred.id, data: values }); message.success('Credential updated successfully'); }
      else { await createCredentialMutation.mutateAsync(values); message.success('Credential created successfully'); }
      setModalVisible(false); form.resetFields();
    } catch { message.error(`Failed to ${editingCred ? 'update' : 'create'} credential`); }
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();
      if (viewingCred) { await updateCredentialMutation.mutateAsync({ id: viewingCred.id, data: values }); message.success('Credential updated successfully'); setViewModalVisible(false); setViewingCred(null); setIsViewModalEditing(false); setShowPassword(false); viewForm.resetFields(); }
    } catch { message.error('Failed to update credential'); }
  };

  const handleExport = () => {
    const csv = [['ID', 'Name', 'Type', 'Username', 'Last Used'], ...filteredCredentials.map((c) => [c.id, c.name, c.type, c.username, c.lastUsed || '—'])]
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'credentials.csv'; a.click(); window.URL.revokeObjectURL(url);
    message.success('Credentials exported successfully');
  };

  const handleApplyFilters = () => {
    const v = filterForm.getFieldsValue();
    setFilters(Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(k => [k, v[k] !== undefined ? v[k] : true])) as CredentialFilterState);
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };
  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('All columns shown'); };
  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const allColumns: ColumnsType<DeviceCredential> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: (a, b) => parseInt(a.id) - parseInt(b.id) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: DeviceCredential) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewItem(record); }}>{text}</a> },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 100, filters: [{ text: 'SSH', value: 'SSH' }, { text: 'Windows', value: 'WINDOWS' }, { text: 'SNMP', value: 'SNMP' }], onFilter: (value, record) => record.type === value },
    { title: 'Username', dataIndex: 'username', key: 'username', render: (text: string) => text || '—' },
    { title: 'Last Used', dataIndex: 'lastUsed', key: 'lastUsed',
      render: (text: string) => text ? new Date(text).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—' },
    { title: 'Actions', key: 'actions', width: 120, align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteModal.onOpen(record)} /></Tooltip>
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId; if (col.key === 'name') return filters.showName; if (col.key === 'type') return filters.showType;
    if (col.key === 'username') return filters.showUsername; if (col.key === 'lastUsed') return filters.showLastUsed; return true;
  });

  const filteredCredentials = credentials.filter((c) => {
    if (!searchText) return true; const s = searchText.toLowerCase();
    return c.id.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || c.username.toLowerCase().includes(s) || (c.description && c.description.toLowerCase().includes(s));
  });
  const paginatedData = filteredCredentials.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>Device Credentials</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip title="Refresh"><Button type="text" icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button type="text" icon={<DownloadOutlined />} onClick={handleExport} /></Tooltip>
          <Tooltip title="Filter columns"><Button type="text" icon={<FilterOutlined />} onClick={() => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); }} style={{ color: hasHiddenColumns ? '#1890ff' : undefined }} /></Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Add Credential</Button>
        </div>
      </div>

      <DataTable
        size="middle"
        columns={columns}
        data={paginatedData}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredCredentials.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
      />

      <Modal title={editingCred ? 'Edit Credential' : 'Add Credential'} open={modalVisible} onCancel={() => { setModalVisible(false); form.resetFields(); }} width={600}
        footer={[<Button key="cancel" onClick={() => { setModalVisible(false); form.resetFields(); }}>Cancel</Button>, <Button key="submit" type="primary" onClick={handleSubmit}>{editingCred ? 'Update' : 'Add'} Credential</Button>]}>
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="name" label="Credential Name" rules={[{ required: true, message: 'Please enter credential name' }]}><Input placeholder="e.g., Windows Admin" /></Form.Item>
          <Form.Item name="type" label="Credential Type" rules={[{ required: true, message: 'Please select credential type' }]}>
            <Select placeholder="Select type"><Select.Option value="SSH">SSH</Select.Option><Select.Option value="WINDOWS">Windows</Select.Option><Select.Option value="SNMP">SNMP</Select.Option></Select>
          </Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Please enter username' }]}><Input placeholder="e.g., admin" /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter password' }]}><Input.Password placeholder="Enter password" /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea placeholder="Optional description" rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Credential Details" open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setViewingCred(null); setIsViewModalEditing(false); setShowPassword(false); viewForm.resetFields(); }} width={600}
        footer={[
          <Button key="close" onClick={() => { if (isViewModalEditing) { if (viewingCred) viewForm.setFieldsValue(viewingCred); setIsViewModalEditing(false); setShowPassword(false); } else { setViewModalVisible(false); setViewingCred(null); setShowPassword(false); viewForm.resetFields(); } }}>{isViewModalEditing ? 'Cancel' : 'Close'}</Button>,
          !isViewModalEditing && <Button key="test" onClick={() => viewingCred && testCredentialMutation.mutateAsync(viewingCred.id).then(() => message.success('Test passed')).catch(() => message.error('Test failed'))}>Test Credential</Button>,
          !isViewModalEditing && <Button key="edit" type="primary" onClick={() => setIsViewModalEditing(true)}>Edit</Button>,
          isViewModalEditing && <Button key="save" type="primary" onClick={handleViewModalSave}>Save</Button>,
        ]}>
        <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="name" label="Credential Name" rules={[{ required: true }]}><Input disabled={!isViewModalEditing} /></Form.Item>
          <Form.Item name="type" label="Credential Type" rules={[{ required: true }]}>
            <Select disabled={!isViewModalEditing}><Select.Option value="SSH">SSH</Select.Option><Select.Option value="WINDOWS">Windows</Select.Option><Select.Option value="SNMP">SNMP</Select.Option></Select>
          </Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input disabled={!isViewModalEditing} /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input type={showPassword ? 'text' : 'password'} disabled={!isViewModalEditing}
              suffix={!isViewModalEditing ? <Button type="text" size="small" icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setShowPassword(!showPassword)} /> : null} />
          </Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea disabled={!isViewModalEditing} rows={3} /></Form.Item>
          <Form.Item label="Last Used"><Text type="secondary">{viewingCred?.lastUsed ? new Date(viewingCred.lastUsed).toLocaleString() : '—'}</Text></Form.Item>
        </Form>
      </Modal>

      <ConfirmModal title="Delete Credential" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteCredentialMutation.isPending} confirmText="Delete" danger />

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
