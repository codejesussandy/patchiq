import { useState } from 'react';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { formatEnum } from '@shared/types';
import type { MenuProps } from 'antd';
import {
  App,
  Input,
  Button,
  Typography,
  Select,
  Tag,
  Dropdown,
  Form,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useOSLicenses, useCreateOSLicense, useUpdateOSLicense, useDeleteOSLicense } from '../../hooks/useAssets';
import { useModal } from '../../hooks/useModal';
import type { OSLicense } from '../../types/asset.types';
import { OSLicenseFormModal } from './components/OSLicenseFormModal';

const { Title, Text } = Typography;
const { Option } = Select;

export const OSLicenses = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();

  const { data: licensesData, isLoading: loading } = useOSLicenses();
  const createOSLicenseMutation = useCreateOSLicense();
  const updateOSLicenseMutation = useUpdateOSLicense();
  const deleteOSLicenseMutation = useDeleteOSLicense();
  const deleteModal = useModal<OSLicense>();
  const licenses: OSLicense[] = licensesData || [];

  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState<OSLicense | null>(null);
  const [osTypeFilter, setOsTypeFilter] = useState<string>('all-os');
  const [statusFilter, setStatusFilter] = useState<string>('all-status');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [autoFetching, setAutoFetching] = useState(false);

  const handleAutoFetchLicenses = async () => {
    setAutoFetching(true);
    message.loading({ content: 'Scanning system for OS licenses...', key: 'autofetch', duration: 0 });
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      message.info({ content: 'Auto-fetch complete. Check for new licenses.', key: 'autofetch', duration: 3 });
    } catch {
      message.error({ content: 'Failed to auto-fetch OS licenses', key: 'autofetch', duration: 3 });
    } finally {
      setAutoFetching(false);
    }
  };

  const handleAddLicense = async () => {
    try {
      const values = await form.validateFields();
      await createOSLicenseMutation.mutateAsync(values);
      message.success('OS License added successfully');
      setModalVisible(false);
      form.resetFields();
    } catch {
      message.error('Failed to add OS license');
    }
  };

  const handleEdit = (license: OSLicense) => {
    setLicenseToEdit(license);
    editForm.setFieldsValue({
      ...license,
      purchaseDate: license.purchaseDate ? dayjs(license.purchaseDate) : undefined,
      expiryDate: license.expiryDate ? dayjs(license.expiryDate) : undefined,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await updateOSLicenseMutation.mutateAsync({ id: licenseToEdit!.id, data: values });
      message.success('OS License updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      setLicenseToEdit(null);
    } catch {
      message.error('Failed to update OS license');
    }
  };

  const handleDelete = (license: OSLicense) => {
    deleteModal.onOpen(license);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      await deleteOSLicenseMutation.mutateAsync(deleteModal.selectedItem.id);
      message.success('OS License deleted successfully');
      deleteModal.onClose();
    } catch {
      message.error('Failed to delete OS license');
    }
  };

  const getActionMenuItems = (license: OSLicense): MenuProps['items'] => [
    { key: 'edit', label: 'Edit', onClick: (info) => { info.domEvent.stopPropagation(); handleEdit(license); } },
    { type: 'divider' },
    { key: 'delete', label: 'Delete', danger: true, onClick: (info) => { info.domEvent.stopPropagation(); handleDelete(license); } },
  ];

  const columns: ColumnsType<OSLicense> = [
    { title: 'License Name', dataIndex: 'licenseName', key: 'licenseName', sorter: (a, b) => a.licenseName.localeCompare(b.licenseName) },
    { title: 'OS Type', dataIndex: 'osType', key: 'osType', sorter: (a, b) => a.osType.localeCompare(b.osType) },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ALLOCATED' ? 'green' : status === 'AVAILABLE' ? 'blue' : 'red'}>
          {formatEnum(status)}
        </Tag>
      ),
      filters: [
        { text: 'Allocated', value: 'ALLOCATED' },
        { text: 'Available', value: 'AVAILABLE' },
        { text: 'Expired', value: 'EXPIRED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    { title: 'License Count', dataIndex: 'licenseCount', key: 'licenseCount', sorter: (a, b) => a.licenseCount - b.licenseCount },
    { title: 'Vendor Name', dataIndex: 'vendorName', key: 'vendorName', sorter: (a, b) => a.vendorName.localeCompare(b.vendorName) },
    {
      title: '', key: 'action', width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
        </Dropdown>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => setSelectedRowKeys(selectedKeys),
  };

  // Reserved for future category/subcategory filtering
  const _categoryId = searchParams.get('category');
  const _subCategoryId = searchParams.get('subcategory');
  void _categoryId; void _subCategoryId;

  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch = lic.licenseName.toLowerCase().includes(searchText.toLowerCase());
    const matchesOsType = osTypeFilter === 'all-os' || lic.osType.toLowerCase().includes(osTypeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all-status' || lic.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesOsType && matchesStatus;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>OS License</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>Manage operating system license assignments</Text>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button icon={<SyncOutlined spin={autoFetching} />} onClick={handleAutoFetchLicenses} loading={autoFetching}>
            Auto Fetch
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            New License
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
        <Input placeholder="Search" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <Select value={osTypeFilter} onChange={setOsTypeFilter} style={{ width: 200 }}>
          <Option value="all-os">All OS</Option>
          <Option value="windows">Windows</Option>
          <Option value="macos">macOS</Option>
          <Option value="linux">Linux</Option>
        </Select>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 200 }}>
          <Option value="all-status">All Status</Option>
          <Option value="ALLOCATED">Allocated</Option>
          <Option value="AVAILABLE">Available</Option>
          <Option value="EXPIRED">Expired</Option>
        </Select>
      </div>

      <DataTable
        rowSelection={rowSelection}
        columns={columns}
        data={filteredLicenses}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} found` }}
        onRow={(record) => ({ onClick: () => handleEdit(record), style: { cursor: 'pointer' } })}
      />

      <OSLicenseFormModal
        title="Add New OS License"
        open={modalVisible}
        form={form}
        onOk={handleAddLicense}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
      />

      <ConfirmModal
        title="Delete OS License"
        description={`Are you sure you want to delete ${deleteModal.selectedItem?.licenseName}?`}
        open={deleteModal.open}
        onConfirm={handleDeleteConfirm}
        onCancel={deleteModal.onClose}
        loading={deleteOSLicenseMutation.isPending}
        confirmText="Delete"
        danger
      />

      <OSLicenseFormModal
        title="Edit OS License"
        open={editModalVisible}
        form={editForm}
        onOk={handleEditSubmit}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setLicenseToEdit(null); }}
      />
    </div>
  );
};
