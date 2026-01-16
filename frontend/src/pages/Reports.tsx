import { useState } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

type ReportItem = {
  id: string;
  name: string;
  description: string;
  downloadFormats: ('PDF' | 'XLS')[];
  createdBy: string;
  createdOn?: string;
};

const mockReports: ReportItem[] = [
  {
    id: '1',
    name: 'Endpoint Summary Report',
    description: 'This is system generated report on th...',
    downloadFormats: ['PDF'],
    createdBy: 'Admin',
  },
  {
    id: '2',
    name: 'Vulnerability Report',
    description: 'Vulnerability Report',
    downloadFormats: ['PDF', 'XLS'],
    createdBy: 'Admin',
  },
  {
    id: '3',
    name: 'Patch Compliance Report',
    description: 'This report is design to provide inform...',
    downloadFormats: ['PDF'],
    createdBy: 'Admin',
  },
  {
    id: '4',
    name: 'Hardware Inventory Report',
    description: 'The report provides the information on...',
    downloadFormats: ['PDF', 'XLS'],
    createdBy: 'Admin',
  },
];

export const Reports = () => {
  const [searchText, setSearchText] = useState('');
  const [reports, setReports] = useState<ReportItem[]>(mockReports);
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Data refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = filteredItems.length > 0 ? filteredItems : reports;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        Name: item.name,
        Description: item.description,
        'Download Formats': item.downloadFormats.join(', '),
        'Created By': item.createdBy,
        'Created On': item.createdOn || '',
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
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Reports exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const handleCreate = () => {
    message.info('Create report functionality');
  };

  const handleEdit = (record: ReportItem) => {
    message.info(`Editing report: ${record.name}`);
  };

  const handleDelete = (id: string) => {
    setReports(reports.filter(item => item.id !== id));
    message.success('Report deleted successfully');
  };

  const handleDownload = (format: 'PDF' | 'XLS', report: ReportItem) => {
    message.info(`Downloading ${report.name} as ${format}`);
  };

  const columns: ColumnsType<ReportItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {text}
        </Text>
      ),
      sorter: (a, b) => a.description.localeCompare(b.description),
    },
    {
      title: 'Download',
      dataIndex: 'downloadFormats',
      key: 'download',
      align: 'center',
      render: (formats: ('PDF' | 'XLS')[], record: ReportItem) => (
        <Space>
          {formats.includes('PDF') && (
            <Tag
              icon={<FileTextOutlined />}
              color="red"
              style={{ cursor: 'pointer', margin: 0 }}
              onClick={() => handleDownload('PDF', record)}
            >
              PDF
            </Tag>
          )}
          {formats.includes('XLS') && (
            <Tag
              color="green"
              style={{ cursor: 'pointer', margin: 0 }}
              onClick={() => handleDownload('XLS', record)}
            >
              XLS
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
    },
    {
      title: 'Created On',
      key: 'createdOn',
      render: (_: any, record: ReportItem) => (
        <Space size="middle">
          <Text>{record.createdOn || ''}</Text>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ color: '#1890ff' }}
          />
          <Popconfirm
            title="Delete Report"
            description="Are you sure you want to delete this report?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredItems = reports.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

  const filterMenuItems: MenuProps['items'] = [
    { key: '1', label: 'Filter Option 1' },
    { key: '2', label: 'Filter Option 2' },
  ];

  return (
    <div>
      {/* Top Controls */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={handleCreate}>
            Create
          </Button>
          <Dropdown menu={{ items: filterMenuItems }} trigger={['click']}>
            <Button icon={<FilterOutlined />} />
          </Dropdown>
        </Space>
      </div>

      {/* Reports Table */}
      <Table
        columns={columns}
        dataSource={filteredItems}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
          showTotal: (total, range) =>
            `showing ${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};
