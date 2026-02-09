/**
 * Hub - Software Package Repository Management
 * Central repository for managing software packages that can be deployed to agents
 */

import { useState, useEffect, useCallback } from 'react';
import {
  App,
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Upload,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tooltip,
  Switch,
  Drawer,
  Typography,
  Divider,
  Tabs,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  UploadOutlined,
  DownloadOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  AppstoreOutlined,
  RocketOutlined,
  CodeOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { hubService } from '../../services/hub.service';
import { softwareJobsService } from '../../services/softwareJobs.service';
import type {
  SoftwarePackage,
  CreatePackageInput,
  HubStats,
  PackageListFilters,
  GroupedPackageResponse,
  PackageVersionSummary,
} from '../../types/hub.types';
import {
  PLATFORM_OPTIONS,
  INSTALL_SOURCE_OPTIONS,
  CATEGORY_OPTIONS,
  ARCHITECTURE_OPTIONS,
} from '../../types/hub.types';

// Agent type for deployment targeting
interface Agent {
  id: string;
  agentId: string;
  hostname: string;
  osType: string;
  status: string;
}

const { Text, Title } = Typography;
const { TextArea } = Input;

// Utility function to format bytes with appropriate unit
const formatBytes = (bytes: number | string): string => {
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (!numBytes || numBytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return `${parseFloat((numBytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const Hub = () => {
  const { message } = App.useApp();
  const [groupedPackages, setGroupedPackages] = useState<GroupedPackageResponse[]>([]);
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<PackageListFilters>({
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SoftwarePackage | null>(null);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedPackageResponse | null>(null);
  const [uploadingPackageId, setUploadingPackageId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [deployForm] = Form.useForm();

  // Deploy modal state
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployingPackageId, setDeployingPackageId] = useState<string | null>(null);
  const [deployingDisplayName, setDeployingDisplayName] = useState('');
  const [deployingPlatform, setDeployingPlatform] = useState('');
  const [deployingVersion, setDeployingVersion] = useState('');
  const [deployingInstallSource, setDeployingInstallSource] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [deployLoading, setDeployLoading] = useState(false);

  // Bundle upload modal state
  const [bundleUploadVisible, setBundleUploadVisible] = useState(false);
  const [bundleUploading, setBundleUploading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await hubService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch hub stats:', error);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await hubService.listPackagesGrouped({
        ...filters,
        search: searchText || undefined,
      });
      setGroupedPackages(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      message.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [filters, searchText]);

  useEffect(() => {
    fetchStats();
    fetchPackages();
  }, [fetchStats, fetchPackages]);

  const handleRefresh = () => {
    fetchStats();
    fetchPackages();
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilters({ ...filters, page: 1 });
  };

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handleTableChange = (pagination: { current?: number; pageSize?: number }) => {
    setFilters({
      ...filters,
      page: pagination.current || 1,
      limit: pagination.pageSize || 20,
    });
  };

  const handleCreatePackage = async (values: CreatePackageInput) => {
    try {
      await hubService.createPackage(values);
      message.success('Package created successfully');
      setCreateModalVisible(false);
      form.resetFields();
      fetchPackages();
      fetchStats();
    } catch (error) {
      console.error('Failed to create package:', error);
      message.error('Failed to create package');
    }
  };

  const handleUpdatePackage = async (values: CreatePackageInput) => {
    if (!editingPackage) return;
    try {
      await hubService.updatePackage(editingPackage.packageId, values);
      message.success('Package updated successfully');
      setEditingPackage(null);
      form.resetFields();
      fetchPackages();
    } catch (error) {
      console.error('Failed to update package:', error);
      message.error('Failed to update package');
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    try {
      await hubService.deletePackage(packageId);
      message.success('Package deleted successfully');
      fetchPackages();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete package:', error);
      message.error('Failed to delete package');
    }
  };

  const handleUploadFile = async (packageId: string, file: File) => {
    setUploadingPackageId(packageId);
    try {
      await hubService.uploadPackageFile(packageId, file);
      message.success('File uploaded successfully');
      fetchPackages();
    } catch (error) {
      console.error('Failed to upload file:', error);
      message.error('Failed to upload file');
    } finally {
      setUploadingPackageId(null);
    }
  };

  const handleDownload = async (packageId: string) => {
    try {
      const urlInfo = await hubService.getDownloadUrl(packageId);
      window.open(urlInfo.presignedUrl, '_blank');
    } catch (error) {
      console.error('Failed to get download URL:', error);
      message.error('Failed to get download URL');
    }
  };

  // Handle script bundle upload (.tar.gz with manifest and scripts)
  const handleBundleUpload = async (file: File) => {
    if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) {
      message.error('Please upload a .tar.gz or .tgz file');
      return false;
    }

    setBundleUploading(true);
    try {
      const result = await hubService.uploadPackageBundle(file);
      message.success(
        <span>
          Bundle uploaded successfully! Package <strong>{result.manifest.displayName}</strong> v{result.manifest.version} created.
          Scripts found: {result.scriptsFound.join(', ')}
        </span>
      );
      setBundleUploadVisible(false);
      fetchPackages();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to upload bundle:', error);
      message.error(error.response?.data?.error || 'Failed to upload bundle');
    } finally {
      setBundleUploading(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleViewDetails = (group: GroupedPackageResponse) => {
    setSelectedGroup(group);
    setDetailsDrawerVisible(true);
  };

  // Fetch agents for deployment targeting
  const fetchAgents = useCallback(async () => {
    try {
      const data = await softwareJobsService.listAgents();
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  }, []);

  // Filter agents by platform compatibility
  const getCompatibleAgents = useCallback((platform: string): Agent[] => {
    if (platform === 'cross-platform') {
      return agents;
    }
    return agents.filter(agent => {
      const agentOs = agent.osType.toLowerCase();
      const pkgPlatform = platform.toLowerCase();

      if (pkgPlatform === 'linux') {
        return agentOs === 'linux';
      }
      if (pkgPlatform === 'windows') {
        return agentOs === 'windows';
      }
      if (pkgPlatform === 'macos') {
        return agentOs === 'darwin' || agentOs === 'macos';
      }
      return false;
    });
  }, [agents]);

  // Open deploy modal for a specific packageId
  const handleDeploy = async (packageId: string, displayName: string, platform: string, version: string, installSource: string) => {
    setDeployingPackageId(packageId);
    setDeployingDisplayName(displayName);
    setDeployingPlatform(platform);
    setDeployingVersion(version);
    setDeployingInstallSource(installSource);
    setSelectedAgents([]);
    deployForm.resetFields();
    deployForm.setFieldsValue({
      deploymentName: `Deploy ${displayName}`,
      deploymentType: 'install',
    });

    if (agents.length === 0) {
      await fetchAgents();
    }

    setDeployModalVisible(true);
  };

  // Deploy from the grouped table row (latest version)
  const handleDeployGroup = async (group: GroupedPackageResponse) => {
    const latestVersion = group.versions[0];
    await handleDeploy(
      group.latestPackageId,
      group.displayName,
      group.platform,
      group.latestVersion,
      latestVersion?.installSource || 'bundle',
    );
  };

  // Deploy a specific version from the versions tab
  const handleDeployVersion = async (version: PackageVersionSummary) => {
    if (!selectedGroup) return;
    await handleDeploy(
      version.packageId,
      selectedGroup.displayName,
      selectedGroup.platform,
      version.version,
      version.installSource,
    );
  };

  // Submit deployment
  const handleDeploySubmit = async () => {
    if (!deployingPackageId) return;

    try {
      await deployForm.validateFields();
      const values = deployForm.getFieldsValue();

      if (selectedAgents.length === 0) {
        message.error('Please select at least one target agent');
        return;
      }

      setDeployLoading(true);

      const result = await softwareJobsService.createDeployment({
        name: values.deploymentName,
        description: `Deploying ${deployingDisplayName} v${deployingVersion}`,
        type: values.deploymentType,
        targetAgentIds: selectedAgents,
        package: {
          packageId: deployingPackageId,
          name: deployingDisplayName,
          source: deployingInstallSource,
          version: deployingVersion,
        },
        retryCount: 1,
        notifyOnComplete: true,
      });

      message.success(
        <span>
          Deployment <strong>{result.deploymentId}</strong> created with {result.tasksCreated} task(s).{' '}
          <a href="/patches/deployed/deployed">View status</a>
        </span>
      );

      setDeployModalVisible(false);
      setDeployingPackageId(null);
      setSelectedAgents([]);
      deployForm.resetFields();
    } catch (error: any) {
      console.error('Failed to create deployment:', error);
      message.error(error.response?.data?.message || 'Failed to create deployment');
    } finally {
      setDeployLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'windows':
        return <WindowsOutlined style={{ color: '#0078d4' }} />;
      case 'macos':
        return <AppleOutlined style={{ color: '#000' }} />;
      case 'linux':
        return <LinuxOutlined style={{ color: '#f9a825' }} />;
      default:
        return <CloudOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const columns: ColumnsType<GroupedPackageResponse> = [
    {
      title: 'Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text, record) => (
        <Space>
          {getPlatformIcon(record.platform)}
          <a onClick={() => handleViewDetails(record)}>{text}</a>
        </Space>
      ),
    },
    {
      title: 'Latest Version',
      dataIndex: 'latestVersion',
      key: 'latestVersion',
      width: 120,
    },
    {
      title: 'Versions',
      dataIndex: 'totalVersions',
      key: 'totalVersions',
      width: 100,
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: count > 1 ? '#1890ff' : '#d9d9d9' }} />
      ),
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      render: (platform) => {
        const option = PLATFORM_OPTIONS.find((o) => o.value === platform);
        return <Tag>{option?.label || platform}</Tag>;
      },
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: 'File',
      dataIndex: 'hasFile',
      key: 'hasFile',
      width: 80,
      render: (hasFile) => (
        hasFile ? (
          <Tag icon={<FileOutlined />} color="green">Yes</Tag>
        ) : (
          <Tag color="orange">No</Tag>
        )
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (_, record) => (
        record.isActive ? (
          <Tooltip title="Active">
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          </Tooltip>
        ) : (
          <Tooltip title="Inactive">
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          </Tooltip>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Deploy Latest">
            <Button
              type="text"
              size="small"
              icon={<RocketOutlined />}
              style={{ color: '#1890ff' }}
              onClick={() => handleDeployGroup(record)}
            />
          </Tooltip>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<AppstoreOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Columns for the versions table inside the drawer
  const versionColumns: ColumnsType<PackageVersionSummary> = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.isActive ? (
            <Tag color="green">Active</Tag>
          ) : (
            <Tag color="default">Inactive</Tag>
          )}
          {record.isVerified && (
            <Tooltip title="Verified">
              <CheckCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'installSource',
      key: 'installSource',
      width: 90,
      render: (source, record) => (
        record.hasBundle ? (
          <Tag icon={<CodeOutlined />} color="green">BUNDLE</Tag>
        ) : (
          <Tag color="purple">{source.toUpperCase()}</Tag>
        )
      ),
    },
    {
      title: 'File',
      key: 'file',
      width: 80,
      render: (_, record) => (
        record.hasFile ? (
          <Tag icon={<FileOutlined />} color="green">{record.fileSize || 'Yes'}</Tag>
        ) : (
          <Tag color="orange">No</Tag>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Deploy">
            <Button
              type="text"
              size="small"
              icon={<RocketOutlined />}
              style={{ color: '#1890ff' }}
              onClick={() => handleDeployVersion(record)}
            />
          </Tooltip>
          {record.hasFile && (
            <Tooltip title="Download">
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record.packageId)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Delete this version?"
            description="This will permanently remove this package version."
            onConfirm={() => handleDeletePackage(record.packageId)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Software Hub</Title>
      <Text type="secondary">
        Manage software packages for deployment to agents
      </Text>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="Total Packages"
              value={stats?.totalPackages || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="Total Size"
              value={formatBytes(stats?.totalSize || 0)}
              prefix={<CloudOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              placeholder="Search packages..."
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
            <Select
              placeholder="Platform"
              style={{ width: 140 }}
              allowClear
              options={PLATFORM_OPTIONS}
              onChange={(value) => handleFilterChange('platform', value)}
            />
            <Select
              placeholder="Category"
              style={{ width: 140 }}
              allowClear
              options={CATEGORY_OPTIONS}
              onChange={(value) => handleFilterChange('category', value)}
            />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              Refresh
            </Button>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setBundleUploadVisible(true)}
            >
              Upload Bundle
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Add Package
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Packages Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={groupedPackages}
          rowKey={(record) => `${record.name}|||${record.platform}`}
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} software titles`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingPackage ? 'Edit Package' : 'Add Package'}
        open={createModalVisible || !!editingPackage}
        onCancel={() => {
          setCreateModalVisible(false);
          setEditingPackage(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingPackage ? handleUpdatePackage : handleCreatePackage}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Package Name"
                rules={[{ required: true, message: 'Package name is required' }]}
              >
                <Input placeholder="e.g., google-chrome" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="displayName"
                label="Display Name"
                rules={[{ required: true, message: 'Display name is required' }]}
              >
                <Input placeholder="e.g., Google Chrome" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="version"
                label="Version"
                rules={[{ required: true, message: 'Version is required' }]}
              >
                <Input placeholder="e.g., 120.0.0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="platform"
                label="Platform"
                rules={[{ required: true, message: 'Platform is required' }]}
              >
                <Select options={PLATFORM_OPTIONS} placeholder="Select platform" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="installSource"
                label="Install Source"
                rules={[{ required: true, message: 'Install source is required' }]}
              >
                <Select options={INSTALL_SOURCE_OPTIONS} placeholder="Select source" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="vendor" label="Vendor">
                <Input placeholder="e.g., Google" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="Category">
                <Select options={CATEGORY_OPTIONS} placeholder="Select category" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="architecture" label="Architecture">
                <Select options={ARCHITECTURE_OPTIONS} placeholder="Select architecture" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Package description" />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" placeholder="Add tags" />
          </Form.Item>

          <Divider orientationMargin={0}>
            <Text strong>Installation Options</Text>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="silentInstall" label="Silent Install" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="requiresReboot" label="Requires Reboot" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="supportsRollback" label="Supports Rollback" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="downloadUrl" label="Download URL (optional)">
            <Input placeholder="https://example.com/package.deb" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  setEditingPackage(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPackage ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Package Details Drawer with Tabs */}
      <Drawer
        title={
          selectedGroup ? (
            <Space>
              {getPlatformIcon(selectedGroup.platform)}
              <span>{selectedGroup.displayName}</span>
            </Space>
          ) : 'Package Details'
        }
        placement="right"
        styles={{ wrapper: { width: 600 } }}
        open={detailsDrawerVisible}
        onClose={() => {
          setDetailsDrawerVisible(false);
          setSelectedGroup(null);
        }}
      >
        {selectedGroup && (
          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: 'details',
                label: 'Details',
                children: (
                  <div>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Text type="secondary">Latest Package ID</Text>
                        <div><Text code>{selectedGroup.latestPackageId}</Text></div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">Latest Version</Text>
                        <div><Text strong>{selectedGroup.latestVersion}</Text></div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">Platform</Text>
                        <div><Tag>{selectedGroup.platform}</Tag></div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">Total Versions</Text>
                        <div><Badge count={selectedGroup.totalVersions} style={{ backgroundColor: '#1890ff' }} /></div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">Category</Text>
                        <div>{selectedGroup.category ? <Tag color="blue">{selectedGroup.category}</Tag> : '-'}</div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">Vendor</Text>
                        <div>{selectedGroup.vendor || '-'}</div>
                      </Col>
                    </Row>

                    <Divider />

                    <Text type="secondary">Description</Text>
                    <div style={{ marginTop: 8 }}>
                      {selectedGroup.description || 'No description provided'}
                    </div>

                    <Divider />

                    <Text type="secondary">Tags</Text>
                    <div style={{ marginTop: 8 }}>
                      {selectedGroup.tags && selectedGroup.tags.length > 0 ? (
                        <Space wrap>
                          {selectedGroup.tags.map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </Space>
                      ) : (
                        '-'
                      )}
                    </div>

                    <Divider />

                    <Space>
                      <Button
                        type="primary"
                        icon={<RocketOutlined />}
                        onClick={() => handleDeployGroup(selectedGroup)}
                      >
                        Deploy Latest
                      </Button>
                    </Space>
                  </div>
                ),
              },
              {
                key: 'versions',
                label: `Versions (${selectedGroup.totalVersions})`,
                children: (
                  <Table
                    columns={versionColumns}
                    dataSource={selectedGroup.versions}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 500 }}
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* Deploy Modal */}
      <Modal
        title={
          <Space>
            <RocketOutlined style={{ color: '#1890ff' }} />
            <span>Deploy Package</span>
          </Space>
        }
        open={deployModalVisible}
        onCancel={() => {
          setDeployModalVisible(false);
          setDeployingPackageId(null);
          setSelectedAgents([]);
          deployForm.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setDeployModalVisible(false);
              setDeployingPackageId(null);
              setSelectedAgents([]);
              deployForm.resetFields();
            }}
          >
            Cancel
          </Button>,
          <Button
            key="deploy"
            type="primary"
            icon={<RocketOutlined />}
            loading={deployLoading}
            onClick={handleDeploySubmit}
          >
            Deploy
          </Button>,
        ]}
        width={600}
      >
        {deployingPackageId && (
          <>
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Space>
                {getPlatformIcon(deployingPlatform)}
                <div>
                  <Text strong>{deployingDisplayName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {deployingPackageId} - v{deployingVersion} - {deployingInstallSource.toUpperCase()}
                  </Text>
                </div>
              </Space>
            </Card>

            <Form form={deployForm} layout="vertical">
              <Form.Item
                name="deploymentName"
                label="Deployment Name"
                rules={[{ required: true, message: 'Please enter deployment name' }]}
              >
                <Input placeholder="Enter deployment name" />
              </Form.Item>

              <Form.Item
                name="deploymentType"
                label="Deployment Type"
                rules={[{ required: true, message: 'Please select deployment type' }]}
              >
                <Select>
                  <Select.Option value="install">Install</Select.Option>
                  <Select.Option value="upgrade">Upgrade</Select.Option>
                  <Select.Option value="uninstall">Uninstall</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>Target Endpoints</span>
                    <Tag color="blue">
                      {deployingPlatform === 'cross-platform'
                        ? 'All Platforms'
                        : deployingPlatform.charAt(0).toUpperCase() + deployingPlatform.slice(1) + ' Only'}
                    </Tag>
                  </Space>
                }
                required
                help={
                  getCompatibleAgents(deployingPlatform).length === 0
                    ? `No ${deployingPlatform} endpoints available`
                    : `${getCompatibleAgents(deployingPlatform).length} compatible endpoint(s) available`
                }
              >
                <Select
                  mode="multiple"
                  placeholder="Select target endpoints"
                  value={selectedAgents}
                  onChange={setSelectedAgents}
                  style={{ width: '100%' }}
                  optionFilterProp="children"
                  showSearch
                  notFoundContent={
                    agents.length === 0 ? 'Loading agents...' : 'No compatible endpoints found'
                  }
                >
                  {getCompatibleAgents(deployingPlatform).map((agent) => (
                    <Select.Option key={agent.id} value={agent.id}>
                      <Space>
                        {agent.osType === 'windows' && <WindowsOutlined style={{ color: '#0078d4' }} />}
                        {agent.osType === 'darwin' && <AppleOutlined style={{ color: '#000' }} />}
                        {agent.osType === 'linux' && <LinuxOutlined style={{ color: '#f9a825' }} />}
                        <span>{agent.hostname}</span>
                        <Tag color={agent.status === 'online' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                          {agent.status}
                        </Tag>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedAgents.length > 0 && (
                <div style={{ marginTop: -8, marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {selectedAgents.length} endpoint(s) selected
                  </Text>
                </div>
              )}
            </Form>
          </>
        )}
      </Modal>

      {/* Bundle Upload Modal */}
      <Modal
        title={
          <Space>
            <CodeOutlined style={{ color: '#52c41a' }} />
            <span>Upload Script Bundle</span>
          </Space>
        }
        open={bundleUploadVisible}
        onCancel={() => setBundleUploadVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Upload.Dragger
            accept=".tar.gz,.tgz"
            showUploadList={false}
            beforeUpload={handleBundleUpload}
            disabled={bundleUploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: bundleUploading ? '#999' : '#52c41a' }} />
            </p>
            <p className="ant-upload-text">
              {bundleUploading ? 'Uploading...' : 'Click or drag bundle file to upload'}
            </p>
            <p className="ant-upload-hint">
              Upload a .tar.gz bundle containing manifest.json and installation scripts
            </p>
          </Upload.Dragger>

          <Divider />

          <Card size="small" style={{ textAlign: 'left', background: '#f9f9f9' }}>
            <Title level={5}>Bundle Structure</Title>
            <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`package-bundle/
  manifest.json       # Required: Package metadata
  scripts/
    install.sh        # Required: Installation script
    update.sh         # Optional: Update script
    rollback.sh       # Optional: Rollback script
    uninstall.sh      # Optional: Uninstall script
  files/
    package.deb       # Optional: Package files`}
              </pre>
            </Text>
          </Card>

          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              Script bundles provide full control over installation behavior.
              The agent will execute the appropriate script based on the operation type.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};
