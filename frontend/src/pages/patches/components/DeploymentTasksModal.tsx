import { SearchOutlined, CloseOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons';
import { App, Button, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import { OSIcon } from '../../../components/patches';
import { DataTable } from '../../../components/shared/DataTable';

const { Title, Text } = Typography;
const { Option } = Select;

type DeploymentTask = {
  id: number;
  endpoint: { name: string; os: 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux'; status: string };
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  createdBy: string;
  lastUpdated: string;
  createdOn: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS': return 'success';
    case 'FAILED': return 'error';
    case 'PENDING': return 'warning';
    case 'IN_PROGRESS': return 'processing';
    default: return 'default';
  }
};

interface DeploymentTasksModalProps {
  open: boolean;
  tasks: DeploymentTask[];
  loading: boolean;
  searchText: string;
  filter: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export const DeploymentTasksModal = ({
  open, tasks, loading, searchText, filter,
  onSearchChange, onFilterChange, onRefresh, onClose,
}: DeploymentTasksModalProps) => {
  const { message } = App.useApp();

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.id.toString().includes(searchText.toLowerCase()) ||
      task.name.toLowerCase().includes(searchText.toLowerCase()) ||
      task.endpoint.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter = filter === 'All' || task.status === filter.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    const dataToExport = filteredTasks.length > 0 ? filteredTasks : tasks;
    if (dataToExport.length === 0) { message.warning('No data to export'); return; }
    const exportData = dataToExport.map((item) => ({
      Id: item.id, Endpoint: item.endpoint.name, Name: item.name, Status: item.status,
      'Created By': item.createdBy, 'Last Updated': item.lastUpdated, 'Created On': item.createdOn,
    }));
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row] || '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) return `"${value.replace(/"/g, '""')}"`;
          return value;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `deployment_tasks_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Tasks exported successfully');
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} style={{ padding: 0, marginRight: 8 }} />
          <Title level={4} style={{ margin: 0 }}>Tasks.</Title>
        </div>
      }
      open={open} onCancel={onClose} width={1200} footer={null} closeIcon={null}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchText}
          onChange={(e) => onSearchChange(e.target.value)} style={{ width: 300 }} />
        <Space>
          <Select value={filter} onChange={onFilterChange} style={{ width: 120 }}>
            <Option value="All">All</Option>
            <Option value="SUCCESS">Success</Option>
            <Option value="FAILED">Failed</Option>
            <Option value="PENDING">Pending</Option>
            <Option value="IN_PROGRESS">In Progress</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>Refresh</Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>Export</Button>
        </Space>
      </div>
      <DataTable<DeploymentTask>
        data={filteredTasks} rowKey="id" loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
        columns={[
          { title: 'Id', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
          { title: 'Endpoint', dataIndex: 'endpoint', key: 'endpoint',
            sorter: (a, b) => a.endpoint.name.localeCompare(b.endpoint.name),
            render: (endpoint: DeploymentTask['endpoint']) => <Space><OSIcon os={endpoint.os} /><Text>{endpoint.name}</Text></Space> },
          { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
            render: (name: string) => (
              <Space>
                <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#1890ff', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                  {name.charAt(0).toUpperCase()}
                </span>
                <Text>{name}</Text>
              </Space>) },
          { title: 'Status', dataIndex: 'status', key: 'status', sorter: (a, b) => a.status.localeCompare(b.status),
            render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag> },
          { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', sorter: (a, b) => a.createdBy.localeCompare(b.createdBy) },
          { title: 'Last Updated', dataIndex: 'lastUpdated', key: 'lastUpdated',
            sorter: (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime(),
            render: (text: string) => <div><div>{text.split(', ')[0]}</div><div style={{ fontSize: 16, color: '#8c8c8c' }}>{text.split(', ')[1]}</div></div> },
          { title: 'Created On', dataIndex: 'createdOn', key: 'createdOn',
            sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
            render: (text: string) => <div><div>{text.split(', ')[0]}</div><div style={{ fontSize: 16, color: '#8c8c8c' }}>{text.split(', ')[1]}</div></div> },
        ]}
        scroll={{ x: 'max-content' }}
      />
    </Modal>
  );
};

export type { DeploymentTask };
