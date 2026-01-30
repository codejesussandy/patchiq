import { useState, useEffect } from 'react';
import { App,
  Table, Button, Space, Input, Tag, Spin } from 'antd';
import { ReloadOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { settingsService } from '../../services/settings.service';
import type { AgentApproval } from '../../types/settings.types';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

const statusColors: Record<string, string> = {
  Approved: 'success',
  Pending: 'processing',
  Rejected: 'error',
};

export const AgentApprovals = () => {
  const { message } = App.useApp();
  const [approvals, setApprovals] = useState<AgentApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<AgentApproval[]>([]);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchText, approvals]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getAgentApprovals();
      setApprovals(data);
      setPagination((prev) => ({
        ...prev,
        total: data.length,
      }));
    } catch (error) {
      console.error('Error fetching agent approvals:', error);
      message.error('Failed to fetch agent approvals');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (!searchText) {
      setFilteredData(approvals);
      return;
    }

    const filtered = approvals.filter((approval) => {
      const searchLower = searchText.toLowerCase();
      return (
        approval.uuid.toLowerCase().includes(searchLower) ||
        approval.hostName.toLowerCase().includes(searchLower) ||
        approval.ipAddresses.some((ip) => ip.toLowerCase().includes(searchLower)) ||
        approval.performedBy.toLowerCase().includes(searchLower)
      );
    });
    setFilteredData(filtered);
    setPagination((prev) => ({
      ...prev,
      current: 1,
      total: filtered.length,
    }));
  };

  const handleExport = async () => {
    try {
      const blob = await settingsService.exportAgentApprovals('csv');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'agent-approvals.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Agent approvals exported successfully');
    } catch (error) {
      console.error('Error exporting agent approvals:', error);
      message.error('Failed to export agent approvals');
    }
  };

  const columns: ColumnsType<AgentApproval> = [
    {
      title: 'UUID',
      dataIndex: 'uuid',
      key: 'uuid',
      width: '20%',
      render: (text) => <span style={{ fontSize: '12px' }}>{text}</span>,
    },
    {
      title: 'Host Name',
      dataIndex: 'hostName',
      key: 'hostName',
      width: '15%',
    },
    {
      title: 'IP Addresses',
      dataIndex: 'ipAddresses',
      key: 'ipAddresses',
      width: '20%',
      render: (addresses: string[]) => (
        <span style={{ fontSize: '12px' }}>{addresses.join(', ')}</span>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      width: '18%',
      render: (text) => <span style={{ fontSize: '12px' }}>{text}</span>,
    },
    {
      title: 'Performed By',
      dataIndex: 'performedBy',
      key: 'performedBy',
      width: '12%',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
  ];

  const paginatedData = filteredData.slice(
    ((pagination.current || 1) - 1) * (pagination.pageSize || 10),
    ((pagination.current || 1) * (pagination.pageSize || 10))
  );

  const startIndex = ((pagination.current || 1) - 1) * (pagination.pageSize || 10) + 1;
  const endIndex = Math.min((pagination.current || 1) * (pagination.pageSize || 10), pagination.total || 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Agent Approvals</h2>
        <Space>
          <Input
            placeholder="Search"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '200px' }}
            allowClear
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchApprovals}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Table<AgentApproval>
          columns={columns}
          dataSource={paginatedData}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total: pagination.total });
            },
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            showTotal: () => (
              <span style={{ marginRight: '16px' }}>
                Showing {startIndex}-{endIndex} of {pagination.total} items
              </span>
            ),
          }}
          style={{ marginTop: '16px' }}
          size="small"
        />
      </Spin>
    </div>
  );
};
