import { useState } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Dropdown,
  Popconfirm,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

type PolicyItem = {
  id: string;
  policyId: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  createdBy: string;
  createdOn: string;
};

const mockPolicies: PolicyItem[] = [
  {
    id: '1',
    policyId: 'POLICY-2',
    name: 'Scheduled Patch Deployment',
    description: 'Scheduled Patch Deployment policy for automated updates',
    type: 'SCHEDULE',
    createdBy: 'Admin',
    createdOn: '2026/01/12 12:14:27 PM',
  },
  {
    id: '2',
    policyId: 'POLICY-1',
    name: 'OOB Instant deployment policy',
    description: '',
    type: 'INSTANT',
    createdBy: 'Admin',
    createdOn: '2025/11/27 10:15:32 PM',
  },
];

export const PatchJobs = () => {
  const [searchText, setSearchText] = useState('');
  const [policies, setPolicies] = useState<PolicyItem[]>(mockPolicies);
  const [loading, setLoading] = useState(false);

  const handleDelete = (id: string) => {
    setPolicies(policies.filter(item => item.id !== id));
    message.success('Policy deleted successfully');
  };

  const handleEdit = (record: PolicyItem) => {
    message.info(`Editing policy: ${record.name}`);
    // In real implementation, open edit modal
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
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
      const dataToExport = filteredItems.length > 0 ? filteredItems : policies;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        ID: item.policyId,
        Name: item.name,
        Description: item.description,
        Type: item.type,
        'Created By': item.createdBy,
        'Created On': item.createdOn,
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
      link.setAttribute('download', `patch_jobs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Patch jobs exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const filterMenuItems: MenuProps['items'] = [
    { key: '1', label: 'Filter Option 1' },
    { key: '2', label: 'Filter Option 2' },
  ];

  const columns: ColumnsType<PolicyItem> = [
    {
      title: 'ID',
      dataIndex: 'policyId',
      key: 'policyId',
      sorter: (a, b) => a.policyId.localeCompare(b.policyId),
      render: (text: string) => (
        <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
      ),
    },
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
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      sorter: (a, b) => a.type.localeCompare(b.type),
      render: (type: string) => (
        <Tag color="cyan" style={{ margin: 0 }}>{type}</Tag>
      ),
      filters: [
        { text: 'SCHEDULE', value: 'SCHEDULE' },
        { text: 'INSTANT', value: 'INSTANT' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
      render: (text: string, record: PolicyItem) => (
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text>{text}</Text>
          <Space>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#1890ff' }}
            />
            <Popconfirm
              title="Delete policy"
              description="Are you sure you want to delete this policy?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </Space>
      ),
    },
  ];

  const filteredItems = policies.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.policyId.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

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
          <Button type="primary" icon={<PlusOutlined />} htmlType="button">
            Create
          </Button>
          <Dropdown menu={{ items: filterMenuItems }} trigger={['click']}>
            <Button icon={<FilterOutlined />} />
          </Dropdown>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredItems}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `showing ${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};
