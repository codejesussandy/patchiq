import { useState } from 'react';
import {
  ReloadOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Typography,
  Space,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useAgentVersions } from '../../hooks/useAgents';
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
  const { message } = App.useApp();
  const { data: rawVersions, isLoading: loading, refetch } = useAgentVersions();
  const [searchText, setSearchText] = useState('');

  const versions = Array.isArray(rawVersions)
    ? rawVersions.map((version: AgentVersion) => ({
        ...version,
        id: version.id || `${version.platform}-${version.architecture}`,
      }))
    : [];

  const handleRefresh = () => {
    refetch();
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
      message.loading({ content: 'Preparing download...', key: 'download' });

      const { blob, filename } = await agentService.downloadAgentBinary(record.id);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `patchiq-agent-${record.platform.toLowerCase()}-${record.architecture}-v${record.version}.zip`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success({ content: 'Download started! Extract the ZIP and run start-agent script.', key: 'download', duration: 5 });
    } catch {
      message.error({ content: 'Failed to download agent version', key: 'download' });
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
      render: (_text: unknown, record: AgentVersion) => (
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

      <DataTable
        columns={columns}
        data={filteredVersions}
        loading={loading}
        rowKey="id"
        size="small"
        searchable
        searchPlaceholder="Search"
        searchValue={searchText}
        onSearch={setSearchText}
        toolbar={
          <Space>
            <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
              Refresh
            </Button>
            <Button onClick={handleExport} icon={<FileTextOutlined />}>
              Export
            </Button>
          </Space>
        }
        style={{ backgroundColor: 'white', borderRadius: '4px' }}
      />
    </div>
  );
};
