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
    message.info('Export functionality coming soon');
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
      render: (_text: any, _record: AgentVersion) => (
        <Tooltip title="Download">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => {
              message.info('Download functionality coming soon');
            }}
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
