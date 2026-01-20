import { useState } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Dropdown,
  Modal,
  Form,
  Select,
  Checkbox,
  Row,
  Col,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExportOutlined,
  EyeOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  RightOutlined,
  LeftOutlined,
  DesktopOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type DeployedItem = {
  id: string;
  deploymentId: string;
  name: string;
  type: 'INSTALL' | 'UNINSTALL' | 'UPGRADE';
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: { current: number; total: number };
  succeeded: { current: number; total: number };
  failed: { current: number; total: number };
  createdBy: string;
  createdOn: string;
};

type ApplicationItem = {
  key: string;
  deploymentId: string;
  title: string;
  os: string[];
  architecture: string;
};

type BundleItem = {
  key: string;
  bundleId: string;
  name: string;
  os: string[];
};

type TaskItem = {
  id: number;
  endpointId: string;
  endpointName: string;
  endpointOS: 'Windows' | 'Mac' | 'Linux';
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  createdBy: string;
  lastUpdated: string;
  createdOn: string;
};

const mockDeployedItems: DeployedItem[] = [
  {
    id: '1',
    deploymentId: 'ADR-007',
    name: 'Test3',
    type: 'INSTALL',
    stage: 'COMPLETED',
    pending: { current: 0, total: 1 },
    succeeded: { current: 1, total: 1 },
    failed: { current: 0, total: 1 },
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/02 11:13:44 AM',
  },
  {
    id: '2',
    deploymentId: 'ADR-006',
    name: 'Test2',
    type: 'INSTALL',
    stage: 'COMPLETED',
    pending: { current: 0, total: 1 },
    succeeded: { current: 1, total: 1 },
    failed: { current: 0, total: 1 },
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/02 11:11:07 AM',
  },
  {
    id: '3',
    deploymentId: 'ADR-005',
    name: 'TEST1',
    type: 'INSTALL',
    stage: 'COMPLETED',
    pending: { current: 0, total: 1 },
    succeeded: { current: 1, total: 1 },
    failed: { current: 0, total: 1 },
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/01 12:00:31 PM',
  },
  {
    id: '4',
    deploymentId: 'ADR-004',
    name: 'TEST',
    type: 'INSTALL',
    stage: 'COMPLETED',
    pending: { current: 0, total: 1 },
    succeeded: { current: 0, total: 1 },
    failed: { current: 1, total: 1 },
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/01 11:56:33 AM',
  },
  {
    id: '5',
    deploymentId: 'ADR-003',
    name: 'TEST',
    type: 'INSTALL',
    stage: 'COMPLETED',
    pending: { current: 0, total: 1 },
    succeeded: { current: 0, total: 1 },
    failed: { current: 1, total: 1 },
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/01 11:54:12 AM',
  },
];

// Mock applications - these would come from the catalog
const mockApplications: ApplicationItem[] = [
  { key: '1', deploymentId: 'SWP-017', title: 'TightVNC', os: ['Windows'], architecture: 'x64' },
  { key: '2', deploymentId: 'SWP-016', title: 'Google Chrome', os: ['Linux'], architecture: 'x64' },
  { key: '3', deploymentId: 'SWP-015', title: 'TEST', os: ['Windows'], architecture: 'x64' },
  { key: '4', deploymentId: 'SWP-014', title: 'Zoom desktop client', os: ['Windows'], architecture: 'x64' },
  { key: '5', deploymentId: 'SWP-013', title: 'WinRAR', os: ['Windows'], architecture: 'x64' },
  { key: '6', deploymentId: 'SWP-012', title: 'VLC For Mac', os: ['Mac'], architecture: 'x64' },
  { key: '7', deploymentId: 'SWP-011', title: 'VLC', os: ['Windows'], architecture: 'x64' },
  { key: '8', deploymentId: 'SWP-010', title: 'Slack Windows', os: ['Windows'], architecture: 'x64' },
  { key: '9', deploymentId: 'SWP-009', title: 'O365 Mac', os: ['Mac'], architecture: 'x64' },
  { key: '10', deploymentId: 'SWP-008', title: 'O365 Windows', os: ['Windows'], architecture: 'x64' },
  { key: '11', deploymentId: 'SWP-007', title: 'Notepad++', os: ['Windows'], architecture: 'x64' },
  { key: '12', deploymentId: 'SWP-006', title: 'Microsoft Teams', os: ['Windows'], architecture: 'x64' },
  { key: '13', deploymentId: 'SWP-005', title: 'Firefox', os: ['Windows'], architecture: 'x64' },
  { key: '14', deploymentId: 'SWP-004', title: 'Adobe Reader', os: ['Windows'], architecture: 'x64' },
  { key: '15', deploymentId: 'SWP-003', title: '7-Zip', os: ['Windows'], architecture: 'x64' },
  { key: '16', deploymentId: 'SWP-002', title: 'Visual Studio Code', os: ['Windows', 'Mac'], architecture: 'x64' },
  { key: '17', deploymentId: 'SWP-001', title: 'Docker Desktop', os: ['Windows', 'Mac'], architecture: 'x64' },
];

// Mock bundles - these would come from the bundle page
const mockBundles: BundleItem[] = [
  { key: 'b1', bundleId: 'BND-001', name: 'HR Team Bundle', os: ['Windows'] },
  { key: 'b2', bundleId: 'BND-002', name: 'Development Tools', os: ['Windows', 'Mac'] },
  { key: 'b3', bundleId: 'BND-003', name: 'Productivity Suite', os: ['Windows', 'Mac', 'Linux'] },
  { key: 'b4', bundleId: 'BND-004', name: 'Design Tools', os: ['Mac'] },
  { key: 'b5', bundleId: 'BND-005', name: 'Communication Tools', os: ['Windows', 'Mac'] },
];

// Mock tasks for deployments - these would come from API
const getMockTasksForDeployment = (_deploymentId: string): TaskItem[] => {
  return [
    {
      id: 62,
      endpointId: 'EP-001',
      endpointName: 'K TightVNC',
      endpointOS: 'Windows',
      name: 'TightVNC Installation',
      status: 'SUCCESS',
      createdBy: 'Abhijeet Tiwari',
      lastUpdated: '2025/12/02 11:13:56 AM',
      createdOn: '2025/12/02 11:13:44 AM',
    },
    // Add more mock tasks as needed
  ];
};

export const SoftwareJobsDeployed = () => {
  const [searchText, setSearchText] = useState('');
  const [deployedItems, setDeployedItems] = useState<DeployedItem[]>(mockDeployedItems);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [deploymentType, setDeploymentType] = useState<'install' | 'uninstall' | 'upgrade'>('install');
  const [selectionType, setSelectionType] = useState<'application' | 'bundle'>('application');
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [selectedAvailableKeys, setSelectedAvailableKeys] = useState<string[]>([]);
  const [selectedSelectedKeys, setSelectedSelectedKeys] = useState<string[]>([]);
  const [tasksModalVisible, setTasksModalVisible] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<DeployedItem | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksSearchText, setTasksSearchText] = useState('');
  const [tasksFilter, setTasksFilter] = useState('All');

  const handleView = (record: DeployedItem) => {
    setSelectedDeployment(record);
    // Fetch tasks for this deployment
    const deploymentTasks = getMockTasksForDeployment(record.deploymentId);
    setTasks(deploymentTasks);
    setTasksModalVisible(true);
    setTasksSearchText('');
    setTasksFilter('All');
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, fetch data from API
      message.success('Data refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = filteredItems.length > 0 ? filteredItems : deployedItems;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        ID: item.deploymentId,
        Name: item.name,
        Type: item.type,
        Stage: item.stage,
        Pending: `${item.pending.current}/${item.pending.total}`,
        Succeeded: `${item.succeeded.current}/${item.succeeded.total}`,
        Failed: `${item.failed.current}/${item.failed.total}`,
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
      link.setAttribute('download', `deployed_jobs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Deployed jobs exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const handleCreate = () => {
    setCreateModalVisible(true);
    form.resetFields();
    setSelectedApplications([]);
    setSelectedAvailableKeys([]);
    setSelectedSelectedKeys([]);
    setAvailableSearch('');
    setSelectedSearch('');
    setDeploymentType('install');
    setSelectionType('application');
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      // Create new deployment
      const newDeployment: DeployedItem = {
        id: Date.now().toString(),
        deploymentId: `ADR-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        name: values.deploymentName,
        type: deploymentType.toUpperCase() as 'INSTALL' | 'UNINSTALL' | 'UPGRADE',
        stage: 'IN_PROGRESS',
        pending: { current: selectedApplications.length, total: selectedApplications.length },
        succeeded: { current: 0, total: selectedApplications.length },
        failed: { current: 0, total: selectedApplications.length },
        createdBy: 'Current User', // In real app, get from auth context
        createdOn: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).replace(',', ''),
      };

      setDeployedItems([newDeployment, ...deployedItems]);
      setCreateModalVisible(false);
      form.resetFields();
      setSelectedApplications([]);
      message.success('Deployment created successfully');
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    setCreateModalVisible(false);
    form.resetFields();
    setSelectedApplications([]);
    setSelectedAvailableKeys([]);
    setSelectedSelectedKeys([]);
    setAvailableSearch('');
    setSelectedSearch('');
  };

  const endpointsMenuItems: MenuProps['items'] = [
    { key: '1', label: 'All Endpoints' },
    { key: '2', label: 'Windows Endpoints' },
    { key: '3', label: 'Mac Endpoints' },
    { key: '4', label: 'Linux Endpoints' },
  ];

  const renderStatusCell = (
    current: number,
    total: number,
    backgroundColor: string
  ) => {
    return (
      <div
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          backgroundColor,
          textAlign: 'center',
          minWidth: 50,
        }}
      >
        {current}/{total}
      </div>
    );
  };

  // Get available and selected items (applications or bundles)
  const currentItems = selectionType === 'application' 
    ? mockApplications 
    : mockBundles;
  
  const availableItems = currentItems.filter(item => !selectedApplications.includes(item.key));
  const selectedItems = currentItems.filter(item => selectedApplications.includes(item.key));

  // Filter by search
  const filteredAvailableItems = availableItems.filter(item => {
    const searchLower = availableSearch.toLowerCase();
    if (selectionType === 'application') {
      const app = item as ApplicationItem;
      return app.title.toLowerCase().includes(searchLower) ||
             app.deploymentId.toLowerCase().includes(searchLower);
    } else {
      const bundle = item as BundleItem;
      return bundle.name.toLowerCase().includes(searchLower) ||
             bundle.bundleId.toLowerCase().includes(searchLower);
    }
  });

  const filteredSelectedItems = selectedItems.filter(item => {
    const searchLower = selectedSearch.toLowerCase();
    if (selectionType === 'application') {
      const app = item as ApplicationItem;
      return app.title.toLowerCase().includes(searchLower) ||
             app.deploymentId.toLowerCase().includes(searchLower);
    } else {
      const bundle = item as BundleItem;
      return bundle.name.toLowerCase().includes(searchLower) ||
             bundle.bundleId.toLowerCase().includes(searchLower);
    }
  });

  // Render Transfer list
  const renderTransferList = (direction: 'left' | 'right') => {
    const isLeft = direction === 'left';
    const items = isLeft ? filteredAvailableItems : filteredSelectedItems;
    const searchValue = isLeft ? availableSearch : selectedSearch;
    const setSearch = isLeft ? setAvailableSearch : setSelectedSearch;
    const selectedKeys = isLeft ? selectedAvailableKeys : selectedSelectedKeys;
    const setSelectedKeys = isLeft ? setSelectedAvailableKeys : setSelectedSelectedKeys;

    const handleItemSelect = (key: string) => {
      if (selectedKeys.includes(key)) {
        setSelectedKeys(selectedKeys.filter(k => k !== key));
      } else {
        setSelectedKeys([...selectedKeys, key]);
      }
    };

    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        setSelectedKeys(items.map(item => item.key));
      } else {
        setSelectedKeys([]);
      }
    };

    return (
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 8, height: 400, display: 'flex', flexDirection: 'column' }}>
        {/* Header with checkbox and count */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: 8, flexShrink: 0 }}>
          <Checkbox
            indeterminate={selectedKeys.length > 0 && selectedKeys.length < items.length}
            checked={items.length > 0 && selectedKeys.length === items.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            <Text strong style={{ marginLeft: 8 }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Text>
          </Checkbox>
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 12px 8px 12px', flexShrink: 0 }}>
          <Input
            placeholder="Search here"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div>No data</div>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedKeys.includes(item.key);
              const getOSIcon = () => {
                if (item.os.includes('Windows')) return <WindowsOutlined style={{ color: '#1890ff' }} />;
                if (item.os.includes('Mac')) return <AppleOutlined />;
                if (item.os.includes('Linux')) return <LinuxOutlined />;
                return null;
              };

              if (selectionType === 'application') {
                const app = item as ApplicationItem;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleItemSelect(item.key)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Checkbox checked={isSelected} />
                    {getOSIcon()}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {app.deploymentId}: {app.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>({app.architecture})</div>
                    </div>
                  </div>
                );
              } else {
                const bundle = item as BundleItem;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleItemSelect(item.key)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Checkbox checked={isSelected} />
                    {getOSIcon()}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {bundle.bundleId}: {bundle.name}
                      </div>
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>
      </div>
    );
  };

  const columns: ColumnsType<DeployedItem> = [
    {
      title: 'ID',
      dataIndex: 'deploymentId',
      key: 'deploymentId',
      sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="green" style={{ margin: 0 }}>{type}</Tag>
      ),
      filters: [
        { text: 'INSTALL', value: 'INSTALL' },
        { text: 'UNINSTALL', value: 'UNINSTALL' },
        { text: 'UPGRADE', value: 'UPGRADE' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: string) => {
        const colors: Record<string, string> = {
          COMPLETED: 'green',
          IN_PROGRESS: 'orange',
          INSTALLED: 'blue',
          FAILED: 'red',
        };
        return <Tag color={colors[stage] || 'default'}>{stage}</Tag>;
      },
      filters: [
        { text: 'COMPLETED', value: 'COMPLETED' },
        { text: 'IN_PROGRESS', value: 'IN_PROGRESS' },
        { text: 'INSTALLED', value: 'INSTALLED' },
        { text: 'FAILED', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.stage === value,
    },
    {
      title: 'Pending',
      dataIndex: 'pending',
      key: 'pending',
      align: 'center',
      render: (pending: { current: number; total: number }) =>
        renderStatusCell(pending.current, pending.total, '#fff7e6'),
    },
    {
      title: 'Succeeded',
      dataIndex: 'succeeded',
      key: 'succeeded',
      align: 'center',
      render: (succeeded: { current: number; total: number }) =>
        renderStatusCell(succeeded.current, succeeded.total, '#f6ffed'),
    },
    {
      title: 'Failed',
      dataIndex: 'failed',
      key: 'failed',
      align: 'center',
      render: (failed: { current: number; total: number }) =>
        renderStatusCell(failed.current, failed.total, '#fff1f0'),
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
      render: (text: string, record: DeployedItem) => (
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text>{text}</Text>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleView(record);
            }}
          />
        </Space>
      ),
    },
  ];

  const filteredItems = deployedItems.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.deploymentId.toLowerCase().includes(searchText.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.endpointName.toLowerCase().includes(tasksSearchText.toLowerCase()) ||
      task.name.toLowerCase().includes(tasksSearchText.toLowerCase()) ||
      task.id.toString().includes(tasksSearchText);
    
    const matchesFilter = tasksFilter === 'All' || task.status === tasksFilter.toUpperCase();
    
    return matchesSearch && matchesFilter;
  });

  // Task table columns
  const taskColumns: ColumnsType<TaskItem> = [
    {
      title: 'Id',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Endpoint',
      key: 'endpoint',
      render: (_: any, record: TaskItem) => (
        <Space>
          <DesktopOutlined style={{ color: '#ff4d4f' }} />
          {record.endpointOS === 'Windows' && <WindowsOutlined style={{ color: '#1890ff' }} />}
          {record.endpointOS === 'Mac' && <AppleOutlined />}
          {record.endpointOS === 'Linux' && <LinuxOutlined />}
          <Text>{record.endpointName}</Text>
        </Space>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          SUCCESS: 'green',
          FAILED: 'red',
          PENDING: 'orange',
          IN_PROGRESS: 'blue',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (createdBy: string) => (
        <Space>
          <EyeOutlined />
          <Text>{createdBy}</Text>
        </Space>
      ),
      sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      sorter: (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime(),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
    },
  ];

  const handleTasksExport = () => {
    try {
      if (filteredTasks.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = filteredTasks.map((task) => ({
        Id: task.id,
        Endpoint: task.endpointName,
        Name: task.name,
        Status: task.status,
        'Created By': task.createdBy,
        'Last Updated': task.lastUpdated,
        'Created On': task.createdOn,
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
      link.setAttribute('download', `tasks_${selectedDeployment?.deploymentId || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Tasks exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  return (
    <div>
      {/* Top Controls */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'flex-start',
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
        <Dropdown menu={{ items: endpointsMenuItems }} trigger={['click']}>
          <Button>
            Endpoints <span style={{ marginLeft: 4 }}>▼</span>
          </Button>
        </Dropdown>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
          Refresh
        </Button>
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          Export
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} htmlType="button">
          Create
        </Button>
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

      {/* Create Deployment Modal */}
      <Modal
        title="Deployment"
        open={createModalVisible}
        onCancel={handleCancel}
        width={800}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>
            Reset
          </Button>,
          <Button key="draft" onClick={handleCancel}>
            Save As Draft
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            Publish
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="deploymentName"
            label={
              <span>
                Deployment Name <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please enter deployment name' }]}
          >
            <Input placeholder="Name" />
          </Form.Item>

          <Form.Item
            name="description"
            label={
              <span>
                Description <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Description" />
          </Form.Item>

          <Form.Item
            name="deploymentType"
            label={
              <span>
                Deployment Type <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select deployment type' }]}
          >
            <Select
              value={deploymentType}
              onChange={(value) => setDeploymentType(value)}
              style={{ width: '100%' }}
            >
              <Option value="install">Install</Option>
              <Option value="uninstall">Uninstall</Option>
              <Option value="upgrade">Upgrade</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Selection Type">
            <Space>
              <Button
                type={selectionType === 'application' ? 'primary' : 'default'}
                onClick={() => setSelectionType('application')}
              >
                Application
              </Button>
              <Button
                type={selectionType === 'bundle' ? 'primary' : 'default'}
                onClick={() => setSelectionType('bundle')}
              >
                Application Bundle
              </Button>
            </Space>
          </Form.Item>

          <Form.Item
            name="scope"
            label={
              <span>
                Scope <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select scope' }]}
          >
            <Select placeholder="Select One" style={{ width: '100%' }}>
              <Option value="all">All</Option>
              <Option value="windows">Windows</Option>
              <Option value="mac">Mac</Option>
              <Option value="linux">Linux</Option>
            </Select>
          </Form.Item>

          <Form.Item name="endpoints" label="Endpoints">
            <Select placeholder="Please Select" style={{ width: '100%' }}>
              <Option value="endpoint1">Endpoint 1</Option>
              <Option value="endpoint2">Endpoint 2</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span>
                {selectionType === 'application' ? 'Select Application' : 'Select Bundle'} <Text type="danger">*</Text>
              </span>
            }
            rules={[
              {
                validator: () => {
                  if (selectedApplications.length === 0) {
                    return Promise.reject(new Error('Please select at least one application'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Row gutter={16}>
              {/* Available Applications */}
              <Col span={11}>
                {renderTransferList('left')}
              </Col>

              {/* Transfer Buttons */}
              <Col span={2} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <Button
                  type="primary"
                  icon={<RightOutlined />}
                  onClick={() => {
                    setSelectedApplications([...selectedApplications, ...selectedAvailableKeys]);
                    setSelectedAvailableKeys([]);
                  }}
                  disabled={selectedAvailableKeys.length === 0}
                />
                <Button
                  type="primary"
                  icon={<LeftOutlined />}
                  onClick={() => {
                    setSelectedApplications(selectedApplications.filter(k => !selectedSelectedKeys.includes(k)));
                    setSelectedSelectedKeys([]);
                  }}
                  disabled={selectedSelectedKeys.length === 0}
                />
              </Col>

              {/* Selected Applications */}
              <Col span={11}>
                {renderTransferList('right')}
              </Col>
            </Row>
          </Form.Item>

          <Form.Item
            name="deploymentPolicy"
            label={
              <span>
                Deployment Policy <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select deployment policy' }]}
          >
            <Select placeholder="Please Select" style={{ width: '100%' }}>
              <Option value="policy1">Policy 1</Option>
              <Option value="policy2">Policy 2</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="retryCount"
            label={
              <span>
                Retry Count <Text type="danger">*</Text>
              </span>
            }
            initialValue={1}
            rules={[{ required: true, message: 'Please enter retry count' }]}
          >
            <Input type="number" min={0} />
          </Form.Item>

          <Form.Item
            name="notifyTo"
            label={
              <span>
                Notify to <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select notify to' }]}
          >
            <Select placeholder="Please Select" style={{ width: '100%' }}>
              <Option value="admin">Admin</Option>
              <Option value="user">User</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Tasks Status Modal */}
      <Modal
        title={
          <Space>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setTasksModalVisible(false)}
              style={{ marginLeft: -16, marginRight: -8 }}
            />
            <Text strong style={{ fontSize: 16 }}>Tasks</Text>
          </Space>
        }
        open={tasksModalVisible}
        onCancel={() => setTasksModalVisible(false)}
        width={1200}
        footer={null}
        closable={false}
      >
        {/* Tasks Controls */}
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
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={tasksSearchText}
              onChange={(e) => setTasksSearchText(e.target.value)}
            />
            <Dropdown
              menu={{
                items: [
                  { key: 'All', label: 'All' },
                  { key: 'SUCCESS', label: 'SUCCESS' },
                  { key: 'FAILED', label: 'FAILED' },
                  { key: 'PENDING', label: 'PENDING' },
                  { key: 'IN_PROGRESS', label: 'IN_PROGRESS' },
                ],
                onClick: ({ key }) => setTasksFilter(key),
              }}
              trigger={['click']}
            >
              <Button>
                {tasksFilter} <span style={{ marginLeft: 4 }}>▼</span>
              </Button>
            </Dropdown>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button icon={<ReloadOutlined />} onClick={() => {
              if (selectedDeployment) {
                const deploymentTasks = getMockTasksForDeployment(selectedDeployment.deploymentId);
                setTasks(deploymentTasks);
                message.success('Tasks refreshed successfully');
              }
            }}>
              Refresh
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleTasksExport}>
              Export
            </Button>
          </div>
        </div>

        {/* Tasks Table */}
        <Table
          columns={taskColumns}
          dataSource={filteredTasks}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `showing ${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Modal>
    </div>
  );
};
