import { useState, useEffect } from 'react';
import { App,
  Table, Input, Button, Typography, Space, Tooltip } from 'antd';
import { ReloadOutlined, DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';
import type { DistributionServer as DistributionServerType } from '../../types/settings.types';

const { Title } = Typography;

export const DistributionServer = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<DistributionServerType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<DistributionServerType[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = data.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description.toLowerCase().includes(searchText.toLowerCase()) ||
        item.location.toLowerCase().includes(searchText.toLowerCase()) ||
        item.url.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchText, data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getDistributionServers();
      setData(response);
    } catch (error) {
      message.error('Failed to fetch distribution servers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
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
    } catch (error) {
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
    } catch (error) {
      message.error('Failed to download distribution server');
    }
  };

  const _handleDelete = async (id: string) => {
    try {
      await settingsService.deleteDistributionServer(id);
      message.success('Distribution server deleted successfully');
      await fetchData();
    } catch (error) {
      message.error('Failed to delete distribution server');
    }
  };
  void _handleDelete; // Reserved for future use

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

      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        {/* Search and Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <Input
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: '300px' }}
            allowClear
          />
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
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <DownloadOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px', display: 'block' }} />
                <span style={{ color: '#8c8c8c' }}>No data</span>
              </div>
            ),
          }}
          pagination={{
            pageSize: 10,
            total: filteredData.length,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
        />
      </Space>
    </div>
  );
};
