import { useState, useEffect } from 'react';
import {
  Button,
  Table,
  Space,
  Input,
  Modal,
  Form,
  message,
  Tooltip,
  Typography,
  Upload,
  Select,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';
import type { VendorLogo } from '../../types/settings.types';

const { Title, Text } = Typography;

export const VendorLogo = () => {
  const [logos, setLogos] = useState<VendorLogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingLogo, setEditingLogo] = useState<VendorLogo | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [hasHiddenColumns, setHasHiddenColumns] = useState(false);

  const [filters, setFilters] = useState({
    showLogo: true,
    showName: true,
    showType: true,
    showCreatedOn: true,
  });

  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getVendorLogos();
      setLogos(data || []);
    } catch (error) {
      console.error('Error fetching vendor logos:', error);
      message.error('Failed to fetch vendor logos');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogos = logos.filter((logo) =>
    logo.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleOpenModal = (mode: 'create' | 'edit', logo?: VendorLogo) => {
    setModalMode(mode);
    setLogoFile(null);
    setLogoPreview('');

    if (mode === 'edit' && logo) {
      setEditingLogo(logo);
      form.setFieldsValue({
        name: logo.name,
        type: logo.type,
      });
      setLogoPreview(logo.logoUrl);
    } else {
      setEditingLogo(null);
      form.resetFields();
    }

    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setModalMode(null);
    setEditingLogo(null);
    setLogoFile(null);
    setLogoPreview('');
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validation: require logo file for create mode
      if (modalMode === 'create' && !logoFile) {
        message.error('Please upload a logo image');
        return;
      }

      setUploading(true);

      // Create FormData
      const formData = new FormData();
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      formData.append('name', values.name);
      formData.append('type', values.type);

      if (modalMode === 'edit' && editingLogo) {
        await settingsService.updateVendorLogo(editingLogo.id, formData);
        message.success('Vendor logo updated successfully');
      } else {
        await settingsService.createVendorLogo(formData);
        message.success('Vendor logo added successfully');
      }

      handleModalClose();
      fetchLogos();
    } catch (error) {
      console.error('Error saving vendor logo:', error);
      if (error instanceof Error && 'errorFields' in error) {
        // Form validation error, already shown by Form component
      } else {
        message.error(`Failed to ${modalMode === 'edit' ? 'update' : 'add'} vendor logo`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (logo: VendorLogo) => {
    Modal.confirm({
      title: 'Delete Vendor Logo',
      content: `Are you sure you want to delete "${logo.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteVendorLogo(logo.id);
          message.success('Vendor logo deleted successfully');
          fetchLogos();
        } catch (error) {
          console.error('Error deleting vendor logo:', error);
          message.error('Failed to delete vendor logo');
        }
      },
    });
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Type', 'File Name', 'Created On'],
      ...filteredLogos.map((logo) => [
        logo.name,
        logo.type,
        logo.fileName || '',
        logo.createdAt || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vendor-logos.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Vendor logos exported successfully');
  };

  const handleReset = () => {
    form.resetFields();
    setLogoFile(null);
    setLogoPreview('');
  };

  const isValidImageFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    const validExtensions = /\.(png|jpg|jpeg|gif|svg)$/i;
    return validTypes.includes(file.type) || validExtensions.test(file.name);
  };

  const beforeUpload = (file: File) => {
    if (!isValidImageFile(file)) {
      message.error('Only PNG, JPG, GIF, SVG files are allowed');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB');
      return false;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setLogoPreview(result);
      }
    };
    reader.readAsDataURL(file);
    return false; // Prevent auto upload
  };

  const handleFilterChange = (key: keyof typeof filters) => {
    const newFilters = { ...filters, [key]: !filters[key] };
    setFilters(newFilters);
    setHasHiddenColumns(!Object.values(newFilters).every((v) => v));
  };

  const handleFilterModalOk = () => {
    setFilterModalVisible(false);
  };

  const tableColumns: ColumnsType<VendorLogo> = [
    filters.showLogo
      ? {
          title: 'Logo',
          dataIndex: 'logoUrl',
          key: 'logo',
          width: 80,
          render: (logoUrl: string, record: VendorLogo) => (
            <div
              style={{
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                border: '1px solid #e8e8e8',
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={record.name}
                  style={{
                    maxWidth: '36px',
                    maxHeight: '36px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span style={{ color: '#bfbfbf', fontSize: '12px' }}>N/A</span>
              )}
            </div>
          ),
        }
      : null,
    filters.showName
      ? {
          title: 'Name',
          dataIndex: 'name',
          key: 'name',
          sorter: (a: VendorLogo, b: VendorLogo) => a.name.localeCompare(b.name),
          render: (text: string, record: VendorLogo) => (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleOpenModal('edit', record);
              }}
              style={{ color: '#1890ff' }}
            >
              {text}
            </a>
          ),
        }
      : null,
    filters.showType
      ? {
          title: 'Type',
          dataIndex: 'type',
          key: 'type',
          width: 120,
          sorter: (a: VendorLogo, b: VendorLogo) => a.type.localeCompare(b.type),
          render: (type: string) => type,
        }
      : null,
    filters.showCreatedOn
      ? {
          title: 'Created On',
          dataIndex: 'createdAt',
          key: 'createdAt',
          width: 200,
          render: (text: string) => {
            if (!text) return '—';
            const date = new Date(text);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours() % 12 || 12).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
            return `${year}/${month}/${day} ${hours}:${minutes}:${seconds} ${ampm}`;
          },
        }
      : null,
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: VendorLogo) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleOpenModal('edit', record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ].filter(Boolean) as ColumnsType<VendorLogo>;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Vendor Logo</Title>
      </div>

      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '12px',
        }}
      >
        <Input
          placeholder="Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: '300px' }}
          prefix={<span style={{ color: '#bfbfbf' }}>🔍</span>}
        />

        <Space>
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchLogos}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={filteredLogos.length === 0}
            />
          </Tooltip>

          <Tooltip title="Filter">
            <Button
              icon={<FilterOutlined />}
              type={hasHiddenColumns ? 'primary' : 'default'}
              onClick={() => setFilterModalVisible(true)}
            />
          </Tooltip>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal('create')}
          >
            Add Logo
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={tableColumns}
        dataSource={filteredLogos}
        loading={loading}
        rowKey="id"
        pagination={pagination}
        onChange={(pag) => setPagination(pag)}
        style={{ backgroundColor: 'white', borderRadius: '8px' }}
        locale={{
          emptyText: filteredLogos.length === 0 ? 'No vendor logos found' : undefined,
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={modalMode === 'edit' ? 'Edit Logo' : 'Add Logo'}
        open={modalVisible}
        width={600}
        onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={handleReset}>
            Reset
          </Button>,
          <Button
            key="cancel"
            onClick={handleModalClose}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            onClick={handleSubmit}
          >
            {modalMode === 'edit' ? 'Update' : 'Create'}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
          {/* 2-Column Form Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label={<span>Name <span style={{ color: 'red' }}>*</span></span>}
              name="name"
              rules={[
                { required: true, message: 'Please enter logo name' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input placeholder="e.g., Microsoft, VMware" />
            </Form.Item>

            <Form.Item
              label={<span>Type <span style={{ color: 'red' }}>*</span></span>}
              name="type"
              rules={[{ required: true, message: 'Please select logo type' }]}
            >
              <Select placeholder="Type">
                <Select.Option value="integration">Integration</Select.Option>
                <Select.Option value="vendor">Vendor</Select.Option>
                <Select.Option value="os">OS</Select.Option>
              </Select>
            </Form.Item>
          </div>

          {/* Upload Area */}
          <Form.Item
            label={<span>Logo <span style={{ color: 'red' }}>*</span></span>}
          >
            <Upload.Dragger
              maxCount={1}
              accept="image/png,image/jpeg,image/gif,image/svg+xml,.png,.jpg,.jpeg,.gif,.svg"
              beforeUpload={beforeUpload}
              onRemove={() => {
                setLogoFile(null);
                setLogoPreview('');
              }}
              fileList={logoFile ? [logoFile as any] : []}
            >
              <div
                style={{
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '48px',
                    color: '#1890ff',
                    marginBottom: '16px',
                  }}
                >
                  <CloudUploadOutlined />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong style={{ fontSize: '14px' }}>
                    Click or drag files in to upload
                  </Text>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Select one png image for best result.
                  </Text>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Support for a single upload
                </Text>
              </div>
            </Upload.Dragger>

            {/* Preview */}
            {logoPreview && (
              <div
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '4px',
                }}
              >
                <img
                  src={logoPreview}
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Filter Columns"
        open={filterModalVisible}
        onOk={handleFilterModalOk}
        onCancel={() => setFilterModalVisible(false)}
        width={400}
      >
        <Form form={filterForm} layout="vertical">
          <Form.Item>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.showLogo}
                    onChange={() => handleFilterChange('showLogo')}
                    style={{ marginRight: '8px' }}
                  />
                  Logo
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.showName}
                    onChange={() => handleFilterChange('showName')}
                    style={{ marginRight: '8px' }}
                  />
                  Name
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.showType}
                    onChange={() => handleFilterChange('showType')}
                    style={{ marginRight: '8px' }}
                  />
                  Type
                </label>
              </div>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.showCreatedOn}
                    onChange={() => handleFilterChange('showCreatedOn')}
                    style={{ marginRight: '8px' }}
                  />
                  Created On
                </label>
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
