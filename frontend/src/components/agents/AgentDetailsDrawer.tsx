import { useState, useEffect } from 'react';
import { LinkOutlined } from '@ant-design/icons';
import { Drawer, Tabs, Tag, Space, Spin, Empty, Button, Divider, Statistic, Row, Col, Typography, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../../services/agent.service';
import type { Agent, Command } from '../../types/agent.types';
import { DataTable } from '../shared/DataTable';

const { Text, Paragraph } = Typography;

interface AgentDetailsDrawerProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONNECTED':
      return 'success';
    case 'DISCONNECTED':
      return 'default';
    case 'PENDING':
      return 'processing';
    case 'ERROR':
      return 'error';
    default:
      return 'default';
  }
};

const getCommandStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
      return 'processing';
    case 'SENT':
      return 'blue';
    case 'FAILED':
      return 'error';
    default:
      return 'default';
  }
};

export const AgentDetailsDrawer = ({ agent, open, onClose }: AgentDetailsDrawerProps) => {
  const navigate = useNavigate();
  const [commands, setCommands] = useState<Command[]>([]);
  const [commandsLoading, setCommandsLoading] = useState(false);

  const fetchCommands = async () => {
    if (!agent) return;
    setCommandsLoading(true);
    try {
      const data = await agentService.getAgentCommands(agent.id);
      setCommands(data);
    } catch {
      // silently fail
    } finally {
      setCommandsLoading(false);
    }
  };

  useEffect(() => {
    if (agent && open) {
      fetchCommands();
    }
  }, [agent, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!agent) {
    return null;
  }

  const commandColumns: ColumnsType<Command> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getCommandStatusColor(status)}>{status.toUpperCase()}</Tag>
      ) },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString() },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (result?: string) => result || '—' },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Paragraph style={{ marginBottom: '8px', fontWeight: 600 }}>Heartbeat Status</Paragraph>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Last Heartbeat"
                  value={agent.lastHeartbeatRelative}
                  suffix={`(${new Date(agent.lastHeartbeat).toLocaleString()})`}
                  styles={{ content: { fontSize: '14px' } }}
                />
              </Col>
              <Col span={12}>
                <div>
                  <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: '14px', marginBottom: '4px' }}>Status</div>
                  <Badge status={getStatusColor(agent.status)} text={agent.status} />
                </div>
              </Col>
            </Row>
          </div>

          <Divider />

          <div>
            <Paragraph style={{ marginBottom: '8px', fontWeight: 600 }}>System Information</Paragraph>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text strong>Machine ID:</Text> <Text copyable>{agent.machineId}</Text>
              </div>
              <div>
                <Text strong>Operating System:</Text> <Text>{agent.os} {agent.osVersion}</Text>
              </div>
              <div>
                <Text strong>Agent Version:</Text> <Text>{agent.agentVersion}</Text>
              </div>
              <div>
                <Text strong>Registered:</Text> <Text>{new Date(agent.registeredAt).toLocaleString()}</Text>
              </div>
            </Space>
          </div>

          <Divider />

          <div>
            <Paragraph style={{ marginBottom: '8px', fontWeight: 600 }}>Network Information</Paragraph>
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              {agent.ipAddress && (
                <div>
                  <Text strong>IP Address:</Text> <Text copyable>{agent.ipAddress}</Text>
                </div>
              )}
              {agent.hostname && (
                <div>
                  <Text strong>Hostname:</Text> <Text copyable>{agent.hostname}</Text>
                </div>
              )}
              {agent.serialNumber && (
                <div>
                  <Text strong>Serial Number:</Text> <Text copyable>{agent.serialNumber}</Text>
                </div>
              )}
              {!agent.ipAddress && !agent.hostname && !agent.serialNumber && (
                <Text type="secondary">No network information available</Text>
              )}
            </Space>
          </div>

          {agent.capabilities && agent.capabilities.length > 0 && (
            <>
              <Divider />
              <div>
                <Paragraph style={{ marginBottom: '8px', fontWeight: 600 }}>Capabilities</Paragraph>
                <Space wrap>
                  {agent.capabilities.map((cap) => (
                    <Tag key={cap} color="blue">
                      {cap}
                    </Tag>
                  ))}
                </Space>
              </div>
            </>
          )}
        </Space>
      ) },
    {
      key: 'linked',
      label: 'Linked',
      children: (
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          {agent.assetId ? (
            <>
              <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Linked Asset</Text>
                  </div>
                  <div>
                    <Text>Asset ID: {agent.assetId}</Text>
                  </div>
                  {agent.assetId && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => {
                        navigate(`/assets/${agent.assetId}`);
                        onClose();
                      }}
                    >
                      View Asset
                    </Button>
                  )}
                </Space>
              </div>
            </>
          ) : (
            <Empty description="No linked asset" />
          )}

          {agent.groups && agent.groups.length > 0 && (
            <>
              <Divider />
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>Groups</Text>
                <Space wrap>
                  {agent.groups.map((group) => (
                    <Tag key={group.id} color="cyan">
                      {group.name}
                    </Tag>
                  ))}
                </Space>
              </div>
            </>
          )}

          {agent.tags && agent.tags.length > 0 && (
            <>
              <Divider />
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>Tags</Text>
                <Space wrap>
                  {agent.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            </>
          )}
        </Space>
      ) },
    {
      key: 'commands',
      label: 'Commands',
      children: (
        <Spin spinning={commandsLoading}>
          {commands.length > 0 ? (
            <DataTable
              columns={commandColumns}
              data={commands}
              rowKey="id"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty description="No commands" />
          )}
        </Spin>
      ) },
  ];

  return (
    <Drawer
      title={`Agent Details: ${agent.name}`}
      placement="right"
      onClose={onClose}
      open={open}
      styles={{ wrapper: { width: 600 }, body: { paddingBottom: '80px' } }}
    >
      <Tabs items={tabItems} />
    </Drawer>
  );
};
