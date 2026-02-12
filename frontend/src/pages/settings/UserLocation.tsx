import { useState } from 'react';
import {
  SearchOutlined, ReloadOutlined, DownloadOutlined, PlusOutlined, FilterOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  App, Input, Button, Typography, Modal, Form, Space, Popconfirm, Select, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, useOrganizations } from '../../hooks/useSettings';
import './styles.css';
import { ColumnFilterModal } from './components/ColumnFilterModal';

const { Title } = Typography;
const { TextArea } = Input;

interface Location { id: string; name: string; description?: string; createdAt?: string; organizationId?: string; organizationName?: string; isDefault?: boolean; usersCount?: number; departmentsCount?: number; }
interface Organization { id: string; name: string; }
interface FilterState { showId: boolean; showName: boolean; showOrganization: boolean; showDescription: boolean; showDefault: boolean; showUsersCount: boolean; showDepartmentsCount: boolean; showCreatedOn: boolean; }

const DEFAULT_FILTERS: FilterState = { showId: true, showName: true, showOrganization: true, showDescription: true, showDefault: true, showUsersCount: true, showDepartmentsCount: true, showCreatedOn: true };

const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' }, { key: 'showName', label: 'Show Name' }, { key: 'showOrganization', label: 'Show Organization' },
  { key: 'showDescription', label: 'Show Description' }, { key: 'showDefault', label: 'Show Default' }, { key: 'showUsersCount', label: 'Show Users' },
  { key: 'showDepartmentsCount', label: 'Show Departments' }, { key: 'showCreatedOn', label: 'Show Created On' },
];

const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '';
  try { return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); }
  catch { return dateString; }
};

export const UserLocation = () => {
  const { message } = App.useApp();
  const { data: locations = [], isLoading: loading, refetch } = useLocations();
  const { data: rawOrganizations = [] } = useOrganizations();
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();
  const deleteLocationMutation = useDeleteLocation();
  const organizations: Organization[] = Array.isArray(rawOrganizations) ? rawOrganizations as Organization[] : [];

  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const orgOptions = organizations.map((org) => ({ value: org.id, label: org.name }));

  const handleCreate = () => { setEditingLocation(null); form.resetFields(); setModalVisible(true); };
  const handleEdit = (loc: Location) => { setEditingLocation(loc); form.setFieldsValue({ name: loc.name, description: loc.description || '', organizationId: loc.organizationId || undefined }); setModalVisible(true); };

  const handleViewLocation = (loc: Location) => {
    setViewingLocation(loc); setIsViewModalEditing(false);
    viewForm.setFieldsValue({ name: loc.name, description: loc.description || '', organizationId: loc.organizationId || undefined });
    setViewModalVisible(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();
      if (viewingLocation) { await updateLocationMutation.mutateAsync({ id: viewingLocation.id, data: values }); message.success('Location updated successfully'); setViewModalVisible(false); setIsViewModalEditing(false); viewForm.resetFields(); }
    } catch { message.error('Failed to update location'); }
  };

  const handleViewModalCancel = () => { setIsViewModalEditing(false); viewForm.setFieldsValue({ name: viewingLocation?.name, description: viewingLocation?.description, organizationId: viewingLocation?.organizationId || undefined }); };

  const handleDelete = async (loc: Location) => {
    try { await deleteLocationMutation.mutateAsync(loc.id); message.success(`${loc.name} deleted successfully`); }
    catch { message.error('Failed to delete location'); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingLocation) { await updateLocationMutation.mutateAsync({ id: editingLocation.id, data: values }); message.success('Location updated successfully'); }
      else { await createLocationMutation.mutateAsync(values); message.success('Location created successfully'); }
      setModalVisible(false); form.resetFields();
    } catch { message.error(`Failed to ${editingLocation ? 'update' : 'create'} location`); }
  };

  const handleApplyFilters = () => {
    const v = filterForm.getFieldsValue();
    setFilters(Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(k => [k, v[k] !== undefined ? v[k] : true])) as FilterState);
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };

  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('All columns shown'); };
  const handleOpenFilterModal = () => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); };
  const hasHiddenColumns = Object.values(filters).some(v => !v);

  /* eslint-disable react-hooks/purity -- event handler, not called during render */
  const handleExport = () => {
    const csv = [['ID', 'Name', 'Description', 'Created On'], ...filteredLocations.map((loc) => [loc.id, loc.name, loc.description || '', formatDateTime(loc.createdAt)])]
      .map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `locations-${Date.now()}.csv`; a.click(); window.URL.revokeObjectURL(url);
    message.success('Locations exported');
  };
  /* eslint-enable react-hooks/purity */

  const allColumns: ColumnsType<Location> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50, sorter: (a, b) => parseInt(a.id, 10) - parseInt(b.id, 10) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: Location) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewLocation(record); }} style={{ color: '#1890ff' }}>{text}</a> },
    { title: 'Organization', dataIndex: 'organizationName', key: 'organization', render: (text: string) => text || '—' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (text: string) => text || '' },
    { title: 'Default', dataIndex: 'isDefault', key: 'default', width: 80, render: (val: boolean) => val ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
    { title: 'Users', dataIndex: 'usersCount', key: 'usersCount', width: 80, render: (count: number) => <Tag color="blue">{count || 0}</Tag> },
    { title: 'Departments', dataIndex: 'departmentsCount', key: 'departmentsCount', width: 110, render: (count: number) => <Tag color="blue">{count || 0}</Tag> },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt', render: (text: string) => formatDateTime(text) },
    { title: '', key: 'action', width: 80, render: (_, record) => (
      <Space size="small">
        <Button type="text" icon={<EditOutlined />} style={{ color: '#1890ff' }} onClick={() => handleEdit(record)} />
        <Popconfirm title="Delete Location" description={`Are you sure you want to delete ${record.name}?`} onConfirm={() => handleDelete(record)} okText="Delete" okType="danger" cancelText="Cancel">
          <Button type="text" icon={<DeleteOutlined />} style={{ color: '#ff4d4f' }} />
        </Popconfirm>
      </Space>
    ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId; if (col.key === 'name') return filters.showName; if (col.key === 'organization') return filters.showOrganization;
    if (col.key === 'description') return filters.showDescription; if (col.key === 'default') return filters.showDefault; if (col.key === 'usersCount') return filters.showUsersCount;
    if (col.key === 'departmentsCount') return filters.showDepartmentsCount; if (col.key === 'createdAt') return filters.showCreatedOn; return true;
  });

  const filteredLocations = locations.filter((loc) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return loc.id.toLowerCase().includes(s) || loc.name.toLowerCase().includes(s) || (loc.description && loc.description.toLowerCase().includes(s));
  });

  const paginatedLocations = filteredLocations.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize);

  return (
    <div className="location-container">
      <div className="location-header"><Title level={2} style={{ margin: 0 }}>Locations</Title></div>

      <div className="location-toolbar">
        <div className="toolbar-left">
          <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPagination({ ...pagination, current: 1 }); }} style={{ width: 250 }} />
        </div>
        <div className="toolbar-right">
          <Button type="default" icon={<ReloadOutlined />} onClick={async () => { await refetch(); message.success('Locations refreshed'); }}>Refresh</Button>
          <Button type="default" icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Create</Button>
          <Button type={hasHiddenColumns ? 'primary' : 'default'} icon={<FilterOutlined />} onClick={handleOpenFilterModal} />
        </div>
      </div>

      <div className="location-table-wrapper">
        <DataTable columns={columns} data={paginatedLocations} rowKey="id" loading={loading}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: filteredLocations.length, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
          onChange={(p) => setPagination({ current: p.current || 1, pageSize: p.pageSize || 20 })}
          className="location-table" style={{ marginBottom: '16px' }} />
      </div>

      {/* Create/Edit Modal */}
      <Modal title={editingLocation ? 'Edit Location' : 'Create Location'} open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingLocation(null); }} onOk={handleSubmit} okText={editingLocation ? 'Update' : 'Create'}>
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item label="Organization" name="organizationId" rules={[{ required: true, message: 'Please select an organization' }]}>
            <Select placeholder="Select Organization" options={orgOptions} />
          </Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please enter location name' }]}>
            <Input placeholder="Enter location name" />
          </Form.Item>
          <Form.Item label="Description" name="description"><Input placeholder="Enter description" /></Form.Item>
        </Form>
      </Modal>

      {/* View Location Modal */}
      <Modal title="Location Details" open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setViewingLocation(null); setIsViewModalEditing(false); viewForm.resetFields(); }}
        footer={[
          <Button key="close-or-cancel" onClick={() => { if (isViewModalEditing) handleViewModalCancel(); else { setViewModalVisible(false); setViewingLocation(null); viewForm.resetFields(); } }}>
            {isViewModalEditing ? 'Cancel' : 'Close'}
          </Button>,
          !isViewModalEditing && <Button key="edit" type="primary" onClick={() => setIsViewModalEditing(true)}>Edit</Button>,
          isViewModalEditing && <Button key="save" type="primary" onClick={handleViewModalSave}>Save</Button>,
        ]} width={600}>
        {viewingLocation && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            <Form.Item label="Organization" name="organizationId" rules={[{ required: true, message: 'Please select an organization' }]}>
              <Select placeholder="Select Organization" disabled={!isViewModalEditing} options={orgOptions} />
            </Form.Item>
            <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please enter location name' }]}>
              <Input placeholder="Enter location name" disabled={!isViewModalEditing} />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <TextArea placeholder="Enter location description (optional)" disabled={!isViewModalEditing} rows={4} />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
