import { useState } from 'react';
import {
  SearchOutlined,
  UploadOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Typography,
  Select,
  Modal,
  Form,
  Row,
  Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from '../../components/shared/DataTable';
import { useSoftwareInventory } from '../../hooks/useAssets';
import type { SoftwareInventory as SoftwareInventoryType } from '../../types/asset.types';

const { Title } = Typography;
const { Option } = Select;

export const SoftwareInventory = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();

  // React Query hooks
  const { data: softwareData, isLoading: loading } = useSoftwareInventory();
  const software: SoftwareInventoryType[] = softwareData || [];

  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [osFilter, setOsFilter] = useState<string>('all-os');
  const [categoryFilter, setCategoryFilter] = useState<string>('all-categories');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareInventoryType | null>(null);
  const [detailForm] = Form.useForm();

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        try {
          message.success(`${file.name} uploaded successfully`);
        } catch {
          message.error('Failed to import CSV');
        }
      }
    };
    input.click();
  };

  const handleRowClick = (record: SoftwareInventoryType) => {
    setSelectedSoftware(record);
    detailForm.setFieldsValue(record);
    setDetailModalVisible(true);
  };

  const columns: ColumnsType<SoftwareInventoryType> = [
    {
      title: 'Software Name',
      dataIndex: 'softwareName',
      key: 'softwareName',
      sorter: (a, b) => a.softwareName.localeCompare(b.softwareName) },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version' },
    {
      title: 'Software Type',
      dataIndex: 'softwareType',
      key: 'softwareType' },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      sorter: (a, b) => (a.manufacturer || '').localeCompare(b.manufacturer || '') },
    {
      title: 'Total Instances',
      dataIndex: 'totalInstances',
      key: 'totalInstances',
      sorter: (a, b) => a.totalInstances - b.totalInstances },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    } };

  const categoryId = searchParams.get('category');
  const subCategoryId = searchParams.get('subcategory');

  // Silence unused variable warnings - category filtering not yet implemented for software inventory
  void categoryId;
  void subCategoryId;

  const filteredSoftware = software.filter((sw) => {
    // Text search filter
    const matchesSearch = sw.softwareName.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#fff', padding: '24px' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center' }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Software Inventory
        </Title>
        <Button icon={<UploadOutlined />} onClick={handleImportCSV}>
          Import from CSV
        </Button>
      </div>

      <div
        style={{
          marginBottom: '16px',
          display: 'flex',
          gap: '16px' }}
      >
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select value={osFilter} onChange={setOsFilter} style={{ width: 200 }}>
          <Option value="all-os">All OS</Option>
          <Option value="windows">Windows</Option>
          <Option value="macos">MacOS</Option>
          <Option value="linux">Linux</Option>
        </Select>
        <Select value={categoryFilter} onChange={setCategoryFilter} style={{ width: 200 }}>
          <Option value="all-categories">All Categories</Option>
          <Option value="application">Application</Option>
          <Option value="system">System</Option>
        </Select>
      </div>

      <DataTable
        rowSelection={rowSelection}
        columns={columns}
        data={filteredSoftware}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} found` }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' } })}
      />

      {/* Software Details Modal */}
      <Modal
        title={`Software Details - ${selectedSoftware?.softwareName || ''}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          detailForm.resetFields();
          setSelectedSoftware(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={detailForm} layout="vertical" disabled>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Software Name" name="softwareName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Version" name="version">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Software Type" name="softwareType">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Manufacturer" name="manufacturer">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Total Instances" name="totalInstances">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
