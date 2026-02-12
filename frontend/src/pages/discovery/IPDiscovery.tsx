import { useState } from 'react';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { App, Input, Button, Modal, Form, Space, Typography, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useIPRanges, useCreateIPRange, useUpdateIPRange, useDeleteIPRange } from '../../hooks/useDiscovery';
import { useModal } from '../../hooks/useModal';
import type { IPRange, IPRangeFilterState } from '../../types/discovery.types';
import { ColumnFilterModal } from '../settings/components/ColumnFilterModal';

const { Title, Text } = Typography;

const DEFAULT_FILTERS: IPRangeFilterState = { showId: true, showName: true, showRange: true, showDescription: true, showLastScanned: true, showDeviceCount: true };
const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' }, { key: 'showName', label: 'Show Name' }, { key: 'showRange', label: 'Show IP Range' },
  { key: 'showDescription', label: 'Show Description' }, { key: 'showLastScanned', label: 'Show Last Scanned' }, { key: 'showDeviceCount', label: 'Show Devices Found' },
];

export const IPDiscovery = () => {
  const { message } = App.useApp();
  const { data: rawRanges = [], isLoading: loading, refetch } = useIPRanges();
  const ranges: IPRange[] = Array.isArray(rawRanges) ? rawRanges : [];
  const createIPRangeMutation = useCreateIPRange();
  const updateIPRangeMutation = useUpdateIPRange();
  const deleteIPRangeMutation = useDeleteIPRange();
  const deleteModal = useModal<IPRange>();

  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<IPRangeFilterState>(DEFAULT_FILTERS);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingRange, setEditingRange] = useState<IPRange | null>(null);
  const [viewingRange, setViewingRange] = useState<IPRange | null>(null);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const handleCreate = () => { setEditingRange(null); form.resetFields(); setModalVisible(true); };
  const handleEdit = (range: IPRange) => { setEditingRange(range); form.setFieldsValue(range); setModalVisible(true); };
  const handleViewItem = (range: IPRange) => { setViewingRange(range); setIsViewModalEditing(false); viewForm.setFieldsValue(range); setViewModalVisible(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteIPRangeMutation.mutateAsync(deleteModal.selectedItem.id); message.success('IP range deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete IP range'); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRange) { await updateIPRangeMutation.mutateAsync({ id: editingRange.id, data: values }); message.success('IP range updated successfully'); }
      else { await createIPRangeMutation.mutateAsync(values); message.success('IP range created successfully'); }
      setModalVisible(false); form.resetFields();
    } catch { message.error(`Failed to ${editingRange ? 'update' : 'create'} IP range`); }
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();
      if (viewingRange) { await updateIPRangeMutation.mutateAsync({ id: viewingRange.id, data: values }); message.success('IP range updated successfully'); setViewModalVisible(false); setViewingRange(null); setIsViewModalEditing(false); viewForm.resetFields(); }
    } catch { message.error('Failed to update IP range'); }
  };

  const handleExport = () => {
    const csv = [['ID', 'Name', 'Range', 'Description', 'Last Scanned', 'Device Count'], ...filteredRanges.map((r) => [r.id, r.name, r.range, r.description || '', r.lastScanned || '—', r.deviceCount])]
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ip-ranges.csv'; a.click(); window.URL.revokeObjectURL(url);
    message.success('IP ranges exported successfully');
  };

  const handleApplyFilters = () => {
    const v = filterForm.getFieldsValue();
    setFilters(Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(k => [k, v[k] !== undefined ? v[k] : true])) as IPRangeFilterState);
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };
  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('All columns shown'); };
  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const allColumns: ColumnsType<IPRange> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: (a, b) => parseInt(a.id) - parseInt(b.id) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: IPRange) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewItem(record); }}>{text}</a> },
    { title: 'IP Range', dataIndex: 'range', key: 'range', render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span> },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (text: string) => text || '—' },
    { title: 'Last Scanned', dataIndex: 'lastScanned', key: 'lastScanned',
      render: (text: string) => text ? new Date(text).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—' },
    { title: 'Devices Found', dataIndex: 'deviceCount', key: 'deviceCount', width: 100, sorter: (a, b) => a.deviceCount - b.deviceCount },
    { title: 'Actions', key: 'actions', width: 100, align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteModal.onOpen(record)} /></Tooltip>
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId; if (col.key === 'name') return filters.showName; if (col.key === 'range') return filters.showRange;
    if (col.key === 'description') return filters.showDescription; if (col.key === 'lastScanned') return filters.showLastScanned; if (col.key === 'deviceCount') return filters.showDeviceCount; return true;
  });

  const filteredRanges = ranges.filter((r) => {
    if (!searchText) return true; const s = searchText.toLowerCase();
    return r.id.toLowerCase().includes(s) || r.name.toLowerCase().includes(s) || r.range.toLowerCase().includes(s) || (r.description && r.description.toLowerCase().includes(s));
  });
  const paginatedData = filteredRanges.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>IP Discovery</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip title="Refresh"><Button type="text" icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button type="text" icon={<DownloadOutlined />} onClick={handleExport} /></Tooltip>
          <Tooltip title="Filter columns"><Button type="text" icon={<FilterOutlined />} onClick={() => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); }} style={{ color: hasHiddenColumns ? '#1890ff' : undefined }} /></Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Create IP Range</Button>
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} rowKey="id" loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredRanges.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }} />

      <Modal title={editingRange ? 'Edit IP Range' : 'Create IP Range'} open={modalVisible} onCancel={() => { setModalVisible(false); form.resetFields(); }} width={600}
        footer={[<Button key="cancel" onClick={() => { setModalVisible(false); form.resetFields(); }}>Cancel</Button>, <Button key="submit" type="primary" onClick={handleSubmit}>{editingRange ? 'Update' : 'Create'} IP Range</Button>]}>
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="name" label="Range Name" rules={[{ required: true, message: 'Please enter range name' }]}><Input placeholder="e.g., Corporate Network" /></Form.Item>
          <Form.Item name="range" label="IP Range (CIDR)" rules={[{ required: true, message: 'Please enter IP range in CIDR notation' }]}><Input placeholder="e.g., 192.168.1.0/24" /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea placeholder="Optional description" rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="IP Range Details" open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setViewingRange(null); setIsViewModalEditing(false); viewForm.resetFields(); }} width={600}
        footer={[
          <Button key="close" onClick={() => { if (isViewModalEditing) { if (viewingRange) viewForm.setFieldsValue(viewingRange); setIsViewModalEditing(false); } else { setViewModalVisible(false); setViewingRange(null); viewForm.resetFields(); } }}>{isViewModalEditing ? 'Cancel' : 'Close'}</Button>,
          !isViewModalEditing && <Button key="edit" type="primary" onClick={() => setIsViewModalEditing(true)}>Edit</Button>,
          isViewModalEditing && <Button key="save" type="primary" onClick={handleViewModalSave}>Save</Button>,
        ]}>
        <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="name" label="Range Name" rules={[{ required: true }]}><Input disabled={!isViewModalEditing} /></Form.Item>
          <Form.Item name="range" label="IP Range (CIDR)" rules={[{ required: true }]}><Input disabled={!isViewModalEditing} /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea disabled={!isViewModalEditing} rows={3} /></Form.Item>
          <Form.Item label="Last Scanned"><Text type="secondary">{viewingRange?.lastScanned ? new Date(viewingRange.lastScanned).toLocaleString() : '—'}</Text></Form.Item>
          <Form.Item label="Devices Found"><Text>{viewingRange?.deviceCount || 0}</Text></Form.Item>
        </Form>
      </Modal>

      <ConfirmModal title="Delete IP Range" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteIPRangeMutation.isPending} confirmText="Delete" danger />

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
