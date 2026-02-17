import {
  RocketOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Card,
  Button,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';

const { Text } = Typography;

interface Agent {
  id: string;
  agentId: string;
  hostname: string;
  osType: string;
  status: string;
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'windows': return <WindowsOutlined style={{ color: '#1890ff' }} />;
    case 'macos': return <AppleOutlined style={{ color: '#000' }} />;
    case 'linux': return <LinuxOutlined style={{ color: '#f9a825' }} />;
    default: return <CloudOutlined style={{ color: '#1890ff' }} />;
  }
};

interface HubDeployModalProps {
  open: boolean;
  deployForm: FormInstance;
  deployingPackageId: string | null;
  deployingDisplayName: string;
  deployingPlatform: string;
  deployingVersion: string;
  deployingInstallSource: string;
  selectedAgents: string[];
  compatibleAgents: Agent[];
  loading: boolean;
  onSelectedAgentsChange: (agents: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const HubDeployModal = ({
  open,
  deployForm,
  deployingPackageId,
  deployingDisplayName,
  deployingPlatform,
  deployingVersion,
  deployingInstallSource,
  selectedAgents,
  compatibleAgents,
  loading,
  onSelectedAgentsChange,
  onClose,
  onSubmit,
}: HubDeployModalProps) => (
  <Modal
    title={
      <Space>
        <RocketOutlined style={{ color: '#1890ff' }} />
        <span>Deploy Package</span>
      </Space>
    }
    open={open}
    onCancel={onClose}
    footer={[
      <Button key="cancel" onClick={onClose}>Cancel</Button>,
      <Button key="deploy" type="primary" icon={<RocketOutlined />} loading={loading} onClick={onSubmit}>
        Deploy
      </Button>,
    ]}
    width={600}
  >
    {deployingPackageId && (
      <>
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Space>
            {getPlatformIcon(deployingPlatform)}
            <div>
              <Text strong>{deployingDisplayName}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {deployingPackageId} - v{deployingVersion} - {deployingInstallSource.toUpperCase()}
              </Text>
            </div>
          </Space>
        </Card>

        <Form form={deployForm} layout="vertical">
          <Form.Item name="deploymentName" label="Deployment Name" rules={[{ required: true, message: 'Please enter deployment name' }]}>
            <Input placeholder="Enter deployment name" />
          </Form.Item>

          <Form.Item name="deploymentType" label="Deployment Type" rules={[{ required: true, message: 'Please select deployment type' }]}>
            <Select>
              <Select.Option value="install">Install</Select.Option>
              <Select.Option value="upgrade">Upgrade</Select.Option>
              <Select.Option value="uninstall">Uninstall</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>Target Endpoints</span>
                <Tag color="blue">
                  {deployingPlatform === 'cross-platform'
                    ? 'All Platforms'
                    : deployingPlatform.charAt(0).toUpperCase() + deployingPlatform.slice(1) + ' Only'}
                </Tag>
              </Space>
            }
            required
            help={
              compatibleAgents.length === 0
                ? `No ${deployingPlatform} endpoints available`
                : `${compatibleAgents.length} compatible endpoint(s) available`
            }
          >
            <Select
              mode="multiple"
              placeholder="Select target endpoints"
              value={selectedAgents}
              onChange={onSelectedAgentsChange}
              style={{ width: '100%' }}
              optionFilterProp="children"
              showSearch
              notFoundContent={compatibleAgents.length === 0 ? 'No compatible endpoints found' : undefined}
            >
              {compatibleAgents.map((agent) => (
                <Select.Option key={agent.id} value={agent.id}>
                  <Space>
                    {agent.osType === 'windows' && <WindowsOutlined style={{ color: '#1890ff' }} />}
                    {agent.osType === 'darwin' && <AppleOutlined style={{ color: '#000' }} />}
                    {agent.osType === 'linux' && <LinuxOutlined style={{ color: '#f9a825' }} />}
                    <span>{agent.hostname}</span>
                    <Tag color={agent.status === 'ONLINE' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                      {agent.status}
                    </Tag>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedAgents.length > 0 && (
            <div style={{ marginTop: -8, marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedAgents.length} endpoint(s) selected
              </Text>
            </div>
          )}
        </Form>
      </>
    )}
  </Modal>
);
