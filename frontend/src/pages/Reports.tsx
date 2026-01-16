import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  Select,
  message,
  Tooltip,
  Space,
  Drawer,
  Checkbox,
  Descriptions,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { reportsService } from '../services/reports.service';
import type { Report } from '../types/reports.types';

const { Option } = Select;

const REPORT_TYPES = [
  { value: 'endpoint', label: 'Endpoint' },
  { value: 'vulnerability', label: 'Vulnerability' },
  { value: 'patch', label: 'Patch' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'asset', label: 'Asset' },
  { value: 'hardware', label: 'Hardware' },
];

export const Reports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>('');

  // Forms
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportsService.getReports();
      setReports(data);
    } catch (error) {
      message.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  // Download handlers
  const handleDownload = async (report: Report, format: 'pdf' | 'excel') => {
    try {
      message.loading({ content: `Downloading ${report.name}...`, key: 'download' });
      const blob = await reportsService.downloadReport(report.id, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.name.replace(/\s+/g, '_')}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success({ content: `Downloaded ${report.name} successfully`, key: 'download' });
    } catch (error) {
      message.error({ content: 'Failed to download report', key: 'download' });
    }
  };

  // View handler
  const handleView = (report: Report) => {
    setSelectedReport(report);
    setViewModalVisible(true);
  };

  // Edit handlers
  const handleEdit = (report: Report) => {
    setSelectedReport(report);
    editForm.setFieldsValue({
      name: report.name,
      type: report.type,
      description: report.description,
      downloadFormats: report.downloadFormats,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!selectedReport) return;

      await reportsService.updateReport(selectedReport.id, values);
      message.success('Report updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      message.error('Failed to update report');
    }
  };

  // Delete handler
  const handleDelete = (report: Report) => {
    Modal.confirm({
      title: 'Delete Report',
      content: `Are you sure you want to delete "${report.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await reportsService.deleteReport(report.id);
          message.success(`Report "${report.name}" deleted successfully`);
          fetchReports();
        } catch (error) {
          message.error('Failed to delete report');
        }
      },
    });
  };

  // Create handler - navigate to create page
  const handleCreate = () => {
    navigate('/reports/create');
  };

  // Export handler
  const handleExport = () => {
    const csvContent = [
      ['Name', 'Type', 'Description', 'Created By', 'Created Date', 'Download Formats'],
      ...filteredReports.map((report) => [
        report.name,
        report.type,
        report.description,
        report.createdBy,
        report.createdDate || '',
        report.downloadFormats?.join(', ') || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    message.success('Reports exported successfully');
  };

  // Filter handlers
  const handleApplyFilters = () => {
    setFilterDrawerVisible(false);
  };

  const handleResetFilters = () => {
    setFilterType([]);
    setFilterCreatedBy('');
  };

  // Get unique creators for filter
  const uniqueCreators = Array.from(new Set(reports.map(r => r.createdBy)));

  // Filter reports
  const filteredReports = reports.filter((report) => {
    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchesSearch =
        report.name.toLowerCase().includes(searchLower) ||
        report.description.toLowerCase().includes(searchLower) ||
        report.createdBy.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType.length > 0 && !filterType.includes(report.type)) {
      return false;
    }

    // Created by filter
    if (filterCreatedBy && report.createdBy !== filterCreatedBy) {
      return false;
    }

    return true;
  });

  const columns: ColumnsType<Report> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Report, b: Report) => a.name.localeCompare(b.name),
      render: (text: string, record: Report) => (
        <a onClick={() => handleView(record)}>{text}</a>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a: Report, b: Report) => a.description.localeCompare(b.description),
      ellipsis: true,
    },
    {
      title: 'Download',
      key: 'download',
      width: 120,
      render: (_, record) => (
        <Space size={8}>
          {record.downloadFormats?.includes('pdf') && (
            <Tooltip title="Download PDF">
              <FilePdfOutlined
                style={{ fontSize: 18, color: '#e74c3c', cursor: 'pointer' }}
                onClick={() => handleDownload(record, 'pdf')}
              />
            </Tooltip>
          )}
          {record.downloadFormats?.includes('excel') && (
            <Tooltip title="Download Excel">
              <FileExcelOutlined
                style={{ fontSize: 18, color: '#27ae60', cursor: 'pointer' }}
                onClick={() => handleDownload(record, 'excel')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 140,
      sorter: (a: Report, b: Report) => a.createdBy.localeCompare(b.createdBy),
    },
    {
      title: 'Created On',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 140,
      sorter: (a: Report, b: Report) => {
        const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
        const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Report form content for edit modal
  const renderReportForm = (form: typeof editForm) => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="name"
        label="Report Name"
        rules={[{ required: true, message: 'Please enter a report name' }]}
      >
        <Input placeholder="Enter report name" />
      </Form.Item>

      <Form.Item
        name="type"
        label="Report Type"
        rules={[{ required: true, message: 'Please select a report type' }]}
      >
        <Select placeholder="Select report type">
          {REPORT_TYPES.map(type => (
            <Option key={type.value} value={type.value}>
              {type.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
        rules={[{ required: true, message: 'Please enter a description' }]}
      >
        <Input.TextArea rows={3} placeholder="Enter report description" />
      </Form.Item>

      <Form.Item
        name="downloadFormats"
        label="Download Formats"
        rules={[{ required: true, message: 'Please select at least one format' }]}
      >
        <Checkbox.Group>
          <Checkbox value="pdf">PDF</Checkbox>
          <Checkbox value="excel">Excel</Checkbox>
        </Checkbox.Group>
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Action Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ maxWidth: '200px' }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchReports}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button type="primary" onClick={handleCreate}>
            Create
          </Button>
          <Tooltip title="Filter">
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilterDrawerVisible(true)}
              type={(filterType.length > 0 || filterCreatedBy) ? 'primary' : 'default'}
            />
          </Tooltip>
        </div>
      </div>

      {/* Active filters indicator */}
      {(filterType.length > 0 || filterCreatedBy) && (
        <div style={{ marginBottom: 16 }}>
          <Space size={8}>
            <span>Active filters:</span>
            {filterType.map(type => (
              <Tag key={type} closable onClose={() => setFilterType(prev => prev.filter(t => t !== type))}>
                Type: {REPORT_TYPES.find(t => t.value === type)?.label}
              </Tag>
            ))}
            {filterCreatedBy && (
              <Tag closable onClose={() => setFilterCreatedBy('')}>
                Created By: {filterCreatedBy}
              </Tag>
            )}
            <Button type="link" size="small" onClick={handleResetFilters}>
              Clear all
            </Button>
          </Space>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredReports}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          total: filteredReports.length,
          showSizeChanger: true,
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={(newPagination) => setPagination(newPagination as TablePaginationConfig)}
        style={{ background: '#fff' }}
        locale={{
          emptyText: 'No reports found',
        }}
      />

      {/* Edit Modal */}
      <Modal
        title="Edit Report"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedReport(null);
        }}
        onOk={handleEditSubmit}
        okText="Save"
        width={500}
      >
        {renderReportForm(editForm)}
      </Modal>

      {/* View Modal */}
      <Modal
        title="Report Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedReport(null);
        }}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setViewModalVisible(false);
              if (selectedReport) {
                handleEdit(selectedReport);
              }
            }}
          >
            Edit
          </Button>,
        ]}
        width={600}
      >
        {selectedReport && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Name">{selectedReport.name}</Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">
                {REPORT_TYPES.find(t => t.value === selectedReport.type)?.label || selectedReport.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Description">{selectedReport.description}</Descriptions.Item>
            <Descriptions.Item label="Created By">{selectedReport.createdBy}</Descriptions.Item>
            <Descriptions.Item label="Created Date">{selectedReport.createdDate}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedReport.status === 'completed' ? 'green' : 'orange'}>
                {selectedReport.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Download Formats">
              <Space>
                {selectedReport.downloadFormats?.map(format => (
                  <Button
                    key={format}
                    type="link"
                    icon={format === 'pdf' ? <FilePdfOutlined style={{ color: '#e74c3c' }} /> : <FileExcelOutlined style={{ color: '#27ae60' }} />}
                    onClick={() => handleDownload(selectedReport, format)}
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Filter Drawer */}
      <Drawer
        title="Filter Reports"
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={320}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={handleResetFilters}>Reset</Button>
            <Button type="primary" onClick={handleApplyFilters}>
              Apply
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Report Type
            </label>
            <Checkbox.Group
              value={filterType}
              onChange={(values) => setFilterType(values as string[])}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {REPORT_TYPES.map(type => (
                <Checkbox key={type.value} value={type.value}>
                  {type.label}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Created By
            </label>
            <Select
              placeholder="Select creator"
              value={filterCreatedBy || undefined}
              onChange={setFilterCreatedBy}
              allowClear
              style={{ width: '100%' }}
            >
              {uniqueCreators.map(creator => (
                <Option key={creator} value={creator}>
                  {creator}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
