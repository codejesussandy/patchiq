import { useState, useEffect } from 'react';
import { SearchOutlined, ReloadOutlined, ExportOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, SendOutlined, CalendarOutlined, SyncOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons';
import { App, Input, Button, Space, Typography, Tag, Popconfirm, Select, DatePicker, Tooltip, Drawer, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { DataTable } from '../components/shared/DataTable';
import { useReports, useDeleteReport, useRegenerateReport, useDownloadReport } from '../hooks/useReports';
import { formatFileSize, downloadBlob, getFileExtension } from '../services/reports.service';
import type { Report, ReportType, ReportFormat, ReportStatus, ListReportsParams } from '../types/reports.types';
import { REPORT_TYPE_LABELS, REPORT_STATUS_CONFIG, REPORT_FORMAT_LABELS } from '../types/reports.types';
import { CreateReportWizard } from './reports/components/CreateReportWizard';
import { ScheduleReportModal } from './reports/components/ScheduleReportModal';
import { SendReportModal } from './reports/components/SendReportModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const SCHEDULE_LABELS: Record<string, string> = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' };

export const Reports = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filterType, setFilterType] = useState<ReportType | undefined>(undefined);
  const [filterFormat, setFilterFormat] = useState<ReportFormat | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const queryParams: ListReportsParams = {
    page: pagination.current, limit: pagination.pageSize, search: searchText || undefined,
    type: filterType, format: filterFormat, status: filterStatus,
    startDate: dateRange?.[0]?.toISOString(), endDate: dateRange?.[1]?.toISOString() };
  const { data: reportsResponse, isLoading: loading, refetch } = useReports(queryParams);
  const reports = reportsResponse?.data || [];
  const totalReports = reportsResponse?.total || 0;
  const deleteReportMutation = useDeleteReport();
  const regenerateReportMutation = useRegenerateReport();
  const downloadReportMutation = useDownloadReport();

  const hasGenerating = reports.some((r: Report) => r.status === 'PROCESSING');
  useEffect(() => { if (!hasGenerating) return; const id = setInterval(() => refetch(), 5000); return () => clearInterval(id); }, [hasGenerating, refetch]);

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  const handleExport = () => {
    if (reports.length === 0) { message.warning('No data to export'); return; }
    const exportData = reports.map((item) => ({
      Name: item.name, Description: item.description || '', Type: REPORT_TYPE_LABELS[item.type] || item.type,
      Format: item.format, Status: REPORT_STATUS_CONFIG[item.status]?.label || item.status,
      Schedule: item.schedule?.enabled ? SCHEDULE_LABELS[item.schedule.frequency] : 'None',
      'File Size': formatFileSize(item.fileSize), 'Generated At': item.generatedAt ? dayjs(item.generatedAt).format('YYYY-MM-DD HH:mm') : 'N/A',
      'Created By': item.createdBy || 'System', 'Created On': item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '' }));
    const headers = Object.keys(exportData[0] || {});
    const csv = [headers.join(','), ...exportData.map((row) => headers.map((h) => {
      const v = row[h as keyof typeof row] || '';
      return typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))].join('\n');
    downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }), `reports_${new Date().toISOString().split('T')[0]}.csv`);
    message.success('Reports exported successfully');
  };

  const handleDownload = async (report: Report, format?: ReportFormat) => {
    if (report.status !== 'COMPLETED') { message.warning('Report is not ready for download'); return; }
    try {
      const dlFormat = format || report.format;
      const blob = await downloadReportMutation.mutateAsync({ id: report.id, format: dlFormat });
      downloadBlob(blob, `${report.name}.${getFileExtension(dlFormat)}`);
      message.success(`Downloaded ${report.name} as ${dlFormat}`);
    } catch { message.error(`Failed to download ${report.name}`); }
  };

  const handleSendNow = (record: Report) => {
    if (record.status !== 'COMPLETED') { message.warning('Report must be completed before sending'); return; }
    setSelectedReport(record); setSendModalOpen(true);
  };

  const columns: ColumnsType<Report> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200, sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: Report) => <Text style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => { setSelectedReport(record); setDetailsDrawerOpen(true); }}>{text}</Text> },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 200, ellipsis: true,
      render: (text: string) => <Tooltip title={text}><Text ellipsis style={{ maxWidth: 180 }}>{text || '-'}</Text></Tooltip> },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 120, render: (type: ReportType) => <Tag>{REPORT_TYPE_LABELS[type] || type}</Tag> },
    { title: 'Format', dataIndex: 'format', key: 'format', width: 80, align: 'center',
      render: (format: ReportFormat) => <Tag color={format === 'PDF' ? 'red' : format === 'XLSX' ? 'green' : 'blue'}>{REPORT_FORMAT_LABELS[format] || format}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (status: ReportStatus) => { const c = REPORT_STATUS_CONFIG[status]; return <Tag color={c?.color || 'default'} icon={status === 'PROCESSING' ? <LoadingOutlined spin /> : undefined}>{c?.label || status}</Tag>; } },
    { title: 'Schedule', key: 'schedule', width: 100,
      render: (_: unknown, record: Report) => record.schedule?.enabled ? <Tag color="purple">{SCHEDULE_LABELS[record.schedule.frequency]}</Tag> : <Text type="secondary">None</Text> },
    { title: 'File Size', dataIndex: 'fileSize', key: 'fileSize', width: 100, align: 'right', sorter: (a, b) => (a.fileSize || 0) - (b.fileSize || 0), render: (size: number) => formatFileSize(size) },
    { title: 'Generated At', dataIndex: 'generatedAt', key: 'generatedAt', width: 150,
      sorter: (a, b) => { if (!a.generatedAt) return 1; if (!b.generatedAt) return -1; return new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(); },
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-' },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', width: 120, render: (text: string) => text || 'System' },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt', width: 150, sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(), defaultSortOrder: 'descend',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm') },
    { title: 'Actions', key: 'actions', width: 200, fixed: 'right',
      render: (_: unknown, record: Report) => (
        <Space size="small">
          <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedReport(record); setDetailsDrawerOpen(true); }} /></Tooltip>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setSelectedReport(record); setEditModalOpen(true); }} /></Tooltip>
          <Tooltip title="Download"><Button type="text" size="small" icon={<DownloadOutlined />} disabled={record.status !== 'COMPLETED'} onClick={() => handleDownload(record)} /></Tooltip>
          <Tooltip title="Schedule"><Button type="text" size="small" icon={<CalendarOutlined />} disabled={record.schedule?.enabled} onClick={() => { setSelectedReport(record); setScheduleModalOpen(true); }} /></Tooltip>
          <Tooltip title="Send Now"><Button type="text" size="small" icon={<SendOutlined />} disabled={record.status !== 'COMPLETED'} onClick={() => handleSendNow(record)} /></Tooltip>
          <Tooltip title="Regenerate"><Button type="text" size="small" icon={<SyncOutlined />} disabled={record.status === 'PROCESSING'} onClick={async () => { try { await regenerateReportMutation.mutateAsync(record.id); message.success('Report regeneration started'); } catch { message.error('Failed to regenerate report'); } }} /></Tooltip>
          <Popconfirm title="Delete Report" description="Are you sure?" onConfirm={async () => { try { await deleteReportMutation.mutateAsync(record.id); message.success('Report deleted'); } catch { message.error('Failed to delete report'); } }} okText="Yes" cancelText="No">
            <Tooltip title="Delete"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
          </Popconfirm>
        </Space>
      ) },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Reports</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Generate and view compliance reports</Text>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Input placeholder="Search by name, description, or creator..." prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />
        <Select placeholder="Type" style={{ width: 140 }} value={filterType} onChange={setFilterType} allowClear options={Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <Select placeholder="Format" style={{ width: 120 }} value={filterFormat} onChange={setFilterFormat} allowClear options={[{ value: 'PDF', label: 'PDF' }, { value: 'CSV', label: 'CSV' }, { value: 'XLSX', label: 'Excel' }]} />
        <Select placeholder="Status" style={{ width: 130 }} value={filterStatus} onChange={setFilterStatus} allowClear options={[{ value: 'PENDING', label: 'Pending' }, { value: 'PROCESSING', label: 'Processing' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'FAILED', label: 'Failed' }]} />
        <RangePicker style={{ width: 260 }} value={dateRange} onChange={(dates) => setDateRange(dates)} />
        <Button onClick={() => { setSearchText(''); setFilterType(undefined); setFilterFormat(undefined); setFilterStatus(undefined); setDateRange(null); }}>Clear</Button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={async () => { await refetch(); message.success('Data refreshed'); }} loading={loading}>Refresh</Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>Export</Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => { setSelectedReport(null); setCreateModalOpen(true); }}>Create</Button>
        </div>
      </div>

      <DataTable columns={columns} data={reports} rowKey="id" loading={loading}
        pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: totalReports, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items`, onChange: (page, pageSize) => setPagination({ current: page, pageSize }) }}
        scroll={{ x: 1600 }} />

      <Drawer title="Report Details" placement="right" styles={{ wrapper: { width: 500 } }} open={detailsDrawerOpen}
        onClose={() => { setDetailsDrawerOpen(false); setSelectedReport(null); }}
        extra={<Space>
          {selectedReport?.status === 'COMPLETED' && (<><Button icon={<DownloadOutlined />} onClick={() => selectedReport && handleDownload(selectedReport)}>Download</Button><Button icon={<SendOutlined />} onClick={() => selectedReport && handleSendNow(selectedReport)}>Send</Button></>)}
          <Button icon={<SyncOutlined />} onClick={async () => { if (selectedReport) { try { await regenerateReportMutation.mutateAsync(selectedReport.id); message.success('Regeneration started'); } catch { message.error('Failed'); } } }} disabled={selectedReport?.status === 'PROCESSING'}>Regenerate</Button>
        </Space>}>
        {selectedReport && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">{selectedReport.name}</Descriptions.Item>
            <Descriptions.Item label="Description">{selectedReport.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="Type"><Tag>{REPORT_TYPE_LABELS[selectedReport.type]}</Tag></Descriptions.Item>
            <Descriptions.Item label="Format"><Tag color={selectedReport.format === 'PDF' ? 'red' : 'green'}>{selectedReport.format}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={REPORT_STATUS_CONFIG[selectedReport.status]?.color} icon={selectedReport.status === 'PROCESSING' ? <LoadingOutlined spin /> : undefined}>{REPORT_STATUS_CONFIG[selectedReport.status]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Schedule">{selectedReport.schedule?.enabled ? (
              <Space direction="vertical" size="small"><Tag color="purple">{SCHEDULE_LABELS[selectedReport.schedule.frequency]}</Tag>{selectedReport.schedule.time && <Text>Time: {selectedReport.schedule.time}</Text>}{selectedReport.schedule.recipients?.length > 0 && <Text>Recipients: {selectedReport.schedule.recipients.join(', ')}</Text>}</Space>
            ) : <Text type="secondary">Not scheduled</Text>}</Descriptions.Item>
            <Descriptions.Item label="File Size">{formatFileSize(selectedReport.fileSize)}</Descriptions.Item>
            <Descriptions.Item label="Generated At">{selectedReport.generatedAt ? dayjs(selectedReport.generatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Created By">{selectedReport.createdBy || 'System'}</Descriptions.Item>
            <Descriptions.Item label="Created On">{dayjs(selectedReport.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            {selectedReport.status === 'FAILED' && selectedReport.errorMessage && <Descriptions.Item label="Error"><Text type="danger">{selectedReport.errorMessage}</Text></Descriptions.Item>}
            {selectedReport.columns && selectedReport.columns.length > 0 && <Descriptions.Item label="Columns"><Space wrap>{selectedReport.columns.map(col => <Tag key={col}>{col}</Tag>)}</Space></Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>

      <CreateReportWizard open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={() => { setCreateModalOpen(false); refetch(); }} mode="create" />
      <CreateReportWizard open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedReport(null); }} onSuccess={() => { setEditModalOpen(false); setSelectedReport(null); refetch(); }} mode="edit" report={selectedReport} />
      <ScheduleReportModal open={scheduleModalOpen} onClose={() => { setScheduleModalOpen(false); setSelectedReport(null); }} onSuccess={() => { setScheduleModalOpen(false); setSelectedReport(null); refetch(); }} report={selectedReport} />
      <SendReportModal open={sendModalOpen} onClose={() => { setSendModalOpen(false); setSelectedReport(null); }} onSuccess={() => { setSendModalOpen(false); setSelectedReport(null); }} report={selectedReport} />
    </div>
  );
};
