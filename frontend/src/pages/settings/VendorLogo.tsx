import { useState } from 'react';
import { PlusOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined, EditOutlined, DeleteOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { App, Button, Space, Input, Modal, Form, Tooltip, Typography, Upload, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useVendorLogos, useCreateVendorLogo, useUpdateVendorLogo, useDeleteVendorLogo } from '../../hooks/useSettings';
import type { VendorLogo as VendorLogoType } from '../../types/settings.types';
import { ColumnFilterModal } from './components/ColumnFilterModal';

const { Title, Text } = Typography;

interface FilterState { showLogo: boolean; showName: boolean; showType: boolean; showCreatedOn: boolean; }
const DEFAULT_FILTERS: FilterState = { showLogo: true, showName: true, showType: true, showCreatedOn: true };
const FILTER_COLUMNS = [
  { key: 'showLogo', label: 'Show Logo' }, { key: 'showName', label: 'Show Name' },
  { key: 'showType', label: 'Show Type' }, { key: 'showCreatedOn', label: 'Show Created On' },
];

const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
  return validTypes.includes(file.type) || /\.(png|jpg|jpeg|gif|svg)$/i.test(file.name);
};

export const VendorLogo = () => {
  const { message } = App.useApp();
  const { data: rawLogos, isLoading: loading, refetch } = useVendorLogos();
  const createLogoMutation = useCreateVendorLogo();
  const updateLogoMutation = useUpdateVendorLogo();
  const deleteLogoMutation = useDeleteVendorLogo();
  const deleteModal = useModal<VendorLogoType>();

  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingLogo, setEditingLogo] = useState<VendorLogoType | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const logos = rawLogos || [];
  const filteredLogos = logos.filter((logo) => logo.name.toLowerCase().includes(searchText.toLowerCase()));
  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const handleOpenModal = (mode: 'create' | 'edit', logo?: VendorLogoType) => {
    setModalMode(mode); setLogoFile(null); setLogoPreview('');
    if (mode === 'edit' && logo) { setEditingLogo(logo); form.setFieldsValue({ name: logo.name, type: logo.type }); setLogoPreview(logo.logoUrl); }
    else { setEditingLogo(null); form.resetFields(); }
    setModalVisible(true);
  };

  const handleModalClose = () => { setModalVisible(false); setModalMode(null); setEditingLogo(null); setLogoFile(null); setLogoPreview(''); form.resetFields(); };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (modalMode === 'create' && !logoFile) { message.error('Please upload a logo image'); return; }
      const formData = new FormData();
      if (logoFile) formData.append('logo', logoFile);
      formData.append('name', values.name); formData.append('type', values.type);
      if (modalMode === 'edit' && editingLogo) { await updateLogoMutation.mutateAsync({ id: editingLogo.id, data: formData }); message.success('Vendor logo updated successfully'); }
      else { await createLogoMutation.mutateAsync(formData); message.success('Vendor logo added successfully'); }
      handleModalClose();
    } catch (error) {
      if (error instanceof Error && 'errorFields' in error) return;
      message.error(`Failed to ${modalMode === 'edit' ? 'update' : 'add'} vendor logo`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteLogoMutation.mutateAsync(deleteModal.selectedItem.id); message.success('Vendor logo deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete vendor logo'); }
  };

  const handleExport = () => {
    const csv = [['Name', 'Type', 'File Name', 'Created On'], ...filteredLogos.map((logo) => [logo.name, logo.type, logo.fileName || '', logo.createdAt || ''])]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'vendor-logos.csv'; a.click(); window.URL.revokeObjectURL(url);
    message.success('Vendor logos exported successfully');
  };

  const beforeUpload = (file: File) => {
    if (!isValidImageFile(file)) { message.error('Only PNG, JPG, GIF, SVG files are allowed'); return false; }
    if (file.size / 1024 / 1024 >= 5) { message.error('Image must be smaller than 5MB'); return false; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => { if (typeof e.target?.result === 'string') setLogoPreview(e.target.result); };
    reader.readAsDataURL(file);
    return false;
  };

  const handleApplyFilters = () => {
    const v = filterForm.getFieldsValue();
    setFilters(Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(k => [k, v[k] !== undefined ? v[k] : true])) as FilterState);
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };
  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('All columns shown'); };

  const allColumns: ColumnsType<VendorLogoType> = [
    { title: 'Logo', dataIndex: 'logoUrl', key: 'logo', width: 80,
      render: (logoUrl: string, record: VendorLogoType) => (
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', borderRadius: '4px', border: '1px solid #e8e8e8' }}>
          {logoUrl ? <img src={logoUrl} alt={record.name} style={{ maxWidth: '36px', maxHeight: '36px', objectFit: 'contain' }} /> : <span style={{ color: '#bfbfbf', fontSize: '12px' }}>N/A</span>}
        </div>
      ) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: VendorLogoType, b: VendorLogoType) => a.name.localeCompare(b.name),
      render: (text: string, record: VendorLogoType) => <a href="#" onClick={(e) => { e.preventDefault(); handleOpenModal('edit', record); }} style={{ color: '#1890ff' }}>{text}</a> },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120, sorter: (a: VendorLogoType, b: VendorLogoType) => a.type.localeCompare(b.type) },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt', width: 200,
      render: (text: string) => text ? new Date(text).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—' },
    { title: 'Actions', key: 'actions', width: 100, align: 'right' as const,
      render: (_: unknown, record: VendorLogoType) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleOpenModal('edit', record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteModal.onOpen(record)} /></Tooltip>
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'logo') return filters.showLogo; if (col.key === 'name') return filters.showName;
    if (col.key === 'type') return filters.showType; if (col.key === 'createdAt') return filters.showCreatedOn; return true;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>Vendor Logo</Title></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <Input placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ maxWidth: '300px' }} prefix={<span style={{ color: '#bfbfbf' }}>&#x1F50D;</span>} />
        <Space>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button icon={<DownloadOutlined />} onClick={handleExport} disabled={filteredLogos.length === 0} /></Tooltip>
          <Tooltip title="Filter"><Button icon={<FilterOutlined />} type={hasHiddenColumns ? 'primary' : 'default'} onClick={() => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); }} /></Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal('create')}>Add Logo</Button>
        </Space>
      </div>

      <DataTable size="middle" columns={columns} data={filteredLogos} loading={loading} rowKey="id" pagination={pagination}
        onChange={(pag) => setPagination(pag)} style={{ backgroundColor: 'white', borderRadius: '8px' }}
        locale={{ emptyText: filteredLogos.length === 0 ? 'No vendor logos found' : undefined }} />

      <Modal title={modalMode === 'edit' ? 'Edit Logo' : 'Add Logo'} open={modalVisible} width={600} onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={() => { form.resetFields(); setLogoFile(null); setLogoPreview(''); }}>Reset</Button>,
          <Button key="cancel" onClick={handleModalClose}>Cancel</Button>,
          <Button key="submit" type="primary" loading={createLogoMutation.isPending || updateLogoMutation.isPending} onClick={handleSubmit}>{modalMode === 'edit' ? 'Update' : 'Create'}</Button>,
        ]}>
        <Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label={<span>Name <span style={{ color: 'red' }}>*</span></span>} name="name" rules={[{ required: true, message: 'Please enter logo name' }, { min: 2, message: 'Name must be at least 2 characters' }]}>
              <Input placeholder="e.g., Microsoft, VMware" />
            </Form.Item>
            <Form.Item label={<span>Type <span style={{ color: 'red' }}>*</span></span>} name="type" rules={[{ required: true, message: 'Please select logo type' }]}>
              <Select placeholder="Type">
                <Select.Option value="integration">Integration</Select.Option>
                <Select.Option value="vendor">Vendor</Select.Option>
                <Select.Option value="os">OS</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item label={<span>Logo <span style={{ color: 'red' }}>*</span></span>}>
            <Upload.Dragger maxCount={1} accept="image/png,image/jpeg,image/gif,image/svg+xml,.png,.jpg,.jpeg,.gif,.svg" beforeUpload={beforeUpload}
              onRemove={() => { setLogoFile(null); setLogoPreview(''); }}
              fileList={logoFile ? [{ uid: '-1', name: logoFile.name, status: 'done' as const, originFileObj: logoFile } as UploadFile] : []}>
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}><CloudUploadOutlined /></div>
                <div style={{ marginBottom: '8px' }}><Text strong style={{ fontSize: '14px' }}>Click or drag files in to upload</Text></div>
                <Text type="secondary" style={{ fontSize: '12px' }}>Select one png image for best result. Support for a single upload</Text>
              </div>
            </Upload.Dragger>
            {logoPreview && (
              <div style={{ marginTop: '16px', textAlign: 'center', padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                <img src={logoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }} />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmModal title="Delete Vendor Logo" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteLogoMutation.isPending} confirmText="Delete" danger />

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
