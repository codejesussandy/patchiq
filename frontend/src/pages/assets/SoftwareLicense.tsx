import { useState, useEffect } from 'react';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
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
  Segmented,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import {
  useSoftwareLicenses, useOSLicenses,
  useCreateSoftwareLicense, useUpdateSoftwareLicense, useDeleteSoftwareLicense,
  useCreateOSLicense, useUpdateOSLicense, useDeleteOSLicense,
} from '../../hooks/useAssets';
import { useModal } from '../../hooks/useModal';
import type { SoftwareLicense as SoftwareLicenseType, OSLicense } from '../../types/asset.types';
import { LicenseFormModal } from './components/LicenseFormModal';

const { Title } = Typography;
const { Option } = Select;

type LicenseTab = 'software' | 'os';

export const SoftwareLicense = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<LicenseTab>('software');

  const { data: softwareLicensesData, isLoading: swLoading } = useSoftwareLicenses();
  const { data: osLicensesData, isLoading: osLoading } = useOSLicenses();
  const softwareLicenses: SoftwareLicenseType[] = softwareLicensesData || [];
  const osLicenses: OSLicense[] = osLicensesData || [];

  const createSwLicenseMutation = useCreateSoftwareLicense();
  const updateSwLicenseMutation = useUpdateSoftwareLicense();
  const deleteSwLicenseMutation = useDeleteSoftwareLicense();
  const createOsLicenseMutation = useCreateOSLicense();
  const updateOsLicenseMutation = useUpdateOSLicense();
  const deleteOsLicenseMutation = useDeleteOSLicense();
  const deleteModal = useModal<SoftwareLicenseType | OSLicense>();

  const [softwareFilter, setSoftwareFilter] = useState<string>('all-software');
  const [osTypeFilter, setOsTypeFilter] = useState<string>('all-os');
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all-status');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState<SoftwareLicenseType | OSLicense | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  /* eslint-disable react-hooks/set-state-in-effect -- reset UI state on tab change */
  useEffect(() => {
    setSelectedRowKeys([]);
    setSearchText('');
    setStatusFilter('all-status');
  }, [activeTab]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAddLicense = async () => {
    try {
      const values = await form.validateFields();
      if (activeTab === 'software') {
        await createSwLicenseMutation.mutateAsync(values);
      } else {
        await createOsLicenseMutation.mutateAsync(values);
      }
      message.success('License added successfully');
      setModalVisible(false);
      form.resetFields();
    } catch {
      message.error('Failed to add license');
    }
  };

  const handleEdit = (license: SoftwareLicenseType | OSLicense) => {
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
      if (activeTab === 'software') {
        await updateSwLicenseMutation.mutateAsync({ id: licenseToEdit!.id, data: values });
      } else {
        await updateOsLicenseMutation.mutateAsync({ id: licenseToEdit!.id, data: values });
      }
      message.success('License updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      setLicenseToEdit(null);
    } catch {
      message.error('Failed to update license');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      if (activeTab === 'software') {
        await deleteSwLicenseMutation.mutateAsync(deleteModal.selectedItem.id);
      } else {
        await deleteOsLicenseMutation.mutateAsync(deleteModal.selectedItem.id);
      }
      message.success('License deleted successfully');
      deleteModal.onClose();
    } catch {
      message.error('Failed to delete license');
    }
  };

  const getActionMenuItems = (license: SoftwareLicenseType | OSLicense): MenuProps['items'] => [
    { key: 'edit', label: 'Edit', onClick: (info) => { info.domEvent.stopPropagation(); handleEdit(license); } },
    { type: 'divider' },
    { key: 'delete', label: 'Delete', danger: true, onClick: (info) => { info.domEvent.stopPropagation(); deleteModal.onOpen(license); } },
  ];

  const actionColumn = {
    title: '', key: 'action', width: 50,
    render: (_: unknown, record: SoftwareLicenseType | OSLicense) => (
      <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
        <Button type="text" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
      </Dropdown>
    ),
  };

  const statusColumn = {
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
    onFilter: (value: boolean | React.Key, record: SoftwareLicenseType | OSLicense) => record.status === value,
  };

  const softwareColumns: ColumnsType<SoftwareLicenseType> = [
    { title: 'License Name', dataIndex: 'licenseName', key: 'licenseName', sorter: (a, b) => a.licenseName.localeCompare(b.licenseName) },
    { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName' },
    statusColumn as ColumnsType<SoftwareLicenseType>[number],
    { title: 'License Count', dataIndex: 'licenseCount', key: 'licenseCount', sorter: (a, b) => a.licenseCount - b.licenseCount },
    { title: 'Vendor Name', dataIndex: 'vendorName', key: 'vendorName', sorter: (a, b) => a.vendorName.localeCompare(b.vendorName) },
    actionColumn as ColumnsType<SoftwareLicenseType>[number],
  ];

  const osColumns: ColumnsType<OSLicense> = [
    { title: 'License Name', dataIndex: 'licenseName', key: 'licenseName', sorter: (a, b) => a.licenseName.localeCompare(b.licenseName) },
    { title: 'OS Type', dataIndex: 'osType', key: 'osType', sorter: (a, b) => a.osType.localeCompare(b.osType) },
    statusColumn as ColumnsType<OSLicense>[number],
    { title: 'License Count', dataIndex: 'licenseCount', key: 'licenseCount', sorter: (a, b) => a.licenseCount - b.licenseCount },
    { title: 'Vendor Name', dataIndex: 'vendorName', key: 'vendorName', sorter: (a, b) => a.vendorName.localeCompare(b.vendorName) },
    actionColumn as ColumnsType<OSLicense>[number],
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => setSelectedRowKeys(selectedKeys),
  };

  const categoryId = searchParams.get('category');
  const subCategoryId = searchParams.get('subcategory');

  const filteredSoftwareLicenses = softwareLicenses.filter((lic) => {
    const matchesSearch = lic.licenseName.toLowerCase().includes(searchText.toLowerCase());
    const matchesSoftware = softwareFilter === 'all-software' || lic.softwareName.toLowerCase().includes(softwareFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all-status' || lic.status.toLowerCase() === statusFilter.toLowerCase();
    void categoryId; void subCategoryId;
    return matchesSearch && matchesSoftware && matchesStatus;
  });

  const filteredOsLicenses = osLicenses.filter((lic) => {
    const matchesSearch = lic.licenseName.toLowerCase().includes(searchText.toLowerCase());
    const matchesOsType = osTypeFilter === 'all-os' || lic.osType.toLowerCase().includes(osTypeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all-status' || lic.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesOsType && matchesStatus;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Software Licenses</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          New License
        </Button>
      </div>

      <Segmented
        value={activeTab}
        onChange={(val) => setActiveTab(val as LicenseTab)}
        options={[
          { label: 'Application Licenses', value: 'software' },
          { label: 'OS Licenses', value: 'os' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
        <Input placeholder="Search" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        {activeTab === 'software' ? (
          <Select value={softwareFilter} onChange={setSoftwareFilter} style={{ width: 200 }}>
            <Option value="all-software">All Software</Option>
            <Option value="adobe">Adobe</Option>
            <Option value="microsoft">Microsoft</Option>
          </Select>
        ) : (
          <Select value={osTypeFilter} onChange={setOsTypeFilter} style={{ width: 200 }}>
            <Option value="all-os">All OS</Option>
            <Option value="windows">Windows</Option>
            <Option value="macos">macOS</Option>
            <Option value="linux">Linux</Option>
          </Select>
        )}
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 200 }}>
          <Option value="all-status">All Status</Option>
          <Option value="ALLOCATED">Allocated</Option>
          <Option value="AVAILABLE">Available</Option>
          <Option value="EXPIRED">Expired</Option>
        </Select>
      </div>

      {activeTab === 'software' ? (
        <DataTable
          rowSelection={rowSelection} columns={softwareColumns} data={filteredSoftwareLicenses} rowKey="id"
          loading={swLoading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} found` }}
          onRow={(record) => ({ onClick: () => handleEdit(record), style: { cursor: 'pointer' } })}
        />
      ) : (
        <DataTable
          rowSelection={rowSelection} columns={osColumns} data={filteredOsLicenses} rowKey="id"
          loading={osLoading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} found` }}
          onRow={(record) => ({ onClick: () => handleEdit(record), style: { cursor: 'pointer' } })}
        />
      )}

      <LicenseFormModal
        title={activeTab === 'software' ? 'Add New Software License' : 'Add New OS License'}
        open={modalVisible} form={form} licenseType={activeTab}
        onOk={handleAddLicense} onCancel={() => { setModalVisible(false); form.resetFields(); }}
      />

      <ConfirmModal
        title="Delete License"
        description={`Are you sure you want to delete ${deleteModal.selectedItem?.licenseName}?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose}
        loading={deleteSwLicenseMutation.isPending || deleteOsLicenseMutation.isPending}
        confirmText="Delete" danger
      />

      <LicenseFormModal
        title={activeTab === 'software' ? 'Edit Software License' : 'Edit OS License'}
        open={editModalVisible} form={editForm} licenseType={activeTab}
        onOk={handleEditSubmit} onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setLicenseToEdit(null); }}
      />
    </div>
  );
};
