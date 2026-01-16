import { useState } from 'react';
import {
  Input,
  Button,
  Card,
  Space,
  Tag,
  Typography,
  Popconfirm,
  message,
  Modal,
  Form,
  Select,
  Row,
  Col,
  Switch,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CloseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type ConfigurationItem = {
  id: string;
  configurationId: string;
  name: string;
  description: string;
  architecture: 'x64' | 'x86';
  os: ('Windows' | 'Mac' | 'Linux')[];
  createdBy: string;
};

const mockConfigurationItems: ConfigurationItem[] = [
  {
    id: '1',
    configurationId: 'CFG-001',
    name: 'Turns off Automated Adobe Acrobat X Updater',
    description: 'Disables the automatic updates of Adobe Acrobat X',
    architecture: 'x64',
    os: ['Windows'],
    createdBy: 'Admin',
  },
  {
    id: '2',
    configurationId: 'CFG-002',
    name: 'Turns off Automated Adobe Acrobat XI Updater',
    description: 'Disables the automatic updates of Adobe Acrobat XI',
    architecture: 'x64',
    os: ['Windows'],
    createdBy: 'Admin',
  },
  {
    id: '3',
    configurationId: 'CFG-003',
    name: 'Turns off Automated Adobe Acrobat Reader DC updater',
    description: 'Disables the automatic updates of Adobe Acrobat Reader DC',
    architecture: 'x64',
    os: ['Windows'],
    createdBy: 'Admin',
  },
  {
    id: '4',
    configurationId: 'CFG-004',
    name: 'Turns off automated Adobe AIR Updater',
    description: 'Disables the automatic updates of Adobe AIR that is installed at the system level',
    architecture: 'x64',
    os: ['Windows'],
    createdBy: 'Admin',
  },
  {
    id: '5',
    configurationId: 'CFG-005',
    name: 'Turns off Automated Adobe Reader 10 updater',
    description: 'Disables the automatic updates of Adobe Reader 10',
    architecture: 'x64',
    os: ['Windows'],
    createdBy: 'Admin',
  },
  {
    id: '6',
    configurationId: 'CFG-006',
    name: 'Turns off Automated Adobe Reader 11 update',
    description: 'Disables automatic updates for Adobe Reader 11',
    architecture: 'x64',
    os: ['Windows'],
    createdBy: 'Admin',
  },
];

export const ConfigurationJobsCatalog = () => {
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [configurationItems, setConfigurationItems] = useState<ConfigurationItem[]>(mockConfigurationItems);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigurationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleDelete = (id: string) => {
    setConfigurationItems(configurationItems.filter(item => item.id !== id));
    message.success('Configuration item deleted successfully');
  };

  const handleEdit = (id: string) => {
    const item = configurationItems.find(i => i.id === id);
    if (item) {
      setEditingItem(item);
      form.setFieldsValue({
        name: item.name,
        description: item.description,
        architecture: item.architecture,
        os: item.os.length === 1 ? item.os[0] : item.os,
      });
      setCreateModalVisible(true);
    }
  };

  const handleModalClose = () => {
    setCreateModalVisible(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, fetch data from API
      message.success('Data refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      if (editingItem) {
        // Update existing item
        setConfigurationItems(
          configurationItems.map(item =>
            item.id === editingItem.id
              ? {
                  ...item,
                  name: values.name,
                  description: values.description,
                  architecture: values.architecture,
                  os: Array.isArray(values.os) ? values.os : [values.os],
                }
              : item
          )
        );
        message.success('Configuration item updated successfully');
      } else {
        // Create new item
        const newItem: ConfigurationItem = {
          id: Date.now().toString(),
          configurationId: `CFG-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          name: values.name,
          description: values.description,
          architecture: values.architecture,
          os: Array.isArray(values.os) ? values.os : [values.os],
          createdBy: 'Current User', // In real app, get from auth context
        };
        setConfigurationItems([newItem, ...configurationItems]);
        message.success('Configuration item created successfully');
      }
      
      handleModalClose();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const filteredItems = configurationItems.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.configurationId.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      {/* Top Controls */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)} htmlType="button">
            Create
          </Button>
          <Space.Compact>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              icon={<UnorderedListOutlined />}
              onClick={() => setViewMode('list')}
            />
            <Button
              type={viewMode === 'grid' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('grid')}
            />
          </Space.Compact>
        </Space>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Windows Icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <WindowsOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                    {item.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {item.description}
                  </Text>
                </div>

                {/* Actions and Tag */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <Space>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(item.id)}
                      style={{ color: '#1890ff' }}
                    />
                    <Popconfirm
                      title="Delete configuration"
                      description="Are you sure you want to delete this configuration item?"
                      onConfirm={() => handleDelete(item.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                  <Tag color="orange" style={{ margin: 0 }}>
                    {item.architecture.toUpperCase()}
                  </Tag>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Icon and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WindowsOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  </div>
                  <Space>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(item.id)}
                      style={{ color: '#1890ff' }}
                    />
                    <Popconfirm
                      title="Delete configuration"
                      description="Are you sure you want to delete this configuration item?"
                      onConfirm={() => handleDelete(item.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>

                {/* Content */}
                <div>
                  <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                    {item.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {item.description}
                  </Text>
                </div>

                {/* Tag */}
                <div>
                  <Tag color="orange">{item.architecture.toUpperCase()}</Tag>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={
          <Space>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleModalClose}
              style={{ marginLeft: -16, marginRight: -8 }}
            />
            <Text strong style={{ fontSize: 16 }}>
              {editingItem ? 'Edit Configuration' : 'Create Configuration'}
            </Text>
          </Space>
        }
        open={createModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>
            Reset
          </Button>,
          <Button key="create" type="primary" onClick={handleSubmit}>
            {editingItem ? 'Update' : 'Create'}
          </Button>,
        ]}
        width={800}
        closable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            {/* Left Column */}
            <Col span={12}>
              <Form.Item
                name="name"
                label={
                  <span>
                    Configuration Name <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter configuration name' }]}
              >
                <Input placeholder="displayName" />
              </Form.Item>

              <Form.Item
                name="os"
                label={
                  <span>
                    OS <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please select OS' }]}
              >
                <Select placeholder="Please select">
                  <Option value="Windows">
                    <Space>
                      <WindowsOutlined />
                      Windows
                    </Space>
                  </Option>
                  <Option value="Mac">
                    <Space>
                      <AppleOutlined />
                      Mac
                    </Space>
                  </Option>
                  <Option value="Linux">
                    <Space>
                      <LinuxOutlined />
                      Linux
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="description"
                label={
                  <span>
                    Description <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter description' }]}
              >
                <TextArea rows={4} placeholder="Description" />
              </Form.Item>

              <Form.Item
                name="tags"
                label="Tags"
              >
                <Select
                  mode="tags"
                  placeholder="Please select"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            {/* Right Column */}
            <Col span={12}>
              <Form.Item
                name="configurationType"
                label={
                  <span>
                    Configuration Type <Text type="danger">*</Text>
                  </span>
                }
                initialValue="command"
                rules={[{ required: true, message: 'Please select configuration type' }]}
              >
                <Select placeholder="Please select">
                  <Option value="command">command</Option>
                  <Option value="policy">policy</Option>
                  <Option value="script">script</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="architecture"
                label={
                  <span>
                    Architecture <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please select architecture' }]}
              >
                <Select placeholder="Please select">
                  <Option value="x64">x64</Option>
                  <Option value="x86">x86</Option>
                  <Option value="ARM64">ARM64</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="isRemediation"
                label="Is Remediation"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          {/* Command Details Section */}
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="commandType"
                  label={
                    <span>
                      Command Type <Text type="danger">*</Text>
                    </span>
                  }
                  rules={[{ required: true, message: 'Please select command type' }]}
                >
                  <Select placeholder="Please select">
                    <Option value="powershell">PowerShell</Option>
                    <Option value="cmd">CMD</Option>
                    <Option value="bash">Bash</Option>
                    <Option value="sh">Shell</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="command"
                  label={
                    <span>
                      Command <Text type="danger">*</Text>
                    </span>
                  }
                  rules={[{ required: true, message: 'Please enter command' }]}
                >
                  <Input.Group compact>
                    <Input
                      placeholder="Command"
                      style={{ width: 'calc(100% - 150px)' }}
                    />
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      style={{ width: 150 }}
                    >
                      Generate Command
                    </Button>
                  </Input.Group>
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
