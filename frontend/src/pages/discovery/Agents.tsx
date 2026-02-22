import { useState } from 'react';
import {
  SearchOutlined,
  MoreOutlined,
  DownloadOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinkOutlined } from '@ant-design/icons';
import { formatEnum } from '@shared/types';
import type { MenuProps } from 'antd';
import {
  App,
  Input,
  Button,
  Dropdown,
  Tag,
  Space,
  Typography,
  Card,
  Modal,
  Tabs,
  Select,
  Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { AgentDetailsDrawer } from '../../components/agents/AgentDetailsDrawer';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { NoAgentsEmptyState, NoSearchResultsEmptyState } from '../../components/shared/EmptyState';
import { useAgents, useAgentDownloads, useDeleteAgent, useAgentErrors } from '../../hooks/useAgents';
import { useModal } from '../../hooks/useModal';
import type { Agent } from '../../types/agent.types';
import type { AgentError } from '../../services/agent.service';
import { api } from '../../services/api.service';

const { Title, Text } = Typography;

type AgentDownload = {
  os: 'Windows 11' | 'MacOS' | 'Linux';
  version: string;
  releaseDate: string;
  downloadUrl: string;
};

const ErrorsTab = () => {
  const [agentFilter, setAgentFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const { data: agents = [] } = useAgents();
  const { data: errorsResult, isLoading } = useAgentErrors({
    agentId: agentFilter,
    commandType: typeFilter,
  });

  const errorColumns: ColumnsType<AgentError> = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' },
    {
      title: 'Agent',
      dataIndex: ['agent', 'name'],
      key: 'agentName',
      width: 150,
      render: (_: unknown, record: AgentError) => record.agent?.name || '—' },
    {
      title: 'Hostname',
      dataIndex: ['agent', 'hostname'],
      key: 'hostname',
      width: 150,
      render: (_: unknown, record: AgentError) => record.agent?.hostname || '—' },
    {
      title: 'Command Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: string) => <Tag>{type}</Tag> },
    {
      title: 'Error Message',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (msg: string) => <Text type="danger">{msg || '—'}</Text> },
    {
      title: 'Command ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => <Text copyable={{ text: id }}>{id.slice(0, 8)}...</Text> },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by agent"
          allowClear
          style={{ width: 200 }}
          value={agentFilter}
          onChange={setAgentFilter}
          options={agents.map((a) => ({ label: a.name, value: a.id }))}
        />
        <Select
          placeholder="Filter by type"
          allowClear
          style={{ width: 200 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: 'Agent Update', value: 'agent_update' },
            { label: 'Inventory', value: 'inventory_full' },
            { label: 'Patch Install', value: 'patch_install' },
            { label: 'Software Install', value: 'software_install' },
            { label: 'Script Bundle', value: 'script_bundle' },
            { label: 'Config Update', value: 'config_update' },
          ]}
        />
      </Space>
      <DataTable
        size="middle"
        columns={errorColumns}
        data={errorsResult?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: <Empty description="No errors found" /> }}
      />
      {errorsResult && (
        <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          Total {errorsResult.total} error{errorsResult.total !== 1 ? 's' : ''}
        </Text>
      )}
    </div>
  );
};

export const Agents = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { data: agents = [], isLoading: loading } = useAgents();
  const { data: agentDownloads = [] } = useAgentDownloads();
  const deleteAgentMutation = useDeleteAgent();
  const deleteModal = useModal<Agent>();
  const [searchText, setSearchText] = useState('');
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleView = (agent: Agent) => {
    setSelectedAgent(agent);
    setDrawerOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    message.info(`Editing ${agent.name}`);
  };

  const handleDelete = (agent: Agent) => {
    deleteModal.onOpen(agent);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      await deleteAgentMutation.mutateAsync(deleteModal.selectedItem.id);
      message.success(`${deleteModal.selectedItem.name} deleted successfully`);
      deleteModal.onClose();
    } catch {
      message.error('Failed to delete agent');
    }
  };

  const handleDownloadAgent = async (download: AgentDownload) => {
    message.info(`Downloading ${download.os} agent...`);
    try {
      const response = await api.get(download.downloadUrl, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers?.['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] || `patchiq-agent-${download.os.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      message.success(`${download.os} agent downloaded successfully`);
    } catch {
      message.error(`Failed to download ${download.os} agent`);
    }
  };

  const getActionMenuItems = (agent: Agent): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View',
      onClick: () => handleView(agent) },
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => handleEdit(agent) },
    {
      type: 'divider' },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(agent) },
  ];

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

  const columns: ColumnsType<Agent> = [
    {
      title: 'Agent Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {formatEnum(status)}
        </Tag>
      ),
      filters: [
        { text: 'Connected', value: 'CONNECTED' },
        { text: 'Disconnected', value: 'DISCONNECTED' },
        { text: 'Pending', value: 'PENDING' },
        { text: 'Error', value: 'ERROR' },
      ],
      onFilter: (value, record) => record.status === value },
    {
      title: 'Last Heartbeat',
      dataIndex: 'lastHeartbeatRelative',
      key: 'lastHeartbeatRelative',
      width: 120,
      sorter: (a, b) => new Date(a.lastHeartbeat).getTime() - new Date(b.lastHeartbeat).getTime() },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip?: string) => ip ? <Text copyable>{ip}</Text> : '—' },
    {
      title: 'Hostname',
      dataIndex: 'hostname',
      key: 'hostname',
      width: 150,
      render: (hostname?: string) => hostname || '—' },
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
      onFilter: (value, record) => record.os === value },
    {
      title: 'Version',
      dataIndex: 'agentVersion',
      key: 'agentVersion',
      width: 100 },
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
      } },
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
      } },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ) },
  ];

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getOSIcon = (os: string) => {
    if (os === 'Windows 11') return <WindowsOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
    if (os === 'MacOS') return <AppleOutlined style={{ fontSize: 32, color: '#000' }} />;
    return <div style={{ fontSize: 32 }}>&#x1F427;</div>;
  };

  const agentsTabContent = (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <DataTable
        size="middle"
        columns={columns}
        data={filteredAgents}
        rowKey="id"
        loading={loading}
        pagination={false}
        style={{ marginBottom: '16px' }}
        locale={{
          emptyText: filteredAgents.length === 0 && agents.length === 0 ? (
            <NoAgentsEmptyState onDownload={() => setDownloadModalVisible(true)} />
          ) : (
            <NoSearchResultsEmptyState onClear={() => setSearchText('')} />
          )
        }}
      />

      <Text type="secondary">
        Total {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} found
      </Text>
    </>
  );

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Agents</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>Monitor and manage discovery agents</Text>
        </div>
        <Button onClick={() => setDownloadModalVisible(true)}>
          Download Agent
        </Button>
      </div>

      <Tabs
        defaultActiveKey="agents"
        items={[
          {
            key: 'agents',
            label: 'Agents',
            children: agentsTabContent,
          },
          {
            key: 'errors',
            label: 'Errors',
            children: <ErrorsTab />,
          },
        ]}
      />

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
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        title="Delete Agent"
        description={`Are you sure you want to delete ${deleteModal.selectedItem?.name}?`}
        open={deleteModal.open}
        onConfirm={handleDeleteConfirm}
        onCancel={deleteModal.onClose}
        loading={deleteAgentMutation.isPending}
        confirmText="Delete"
        danger
      />

      {/* Agent Details Drawer */}
      <AgentDetailsDrawer
        agent={selectedAgent}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
