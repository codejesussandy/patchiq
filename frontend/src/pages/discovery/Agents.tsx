import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App,
  Table,
  Input,
  Button,
  Dropdown,
  Tag,
  Space,
  Typography,
  Card,
  Modal,
} from 'antd';
import {
  SearchOutlined,
  MoreOutlined,
  DownloadOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { agentService } from '../../services/agent.service';
import type { Agent } from '../../types/agent.types';
import { AgentDetailsDrawer } from '../../components/agents/AgentDetailsDrawer';

const { Title, Text } = Typography;

type AgentDownload = {
  os: 'Windows 11' | 'MacOS' | 'Linux';
  version: string;
  releaseDate: string;
  downloadUrl: string;
};

export const Agents = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [agentDownloads, setAgentDownloads] = useState<AgentDownload[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchAgentDownloads();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await agentService.getAgents();
      setAgents(data);
    } catch (error) {
      message.error('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentDownloads = async () => {
    try {
      const data = await agentService.getAgentDownloads();
      setAgentDownloads(data);
    } catch (error) {
      message.error('Failed to fetch agent downloads');
    }
  };

  const handleView = (agent: Agent) => {
    setSelectedAgent(agent);
    setDrawerOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    message.info(`Editing ${agent.name}`);
  };

  const handleDelete = (agent: Agent) => {
    Modal.confirm({
      title: 'Delete Agent',
      content: `Are you sure you want to delete ${agent.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await agentService.deleteAgent(agent.id);
          message.success(`${agent.name} deleted successfully`);
          fetchAgents();
        } catch (error) {
          message.error('Failed to delete agent');
        }
      },
    });
  };

  const handleDownloadAgent = (download: AgentDownload) => {
    message.success(`Downloading ${download.os} agent...`);
    // In real implementation, this would trigger a file download
    window.open(download.downloadUrl, '_blank');
  };

  const getActionMenuItems = (agent: Agent): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View',
      onClick: () => handleView(agent),
    },
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => handleEdit(agent),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(agent),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected':
        return 'success';
      case 'Disconnected':
        return 'default';
      case 'Pending':
        return 'processing';
      case 'Error':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<Agent> = [
    {
      title: 'Agent Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Connected', value: 'Connected' },
        { text: 'Disconnected', value: 'Disconnected' },
        { text: 'Pending', value: 'Pending' },
        { text: 'Error', value: 'Error' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Last Heartbeat',
      dataIndex: 'lastHeartbeatRelative',
      key: 'lastHeartbeatRelative',
      width: 120,
      sorter: (a, b) => new Date(a.lastHeartbeat).getTime() - new Date(b.lastHeartbeat).getTime(),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip?: string) => ip ? <Text copyable>{ip}</Text> : '—',
    },
    {
      title: 'Hostname',
      dataIndex: 'hostname',
      key: 'hostname',
      width: 150,
      render: (hostname?: string) => hostname || '—',
    },
    {
      title: 'OS',
      dataIndex: 'os',
      key: 'os',
      width: 100,
      filters: [
        { text: 'Windows', value: 'Windows' },
        { text: 'MacOS', value: 'MacOS' },
        { text: 'Linux', value: 'Linux' },
      ],
      onFilter: (value, record) => record.os === value,
    },
    {
      title: 'Version',
      dataIndex: 'agentVersion',
      key: 'agentVersion',
      width: 100,
    },
    {
      title: 'Groups',
      dataIndex: 'groups',
      key: 'groups',
      width: 180,
      render: (groups?: Array<{ id: string; name: string }>) => {
        if (!groups || groups.length === 0) return '—';
        return (
          <Space size="small" wrap>
            {groups.slice(0, 2).map((group) => (
              <Tag key={group.id} color="cyan" style={{ margin: 0 }}>
                {group.name}
              </Tag>
            ))}
            {groups.length > 2 && <Text type="secondary">+{groups.length - 2} more</Text>}
          </Space>
        );
      },
    },
    {
      title: 'Asset',
      dataIndex: 'assetId',
      key: 'assetId',
      width: 120,
      render: (assetId?: string) => {
        if (!assetId) return '—';
        return (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => navigate(`/assets/${assetId}`)}
          >
            View
          </Button>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getOSIcon = (os: string) => {
    if (os === 'Windows 11') return <WindowsOutlined style={{ fontSize: 32, color: '#0078d4' }} />;
    if (os === 'MacOS') return <AppleOutlined style={{ fontSize: 32, color: '#000' }} />;
    return <div style={{ fontSize: 32 }}>🐧</div>;
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          Agents
        </Title>
        <Button onClick={() => setDownloadModalVisible(true)}>
          Download Agent
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredAgents}
        rowKey="id"
        loading={loading}
        pagination={false}
        style={{ marginBottom: '16px' }}
      />

      <Text type="secondary">
        Total {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} found
      </Text>

      {/* Download Agents Modal */}
      <Modal
        title="Download Agents for Devices"
        open={downloadModalVisible}
        onCancel={() => setDownloadModalVisible(false)}
        footer={null}
        width={600}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </Text>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {agentDownloads.map((download) => (
            <Card
              key={download.os}
              hoverable
              style={{ cursor: 'pointer' }}
              onClick={() => handleDownloadAgent(download)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {getOSIcon(download.os)}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{download.os}</div>
                    <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                      Version: {download.version}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    Release: {download.releaseDate}
                  </Text>
                  <DownloadOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                </div>
              </div>
            </Card>
          ))}
        </Space>
      </Modal>

      {/* Agent Details Drawer */}
      <AgentDetailsDrawer
        agent={selectedAgent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
