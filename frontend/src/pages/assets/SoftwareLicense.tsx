import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  App,
  Table,
  Input,
  Button,
  Typography,
  Select,
  Tag,
  Dropdown,
  Modal,
  Form,
  Row,
  Col,
  DatePicker,
  Segmented,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { assetService } from '../../services/asset.service';
import type { SoftwareLicense as SoftwareLicenseType, OSLicense } from '../../types/asset.types';

const { Title } = Typography;
const { Option } = Select;

type LicenseTab = 'software' | 'os';

export const SoftwareLicense = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<LicenseTab>('software');

  // Software license state
  const [softwareLicenses, setSoftwareLicenses] = useState<SoftwareLicenseType[]>([]);
  const [swLoading, setSwLoading] = useState(false);
  const [softwareFilter, setSoftwareFilter] = useState<string>('all-software');

  // OS license state
  const [osLicenses, setOsLicenses] = useState<OSLicense[]>([]);
  const [osLoading, setOsLoading] = useState(false);
  const [osTypeFilter, setOsTypeFilter] = useState<string>('all-os');

  // Shared state
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all-status');
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState<SoftwareLicenseType | OSLicense | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchSoftwareLicenses();
    fetchOsLicenses();
  }, []);

  // Reset selection when switching tabs
  useEffect(() => {
    setSelectedRowKeys([]);
    setSearchText('');
    setStatusFilter('all-status');
  }, [activeTab]);

  const fetchSoftwareLicenses = async () => {
    setSwLoading(true);
    try {
      const data = await assetService.getSoftwareLicenses();
      setSoftwareLicenses(data);
    } catch {
      message.error('Failed to fetch software licenses');
    } finally {
      setSwLoading(false);
    }
  };

  const fetchOsLicenses = async () => {
    setOsLoading(true);
    try {
      const data = await assetService.getOSLicenses();
      setOsLicenses(data);
    } catch {
      message.error('Failed to fetch OS licenses');
    } finally {
      setOsLoading(false);
    }
  };

  const handleAddLicense = async () => {
    try {
      const values = await form.validateFields();
      if (activeTab === 'software') {
        await assetService.createSoftwareLicense(values);
      } else {
        await assetService.createOSLicense(values);
      }
      message.success('License added successfully');
      setModalVisible(false);
      form.resetFields();
      activeTab === 'software' ? fetchSoftwareLicenses() : fetchOsLicenses();
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
        await assetService.updateSoftwareLicense(licenseToEdit!.id, values);
      } else {
        await assetService.updateOSLicense(licenseToEdit!.id, values);
      }
      message.success('License updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      setLicenseToEdit(null);
      activeTab === 'software' ? fetchSoftwareLicenses() : fetchOsLicenses();
    } catch {
      message.error('Failed to update license');
    }
  };

  const handleDelete = (license: SoftwareLicenseType | OSLicense) => {
    Modal.confirm({
      title: 'Delete License',
      content: `Are you sure you want to delete ${license.licenseName}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          if (activeTab === 'software') {
            await assetService.deleteSoftwareLicense(license.id);
          } else {
            await assetService.deleteOSLicense(license.id);
          }
          message.success('License deleted successfully');
          activeTab === 'software' ? fetchSoftwareLicenses() : fetchOsLicenses();
        } catch {
          message.error('Failed to delete license');
        }
      },
    });
  };

  const getActionMenuItems = (license: SoftwareLicenseType | OSLicense): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
        handleEdit(license);
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
        handleDelete(license);
      },
    },
  ];

  const actionColumn = {
    title: '',
    key: 'action',
    width: 50,
    render: (_: unknown, record: SoftwareLicenseType | OSLicense) => (
      <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
        <Button type="text" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
      </Dropdown>
    ),
  };

  const statusColumn = {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={status === 'Allocated' ? 'green' : status === 'Available' ? 'blue' : 'red'}>
        {status}
      </Tag>
    ),
    filters: [
      { text: 'Allocated', value: 'Allocated' },
      { text: 'Available', value: 'Available' },
      { text: 'Expired', value: 'Expired' },
    ],
    onFilter: (value: any, record: any) => record.status === value,
  };

  const softwareColumns: ColumnsType<SoftwareLicenseType> = [
    { title: 'License Name', dataIndex: 'licenseName', key: 'licenseName', sorter: (a, b) => a.licenseName.localeCompare(b.licenseName) },
    { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName' },
    statusColumn as any,
    { title: 'License Count', dataIndex: 'licenseCount', key: 'licenseCount', sorter: (a, b) => a.licenseCount - b.licenseCount },
    { title: 'Vendor Name', dataIndex: 'vendorName', key: 'vendorName', sorter: (a, b) => a.vendorName.localeCompare(b.vendorName) },
    actionColumn as any,
  ];

  const osColumns: ColumnsType<OSLicense> = [
    { title: 'License Name', dataIndex: 'licenseName', key: 'licenseName', sorter: (a, b) => a.licenseName.localeCompare(b.licenseName) },
    { title: 'OS Type', dataIndex: 'osType', key: 'osType', sorter: (a, b) => a.osType.localeCompare(b.osType) },
    statusColumn as any,
    { title: 'License Count', dataIndex: 'licenseCount', key: 'licenseCount', sorter: (a, b) => a.licenseCount - b.licenseCount },
    { title: 'Vendor Name', dataIndex: 'vendorName', key: 'vendorName', sorter: (a, b) => a.vendorName.localeCompare(b.vendorName) },
    actionColumn as any,
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => setSelectedRowKeys(selectedKeys),
  };

  const categoryId = searchParams.get('category');
  const subCategoryId = searchParams.get('subcategory');

  const filteredSoftwareLicenses = softwareLicenses.filter((lic) => {
    const matchesSearch = lic.licenseName.toLowerCase().includes(searchText.toLowerCase());
    const matchesSoftware = softwareFilter === 'all-software' ||
      lic.softwareName.toLowerCase().includes(softwareFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all-status' ||
      lic.status.toLowerCase() === statusFilter.toLowerCase();
    if (categoryId && (lic as any).categoryId !== categoryId) return false;
    if (subCategoryId && (lic as any).subCategoryId !== subCategoryId) return false;
    return matchesSearch && matchesSoftware && matchesStatus;
  });

  const filteredOsLicenses = osLicenses.filter((lic) => {
    const matchesSearch = lic.licenseName.toLowerCase().includes(searchText.toLowerCase());
    const matchesOsType = osTypeFilter === 'all-os' ||
      lic.osType.toLowerCase().includes(osTypeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all-status' ||
      lic.status.toLowerCase() === statusFilter.toLowerCase();
    if (categoryId && (lic as any).categoryId !== categoryId) return false;
    if (subCategoryId && (lic as any).subCategoryId !== subCategoryId) return false;
    return matchesSearch && matchesOsType && matchesStatus;
  });

  // Shared form fields (common to both add/edit modals)
  const renderCommonFormFields = () => (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Publisher" name="publisher">
            <Input placeholder="Enter publisher" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="License Key" name="licenseKey">
            <Input placeholder="Enter license key" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Purchase Date" name="purchaseDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Expiry Date" name="expiryDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Number of Licenses" name="licenseCount" rules={[{ required: true }]}>
            <Input type="number" placeholder="Enter count" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Vendor Name" name="vendorName" rules={[{ required: true }]}>
            <Input placeholder="Enter vendor name" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Cost" name="cost">
            <Input placeholder="Enter cost" addonBefore="$" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select placeholder="Select status">
              <Option value="Allocated">Allocated</Option>
              <Option value="Available">Available</Option>
              <Option value="Expired">Expired</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Notes/Comments" name="notes">
        <Input.TextArea rows={4} placeholder="Enter any additional notes" />
      </Form.Item>
    </>
  );

  // Type-specific first row of form
  const renderTypeSpecificFields = (formInstance: typeof form) => {
    if (activeTab === 'software') {
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="License Name" name="licenseName" rules={[{ required: true }]}>
              <Input placeholder="Enter license name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Software Name" name="softwareName" rules={[{ required: true }]}>
              <Input placeholder="Enter software name" />
            </Form.Item>
          </Col>
        </Row>
      );
    }
    return (
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="License Name" name="licenseName" rules={[{ required: true }]}>
            <Input placeholder="Enter license name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="OS Type" name="osType" rules={[{ required: true }]}>
            <Select placeholder="Select OS type">
              <Option value="Windows 11 Pro">Windows 11 Pro</Option>
              <Option value="Windows 10">Windows 10</Option>
              <Option value="MacOS">macOS</Option>
              <Option value="Linux">Linux</Option>
              <Option value="Android">Android</Option>
              <Option value="iOS">iOS</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    );
  };

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
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
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
          <Option value="allocated">Allocated</Option>
          <Option value="available">Available</Option>
          <Option value="expired">Expired</Option>
        </Select>
      </div>

      {activeTab === 'software' ? (
        <Table
          rowSelection={rowSelection}
          columns={softwareColumns}
          dataSource={filteredSoftwareLicenses}
          rowKey="id"
          loading={swLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} found` }}
          onRow={(record) => ({ onClick: () => handleEdit(record), style: { cursor: 'pointer' } })}
        />
      ) : (
        <Table
          rowSelection={rowSelection}
          columns={osColumns}
          dataSource={filteredOsLicenses}
          rowKey="id"
          loading={osLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} found` }}
          onRow={(record) => ({ onClick: () => handleEdit(record), style: { cursor: 'pointer' } })}
        />
      )}

      {/* Add License Modal */}
      <Modal
        title={activeTab === 'software' ? 'Add New Software License' : 'Add New OS License'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        onOk={handleAddLicense}
        width={800}
      >
        <Form form={form} layout="vertical">
          {renderTypeSpecificFields(form)}
          {renderCommonFormFields()}
        </Form>
      </Modal>

      {/* Edit License Modal */}
      <Modal
        title={activeTab === 'software' ? 'Edit Software License' : 'Edit OS License'}
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setLicenseToEdit(null); }}
        onOk={handleEditSubmit}
        width={800}
      >
        <Form form={editForm} layout="vertical">
          {renderTypeSpecificFields(editForm)}
          {renderCommonFormFields()}
        </Form>
      </Modal>
    </div>
  );
};
