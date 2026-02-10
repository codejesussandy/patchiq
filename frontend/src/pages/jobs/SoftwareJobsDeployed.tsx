import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  App,
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
  Tooltip,
  Progress,
  Badge,
  Descriptions,
  Card,
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
  RollbackOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  softwareJobsService,
  type SoftwareDeployment,
  type SoftwareDeploymentTask,
} from '../../services/softwareJobs.service';
import type { SoftwarePackage, HubBundle } from '../../types/hub.types';

// Navigation state type from SoftwareJobsCatalog
interface LocationState {
  createDeployment?: boolean;
  selectedPackage?: {
    id: string;
    packageId: string;
    name: string;
    displayName: string;
    version: string;
    installSource: string;
    hasBundle: boolean;
  };
}

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Display types (converted from API types)
type DeployedItem = {
  id: string;
  deploymentId: string;
  name: string;
  type: 'INSTALL' | 'UNINSTALL' | 'UPGRADE';
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  pending: { current: number; total: number };
  succeeded: { current: number; total: number };
  failed: { current: number; total: number };
  createdBy: string;
  createdOn: string;
};

type ApplicationItem = {
  key: string;
  id: string;
  deploymentId: string;
  name: string;  // Actual package name (lowercase, used for apt/brew)
  title: string; // Display name
  os: string[];
  architecture: string;
  installSource: string;
};

type BundleItem = {
  key: string;
  bundleId: string;
  name: string;
  os: string[];
};

type AgentItem = {
  key: string;
  id: string;
  agentId: string;
  hostname: string;
  osType: string;
  status: string;
};

type TaskItem = {
  id: string;
  endpointId: string;
  endpointName: string;
  endpointOS: 'Windows' | 'Mac' | 'Linux';
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  errorMessage?: string;
  lastUpdated: string;
  createdOn: string;
  startedAt?: string;
  completedAt?: string;
  duration?: string;
  output?: string;
  commandResult?: string;
};

type DeploymentDetail = {
  deploymentId: string;
  name: string;
  type: string;
  stage: string;
  progress: number;
  pending: number;
  succeeded: number;
  failed: number;
  total: number;
  createdAt: string;
};

// Helper to convert API deployment to display type
const convertDeployment = (d: SoftwareDeployment): DeployedItem => ({
  id: d.id,
  deploymentId: d.deploymentId,
  name: d.name,
  type: d.type.toUpperCase() as 'INSTALL' | 'UNINSTALL' | 'UPGRADE',
  stage: d.stage as DeployedItem['stage'],
  pending: { current: d.pending, total: d.total },
  succeeded: { current: d.succeeded, total: d.total },
  failed: { current: d.failed, total: d.total },
  createdBy: d.createdBy || 'System',
  createdOn: new Date(d.createdAt).toLocaleString(),
});

// Helper to convert package to application item
const convertPackage = (p: SoftwarePackage): ApplicationItem => ({
  key: p.id,
  id: p.id,
  deploymentId: p.packageId,
  name: p.name,  // Actual package name (lowercase)
  title: p.displayName,
  os: [p.platform === 'macos' ? 'Mac' : p.platform === 'windows' ? 'Windows' : 'Linux'],
  architecture: p.architecture || 'x64',
  installSource: p.installSource,
});

// Helper to convert bundle to bundle item
const convertBundle = (b: HubBundle): BundleItem => ({
  key: b.id,
  bundleId: b.bundleId,
  name: b.name,
  os: [b.platform === 'macos' ? 'Mac' : b.platform === 'windows' ? 'Windows' : 'Linux'],
});

// Helper to convert task to display type
const convertTask = (t: SoftwareDeploymentTask): TaskItem => {
  // Handle both backend field name formats (endpoint* and agent*)
  const agentId = t.agentId || (t as any).endpointId || '';
  const agentName = t.agentName || (t as any).endpointName || agentId;
  const agentOs = t.agentOs || (t as any).endpointOs || 'linux';
  const packageName = t.packageName || (t as any).itemName || '';

  // Normalize status (handle both uppercase and lowercase)
  const normalizedStatus = (t.status || 'pending').toLowerCase();
  const displayStatus = normalizedStatus === 'completed' || normalizedStatus === 'success' ? 'SUCCESS'
    : normalizedStatus === 'failed' ? 'FAILED'
    : normalizedStatus === 'in_progress' ? 'IN_PROGRESS'
    : 'PENDING';

  // Calculate duration
  const startedAt = t.startedAt || (t as any).command?.executedAt;
  const completedAt = t.completedAt || (t as any).command?.completedAt;
  let duration: string | undefined;
  if (startedAt && completedAt) {
    const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (ms < 1000) duration = `${ms}ms`;
    else if (ms < 60000) duration = `${(ms / 1000).toFixed(1)}s`;
    else duration = `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  const output = t.executionOutput || (t as any).output || '';
  const commandResult = (t as any).command?.result;

  return {
    id: t.id,
    endpointId: agentId,
    endpointName: agentName,
    endpointOS: (agentOs === 'darwin' || agentOs === 'macos' ? 'Mac' : agentOs === 'windows' ? 'Windows' : 'Linux') as TaskItem['endpointOS'],
    name: packageName,
    status: displayStatus as TaskItem['status'],
    errorMessage: t.errorMessage,
    lastUpdated: t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '-',
    createdOn: t.createdAt ? new Date(t.createdAt).toLocaleString() : '-',
    startedAt: startedAt ? new Date(startedAt).toLocaleString() : undefined,
    completedAt: completedAt ? new Date(completedAt).toLocaleString() : undefined,
    duration,
    output: typeof output === 'string' ? output : JSON.stringify(output),
    commandResult: commandResult ? (typeof commandResult === 'string' ? commandResult : JSON.stringify(commandResult)) : undefined,
  };
};

// API data will be loaded into state

export const SoftwareJobsDeployed = () => {
  const { message } = App.useApp();
  // Get navigation state from SoftwareJobsCatalog
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [searchText, setSearchText] = useState('');
  const [deployedItems, setDeployedItems] = useState<DeployedItem[]>([]);
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
  const [deploymentDetail, setDeploymentDetail] = useState<DeploymentDetail | null>(null);

  // API data state
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [bundles, setBundles] = useState<BundleItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Rollback state
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null);

  // Track if we've handled the navigation state (to prevent re-triggering)
  const [navigationHandled, setNavigationHandled] = useState(false);

  // Handle rollback for a task
  const handleRollback = async (task: TaskItem) => {
    if (!selectedDeployment) return;

    Modal.confirm({
      title: 'Confirm Rollback',
      content: (
        <div>
          <p>Are you sure you want to rollback this installation?</p>
          <p><strong>Endpoint:</strong> {task.endpointName}</p>
          <p><strong>Package:</strong> {task.name}</p>
          <p style={{ color: '#ff4d4f', fontSize: 12 }}>
            This will attempt to uninstall or revert to the previous version.
          </p>
        </div>
      ),
      okText: 'Rollback',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setRollbackLoading(task.id);
        try {
          const result = await softwareJobsService.triggerRollback(
            selectedDeployment.deploymentId,
            task.id,
            { force: false }
          );
          message.success(`Rollback initiated (Command ID: ${result.commandId.slice(0, 8)}...)`);
          // Refresh tasks to show updated status
          await fetchTasks(selectedDeployment.deploymentId);
        } catch (error: any) {
          console.error('Failed to trigger rollback:', error);
          message.error(error.response?.data?.message || 'Failed to trigger rollback');
        } finally {
          setRollbackLoading(null);
        }
      },
    });
  };

  // Fetch deployments from API
  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await softwareJobsService.listDeployments();
      setDeployedItems(data.map(convertDeployment));
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
      message.error('Failed to load deployments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch packages from Hub
  const fetchPackages = useCallback(async () => {
    try {
      const data = await softwareJobsService.listPackages();
      setApplications(data.map(convertPackage));
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    }
  }, []);

  // Fetch bundles from Hub
  const fetchBundles = useCallback(async () => {
    try {
      const data = await softwareJobsService.listBundles();
      setBundles(data.map(convertBundle));
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
    }
  }, []);

  // Fetch agents for target selection
  const fetchAgents = useCallback(async () => {
    try {
      const data = await softwareJobsService.listAgents();
      setAgents(data.map(a => ({
        key: a.id,
        id: a.id,
        agentId: a.agentId,
        hostname: a.hostname,
        osType: a.osType,
        status: a.status,
      })));
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  }, []);

  // Fetch tasks for a deployment
  const fetchTasks = useCallback(async (deploymentId: string) => {
    try {
      const data = await softwareJobsService.getDeployment(deploymentId);
      if (data.tasks) {
        setTasks(data.tasks.map(convertTask));
      }
      // Store deployment summary for progress display
      setDeploymentDetail({
        deploymentId: data.deploymentId,
        name: data.name,
        type: data.type || 'install',
        stage: data.stage || 'PENDING',
        progress: data.progress ?? 0,
        pending: data.pending ?? 0,
        succeeded: data.succeeded ?? 0,
        failed: data.failed ?? 0,
        total: data.total ?? (data.tasks?.length || 0),
        createdAt: data.createdAt,
      });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      message.error('Failed to load tasks');
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchDeployments();
    fetchPackages();
    fetchBundles();
    fetchAgents();
  }, [fetchDeployments, fetchPackages, fetchBundles, fetchAgents]);

  // Handle navigation state from SoftwareJobsCatalog (auto-open create modal with selected package)
  useEffect(() => {
    // Only handle once, and only after packages are loaded
    if (navigationHandled || applications.length === 0 || !locationState?.createDeployment) {
      return;
    }

    const selectedPkg = locationState.selectedPackage;
    if (selectedPkg) {
      // Find the matching application in our loaded list
      const matchingApp = applications.find(
        app => app.id === selectedPkg.id || app.deploymentId === selectedPkg.packageId
      );

      if (matchingApp) {
        // Pre-select the application and open modal
        setSelectedApplications([matchingApp.key]);
        form.setFieldsValue({
          deploymentName: `Deploy ${selectedPkg.displayName || selectedPkg.name}`,
          description: `Deployment of ${selectedPkg.displayName || selectedPkg.name} v${selectedPkg.version}`,
        });
        setCreateModalVisible(true);
        setNavigationHandled(true);
        message.info(`Package "${selectedPkg.displayName || selectedPkg.name}" pre-selected. Choose target agents and publish.`);
      }
    }
  }, [applications, locationState, navigationHandled, form]);

  // Auto-refresh tasks when modal is open and deployment is in progress
  useEffect(() => {
    if (!tasksModalVisible || !selectedDeployment) return;
    if (deploymentDetail?.stage === 'COMPLETED' || deploymentDetail?.stage === 'FAILED') return;

    const interval = setInterval(() => {
      fetchTasks(selectedDeployment.deploymentId);
    }, 5000);

    return () => clearInterval(interval);
  }, [tasksModalVisible, selectedDeployment, deploymentDetail?.stage, fetchTasks]);

  const handleView = async (record: DeployedItem) => {
    setSelectedDeployment(record);
    setTasksModalVisible(true);
    setTasksSearchText('');
    setTasksFilter('All');
    // Fetch tasks for this deployment
    await fetchTasks(record.deploymentId);
  };

  const handleRefresh = async () => {
    await fetchDeployments();
    message.success('Data refreshed successfully');
  };

  const handleExport = () => {
    try {
      // Filter inline to avoid use-before-definition issue
      const currentFilteredItems = deployedItems.filter(
        item =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.deploymentId.toLowerCase().includes(searchText.toLowerCase()) ||
          item.createdBy.toLowerCase().includes(searchText.toLowerCase())
      );
      const dataToExport = currentFilteredItems.length > 0 ? currentFilteredItems : deployedItems;

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
    setSelectedAgents([]);
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      // Get selected package details
      const selectedPackage = applications.find(a => selectedApplications.includes(a.key));
      if (!selectedPackage && selectionType === 'application') {
        message.error('Please select a package');
        return;
      }

      if (selectedAgents.length === 0) {
        message.error('Please select at least one target agent');
        return;
      }

      // Create deployment via API
      const result = await softwareJobsService.createDeployment({
        name: values.deploymentName,
        description: values.description,
        type: deploymentType,
        targetAgentIds: selectedAgents,
        package: selectedPackage ? {
          name: selectedPackage.name,  // Use actual package name, not display title
          source: selectedPackage.installSource,
          version: 'latest',
        } : {
          name: 'bundle-install',
          source: 'bundle',
        },
        retryCount: parseInt(values.retryCount, 10) || 1,
        notifyOnComplete: true,
      });

      message.success(`Deployment ${result.deploymentId} created with ${result.tasksCreated} tasks`);
      setCreateModalVisible(false);
      form.resetFields();
      setSelectedApplications([]);
      setSelectedAgents([]);

      // Refresh the list
      await fetchDeployments();
    } catch (error: any) {
      console.error('Failed to create deployment:', error);
      message.error(error.response?.data?.message || 'Failed to create deployment');
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
    setSelectedAgents([]);
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
    ? applications
    : bundles;
  
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
      (task.endpointName || '').toLowerCase().includes(tasksSearchText.toLowerCase()) ||
      (task.name || '').toLowerCase().includes(tasksSearchText.toLowerCase()) ||
      (task.id || '').toString().includes(tasksSearchText);

    // Compare with uppercase since task.status is now uppercase (SUCCESS, FAILED, etc.)
    const matchesFilter = tasksFilter === 'All' || task.status === tasksFilter;

    return matchesSearch && matchesFilter;
  });

  // Task table columns
  const taskColumns: ColumnsType<TaskItem> = [
    {
      title: 'Endpoint',
      key: 'endpoint',
      render: (_: any, record: TaskItem) => (
        <Space>
          {record.endpointOS === 'Windows' && <WindowsOutlined style={{ color: '#0078d4' }} />}
          {record.endpointOS === 'Mac' && <AppleOutlined />}
          {record.endpointOS === 'Linux' && <LinuxOutlined style={{ color: '#f9a825' }} />}
          <Text>{record.endpointName}</Text>
        </Space>
      ),
    },
    {
      title: 'Package',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string, record: TaskItem) => {
        const config: Record<string, { color: string; icon: React.ReactNode }> = {
          SUCCESS: { color: 'green', icon: <CheckCircleOutlined /> },
          FAILED: { color: 'red', icon: <CloseCircleOutlined /> },
          PENDING: { color: 'orange', icon: <ClockCircleOutlined /> },
          IN_PROGRESS: { color: 'blue', icon: <SyncOutlined spin /> },
        };
        const c = config[status] || { color: 'default', icon: null };
        return (
          <div>
            <Tag color={c.color} icon={c.icon}>{status}</Tag>
            {record.errorMessage && (
              <div style={{ marginTop: 4 }}>
                <Text type="danger" style={{ fontSize: 11 }}>{record.errorMessage}</Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: string | undefined, record: TaskItem) => {
        if (record.status === 'IN_PROGRESS') return <LoadingOutlined style={{ color: '#1890ff' }} />;
        return duration || '-';
      },
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 170,
      render: (v: string) => v || '-',
    },
    {
      title: 'Completed',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 170,
      render: (v: string) => v || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: TaskItem) => (
        <Space>
          {(record.status === 'FAILED' || record.status === 'SUCCESS') && (
            <Tooltip title="Rollback">
              <Button
                type="text"
                size="small"
                icon={<RollbackOutlined />}
                loading={rollbackLoading === record.id}
                onClick={() => handleRollback(record)}
                style={{ color: record.status === 'FAILED' ? '#ff4d4f' : '#faad14' }}
              />
            </Tooltip>
          )}
        </Space>
      ),
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
        'Error': task.errorMessage || '',
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
        onRow={(record) => ({
          onClick: () => handleView(record),
          style: { cursor: 'pointer' },
        })}
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

          <Form.Item
            name="endpoints"
            label={
              <span>
                Target Agents <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select target agents' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select target agents"
              style={{ width: '100%' }}
              value={selectedAgents}
              onChange={setSelectedAgents}
              optionFilterProp="children"
              showSearch
            >
              {agents.map(agent => (
                <Option key={agent.id} value={agent.id}>
                  <Space>
                    {agent.osType === 'windows' && <WindowsOutlined style={{ color: '#1890ff' }} />}
                    {agent.osType === 'darwin' && <AppleOutlined />}
                    {agent.osType === 'linux' && <LinuxOutlined />}
                    {agent.hostname} ({agent.agentId})
                    <Tag color={agent.status === 'online' ? 'green' : 'orange'}>{agent.status}</Tag>
                  </Space>
                </Option>
              ))}
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
              onClick={() => { setTasksModalVisible(false); setDeploymentDetail(null); }}
              style={{ marginLeft: -16, marginRight: -8 }}
            />
            <Text strong style={{ fontSize: 16 }}>
              {deploymentDetail?.name || 'Deployment Tasks'}
            </Text>
            {deploymentDetail && (
              <Tag color={
                deploymentDetail.stage === 'COMPLETED' ? 'green'
                  : deploymentDetail.stage === 'FAILED' ? 'red'
                  : deploymentDetail.stage === 'IN_PROGRESS' ? 'blue'
                  : 'orange'
              }>
                {deploymentDetail.stage}
              </Tag>
            )}
          </Space>
        }
        open={tasksModalVisible}
        onCancel={() => { setTasksModalVisible(false); setDeploymentDetail(null); }}
        width={1200}
        footer={null}
        closable={false}
      >
        {/* Deployment Summary */}
        {deploymentDetail && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={24} align="middle">
              <Col flex="1">
                <Progress
                  percent={deploymentDetail.progress}
                  status={
                    deploymentDetail.stage === 'FAILED' ? 'exception'
                      : deploymentDetail.stage === 'COMPLETED' ? 'success'
                      : 'active'
                  }
                  strokeWidth={10}
                  format={(pct) => `${pct}%`}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col>
                <Space size={4}>
                  <Badge status="default" />
                  <Text type="secondary">Total:</Text>
                  <Text strong>{deploymentDetail.total}</Text>
                </Space>
              </Col>
              <Col>
                <Space size={4}>
                  <Badge status="warning" />
                  <Text type="secondary">Pending:</Text>
                  <Text strong>{deploymentDetail.pending}</Text>
                </Space>
              </Col>
              <Col>
                <Space size={4}>
                  <Badge status="processing" />
                  <Text type="secondary">In Progress:</Text>
                  <Text strong>{deploymentDetail.total - deploymentDetail.pending - deploymentDetail.succeeded - deploymentDetail.failed}</Text>
                </Space>
              </Col>
              <Col>
                <Space size={4}>
                  <Badge status="success" />
                  <Text type="secondary">Succeeded:</Text>
                  <Text strong style={{ color: '#52c41a' }}>{deploymentDetail.succeeded}</Text>
                </Space>
              </Col>
              <Col>
                <Space size={4}>
                  <Badge status="error" />
                  <Text type="secondary">Failed:</Text>
                  <Text strong style={{ color: '#ff4d4f' }}>{deploymentDetail.failed}</Text>
                </Space>
              </Col>
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Type: <Tag style={{ marginRight: 0 }}>{deploymentDetail.type.toUpperCase()}</Tag>
                </Text>
              </Col>
            </Row>
          </Card>
        )}

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
            <Button icon={<ReloadOutlined />} onClick={async () => {
              if (selectedDeployment) {
                await fetchTasks(selectedDeployment.deploymentId);
                message.success('Tasks refreshed');
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
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 0' }}>
                {record.commandResult && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 12 }}>Result: </Text>
                    <Text style={{ fontSize: 12 }}>{record.commandResult}</Text>
                  </div>
                )}
                {record.output ? (
                  <div>
                    <Text strong style={{ fontSize: 12 }}>Execution Output:</Text>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 12,
                      maxHeight: 300,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      marginTop: 4,
                    }}>
                      {record.output}
                    </pre>
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>No execution output available</Text>
                )}
                {record.errorMessage && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong type="danger" style={{ fontSize: 12 }}>Error: </Text>
                    <Text type="danger" style={{ fontSize: 12 }}>{record.errorMessage}</Text>
                  </div>
                )}
              </div>
            ),
            rowExpandable: () => true,
          }}
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
