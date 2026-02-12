import { useState, useMemo } from 'react';
import { ReloadOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import { App,
  Button, Typography, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useDistributionServers } from '../../hooks/useSettings';
import { settingsService } from '../../services/settings.service';
import type { DistributionServer as DistributionServerType } from '../../types/settings.types';

const { Title } = Typography;

export const DistributionServer = () => {
  const { message } = App.useApp();
  const { data = [], isLoading: loading, refetch } = useDistributionServers();
  const [searchText, setSearchText] = useState('');

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    return data.filter((item: DistributionServerType) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.location.toLowerCase().includes(searchText.toLowerCase()) ||
      item.url.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = async () => {
    try {
      const blob = await settingsService.exportDistributionServers('csv');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'distribution-servers.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Distribution servers exported successfully');
    } catch {
      message.error('Failed to export distribution servers');
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await settingsService.downloadDistributionServer();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'distribution-server.json');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Distribution server downloaded successfully');
    } catch {
      message.error('Failed to download distribution server');
    }
  };

  const _handleDelete = async (id: string) => {
    try {
      await settingsService.deleteDistributionServer(id);
      message.success('Distribution server deleted successfully');
      refetch();
    } catch {
      message.error('Failed to delete distribution server');
    }
  };
  void _handleDelete; // Reserved for future use when delete UI is added

  const columns: ColumnsType<DistributionServerType> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      sorter: (a, b) => a.location.localeCompare(b.location),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <Tooltip title={url}>
          <span style={{ maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {url}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      sorter: (a, b) => a.version.localeCompare(b.version),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      render: (createdOn: string) => new Date(createdOn).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>Distribution Server</Title>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        rowKey="id"
        loading={loading}
        searchable
        searchPlaceholder="Search..."
        searchValue={searchText}
        onSearch={setSearchText}
        toolbar={
          <Space>
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              />
            </Tooltip>
            <Button onClick={handleExport} loading={loading}>
              Export
            </Button>
            <Button onClick={handleDownload} loading={loading}>
              Download Distribution Server
            </Button>
            <Tooltip title="Settings">
              <Button icon={<SettingOutlined />} />
            </Tooltip>
          </Space>
        }
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <DownloadOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px', display: 'block' }} />
              <span style={{ color: '#8c8c8c' }}>No data</span>
            </div>
          ),
        }}
        pagination={{
          current: 1,
          pageSize: 10,
          total: filteredData.length,
          onChange: () => {},
        }}
      />
    </div>
  );
};
