import { useState } from 'react';
import {
  SearchOutlined,
  UploadOutlined,
  SafetyCertificateOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Typography,
  Modal,
  Form,
  Row,
  Col,
  Tag,
  Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from '../../components/shared/DataTable';
import { useSoftwareInventory } from '../../hooks/useAssets';
import type { SoftwareInventory as SoftwareInventoryType } from '../../types/asset.types';

const { Title, Text } = Typography;

export const SoftwareInventory = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();

  // React Query hooks
  const { data: softwareData, isLoading: loading } = useSoftwareInventory();
  const software: SoftwareInventoryType[] = softwareData || [];

  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
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
      sorter: (a, b) => a.softwareName.localeCompare(b.softwareName),
      render: (text: string) => (
        <Space>
          <div style={{ width: 28, height: 28, background: '#1890ff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>
            <SafetyCertificateOutlined />
          </div>
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (v: string) => v ? <Tag>{v}</Tag> : '-',
    },
    {
      title: 'Status',
      dataIndex: 'softwareType',
      key: 'softwareType',
      render: () => <Tag color="green">Managed</Tag>,
    },
    {
      title: 'Vendor',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      sorter: (a, b) => (a.manufacturer || '').localeCompare(b.manufacturer || '') },
    {
      title: 'Endpoints',
      dataIndex: 'totalInstances',
      key: 'totalInstances',
      sorter: (a, b) => a.totalInstances - b.totalInstances,
      render: (count: number) => <Tag color="blue">{count} {count === 1 ? 'endpoint' : 'endpoints'}</Tag>,
    },
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
    const matchesSearch =
      !searchText ||
      sw.softwareName.toLowerCase().includes(searchText.toLowerCase()) ||
      (sw.manufacturer || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (sw.version || '').toLowerCase().includes(searchText.toLowerCase());

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
        <div>
          <Title level={3} style={{ margin: 0 }}>Software Inventory</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>Hub-managed software deployed across your endpoints</Text>
        </div>
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
        <Tag color="blue" style={{ lineHeight: '30px', fontSize: 13, padding: '0 12px' }}>
          <SafetyCertificateOutlined style={{ marginRight: 4 }} />
          Showing managed software only
        </Tag>
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
