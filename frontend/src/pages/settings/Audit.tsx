import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Select,
  Input,
  Space,
  Tag,
  Spin,
  message,
  Modal,
  DatePicker,
} from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { settingsService } from '../../services/settings.service';

interface AuditLog {
  id: string;
  module: string;
  operation: string;
  user: string;
  status: 'success' | 'fail';
  message: string;
  createdAt: string;
}

type TimePeriod = 'all' | 'thisMinute' | 'thisHour' | 'thisDay' | 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'previous15Hours' | 'previousWeek' | 'previousMonth' | 'previousQuarter' | 'previousYear' | 'custom';

export const Audit = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('all');
  const [customStartDate, setCustomStartDate] = useState<Dayjs | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    fetchAuditLogs();
    fetchFilterOptions();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getAuditLogs();
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      message.error('Failed to load audit logs');
      setAuditLogs([]);
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
  }

  const getTimePeriodRange = (period: TimePeriod): { start: Date; end: Date } => {
    const now = new Date();
    let start = new Date();

    switch (period) {
      case 'thisMinute':
        start.setSeconds(0);
        start.setMilliseconds(0);
        break;
      case 'thisHour':
        start.setMinutes(0, 0, 0);
        break;
      case 'thisDay':
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisWeek':
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisYear':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'previous15Hours':
        start.setHours(start.getHours() - 15);
        break;
      case 'previousWeek':
        start.setDate(start.getDate() - 7);
        break;
      case 'previousMonth':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'previousQuarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'previousYear':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
      default:
        start = new Date(0);
    }

    return { start, end: now };
  };

  const isLogInTimePeriod = (logDate: string, period: TimePeriod): boolean => {
    if (period === 'all') return true;
    if (period === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      try {
        const logTime = new Date(logDate);
        const start = customStartDate.toDate();
        const end = customEndDate.toDate();
        return logTime >= start && logTime <= end;
      } catch {
        return false;
      }
    }
    try {
      const logTime = new Date(logDate);
      const { start, end } = getTimePeriodRange(period);
      return logTime >= start && logTime <= end;
    } catch {
      return false;
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedModule && log.module !== selectedModule) return false;
    if (selectedUser && log.user !== selectedUser) return false;
    if (selectedOperation && log.operation !== selectedOperation) return false;
    if (searchText && !log.message.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (showTimeline && !isLogInTimePeriod(log.createdAt, selectedTimePeriod)) return false;
    return true;
  });

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 100,
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
      width: 100,
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color = status === 'success' ? 'green' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
    },
  ];

  const handleRefresh = () => {
    fetchAuditLogs();
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
        log.createdAt,
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

  const timePeriodButtons = [
    { key: 'thisMinute', label: 'This Minute' },
    { key: 'thisHour', label: 'This Hour' },
    { key: 'thisDay', label: 'This Day' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'thisQuarter', label: 'This Quarter' },
    { key: 'thisYear', label: 'This Year' },
    { key: 'previous15Hours', label: 'Previous 15 Hours' },
    { key: 'previousWeek', label: 'Previous Week' },
    { key: 'previousMonth', label: 'Previous Month' },
    { key: 'previousQuarter', label: 'Previous Quarter' },
    { key: 'previousYear', label: 'Previous Year' },
  ];

  const handleTimelineModalClose = () => {
    setShowTimeline(false);
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '28px', fontWeight: 600 }}>Audit</h1>

      {/* Search and Filters */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            placeholder="Select Module"
            value={selectedModule}
            onChange={setSelectedModule}
            options={[
              { label: 'All Modules', value: null },
              ...modules.map((m) => ({ label: m, value: m })),
            ]}
            style={{ width: '200px' }}
            allowClear
          />

          <Select
            placeholder="Select User"
            value={selectedUser}
            onChange={setSelectedUser}
            options={[
              { label: 'All Users', value: null },
              ...users.map((u) => ({ label: u, value: u })),
            ]}
            style={{ width: '200px' }}
            allowClear
          />

          <Select
            placeholder="Select Operation"
            value={selectedOperation}
            onChange={setSelectedOperation}
            options={[
              { label: 'All Operations', value: null },
              ...operations.map((o) => ({ label: o, value: o })),
            ]}
            style={{ width: '200px' }}
            allowClear
          />

          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowTimeline(true)}
                type={selectedTimePeriod !== 'all' ? 'primary' : 'default'}
              >
                Timeline
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
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
        </div>
      </div>

      {/* Table */}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          pagination={{
            pageSize: 10,
            current: currentPage,
            onChange: setCurrentPage,
          }}
        />
      </Spin>

      {/* Timeline Modal */}
      <Modal
        title="Select Timeline"
        open={showTimeline}
        onCancel={handleTimelineModalClose}
        width={500}
        footer={[
          <Button key="close" onClick={handleTimelineModalClose}>
            Close
          </Button>,
        ]}
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Preset Time Periods */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
              Preset Timeline
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {timePeriodButtons.map((period) => (
                <Button
                  key={period.key}
                  type={selectedTimePeriod === period.key && selectedTimePeriod !== 'custom' ? 'primary' : 'default'}
                  onClick={() => {
                    setSelectedTimePeriod(period.key as TimePeriod);
                    setCustomStartDate(null);
                    setCustomEndDate(null);
                  }}
                  style={{
                    textAlign: 'left',
                    fontSize: '13px',
                    height: '36px',
                  }}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
              Custom Date Range
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>From</div>
                <DatePicker
                  value={customStartDate}
                  onChange={setCustomStartDate}
                  placeholder="Start Date"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>To</div>
                <DatePicker
                  value={customEndDate}
                  onChange={setCustomEndDate}
                  placeholder="End Date"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <Button
              block
              style={{ marginTop: '12px' }}
              type={selectedTimePeriod === 'custom' ? 'primary' : 'default'}
              onClick={() => {
                if (customStartDate && customEndDate) {
                  setSelectedTimePeriod('custom');
                } else {
                  message.warning('Please select both start and end dates');
                }
              }}
            >
              Apply Custom Range
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
