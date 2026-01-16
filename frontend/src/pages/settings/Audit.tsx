import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Select,
  Spin,
  Tag,
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';

interface AuditLog {
  id: string;
  module: string;
  operation: string;
  user: string;
  status: string;
  message: string;
  createdAt: string;
}

export const Audit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);
  const [selectedOperation, setSelectedOperation] = useState<string | undefined>(undefined);
  const [modules, setModules] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [operations, setOperations] = useState<string[]>([]);

  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchAuditLogs();
    fetchFilterOptions();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getAuditLogs();
      const formattedData = Array.isArray(data)
        ? data.map((log: any, index: number) => ({
            ...log,
            id: log.id || String(index),
          }))
        : [];
      setLogs(formattedData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const data = await settingsService.getAuditFilterOptions();
      if (data) {
        setModules(data.modules || []);
        setUsers(data.users || []);
        setOperations(data.operations || []);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Module', 'Operation', 'User', 'Status', 'Message', 'Created At'],
      ...filteredLogs.map((log) => [
        log.module,
        log.operation,
        log.user,
        log.status,
        log.message,
        formatDate(log.createdAt),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-logs.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const filteredLogs = logs.filter((log) => {
    const matchModule = !selectedModule || log.module === selectedModule;
    const matchUser = !selectedUser || log.user === selectedUser;
    const matchOperation = !selectedOperation || log.operation === selectedOperation;

    return matchModule && matchUser && matchOperation;
  });

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 90,
      align: 'left',
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
      width: 90,
      align: 'left',
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 70,
      align: 'left',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'left',
      render: (status: string) => {
        const statusColor = status === 'success' ? 'green' : 'red';
        return <Tag color={statusColor}>{status}</Tag>;
      },
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (text: string) => text || '—',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 145,
      align: 'left',
      render: (date: string) => formatDate(date),
    },
  ];

  return (
    <div style={{ padding: '0px', background: '#fff' }}>
      <div style={{ padding: '12px 12px 8px 12px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600 }}>Audit</h3>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
          <Select
            placeholder="Module"
            allowClear
            value={selectedModule}
            onChange={setSelectedModule}
            options={modules.map((m) => ({ label: m, value: m }))}
            style={{ width: 110 }}
            size="small"
          />
          <Select
            placeholder="Operation"
            allowClear
            value={selectedOperation}
            onChange={setSelectedOperation}
            options={operations.map((o) => ({ label: o, value: o }))}
            style={{ width: 110 }}
            size="small"
          />
          <Select
            placeholder="User"
            allowClear
            value={selectedUser}
            onChange={setSelectedUser}
            options={users.map((u) => ({ label: u, value: u }))}
            style={{ width: 85 }}
            size="small"
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={fetchAuditLogs}
              style={{ fontSize: '12px' }}
            >
              Refresh
            </Button>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={handleExport}
              style={{ fontSize: '12px' }}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          pagination={{
            pageSize: 20,
            current: pagination.current,
            showSizeChanger: false,
            showQuickJumper: false,
            showTotal: (total) => `showing 1-20 of ${total} items`,
            position: ['bottomRight'],
          }}
          onChange={(newPagination) => setPagination(newPagination as TablePaginationConfig)}
          bordered
          size="small"
          scroll={{ x: 800 }}
        />
      </Spin>
    </div>
  );
};
