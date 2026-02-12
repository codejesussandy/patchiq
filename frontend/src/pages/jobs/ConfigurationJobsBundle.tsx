import { useState } from 'react';
import {
  EditOutlined,
  DeleteOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Select,
  Popconfirm,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { JobToolbar, TransferListPicker, exportToCsv } from './components';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type ConfigurationBundleItem = {
  id: string;
  name: string;
  description: string;
  os: ('Windows' | 'Mac' | 'Linux')[];
  configurations: number;
  configurationsList?: string[];
  createdBy: string;
  createdOn: string;
};

const mockBundleItems: ConfigurationBundleItem[] = [
  { id: '1', name: 'Security Hardening for Windows', description: 'Security Hardening for Windows endpoints with comprehensive policies', os: ['Windows'], configurations: 6, configurationsList: ['1', '2', '3', '4', '5', '6'], createdBy: 'Admin', createdOn: '2026/01/12 12:27:44 PM' },
  { id: '2', name: 'Mac Security Bundle', description: 'Security configurations for Mac endpoints', os: ['Mac'], configurations: 4, configurationsList: ['1', '2', '3', '4'], createdBy: 'Admin', createdOn: '2026/01/11 10:15:30 AM' },
  { id: '3', name: 'Linux Compliance Bundle', description: 'Compliance and security configurations for Linux systems', os: ['Linux'], configurations: 5, configurationsList: ['1', '2', '3', '4', '5'], createdBy: 'Admin', createdOn: '2026/01/10 09:20:15 AM' },
];

const mockConfigurations = [
  { key: '1', configurationId: 'CNF-017', title: 'Turns Off Automated Adobe Read', os: ['Windows'], architecture: 'x64' },
  { key: '2', configurationId: 'CNF-016', title: 'Turns off automatic updates for Ac', os: ['Windows'], architecture: 'x64' },
  { key: '3', configurationId: 'CNF-015', title: 'Stop Auto Update of Google Chro', os: ['Windows'], architecture: 'x64' },
  { key: '4', configurationId: 'CNF-014', title: 'Stop Automated App Updates', os: ['Windows'], architecture: 'x64' },
  { key: '5', configurationId: 'CNF-013', title: 'Stop Automatic Delivery of IE 10', os: ['Windows'], architecture: 'x64' },
  { key: '6', configurationId: 'CNF-012', title: 'Turn Off Automated upgrade of IE', os: ['Windows'], architecture: 'x64' },
  { key: '7', configurationId: 'CNF-011', title: 'Turn Off automatic updates for Wi', os: ['Windows'], architecture: 'x64' },
  { key: '8', configurationId: 'CNF-010', title: 'Stop Automated Java Updates', os: ['Windows'], architecture: 'x64' },
  { key: '9', configurationId: 'CNF-009', title: 'Turns off Automated Adobe Acrobat X Updater', os: ['Windows'], architecture: 'x64' },
  { key: '10', configurationId: 'CNF-008', title: 'Turns off Automated Adobe Acrobat XI Updater', os: ['Windows'], architecture: 'x64' },
];

const getOSIcons = (os: string[]) => (
  <Space>
    {os.map((o) => {
      switch (o) {
        case 'Windows': return <WindowsOutlined key={o} style={{ fontSize: 18, color: '#1890ff' }} />;
        case 'Mac': return <AppleOutlined key={o} style={{ fontSize: 18, color: '#000' }} />;
        case 'Linux': return <LinuxOutlined key={o} style={{ fontSize: 18, color: '#000' }} />;
        default: return null;
      }
    })}
  </Space>
);

export const ConfigurationJobsBundle = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bundleItems, setBundleItems] = useState<ConfigurationBundleItem[]>(mockBundleItems);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigurationBundleItem | null>(null);
  const [form] = Form.useForm();
  const [selectedConfigurations, setSelectedConfigurations] = useState<string[]>([]);

  const transferItems = mockConfigurations.map(c => ({
    key: c.key,
    title: `${c.configurationId}: ${c.title}`,
    subtitle: `(${c.architecture})`,
    os: c.os,
  }));

  const handleDelete = (id: string) => {
    setBundleItems(bundleItems.filter(item => item.id !== id));
    message.success('Bundle deleted successfully');
    setSelectedRowKeys([]);
  };

  const handleEdit = (record: ConfigurationBundleItem) => {
    setEditingItem(record);
    form.setFieldsValue({ bundleName: record.name, os: record.os[0], description: record.description });
    setSelectedConfigurations(record.configurationsList || []);
    setCreateModalVisible(true);
  };

  const handleModalClose = () => {
    setCreateModalVisible(false);
    setEditingItem(null);
    setSelectedConfigurations([]);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      if (selectedConfigurations.length === 0) {
        message.error('Please select at least one configuration');
        return;
      }
      const values = form.getFieldsValue();
      if (editingItem) {
        setBundleItems(bundleItems.map(item =>
          item.id === editingItem.id
            ? { ...item, name: values.bundleName, description: values.description || '', os: [values.os], configurations: selectedConfigurations.length, configurationsList: selectedConfigurations }
            : item
        ));
        message.success('Bundle updated successfully');
      } else {
        const newItem: ConfigurationBundleItem = {
          id: String(bundleItems.length + 1),
          name: values.bundleName,
          description: values.description || '',
          os: [values.os],
          configurations: selectedConfigurations.length,
          configurationsList: selectedConfigurations,
          createdBy: 'Admin',
          createdOn: new Date().toLocaleString(),
        };
        setBundleItems([newItem, ...bundleItems]);
        message.success('Bundle created successfully');
      }
      handleModalClose();
    } catch {
      // form validation failed — ant design shows field errors
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    message.success('Data refreshed successfully');
  };

  const handleExport = () => {
    exportToCsv(
      filteredItems.length > 0 ? filteredItems : bundleItems,
      [
        { header: 'Name', accessor: (i) => i.name },
        { header: 'Description', accessor: (i) => i.description },
        { header: 'OS', accessor: (i) => i.os.join(', ') },
        { header: 'Configurations', accessor: (i) => i.configurations },
        { header: 'Created By', accessor: (i) => i.createdBy },
        { header: 'Created On', accessor: (i) => i.createdOn },
      ],
      'configuration_bundle',
      message,
    );
  };

  const filteredItems = bundleItems.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description.toLowerCase().includes(searchText.toLowerCase()) ||
    item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<ConfigurationBundleItem> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name), render: (text: string) => <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text> },
    { title: 'Description', dataIndex: 'description', key: 'description', sorter: (a, b) => a.description.localeCompare(b.description), render: (text: string) => <Text ellipsis style={{ maxWidth: 300 }}>{text}</Text> },
    { title: 'OS', dataIndex: 'os', key: 'os', render: (os: string[]) => getOSIcons(os) },
    { title: 'Configurations', dataIndex: 'configurations', key: 'configurations', align: 'center', sorter: (a, b) => a.configurations - b.configurations, render: (count: number) => <Badge count={count} style={{ backgroundColor: '#1890ff' }} /> },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', sorter: (a, b) => a.createdBy.localeCompare(b.createdBy) },
    { title: 'Created On', dataIndex: 'createdOn', key: 'createdOn', sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime() },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: ConfigurationBundleItem) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#1890ff' }} />
          <Popconfirm title="Delete bundle" description="Are you sure you want to delete this bundle?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <JobToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onCreate={() => { setCreateModalVisible(true); setSelectedConfigurations([]); form.resetFields(); }}
        loading={loading}
      />

      <DataTable
        rowSelection={{ selectedRowKeys, onChange: (keys: React.Key[]) => setSelectedRowKeys(keys) }}
        columns={columns}
        data={filteredItems}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={
          <Space>
            <Button type="text" icon={<CloseOutlined />} onClick={handleModalClose} style={{ marginLeft: -16, marginRight: -8 }} />
            <Text strong style={{ fontSize: 16 }}>{editingItem ? 'Edit Configuration Bundle' : 'Create Configuration Bundle'}</Text>
          </Space>
        }
        open={createModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>Reset</Button>,
          <Button key="update" type="primary" onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>,
        ]}
        width={900}
        closable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="bundleName" label={<span>Bundle Name <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter bundle name' }]}>
            <Input placeholder="Bundle Name" />
          </Form.Item>

          <Form.Item name="os" label={<span>OS <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select OS' }]}>
            <Select placeholder="Please select">
              <Option value="Windows"><Space><WindowsOutlined />Windows</Space></Option>
              <Option value="Mac"><Space><AppleOutlined />Mac</Space></Option>
              <Option value="Linux"><Space><LinuxOutlined />Linux</Space></Option>
            </Select>
          </Form.Item>

          <Form.Item label={<span>Configurations <Text type="danger">*</Text></span>}>
            <TransferListPicker
              selectedKeys={selectedConfigurations}
              onSelectedKeysChange={setSelectedConfigurations}
              items={transferItems}
            />
          </Form.Item>

          <Form.Item name="description" label={<span>Description <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter description' }]}>
            <TextArea rows={3} placeholder="Description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
