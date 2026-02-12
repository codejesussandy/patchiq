import { useState } from 'react';
import { ReloadOutlined, DownloadOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { Button, Select, Input, Space, Tag, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { DataTable } from '../../components/shared/DataTable';
import { useAuditLogs, useAuditFilterOptions } from '../../hooks/useSettings';
import { formatAuditDetail } from './components/AuditDetailFormatter';
import { AuditTimelineModal, type TimePeriod } from './components/AuditTimelineModal';

interface AuditLog {
  id: string;
  module: string;
  operation: string;
  user: string;
  status: 'success' | 'fail';
  message: string;
  createdAt: string;
}

const getTimePeriodRange = (period: TimePeriod): { start: Date; end: Date } => {
  const now = new Date();
  let start = new Date();
  switch (period) {
    case 'thisMinute': start.setSeconds(0); start.setMilliseconds(0); break;
    case 'thisHour': start.setMinutes(0, 0, 0); break;
    case 'thisDay': start.setHours(0, 0, 0, 0); break;
    case 'thisWeek': { const day = start.getDay(); start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0); break; }
    case 'thisMonth': start.setDate(1); start.setHours(0, 0, 0, 0); break;
    case 'thisQuarter': { const quarter = Math.floor(start.getMonth() / 3); start.setMonth(quarter * 3, 1); start.setHours(0, 0, 0, 0); break; }
    case 'thisYear': start.setMonth(0, 1); start.setHours(0, 0, 0, 0); break;
    case 'previous15Hours': start.setHours(start.getHours() - 15); break;
    case 'previousWeek': start.setDate(start.getDate() - 7); break;
    case 'previousMonth': start.setMonth(start.getMonth() - 1); break;
    case 'previousQuarter': start.setMonth(start.getMonth() - 3); break;
    case 'previousYear': start.setFullYear(start.getFullYear() - 1); break;
    case 'all': default: start = new Date(0);
  }
  return { start, end: now };
};

export const Audit = () => {
  const { data: rawAuditLogs, isLoading: loading, refetch } = useAuditLogs();
  const { data: filterOptionsData } = useAuditFilterOptions();
  const [searchText, setSearchText] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('all');
  const [customStartDate, setCustomStartDate] = useState<Dayjs | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Dayjs | null>(null);

  const auditLogs: AuditLog[] = Array.isArray(rawAuditLogs) ? rawAuditLogs : [];
  const modules: string[] = filterOptionsData?.modules || [];
  const users: string[] = filterOptionsData?.users || [];
  const operations: string[] = filterOptionsData?.operations || [];

  const isLogInTimePeriod = (logDate: string, period: TimePeriod): boolean => {
    if (period === 'all') return true;
    if (period === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      try { const logTime = new Date(logDate); return logTime >= customStartDate.toDate() && logTime <= customEndDate.toDate(); } catch { return false; }
    }
    try { const logTime = new Date(logDate); const { start, end } = getTimePeriodRange(period); return logTime >= start && logTime <= end; } catch { return false; }
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
    { title: 'Module', dataIndex: 'module', key: 'module', width: 100 },
    { title: 'Operation', dataIndex: 'operation', key: 'operation', width: 100 },
    { title: 'User', dataIndex: 'user', key: 'user', width: 100 },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (status: string) => <Tag color={status === 'SUCCESS' ? 'green' : 'red'}>{status}</Tag> },
    { title: 'Details', dataIndex: 'message', key: 'message',
      render: (value: string) => value ? (
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.5' }}>{formatAuditDetail(value)}</div>
      ) : '-' },
    { title: 'Created At', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (value: string) => {
        if (!value) return '-';
        try { return new Date(value).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return value; }
      } },
  ];

  const handleExport = () => {
    const csvContent = [['Module', 'Operation', 'User', 'Status', 'Details', 'Created At'],
      ...filteredLogs.map((log) => [log.module, log.operation, log.user, log.status, log.message, log.createdAt ? new Date(log.createdAt).toLocaleString() : ''])]
      .map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'audit-logs.csv'; link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '28px', fontWeight: 600 }}>Audit</h1>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ maxWidth: '400px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Select placeholder="Select Module" value={selectedModule} onChange={setSelectedModule}
            options={[{ label: 'All Modules', value: null }, ...modules.map((m) => ({ label: m, value: m }))]} style={{ width: '200px' }} allowClear />
          <Select placeholder="Select User" value={selectedUser} onChange={setSelectedUser}
            options={[{ label: 'All Users', value: null }, ...users.map((u) => ({ label: u, value: u }))]} style={{ width: '200px' }} allowClear />
          <Select placeholder="Select Operation" value={selectedOperation} onChange={setSelectedOperation}
            options={[{ label: 'All Operations', value: null }, ...operations.map((o) => ({ label: o, value: o }))]} style={{ width: '200px' }} allowClear />
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Button icon={<FilterOutlined />} onClick={() => setShowTimeline(true)} type={selectedTimePeriod !== 'all' ? 'primary' : 'default'}>Timeline</Button>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
            </Space>
          </div>
        </div>
      </div>
      <Spin spinning={loading}>
        <DataTable columns={columns} data={filteredLogs} rowKey="id" pagination={{ pageSize: 10, current: currentPage, onChange: setCurrentPage }} />
      </Spin>
      <AuditTimelineModal open={showTimeline} selectedTimePeriod={selectedTimePeriod}
        customStartDate={customStartDate} customEndDate={customEndDate}
        onTimePeriodChange={setSelectedTimePeriod} onCustomStartChange={setCustomStartDate} onCustomEndChange={setCustomEndDate}
        onClose={() => { setShowTimeline(false); setCustomStartDate(null); setCustomEndDate(null); }} />
    </div>
  );
};
