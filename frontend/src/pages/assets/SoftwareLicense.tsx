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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { assetService } from '../../services/asset.service';
import type { SoftwareLicense as SoftwareLicenseType } from '../../types/asset.types';

const { Title } = Typography;
const { Option } = Select;

export const SoftwareLicense = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [licenses, setLicenses] = useState<SoftwareLicenseType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState<SoftwareLicenseType | null>(null);
  const [softwareFilter, setSoftwareFilter] = useState<string>('all-software');
  const [statusFilter, setStatusFilter] = useState<string>('all-status');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const data = await assetService.getSoftwareLicenses();
      setLicenses(data);
    } catch (error) {
      message.error('Failed to fetch software licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLicense = async () => {
    try {
      const values = await form.validateFields();
      await assetService.createSoftwareLicense(values);
      message.success('License added successfully');
      setModalVisible(false);
      form.resetFields();
      fetchLicenses();
    } catch (error) {
      message.error('Failed to add license');
    }
  };

  const handleEdit = (license: SoftwareLicenseType) => {
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
      await assetService.updateSoftwareLicense(licenseToEdit!.id, values);
      message.success('License updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      setLicenseToEdit(null);
      fetchLicenses();
    } catch (error) {
      message.error('Failed to update license');
    }
  };

  const handleDelete = (license: SoftwareLicenseType) => {
    Modal.confirm({
      title: 'Delete License',
      content: `Are you sure you want to delete ${license.licenseName}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await assetService.deleteSoftwareLicense(license.id);
          message.success('License deleted successfully');
          fetchLicenses();
        } catch (error) {
          message.error('Failed to delete license');
        }
      },
    });
  };

  const getActionMenuItems = (license: SoftwareLicenseType): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
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
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
        handleDelete(license);
      },
    },
  ];

  const columns: ColumnsType<SoftwareLicenseType> = [
    {
      title: 'License Name',
      dataIndex: 'licenseName',
      key: 'licenseName',
      sorter: (a, b) => a.licenseName.localeCompare(b.licenseName),
    },
    {
      title: 'Software Name',
      dataIndex: 'softwareName',
      key: 'softwareName',
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

  const categoryId = searchParams.get('category');
  const subCategoryId = searchParams.get('subcategory');

  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch = lic.licenseName.toLowerCase().includes(searchText.toLowerCase());
    const matchesSoftware = softwareFilter === 'all-software' ||
                           lic.softwareName.toLowerCase().includes(softwareFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all-status' ||
                         lic.status.toLowerCase() === statusFilter.toLowerCase();

    // Category filter (for future use when software license has category support)
    if (categoryId && (lic as any).categoryId !== categoryId) {
      return false;
    }

    // Sub-category filter (for future use when software license has sub-category support)
    if (subCategoryId && (lic as any).subCategoryId !== subCategoryId) {
      return false;
    }

    return matchesSearch && matchesSoftware && matchesStatus;
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
          Software License
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          New License
        </Button>
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
        <Select value={softwareFilter} onChange={setSoftwareFilter} style={{ width: 200 }}>
          <Option value="all-software">All Software</Option>
          <Option value="adobe">Adobe</Option>
          <Option value="microsoft">Microsoft</Option>
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
        title="Add New License"
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
              <Form.Item label="Software Name" name="softwareName" rules={[{ required: true }]}>
                <Input placeholder="Enter software name" />
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
        title="Edit License"
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
              <Form.Item label="Software Name" name="softwareName" rules={[{ required: true }]}>
                <Input placeholder="Enter software name" />
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
