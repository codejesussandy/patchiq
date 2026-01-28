import { useState, useEffect, useCallback } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Select,
  DatePicker,
  Tooltip,
  Drawer,
  Descriptions,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SendOutlined,
  CalendarOutlined,
  SyncOutlined,
  EyeOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { reportsService, formatFileSize, downloadBlob, getFileExtension } from '../services/reports.service';
import type {
  Report,
  ReportType,
  ReportFormat,
  ReportStatus,
  ListReportsParams,
} from '../types/reports.types';
import {
  REPORT_TYPE_LABELS,
  REPORT_STATUS_CONFIG,
  REPORT_FORMAT_LABELS,
} from '../types/reports.types';
import { CreateReportWizard } from './reports/components/CreateReportWizard';
import { ScheduleReportModal } from './reports/components/ScheduleReportModal';
import { SendReportModal } from './reports/components/SendReportModal';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// Schedule frequency labels
const SCHEDULE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const Reports = () => {
  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Filters
  const [filterType, setFilterType] = useState<ReportType | undefined>(undefined);
  const [filterFormat, setFilterFormat] = useState<ReportFormat | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Modals/Drawers
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  // Polling for generating reports
  const [pollingActive, setPollingActive] = useState(false);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListReportsParams = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        type: filterType,
        format: filterFormat,
        status: filterStatus,
        startDate: dateRange?.[0]?.toISOString(),
        endDate: dateRange?.[1]?.toISOString(),
      };
      const response = await reportsService.getReports(params);
      setReports(response.data);
      setPagination(prev => ({ ...prev, total: response.total }));

      // Check if any reports are generating
      const hasGenerating = response.data.some(r => r.status === 'generating');
      setPollingActive(hasGenerating);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      message.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, filterType, filterFormat, filterStatus, dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Poll for generating reports
  useEffect(() => {
    if (!pollingActive) return;

    const interval = setInterval(() => {
      fetchReports();
    }, 5000);

    return () => clearInterval(interval);
  }, [pollingActive, fetchReports]);

  // Handlers
  const handleRefresh = async () => {
    await fetchReports();
    message.success('Data refreshed successfully');
  };

  const handleExport = () => {
    try {
      if (reports.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = reports.map((item) => ({
        Name: item.name,
        Description: item.description || '',
        Type: REPORT_TYPE_LABELS[item.type] || item.type,
        Format: item.format,
        Status: REPORT_STATUS_CONFIG[item.status]?.label || item.status,
        Schedule: item.schedule?.enabled ? SCHEDULE_LABELS[item.schedule.frequency] : 'None',
        'File Size': formatFileSize(item.fileSize),
        'Generated At': item.generatedAt ? dayjs(item.generatedAt).format('YYYY-MM-DD HH:mm') : 'N/A',
        'Created By': item.createdBy || 'System',
        'Created On': item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '',
      }));

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
          headers.map((header) => {
            const value = row[header as keyof typeof row] || '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `reports_${new Date().toISOString().split('T')[0]}.csv`);
      message.success('Reports exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const handleCreate = () => {
    setSelectedReport(null);
    setCreateModalOpen(true);
  };

  const handleView = (record: Report) => {
    setSelectedReport(record);
    setDetailsDrawerOpen(true);
  };

  const handleEdit = (record: Report) => {
    setSelectedReport(record);
    setEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await reportsService.deleteReport(id);
      setReports(reports.filter(item => item.id !== id));
      message.success('Report deleted successfully');
    } catch (error) {
      console.error('Failed to delete report:', error);
      message.error('Failed to delete report');
    }
  };

  const handleDownload = async (report: Report, format?: ReportFormat) => {
    if (report.status !== 'completed') {
      message.warning('Report is not ready for download');
      return;
    }
    try {
      const downloadFormat = format || report.format;
      const blob = await reportsService.downloadReport(report.id, downloadFormat);
      const extension = getFileExtension(downloadFormat);
      downloadBlob(blob, `${report.name}.${extension}`);
      message.success(`Downloaded ${report.name} as ${downloadFormat}`);
    } catch (error) {
      console.error('Failed to download report:', error);
      message.error(`Failed to download ${report.name}`);
    }
  };

  const handleSchedule = (record: Report) => {
    setSelectedReport(record);
    setScheduleModalOpen(true);
  };

  const handleSendNow = (record: Report) => {
    if (record.status !== 'completed') {
      message.warning('Report must be completed before sending');
      return;
    }
    setSelectedReport(record);
    setSendModalOpen(true);
  };

  const handleRegenerate = async (record: Report) => {
    try {
      await reportsService.regenerateReport(record.id);
      message.success('Report regeneration started');
      fetchReports();
    } catch (error) {
      console.error('Failed to regenerate report:', error);
      message.error('Failed to regenerate report');
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setFilterType(undefined);
    setFilterFormat(undefined);
    setFilterStatus(undefined);
    setDateRange(null);
  };

  // Table columns
  const columns: ColumnsType<Report> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: Report) => (
        <Text
          style={{ color: '#1890ff', cursor: 'pointer' }}
          onClick={() => handleView(record)}
        >
          {text}
        </Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {text || '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: ReportType) => (
        <Tag>{REPORT_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      align: 'center',
      render: (format: ReportFormat) => (
        <Tag color={format === 'PDF' ? 'red' : format === 'Excel' ? 'green' : 'blue'}>
          {REPORT_FORMAT_LABELS[format] || format}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ReportStatus) => {
        const config = REPORT_STATUS_CONFIG[status];
        return (
          <Tag
            color={config?.color || 'default'}
            icon={status === 'generating' ? <LoadingOutlined spin /> : undefined}
          >
            {config?.label || status}
          </Tag>
        );
      },
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 100,
      render: (_: unknown, record: Report) => {
        if (record.schedule?.enabled) {
          return <Tag color="purple">{SCHEDULE_LABELS[record.schedule.frequency]}</Tag>;
        }
        return <Text type="secondary">None</Text>;
      },
    },
    {
      title: 'File Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      align: 'right',
      sorter: (a, b) => (a.fileSize || 0) - (b.fileSize || 0),
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Generated At',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      width: 150,
      sorter: (a, b) => {
        if (!a.generatedAt) return 1;
        if (!b.generatedAt) return -1;
        return new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
      },
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 120,
      render: (text: string) => text || 'System',
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: Report) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              disabled={record.status !== 'completed'}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Tooltip title="Schedule">
            <Button
              type="text"
              size="small"
              icon={<CalendarOutlined />}
              disabled={record.schedule?.enabled}
              onClick={() => handleSchedule(record)}
            />
          </Tooltip>
          <Tooltip title="Send Now">
            <Button
              type="text"
              size="small"
              icon={<SendOutlined />}
              disabled={record.status !== 'completed'}
              onClick={() => handleSendNow(record)}
            />
          </Tooltip>
          <Tooltip title="Regenerate">
            <Button
              type="text"
              size="small"
              icon={<SyncOutlined />}
              disabled={record.status === 'generating'}
              onClick={() => handleRegenerate(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Report"
            description="Are you sure you want to delete this report?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Filters Row */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Input
          placeholder="Search by name, description, or creator..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Select
          placeholder="Type"
          style={{ width: 140 }}
          value={filterType}
          onChange={setFilterType}
          allowClear
          options={[
            { value: 'patch', label: 'Patch' },
            { value: 'asset', label: 'Asset' },
            { value: 'vulnerability', label: 'Vulnerability' },
            { value: 'compliance', label: 'Compliance' },
            { value: 'audit', label: 'Audit' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        <Select
          placeholder="Format"
          style={{ width: 120 }}
          value={filterFormat}
          onChange={setFilterFormat}
          allowClear
          options={[
            { value: 'PDF', label: 'PDF' },
            { value: 'CSV', label: 'CSV' },
            { value: 'Excel', label: 'Excel' },
          ]}
        />
        <Select
          placeholder="Status"
          style={{ width: 130 }}
          value={filterStatus}
          onChange={setFilterStatus}
          allowClear
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'generating', label: 'Generating' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
        <RangePicker
          style={{ width: 260 }}
          value={dateRange}
          onChange={(dates) => setDateRange(dates)}
        />
        <Button onClick={clearFilters}>Clear</Button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={handleCreate}>
            Create
          </Button>
        </div>
      </div>

      {/* Reports Table */}
      <Table
        columns={columns}
        dataSource={reports}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize }));
          },
        }}
        scroll={{ x: 1600 }}
      />

      {/* Report Details Drawer */}
      <Drawer
        title="Report Details"
        placement="right"
        width={500}
        open={detailsDrawerOpen}
        onClose={() => {
          setDetailsDrawerOpen(false);
          setSelectedReport(null);
        }}
        extra={
          <Space>
            {selectedReport?.status === 'completed' && (
              <>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => selectedReport && handleDownload(selectedReport)}
                >
                  Download
                </Button>
                <Button
                  icon={<SendOutlined />}
                  onClick={() => selectedReport && handleSendNow(selectedReport)}
                >
                  Send
                </Button>
              </>
            )}
            <Button
              icon={<SyncOutlined />}
              onClick={() => selectedReport && handleRegenerate(selectedReport)}
              disabled={selectedReport?.status === 'generating'}
            >
              Regenerate
            </Button>
          </Space>
        }
      >
        {selectedReport && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">{selectedReport.name}</Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedReport.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag>{REPORT_TYPE_LABELS[selectedReport.type]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Format">
              <Tag color={selectedReport.format === 'PDF' ? 'red' : 'green'}>
                {selectedReport.format}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag
                color={REPORT_STATUS_CONFIG[selectedReport.status]?.color}
                icon={selectedReport.status === 'generating' ? <LoadingOutlined spin /> : undefined}
              >
                {REPORT_STATUS_CONFIG[selectedReport.status]?.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Schedule">
              {selectedReport.schedule?.enabled ? (
                <Space direction="vertical" size="small">
                  <Tag color="purple">{SCHEDULE_LABELS[selectedReport.schedule.frequency]}</Tag>
                  {selectedReport.schedule.time && <Text>Time: {selectedReport.schedule.time}</Text>}
                  {selectedReport.schedule.recipients?.length > 0 && (
                    <Text>Recipients: {selectedReport.schedule.recipients.join(', ')}</Text>
                  )}
                </Space>
              ) : (
                <Text type="secondary">Not scheduled</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="File Size">
              {formatFileSize(selectedReport.fileSize)}
            </Descriptions.Item>
            <Descriptions.Item label="Generated At">
              {selectedReport.generatedAt
                ? dayjs(selectedReport.generatedAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              {selectedReport.createdBy || 'System'}
            </Descriptions.Item>
            <Descriptions.Item label="Created On">
              {dayjs(selectedReport.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {selectedReport.status === 'failed' && selectedReport.errorMessage && (
              <Descriptions.Item label="Error">
                <Text type="danger">{selectedReport.errorMessage}</Text>
              </Descriptions.Item>
            )}
            {selectedReport.columns && selectedReport.columns.length > 0 && (
              <Descriptions.Item label="Columns">
                <Space wrap>
                  {selectedReport.columns.map(col => (
                    <Tag key={col}>{col}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* Create Report Wizard */}
      <CreateReportWizard
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          fetchReports();
        }}
        mode="create"
      />

      {/* Edit Report Wizard */}
      <CreateReportWizard
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedReport(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedReport(null);
          fetchReports();
        }}
        mode="edit"
        report={selectedReport}
      />

      {/* Schedule Report Modal */}
      <ScheduleReportModal
        open={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedReport(null);
        }}
        onSuccess={() => {
          setScheduleModalOpen(false);
          setSelectedReport(null);
          fetchReports();
        }}
        report={selectedReport}
      />

      {/* Send Report Modal */}
      <SendReportModal
        open={sendModalOpen}
        onClose={() => {
          setSendModalOpen(false);
          setSelectedReport(null);
        }}
        onSuccess={() => {
          setSendModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
      />
    </div>
  );
};
