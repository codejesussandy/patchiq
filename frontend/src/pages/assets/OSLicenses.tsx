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
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { assetService } from '../../services/asset.service';
import type { OSLicense } from '../../types/asset.types';

const { Title } = Typography;
const { Option } = Select;

export const OSLicenses = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [licenses, setLicenses] = useState<OSLicense[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const data = await assetService.getOSLicenses();
      setLicenses(data);
    } catch (error) {
      message.error('Failed to fetch OS licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFetchLicenses = async () => {
    setAutoFetching(true);
    message.loading({
      content: 'Scanning system for OS licenses...',
      key: 'autofetch',
      duration: 0,
    });

    try {
      // Simulate scanning system for OS licenses (3 seconds delay)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate new licenses based on common OS types
      const newLicenses: OSLicense[] = [
        {
          id: `os-lic-fetch-${Date.now()}-1`,
          licenseName: 'Windows Server 2022 Standard - Auto Detected',
          osType: 'Windows Server 2022',
          status: 'Allocated',
          licenseCount: 5,
          vendorName: 'Microsoft',
          licenseKey: 'KEY-XXXX-XXXX-XXXX (Auto-detected)',
          purchaseDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0],
          cost: '₹250,000',
        },
        {
          id: `os-lic-fetch-${Date.now()}-2`,
          licenseName: 'Ubuntu Pro - Auto Detected',
          osType: 'Linux',
          status: 'Available',
          licenseCount: 10,
          vendorName: 'Canonical',
          licenseKey: 'KEY-XXXX-XXXX-XXXX (Auto-detected)',
          purchaseDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
          cost: '₹150,000',
        },
        {
          id: `os-lic-fetch-${Date.now()}-3`,
          licenseName: 'macOS Enterprise - Auto Detected',
          osType: 'MacOS',
          status: 'Allocated',
          licenseCount: 3,
          vendorName: 'Apple',
          licenseKey: 'KEY-XXXX-XXXX-XXXX (Auto-detected)',
          purchaseDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          cost: '₹180,000',
        },
      ];

      // Add new licenses to existing ones (avoiding duplicates based on licenseName)
      const existingNames = licenses.map(l => l.licenseName);
      const licensesToAdd = newLicenses.filter(nl => !existingNames.includes(nl.licenseName));

      if (licensesToAdd.length > 0) {
        setLicenses([...licenses, ...licensesToAdd]);
        message.success({
          content: `Successfully detected and added ${licensesToAdd.length} new OS license(s)!`,
          key: 'autofetch',
          duration: 3,
        });
      } else {
        message.info({
          content: 'No new licenses detected. All licenses are already in the system.',
          key: 'autofetch',
          duration: 3,
        });
      }
    } catch (error) {
      message.error({
        content: 'Failed to auto-fetch OS licenses',
        key: 'autofetch',
        duration: 3,
      });
    } finally {
      setAutoFetching(false);
    }
  };

  const handleAddLicense = async () => {
    try {
      const values = await form.validateFields();
      await assetService.createOSLicense(values);
      message.success('OS License added successfully');
      setModalVisible(false);
      form.resetFields();
      fetchLicenses();
    } catch (error) {
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
      await assetService.updateOSLicense(licenseToEdit!.id, values);
      message.success('OS License updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      setLicenseToEdit(null);
      fetchLicenses();
    } catch (error) {
      message.error('Failed to update OS license');
    }
  };

  const handleDelete = (license: OSLicense) => {
    Modal.confirm({
      title: 'Delete OS License',
      content: `Are you sure you want to delete ${license.licenseName}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await assetService.deleteOSLicense(license.id);
          message.success('OS License deleted successfully');
          fetchLicenses();
        } catch (error) {
          message.error('Failed to delete OS license');
        }
      },
    });
  };

  const getActionMenuItems = (license: OSLicense): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (info) => {
        info.domEvent.stopPropagation();
        handleEdit(license);
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        handleDelete(license);
      },
    },
  ];

  const columns: ColumnsType<OSLicense> = [
    {
      title: 'License Name',
      dataIndex: 'licenseName',
      key: 'licenseName',
      sorter: (a, b) => a.licenseName.localeCompare(b.licenseName),
    },
    {
      title: 'OS Type',
      dataIndex: 'osType',
      key: 'osType',
      sorter: (a, b) => a.osType.localeCompare(b.osType),
    },
    {
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
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'License Count',
      dataIndex: 'licenseCount',
      key: 'licenseCount',
      sorter: (a, b) => a.licenseCount - b.licenseCount,
    },
    {
      title: 'Vendor Name',
      dataIndex: 'vendorName',
      key: 'vendorName',
      sorter: (a, b) => a.vendorName.localeCompare(b.vendorName),
    },
    {
      title: '',
      key: 'action',
      width: 50,
       render: (_, record) => (
         <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
           <Button type="text" icon={<MoreOutlined />} onClick={(e) => {
             e.stopPropagation();
             e.preventDefault();
           }} />
         </Dropdown>
       ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  // Note: categoryId/subCategoryId filtering not yet supported for OS licenses
  const _categoryId = searchParams.get('category');
  const _subCategoryId = searchParams.get('subcategory');
  void _categoryId; void _subCategoryId; // Reserved for future use

  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch = lic.licenseName.toLowerCase().includes(searchText.toLowerCase());
    const matchesOsType = osTypeFilter === 'all-os' ||
                          lic.osType.toLowerCase().includes(osTypeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all-status' ||
                         lic.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesOsType && matchesStatus;
  });

  return (
    <div>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          OS License
        </Title>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            icon={<SyncOutlined spin={autoFetching} />}
            onClick={handleAutoFetchLicenses}
            loading={autoFetching}
          >
            Auto Fetch
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            New License
          </Button>
        </div>
      </div>

      <div
        style={{
          marginBottom: '16px',
          display: 'flex',
          gap: '16px',
        }}
      >
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select value={osTypeFilter} onChange={setOsTypeFilter} style={{ width: 200 }}>
          <Option value="all-os">All OS</Option>
          <Option value="windows">Windows</Option>
          <Option value="macos">macOS</Option>
          <Option value="linux">Linux</Option>
        </Select>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 200 }}>
          <Option value="all-status">All Status</Option>
          <Option value="allocated">Allocated</Option>
          <Option value="available">Available</Option>
          <Option value="expired">Expired</Option>
        </Select>
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredLicenses}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} found`,
        }}
        onRow={(record) => ({
          onClick: () => handleEdit(record),
          style: { cursor: 'pointer' },
        })}
      />

      {/* Add License Modal */}
      <Modal
        title="Add New OS License"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={handleAddLicense}
        width={800}
      >
        <Form form={form} layout="vertical">
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
                <Input placeholder="Enter cost" addonBefore="₹" />
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
        </Form>
      </Modal>

      {/* Edit License Modal */}
      <Modal
        title="Edit OS License"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setLicenseToEdit(null);
        }}
        onOk={handleEditSubmit}
        width={800}
      >
        <Form form={editForm} layout="vertical">
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
                <Input placeholder="Enter cost" addonBefore="₹" />
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
        </Form>
      </Modal>
    </div>
  );
};
