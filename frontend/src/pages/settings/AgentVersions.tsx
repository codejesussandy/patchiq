import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Typography,
  message,
  Space,
  Tooltip,
  Select,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { agentService } from '../../services/agent.service';
import type { AgentVersion } from '../../types/agent.types';

const { Title } = Typography;

interface PlatformIconProps {
  platform: string;
}

const PlatformIcon = ({ platform }: PlatformIconProps) => {
  const getIcon = () => {
    switch (platform) {
      case 'Linux':
        return '🐧';
      case 'Windows':
        return '🪟';
      case 'Mac':
        return '🍎';
      default:
        return '💻';
    }
  };

  return <span style={{ marginRight: '8px' }}>{getIcon()}</span>;
};

export const AgentVersions = () => {
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 50,
    current: 1,
  });

  useEffect(() => {
    fetchAgentVersions();
  }, []);

  const fetchAgentVersions = async () => {
    setLoading(true);
    try {
      const data = await agentService.getAgentVersions();
      const formattedData = Array.isArray(data)
        ? data.map((version: AgentVersion) => ({
            ...version,
            id: version.id || `${version.platform}-${version.architecture}`,
          }))
        : [];
      setVersions(formattedData);
    } catch (error) {
      console.error('Error fetching agent versions:', error);
      message.error('Failed to fetch agent versions');
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAgentVersions();
  };

  const handleExport = () => {
    if (filteredVersions.length === 0) {
      message.warning('No data to export');
      return;
    }

    // Prepare CSV headers
    const headers = ['Platform', 'Architecture', 'Version', 'Last Updated At'];

    // Prepare CSV rows
    const rows = filteredVersions.map((version) => [
      version.platform,
      version.architecture,
      version.version,
      new Date(version.lastUpdatedAt).toLocaleString(),
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `agent-versions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Agent versions exported successfully');
  };

  const handleDownload = async (record: AgentVersion) => {
    try {
      // Construct a download URL based on platform and architecture
      const downloadFileName = `agent-${record.platform.toLowerCase()}-${record.architecture}-v${record.version}`;
      const fileExtension = record.platform === 'Windows' ? '.exe' : record.platform === 'Mac' ? '.dmg' : '.deb';

      // For now, we'll create a mock download by triggering a blob download
      // In production, this would be a real API endpoint
      const response = await fetch(`/v1/agent-versions/${record.id}/download`);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${downloadFileName}${fileExtension}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('Download started');
      } else {
        message.error('Failed to download agent version');
      }
    } catch (error) {
      console.error('Error downloading agent version:', error);
      message.error('Failed to download agent version');
    }
  };

  const filteredVersions = versions.filter((version) =>
    Object.values(version).some((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const columns: ColumnsType<AgentVersion> = [
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      width: 150,
      render: (platform: string) => (
        <span>
          <PlatformIcon platform={platform} />
          {platform}
        </span>
      ),
      sorter: (a, b) => a.platform.localeCompare(b.platform),
    },
    {
      title: 'Architecture',
      dataIndex: 'architecture',
      key: 'architecture',
      width: 150,
      sorter: (a, b) => a.architecture.localeCompare(b.architecture),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 150,
      sorter: (a, b) => a.version.localeCompare(b.version),
    },
    {
      title: 'Last Updated At',
      dataIndex: 'lastUpdatedAt',
      key: 'lastUpdatedAt',
      width: 200,
      render: (date: string) => {
        return new Date(date).toLocaleString();
      },
      sorter: (a, b) =>
        new Date(a.lastUpdatedAt).getTime() -
        new Date(b.lastUpdatedAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_text: any, record: AgentVersion) => (
        <Tooltip title="Download">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Agent Versions</Title>
      </div>

      {/* Search and Actions Bar */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '250px' }}
        />

        <Space>
          <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
            Refresh
          </Button>
          <Button onClick={handleExport} icon={<FileTextOutlined />}>
            Export
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredVersions}
        loading={loading}
        pagination={pagination}
        onChange={(newPagination) => setPagination(newPagination)}
        rowKey="id"
        size="small"
        style={{ backgroundColor: 'white', borderRadius: '4px' }}
      />
    </div>
  );
};
