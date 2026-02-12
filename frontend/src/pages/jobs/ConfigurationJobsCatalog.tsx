import { useState } from 'react';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, WindowsOutlined, AppleOutlined, LinuxOutlined, AppstoreOutlined, UnorderedListOutlined, CloseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { App, Input, Button, Card, Space, Tag, Typography, Popconfirm, Modal, Form, Select, Row, Col, Switch } from 'antd';
import { useConfigCatalog, useCreateConfigCatalog, useUpdateConfigCatalog, useDeleteConfigCatalog } from '../../hooks/useJobs';
import type { ConfigCatalogItem } from '../../services/jobs.service';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type ConfigurationItem = { id: string; configurationId: string; name: string; description: string; architecture: 'x64' | 'x86' | 'ARM64'; os: ('Windows' | 'Mac' | 'Linux')[]; createdBy: string; configurationType?: string; commandType?: string; command?: string; isRemediation?: boolean; tags?: string[]; };

const mapApiToLocal = (item: ConfigCatalogItem): ConfigurationItem => ({
  id: item.id, configurationId: item.configurationId, name: item.name, description: item.description || '',
  architecture: item.architecture, os: [item.os], createdBy: item.createdBy || 'System',
  configurationType: item.configurationType, commandType: item.commandType, command: item.command, isRemediation: item.isRemediation, tags: item.tags,
});

const ConfigCard = ({ item, onEdit, onDelete }: { item: ConfigurationItem; onEdit: (id: string) => void; onDelete: (id: string) => void }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <WindowsOutlined style={{ fontSize: 24, color: '#1890ff' }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <Title level={5} style={{ margin: 0, marginBottom: 8 }}>{item.name}</Title>
      <Text type="secondary" style={{ fontSize: 14 }}>{item.description}</Text>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <Space>
        <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(item.id)} style={{ color: '#1890ff' }} />
        <Popconfirm title="Delete configuration" description="Are you sure?" onConfirm={() => onDelete(item.id)} okText="Yes" cancelText="No">
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
      <Tag color="orange" style={{ margin: 0 }}>{item.architecture.toUpperCase()}</Tag>
    </div>
  </div>
);

export const ConfigurationJobsCatalog = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigurationItem | null>(null);
  const [form] = Form.useForm();

  const { data: rawConfigItems, isLoading: loading, refetch } = useConfigCatalog();
  const configurationItems = (rawConfigItems || []).map(mapApiToLocal);
  const deleteMutation = useDeleteConfigCatalog();
  const createMutation = useCreateConfigCatalog();
  const updateMutation = useUpdateConfigCatalog();

  const handleDelete = (id: string) => { deleteMutation.mutate(id, { onSuccess: () => message.success('Configuration item deleted'), onError: () => message.error('Failed to delete') }); };

  const handleEdit = (id: string) => {
    const item = configurationItems.find(i => i.id === id);
    if (item) {
      setEditingItem(item);
      form.setFieldsValue({ name: item.name, description: item.description, architecture: item.architecture, os: item.os.length === 1 ? item.os[0] : item.os,
        configurationType: item.configurationType || 'command', commandType: item.commandType || 'powershell', command: item.command || '', isRemediation: item.isRemediation || false, tags: item.tags || [] });
      setCreateModalVisible(true);
    }
  };

  const handleModalClose = () => { setCreateModalVisible(false); setEditingItem(null); form.resetFields(); };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      const apiData = { name: values.name, os: Array.isArray(values.os) ? values.os[0] : values.os, description: values.description, tags: values.tags || [],
        configurationType: values.configurationType || 'command', architecture: values.architecture || 'x64', isRemediation: values.isRemediation || false,
        commandType: values.commandType || 'powershell', command: values.command || '' };
      if (editingItem) { updateMutation.mutate({ id: editingItem.id, data: apiData }, { onSuccess: () => { message.success('Updated successfully'); handleModalClose(); }, onError: () => message.error('Failed to save') }); }
      else { createMutation.mutate(apiData, { onSuccess: () => { message.success('Created successfully'); handleModalClose(); }, onError: () => message.error('Failed to save') }); }
    } catch { /* form validation failed */ }
  };

  const filteredItems = configurationItems.filter(item => item.name.toLowerCase().includes(searchText.toLowerCase()) || item.description.toLowerCase().includes(searchText.toLowerCase()) || item.configurationId.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={async () => { await refetch(); message.success('Data refreshed'); }} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)} htmlType="button">Create</Button>
          <Space.Compact>
            <Button type={viewMode === 'list' ? 'primary' : 'default'} icon={<UnorderedListOutlined />} onClick={() => setViewMode('list')} />
            <Button type={viewMode === 'grid' ? 'primary' : 'default'} icon={<AppstoreOutlined />} onClick={() => setViewMode('grid')} />
          </Space.Compact>
        </Space>
      </div>

      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredItems.map((item) => (
            <Card key={item.id} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} styles={{ body: { padding: 16 } }}>
              <ConfigCard item={item} onEdit={handleEdit} onDelete={handleDelete} />
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filteredItems.map((item) => (
            <Card key={item.id} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} styles={{ body: { padding: 16 } }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WindowsOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  </div>
                  <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(item.id)} style={{ color: '#1890ff' }} />
                    <Popconfirm title="Delete configuration" description="Are you sure?" onConfirm={() => handleDelete(item.id)} okText="Yes" cancelText="No">
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
                <div><Title level={5} style={{ margin: 0, marginBottom: 8 }}>{item.name}</Title><Text type="secondary" style={{ fontSize: 14 }}>{item.description}</Text></div>
                <div><Tag color="orange">{item.architecture.toUpperCase()}</Tag></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal title={<Space><Button type="text" icon={<CloseOutlined />} onClick={handleModalClose} style={{ marginLeft: -16, marginRight: -8 }} /><Text strong style={{ fontSize: 16 }}>{editingItem ? 'Edit Configuration' : 'Create Configuration'}</Text></Space>}
        open={createModalVisible} onCancel={handleModalClose} closable={false} width={800}
        footer={[<Button key="reset" onClick={() => form.resetFields()}>Reset</Button>, <Button key="create" type="primary" onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>]}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label={<span>Configuration Name <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter configuration name' }]}><Input placeholder="displayName" /></Form.Item>
              <Form.Item name="os" label={<span>OS <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select OS' }]}>
                <Select placeholder="Please select"><Option value="Windows"><Space><WindowsOutlined /> Windows</Space></Option><Option value="Mac"><Space><AppleOutlined /> Mac</Space></Option><Option value="Linux"><Space><LinuxOutlined /> Linux</Space></Option></Select>
              </Form.Item>
              <Form.Item name="description" label={<span>Description <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter description' }]}><TextArea rows={4} placeholder="Description" /></Form.Item>
              <Form.Item name="tags" label="Tags"><Select mode="tags" placeholder="Please select" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="configurationType" label={<span>Configuration Type <Text type="danger">*</Text></span>} initialValue="command" rules={[{ required: true }]}>
                <Select placeholder="Please select"><Option value="command">command</Option><Option value="policy">policy</Option><Option value="script">script</Option></Select>
              </Form.Item>
              <Form.Item name="architecture" label={<span>Architecture <Text type="danger">*</Text></span>} rules={[{ required: true }]}>
                <Select placeholder="Please select"><Option value="X64">x64</Option><Option value="X86">x86</Option><Option value="ARM64">ARM64</Option></Select>
              </Form.Item>
              <Form.Item name="isRemediation" label="Is Remediation" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
            </Col>
          </Row>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="commandType" label={<span>Command Type <Text type="danger">*</Text></span>} rules={[{ required: true }]}>
                  <Select placeholder="Please select"><Option value="powershell">PowerShell</Option><Option value="cmd">CMD</Option><Option value="bash">Bash</Option><Option value="sh">Shell</Option></Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="command" label={<span>Command <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter command' }]}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input placeholder="Command" style={{ width: 'calc(100% - 150px)' }} />
                    <Button type="primary" icon={<ThunderboltOutlined />} style={{ width: 150 }}>Generate Command</Button>
                  </Space.Compact>
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
