import { RocketOutlined } from '@ant-design/icons';
import { Button, Modal, Form, Input, Select, Space, Typography, Divider, List } from 'antd';
import dayjs from 'dayjs';
import { SeverityBadge } from '../../../components/patches';
import type { Patch } from '../../../services/patch.service';

const { Text } = Typography;
const { Option } = Select;

interface Agent {
  id: string;
  hostname?: string;
  name: string;
  os: string;
  status: string;
}

interface DeployModalProps {
  open: boolean;
  deployForm: ReturnType<typeof Form.useForm>[0];
  selectedPatches: Patch[];
  agents: Agent[];
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export const DeployModal = ({ open, deployForm, selectedPatches, agents, loading, onSubmit, onCancel }: DeployModalProps) => (
  <Modal
    title={<Space><RocketOutlined /><span>Deploy Patches ({selectedPatches.length} selected)</span></Space>}
    open={open}
    onCancel={onCancel}
    width={700}
    footer={[
      <Button key="cancel" onClick={onCancel}>Cancel</Button>,
      <Button key="deploy" type="primary" icon={<RocketOutlined />} loading={loading} onClick={onSubmit}>Deploy Now</Button>,
    ]}
  >
    <Form form={deployForm} layout="vertical">
      <Form.Item name="deploymentName" label="Deployment Name" initialValue={`Patch Deployment - ${dayjs().format('YYYY-MM-DD HH:mm')}`}>
        <Input placeholder="Enter deployment name" />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <Input.TextArea rows={2} placeholder="Optional description" />
      </Form.Item>

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Selected Patches:</Text>
        <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, backgroundColor: '#fafafa' }}>
          <List
            size="small"
            dataSource={selectedPatches}
            renderItem={(patch) => (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Space>
                  <Text>{patch.software}</Text>
                  {patch.kbNumber && <Text type="secondary">({patch.kbNumber})</Text>}
                  <SeverityBadge severity={patch.severity} />
                </Space>
              </List.Item>
            )}
          />
        </div>
      </div>

      <Divider />

      <Form.Item
        name="targetAgentIds"
        label="Target Agents"
        rules={[{ required: true, message: 'Please select at least one agent' }]}
        extra={`${agents.filter(a => a.status === 'CONNECTED').length} agents online`}
      >
        <Select
          mode="multiple"
          placeholder="Select agents to deploy patches to"
          style={{ width: '100%' }}
          showSearch
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={agents.map((agent) => ({
            value: agent.id,
            label: `${agent.hostname || agent.name} (${agent.os})`,
            disabled: agent.status !== 'CONNECTED',
          }))}
          optionRender={(option) => {
            const agent = agents.find(a => a.id === option.value);
            return (
              <Space>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: agent?.status === 'CONNECTED' ? '#52c41a' : '#ff4d4f', display: 'inline-block' }} />
                <span>{option.label}</span>
                {agent?.status !== 'CONNECTED' && <Text type="secondary" style={{ fontSize: 12 }}>(Offline)</Text>}
              </Space>
            );
          }}
        />
      </Form.Item>

      <Form.Item name="retryCount" label="Retry Count" initialValue={1} extra="Number of times to retry failed installations">
        <Select style={{ width: 200 }}>
          <Option value={0}>No retries</Option>
          <Option value={1}>1 retry</Option>
          <Option value={2}>2 retries</Option>
          <Option value={3}>3 retries</Option>
        </Select>
      </Form.Item>
    </Form>
  </Modal>
);
