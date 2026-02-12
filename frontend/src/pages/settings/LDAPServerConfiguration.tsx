import { useState } from 'react';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Typography,
  Modal,
  Form,
  Space,
  Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useLDAPServerConfigs, useCreateLDAPServerConfig, useUpdateLDAPServerConfig, useDeleteLDAPServerConfig, useTestLDAPServerConfig } from '../../hooks/useSettings';
import type { LDAPServerConfig } from '../../types/settings.types';
import { getErrorMessage } from '../../utils/error';
import { ColumnFilterModal } from './components/ColumnFilterModal';
import { LDAPFormFields } from './components/LDAPFormFields';

const { Title } = Typography;

const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' },
  { key: 'showName', label: 'Show Name' },
  { key: 'showHost', label: 'Show Host' },
  { key: 'showFQDN', label: 'Show FQDN' },
  { key: 'showCreatedOn', label: 'Show Created On' },
];

interface FilterState {
  showId: boolean;
  showName: boolean;
  showHost: boolean;
  showFQDN: boolean;
  showCreatedOn: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  showId: true,
  showName: true,
  showHost: true,
  showFQDN: true,
  showCreatedOn: true,
};

const setFormFromConfig = (form: ReturnType<typeof Form.useForm>[0], config: LDAPServerConfig) => {
  form.setFieldsValue({
    name: config.name,
    host: config.host,
    port: config.port,
    fqdn: config.fqdn,
    baseDN: config.baseDN,
    username: config.username,
    password: config.password,
    groupBase: config.groupBase,
    protocol: config.protocol || 'LDAP',
    timeout: config.timeout,
    description: config.description,
    enabled: config.enabled ?? true,
    enableAutoSync: config.enableAutoSync ?? false,
    autoSyncInterval: config.autoSyncInterval,
  });
};

export const LDAPServerConfiguration = () => {
  const { message } = App.useApp();
  const { data: rawLdapConfigs, isLoading: loading, refetch } = useLDAPServerConfigs();
  const createConfigMutation = useCreateLDAPServerConfig();
  const updateConfigMutation = useUpdateLDAPServerConfig();
  const deleteConfigMutation = useDeleteLDAPServerConfig();
  const testConfigMutation = useTestLDAPServerConfig();
  const deleteModal = useModal<LDAPServerConfig>();
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LDAPServerConfig | null>(null);
  const [viewingConfig, setViewingConfig] = useState<LDAPServerConfig | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ pageSize: 20, current: 1 });

  const ldapConfigs = Array.isArray(rawLdapConfigs) ? rawLdapConfigs : [];

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (config: LDAPServerConfig) => {
    setEditingConfig(config);
    setFormFromConfig(form, config);
    setModalVisible(true);
  };

  const handleViewConfig = (config: LDAPServerConfig) => {
    setViewingConfig(config);
    setIsViewModalEditing(false);
    setFormFromConfig(viewForm, config);
    setViewModalVisible(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();
      if (viewingConfig) {
        await updateConfigMutation.mutateAsync({ id: viewingConfig.id, data: values });
        message.success('LDAP server configuration updated successfully');
        setViewModalVisible(false);
        setIsViewModalEditing(false);
        viewForm.resetFields();
      }
    } catch {
      message.error('Failed to update LDAP server configuration');
    }
  };

  const handleViewModalCancel = () => {
    setIsViewModalEditing(false);
    if (viewingConfig) setFormFromConfig(viewForm, viewingConfig);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      await deleteConfigMutation.mutateAsync(deleteModal.selectedItem.id);
      message.success('LDAP server configuration deleted successfully');
      deleteModal.onClose();
    } catch {
      message.error('Failed to delete LDAP server configuration');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingConfig) {
        await updateConfigMutation.mutateAsync({ id: editingConfig.id, data: values });
        message.success('LDAP server configuration updated successfully');
      } else {
        await createConfigMutation.mutateAsync(values);
        message.success('LDAP server configuration created successfully');
      }
      setModalVisible(false);
      form.resetFields();
    } catch {
      message.error(`Failed to ${editingConfig ? 'update' : 'create'} LDAP server configuration`);
    }
  };

  const handleTestConnection = async () => {
    if (!editingConfig) {
      message.warning('Please save the configuration first, then test the connection.');
      return;
    }
    try {
      await testConfigMutation.mutateAsync(editingConfig.id);
      message.success('LDAP connection test successful!');
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'LDAP connection test failed'));
    }
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true,
      showName: values.showName !== undefined ? values.showName : true,
      showHost: values.showHost !== undefined ? values.showHost : true,
      showFQDN: values.showFQDN !== undefined ? values.showFQDN : true,
      showCreatedOn: values.showCreatedOn !== undefined ? values.showCreatedOn : true,
    });
    setPagination({ ...pagination, current: 1 });
    setFilterModalVisible(false);
    message.success('Columns updated');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters(DEFAULT_FILTERS);
    setPagination({ ...pagination, current: 1 });
    message.success('All columns shown');
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue(filters);
    setFilterModalVisible(true);
  };

  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Host', 'FQDN', 'Created On'],
      ...filteredConfigs.map((config) => [config.id, config.name, config.host, config.fqdn, config.createdAt || '']),
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ldap-server-configurations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('LDAP server configurations exported successfully');
  };

  const allColumns: ColumnsType<LDAPServerConfig> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: LDAPServerConfig) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewConfig(record); }}>{text}</a> },
    { title: 'Host', dataIndex: 'host', key: 'host' },
    { title: 'FQDN', dataIndex: 'fqdn', key: 'fqdn' },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt',
      render: (text: string) => text ? new Date(text).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—' },
    { title: 'Actions', key: 'actions', width: 100, align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteModal.onOpen(record)} /></Tooltip>
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'host') return filters.showHost;
    if (col.key === 'fqdn') return filters.showFQDN;
    if (col.key === 'createdAt') return filters.showCreatedOn;
    return true;
  });

  const filteredConfigs = ldapConfigs.filter((config) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return config.id.toLowerCase().includes(s) || config.name.toLowerCase().includes(s) || config.host.toLowerCase().includes(s) || config.fqdn.toLowerCase().includes(s) || (config.description && config.description.toLowerCase().includes(s));
  });

  const paginatedData = filteredConfigs.slice((pagination.current! - 1) * pagination.pageSize!, pagination.current! * pagination.pageSize!);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>LDAP Server Configurations</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search by name, host, or FQDN" prefix={<SearchOutlined />} style={{ flex: 1, maxWidth: '400px' }} value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPagination({ ...pagination, current: 1 }); }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button icon={<DownloadOutlined />} onClick={handleExport} disabled={ldapConfigs.length === 0} /></Tooltip>
          <Tooltip title={hasHiddenColumns ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}>
            <Button icon={<FilterOutlined />} onClick={handleOpenFilterModal} type={hasHiddenColumns ? 'primary' : 'default'} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Create</Button>
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} rowKey="id" loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredConfigs.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}–${range[1]} of ${total} items` }}
        style={{ marginBottom: '24px' }} />

      <ConfirmModal title="Delete LDAP Server Configuration" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteConfigMutation.isPending} confirmText="Delete" danger />

      {/* Create/Edit Modal */}
      <Modal title={editingConfig ? 'Edit LDAP Server' : 'Create LDAP Server'} open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>Reset</Button>,
          <Button key="test" onClick={handleTestConnection} loading={testConfigMutation.isPending} disabled={!editingConfig} title={!editingConfig ? 'Save the configuration first to test' : 'Test LDAP connection'}>Test</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>{editingConfig ? 'Update' : 'Create'}</Button>,
        ]}
        width={900}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <LDAPFormFields />
        </Form>
      </Modal>

      {/* View Configuration Modal */}
      <Modal title="LDAP Server Configuration Details" open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setViewingConfig(null); setIsViewModalEditing(false); viewForm.resetFields(); }}
        footer={[
          <Button key="close-or-cancel" onClick={() => { if (isViewModalEditing) { handleViewModalCancel(); } else { setViewModalVisible(false); setViewingConfig(null); viewForm.resetFields(); } }}>
            {isViewModalEditing ? 'Cancel' : 'Close'}
          </Button>,
          !isViewModalEditing && <Button key="edit" type="primary" onClick={() => setIsViewModalEditing(true)}>Edit</Button>,
          isViewModalEditing && <Button key="save" type="primary" onClick={handleViewModalSave}>Save</Button>,
        ]}
        width={900}
      >
        {viewingConfig && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            <LDAPFormFields disabled={!isViewModalEditing} />
          </Form>
        )}
      </Modal>

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
