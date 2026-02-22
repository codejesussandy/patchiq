/**
 * Hub - Software Package Repository Management
 * Central repository for managing software packages that can be deployed to agents
 */

import { useState, useCallback } from 'react';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  AppstoreOutlined,
  RocketOutlined } from '@ant-design/icons';
import {
  App,
  Card,
  Button,
  Input,
  Space,
  Tag,
  Form,
  Select,
  Row,
  Col,
  Statistic,
  Tooltip,
  Typography,
  Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/shared/DataTable';
import {
  useHubStats,
  useHubPackagesGrouped,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  useUploadPackageBundle } from '../../hooks/useHub';
import { useSoftwareAgents, useCreateSoftwareDeployment } from '../../hooks/useJobs';
import { hubService } from '../../services/hub.service';
import type {
  SoftwarePackage,
  CreatePackageInput,
  PackageListFilters,
  GroupedPackageResponse,
  PackageVersionSummary } from '../../types/hub.types';
import { PLATFORM_OPTIONS, CATEGORY_OPTIONS } from '../../types/hub.types';
import { getErrorMessage } from '../../utils/error';
import { sanitizeInput } from '../../utils/sanitize';
import { HubBundleUploadModal } from './components/HubBundleUploadModal';
import { HubDeployModal } from './components/HubDeployModal';
import { HubDetailsDrawer } from './components/HubDetailsDrawer';
import { HubPackageFormModal } from './components/HubPackageFormModal';

interface Agent {
  id: string;
  agentId: string;
  hostname: string;
  osType: string;
  status: string;
}

const { Text, Title } = Typography;

const formatBytes = (bytes: number | string): string => {
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!numBytes || numBytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'windows': return <WindowsOutlined style={{ color: '#1890ff' }} />;
    case 'macos': return <AppleOutlined style={{ color: '#000' }} />;
    case 'linux': return <LinuxOutlined style={{ color: '#f9a825' }} />;
    default: return <CloudOutlined style={{ color: '#1890ff' }} />;
  }
};

export const Hub = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<PackageListFilters>({ page: 1, limit: 20 });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SoftwarePackage | null>(null);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedPackageResponse | null>(null);
  const [form] = Form.useForm();
  const [deployForm] = Form.useForm();

  const { data: stats } = useHubStats();
  const queryFilters = { ...filters, search: searchText || undefined };
  const { data: packagesResponse, isLoading: loading, refetch: refetchPackages } = useHubPackagesGrouped(queryFilters);
  const groupedPackages = packagesResponse?.data || [];
  const total = packagesResponse?.total || 0;
  const createPackageMutation = useCreatePackage();
  const updatePackageMutation = useUpdatePackage();
  const deletePackageMutation = useDeletePackage();
  const uploadBundleMutation = useUploadPackageBundle();
  const createDeploymentMutation = useCreateSoftwareDeployment();
  const { data: agents = [] } = useSoftwareAgents();

  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployingPackageId, setDeployingPackageId] = useState<string | null>(null);
  const [deployingDisplayName, setDeployingDisplayName] = useState('');
  const [deployingPlatform, setDeployingPlatform] = useState('');
  const [deployingVersion, setDeployingVersion] = useState('');
  const [deployingInstallSource, setDeployingInstallSource] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [bundleUploadVisible, setBundleUploadVisible] = useState(false);

  const getCompatibleAgents = useCallback((platform: string): Agent[] => {
    if (platform === 'cross-platform') return agents;
    return agents.filter(agent => {
      const agentOs = agent.osType.toLowerCase();
      const pkgPlatform = platform.toLowerCase();
      if (pkgPlatform === 'linux') return agentOs === 'linux';
      if (pkgPlatform === 'windows') return agentOs === 'windows';
      if (pkgPlatform === 'macos') return agentOs === 'darwin' || agentOs === 'macos';
      return false;
    });
  }, [agents]);

  const handleDeploy = (packageId: string, displayName: string, platform: string, version: string, installSource: string) => {
    setDeployingPackageId(packageId); setDeployingDisplayName(displayName); setDeployingPlatform(platform);
    setDeployingVersion(version); setDeployingInstallSource(installSource); setSelectedAgents([]);
    deployForm.resetFields();
    deployForm.setFieldsValue({ deploymentName: `Deploy ${displayName}`, deploymentType: 'install' });
    setDeployModalVisible(true);
  };

  const handleDeployGroup = (group: GroupedPackageResponse) => {
    const latestVersion = group.versions[0];
    handleDeploy(group.latestPackageId, group.displayName, group.platform, group.latestVersion, latestVersion?.installSource || 'bundle');
  };

  const handleDeployVersion = (version: PackageVersionSummary) => {
    if (!selectedGroup) return;
    handleDeploy(version.packageId, selectedGroup.displayName, selectedGroup.platform, version.version, version.installSource);
  };

  const handleDeploySubmit = async () => {
    if (!deployingPackageId) return;
    try {
      await deployForm.validateFields();
      const values = deployForm.getFieldsValue();
      if (selectedAgents.length === 0) { message.error('Please select at least one target agent'); return; }
      const result = await createDeploymentMutation.mutateAsync({
        name: values.deploymentName, description: `Deploying ${deployingDisplayName} v${deployingVersion}`,
        type: values.deploymentType, targetAgentIds: selectedAgents,
        package: { packageId: deployingPackageId, name: deployingDisplayName, source: deployingInstallSource, version: deployingVersion },
        retryCount: 1, notifyOnComplete: true,
      });
      message.success(<span>Deployment <strong>{result.deploymentId}</strong> created with {result.tasksCreated} task(s). <a onClick={() => navigate('/assets/software-jobs')}>View in Software Jobs</a></span>);
      setDeployModalVisible(false); setDeployingPackageId(null); setSelectedAgents([]); deployForm.resetFields();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to create deployment'));
    }
  };

  const handleCreatePackage = async (values: CreatePackageInput) => {
    try {
      // Sanitize string fields to prevent XSS
      const sanitizedValues = {
        ...values,
        name: sanitizeInput(values.name),
        displayName: sanitizeInput(values.displayName),
        version: sanitizeInput(values.version),
        vendor: values.vendor ? sanitizeInput(values.vendor) : values.vendor,
        description: values.description ? sanitizeInput(values.description) : values.description,
        downloadUrl: values.downloadUrl ? sanitizeInput(values.downloadUrl) : values.downloadUrl,
      };

      await createPackageMutation.mutateAsync(sanitizedValues);
      message.success('Package created successfully');
      setCreateModalVisible(false);
      form.resetFields();
    }
    catch { message.error('Failed to create package'); }
  };

  const handleUpdatePackage = async (values: CreatePackageInput) => {
    if (!editingPackage) return;
    try {
      // Sanitize string fields to prevent XSS
      const sanitizedValues = {
        ...values,
        name: sanitizeInput(values.name),
        displayName: sanitizeInput(values.displayName),
        version: sanitizeInput(values.version),
        vendor: values.vendor ? sanitizeInput(values.vendor) : values.vendor,
        description: values.description ? sanitizeInput(values.description) : values.description,
        downloadUrl: values.downloadUrl ? sanitizeInput(values.downloadUrl) : values.downloadUrl,
      };

      await updatePackageMutation.mutateAsync({ id: editingPackage.packageId, data: sanitizedValues });
      message.success('Package updated successfully');
      setEditingPackage(null);
      form.resetFields();
    }
    catch { message.error('Failed to update package'); }
  };

  const handleDeletePackage = async (packageId: string) => {
    try { await deletePackageMutation.mutateAsync(packageId); message.success('Package deleted successfully'); }
    catch { message.error('Failed to delete package'); }
  };

  const handleDownload = async (packageId: string) => {
    try { const urlInfo = await hubService.getDownloadUrl(packageId); window.open(urlInfo.presignedUrl, '_blank'); }
    catch { message.error('Failed to get download URL'); }
  };

  const handleBundleUpload = async (file: File): Promise<false> => {
    if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) { message.error('Please upload a .tar.gz or .tgz file'); return false; }
    try {
      const result = await uploadBundleMutation.mutateAsync(file);
      message.success(<span>Bundle uploaded successfully! Package <strong>{result.manifest.displayName}</strong> v{result.manifest.version} created. Scripts found: {result.scriptsFound.join(', ')}</span>);
      setBundleUploadVisible(false);
    } catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to upload bundle')); }
    return false;
  };

  const columns: ColumnsType<GroupedPackageResponse> = [
    { title: 'Name', dataIndex: 'displayName', key: 'displayName',
      render: (text, record) => <Space>{getPlatformIcon(record.platform)}<a onClick={() => { setSelectedGroup(record); setDetailsDrawerVisible(true); }}>{text}</a></Space> },
    { title: 'Latest Version', dataIndex: 'latestVersion', key: 'latestVersion', width: 120 },
    { title: 'Versions', dataIndex: 'totalVersions', key: 'totalVersions', width: 100,
      render: (count: number) => <Badge count={count} style={{ backgroundColor: count > 1 ? '#1890ff' : '#d9d9d9' }} /> },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 120,
      render: (platform) => { const option = PLATFORM_OPTIONS.find((o) => o.value === platform); return <Tag>{option?.label || platform}</Tag>; } },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 120, render: (category) => category ? <Tag color="blue">{category}</Tag> : '-' },
    { title: 'File', dataIndex: 'hasFile', key: 'hasFile', width: 80,
      render: (hasFile) => hasFile ? <Tag icon={<FileOutlined />} color="green">Yes</Tag> : <Tag color="orange">No</Tag> },
    { title: 'Status', key: 'status', width: 80,
      render: (_, record) => record.isActive ? <Tooltip title="Active"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip> : <Tooltip title="Inactive"><CloseCircleOutlined style={{ color: '#ff4d4f' }} /></Tooltip> },
    { title: 'Actions', key: 'actions', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Deploy Latest"><Button type="text" size="small" icon={<RocketOutlined />} style={{ color: '#1890ff' }} onClick={() => handleDeployGroup(record)} /></Tooltip>
          <Tooltip title="View Details"><Button type="text" size="small" icon={<AppstoreOutlined />} onClick={() => { setSelectedGroup(record); setDetailsDrawerVisible(true); }} /></Tooltip>
        </Space>
      ) },
  ];

  return (
    <div>
      <Title level={3} style={{ margin: 0 }}>Software Hub</Title>
      <Text type="secondary" style={{ fontSize: 14 }}>Manage software packages for deployment to agents</Text>

      <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col span={12}><Card><Statistic title="Total Applications" value={stats?.totalApplications || 0} prefix={<AppstoreOutlined />} /></Card></Col>
        <Col span={12}><Card><Statistic title="Total Size" value={formatBytes(stats?.totalSize || 0)} prefix={<CloudOutlined />} /></Card></Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input placeholder="Search packages..." prefix={<SearchOutlined />} style={{ width: 250 }} value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setFilters({ ...filters, page: 1 }); }} allowClear />
            <Select placeholder="Platform" style={{ width: 140 }} allowClear options={PLATFORM_OPTIONS} onChange={(value) => setFilters({ ...filters, platform: value, page: 1 })} />
            <Select placeholder="Category" style={{ width: 140 }} allowClear options={CATEGORY_OPTIONS} onChange={(value) => setFilters({ ...filters, category: value, page: 1 })} />
            <Button icon={<ReloadOutlined />} onClick={() => refetchPackages()}>Refresh</Button>
          </Space>
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setBundleUploadVisible(true)}>Upload Bundle</Button>
            <Button icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>Add Package</Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <DataTable columns={columns} data={groupedPackages} rowKey={(record) => `${record.name}|||${record.platform}`} loading={loading}
          pagination={{ current: filters.page, pageSize: filters.limit, total, showSizeChanger: true, showTotal: (total) => `Total ${total} software titles` }}
          onChange={(pagination: { current?: number; pageSize?: number }) => setFilters({ ...filters, page: pagination.current || 1, limit: pagination.pageSize || 20 })}
          scroll={{ x: 900 }} />
      </Card>

      <HubPackageFormModal open={createModalVisible || !!editingPackage} editingPackage={editingPackage} form={form}
        onClose={() => { setCreateModalVisible(false); setEditingPackage(null); form.resetFields(); }}
        onCreatePackage={handleCreatePackage} onUpdatePackage={handleUpdatePackage} />

      <HubDetailsDrawer open={detailsDrawerVisible} selectedGroup={selectedGroup}
        onClose={() => { setDetailsDrawerVisible(false); setSelectedGroup(null); }}
        onDeployGroup={handleDeployGroup} onDeployVersion={handleDeployVersion}
        onDownload={handleDownload} onDeletePackage={handleDeletePackage} />

      <HubDeployModal open={deployModalVisible} deployForm={deployForm} deployingPackageId={deployingPackageId}
        deployingDisplayName={deployingDisplayName} deployingPlatform={deployingPlatform}
        deployingVersion={deployingVersion} deployingInstallSource={deployingInstallSource}
        selectedAgents={selectedAgents} compatibleAgents={getCompatibleAgents(deployingPlatform)}
        loading={createDeploymentMutation.isPending} onSelectedAgentsChange={setSelectedAgents}
        onClose={() => { setDeployModalVisible(false); setDeployingPackageId(null); setSelectedAgents([]); deployForm.resetFields(); }}
        onSubmit={handleDeploySubmit} />

      <HubBundleUploadModal open={bundleUploadVisible} uploading={uploadBundleMutation.isPending}
        onClose={() => setBundleUploadVisible(false)} onBundleUpload={handleBundleUpload} />
    </div>
  );
};
