import {
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
} from '@ant-design/icons';
import { Modal, Form, Input, Select, Button, Space, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { TransferListPicker } from './TransferListPicker';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Agent {
  key: string;
  id: string;
  agentId: string;
  hostname: string;
  osType: string;
  status: string;
}

interface TransferItem {
  key: string;
  title: string;
  subtitle?: string;
  os?: string[];
}

interface CreateSoftwareDeploymentModalProps {
  open: boolean;
  form: FormInstance;
  deploymentType: 'INSTALL' | 'UNINSTALL' | 'UPGRADE';
  selectionType: 'application' | 'bundle';
  selectedApplications: string[];
  selectedAgents: string[];
  agents: Agent[];
  transferItems: TransferItem[];
  onDeploymentTypeChange: (value: 'INSTALL' | 'UNINSTALL' | 'UPGRADE') => void;
  onSelectionTypeChange: (value: 'application' | 'bundle') => void;
  onSelectedApplicationsChange: (keys: string[]) => void;
  onSelectedAgentsChange: (keys: string[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreateSoftwareDeploymentModal = ({
  open, form, deploymentType, selectionType,
  selectedApplications, selectedAgents, agents, transferItems,
  onDeploymentTypeChange, onSelectionTypeChange,
  onSelectedApplicationsChange, onSelectedAgentsChange,
  onSubmit, onCancel,
}: CreateSoftwareDeploymentModalProps) => (
  <Modal
    title="Deployment"
    open={open}
    onCancel={onCancel}
    width={800}
    footer={[
      <Button key="reset" onClick={() => form.resetFields()}>Reset</Button>,
      <Button key="draft" onClick={onCancel}>Save As Draft</Button>,
      <Button key="submit" type="primary" onClick={onSubmit}>Publish</Button>,
    ]}
  >
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item name="deploymentName" label={<span>Deployment Name <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter deployment name' }]}>
        <Input placeholder="Name" />
      </Form.Item>

      <Form.Item name="description" label={<span>Description <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter description' }]}>
        <TextArea rows={3} placeholder="Description" />
      </Form.Item>

      <Form.Item name="deploymentType" label={<span>Deployment Type <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select deployment type' }]}>
        <Select value={deploymentType} onChange={onDeploymentTypeChange} style={{ width: '100%' }}>
          <Option value="INSTALL">Install</Option>
          <Option value="UNINSTALL">Uninstall</Option>
          <Option value="UPGRADE">Upgrade</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Selection Type">
        <Space>
          <Button type={selectionType === 'application' ? 'primary' : 'default'} onClick={() => onSelectionTypeChange('application')}>Application</Button>
          <Button type={selectionType === 'bundle' ? 'primary' : 'default'} onClick={() => onSelectionTypeChange('bundle')}>Application Bundle</Button>
        </Space>
      </Form.Item>

      <Form.Item name="scope" label={<span>Scope <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select scope' }]}>
        <Select placeholder="Select One" style={{ width: '100%' }}>
          <Option value="all">All</Option>
          <Option value="windows">Windows</Option>
          <Option value="mac">Mac</Option>
          <Option value="linux">Linux</Option>
        </Select>
      </Form.Item>

      <Form.Item name="endpoints" label={<span>Target Agents <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select target agents' }]}>
        <Select mode="multiple" placeholder="Select target agents" style={{ width: '100%' }} value={selectedAgents} onChange={onSelectedAgentsChange} optionFilterProp="children" showSearch>
          {agents.map(agent => (
            <Option key={agent.id} value={agent.id}>
              <Space>
                {agent.osType === 'windows' && <WindowsOutlined style={{ color: '#1890ff' }} />}
                {agent.osType === 'darwin' && <AppleOutlined />}
                {agent.osType === 'linux' && <LinuxOutlined />}
                {agent.hostname} ({agent.agentId})
                <Tag color={agent.status === 'ONLINE' ? 'green' : 'orange'}>{agent.status}</Tag>
              </Space>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item label={<span>{selectionType === 'application' ? 'Select Application' : 'Select Bundle'} <Text type="danger">*</Text></span>}>
        <TransferListPicker
          selectedKeys={selectedApplications}
          onSelectedKeysChange={onSelectedApplicationsChange}
          items={transferItems}
        />
      </Form.Item>

      <Form.Item name="deploymentPolicy" label={<span>Deployment Policy <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select deployment policy' }]}>
        <Select placeholder="Please Select" style={{ width: '100%' }}>
          <Option value="policy1">Policy 1</Option>
          <Option value="policy2">Policy 2</Option>
        </Select>
      </Form.Item>

      <Form.Item name="retryCount" label={<span>Retry Count <Text type="danger">*</Text></span>} initialValue={1} rules={[{ required: true, message: 'Please enter retry count' }]}>
        <Input type="number" min={0} />
      </Form.Item>

      <Form.Item name="notifyTo" label={<span>Notify to <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select notify to' }]}>
        <Select placeholder="Please Select" style={{ width: '100%' }}>
          <Option value="admin">Admin</Option>
          <Option value="user">User</Option>
        </Select>
      </Form.Item>
    </Form>
  </Modal>
);
