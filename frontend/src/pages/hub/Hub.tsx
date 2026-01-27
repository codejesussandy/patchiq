/**
 * Hub - Software Package Repository Management
 * Central repository for managing software packages that can be deployed to agents
 */

import { useState, useEffect, useCallback } from 'react';
import {
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
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tooltip,
  Switch,
  Drawer,
  Typography,
  Divider,
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

export const Hub = () => {
  const [packages, setPackages] = useState<SoftwarePackage[]>([]);
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
  const [selectedPackage, setSelectedPackage] = useState<SoftwarePackage | null>(null);
  const [uploadingPackageId, setUploadingPackageId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [deployForm] = Form.useForm();

  // Deploy modal state
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployingPackage, setDeployingPackage] = useState<SoftwarePackage | null>(null);
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
      const response = await hubService.listPackages({
        ...filters,
        search: searchText || undefined,
      });
      setPackages(response.data);
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

  const handleEdit = (pkg: SoftwarePackage) => {
    setEditingPackage(pkg);
    form.setFieldsValue({
      name: pkg.name,
      displayName: pkg.displayName,
      version: pkg.version,
      platform: pkg.platform,
      installSource: pkg.installSource,
      vendor: pkg.vendor,
      category: pkg.category,
      architecture: pkg.architecture,
      description: pkg.description,
      tags: pkg.tags,
      silentInstall: pkg.silentInstall,
      requiresReboot: pkg.requiresReboot,
      supportsRollback: pkg.supportsRollback,
    });
  };

  const handleViewDetails = (pkg: SoftwarePackage) => {
    setSelectedPackage(pkg);
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

  // Open deploy modal
  const handleDeploy = async (pkg: SoftwarePackage) => {
    setDeployingPackage(pkg);
    setSelectedAgents([]);
    deployForm.resetFields();
    deployForm.setFieldsValue({
      deploymentName: `Deploy ${pkg.displayName}`,
      deploymentType: 'install',
    });

    // Fetch agents if not already loaded
    if (agents.length === 0) {
      await fetchAgents();
    }

    setDeployModalVisible(true);
  };

  // Submit deployment
  const handleDeploySubmit = async () => {
    if (!deployingPackage) return;

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
        description: `Deploying ${deployingPackage.displayName} v${deployingPackage.version}`,
        type: values.deploymentType,
        targetAgentIds: selectedAgents,
        package: {
          packageId: deployingPackage.packageId, // Include packageId for Hub package detection
          name: deployingPackage.name,
          source: deployingPackage.installSource,
          version: deployingPackage.version,
          // Include packageUrl for deb/rpm/url sources
          ...(deployingPackage.downloadUrl && { packageUrl: deployingPackage.downloadUrl }),
        },
        retryCount: 1,
        notifyOnComplete: true,
      });

      message.success(
        <span>
          Deployment <strong>{result.deploymentId}</strong> created with {result.tasksCreated} task(s).{' '}
          <a href="/jobs/software-jobs/deployed">View status →</a>
        </span>
      );

      setDeployModalVisible(false);
      setDeployingPackage(null);
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

  const columns: ColumnsType<SoftwarePackage> = [
    {
      title: 'Package ID',
      dataIndex: 'packageId',
      key: 'packageId',
      width: 130,
      render: (text) => <Text code>{text}</Text>,
    },
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
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
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
      title: 'Source',
      dataIndex: 'installSource',
      key: 'installSource',
      width: 120,
      render: (source, record) => (
        <Space>
          {record.scriptsIncluded ? (
            <Tooltip title="Script bundle - includes install/update/rollback scripts">
              <Tag icon={<CodeOutlined />} color="green">BUNDLE</Tag>
            </Tooltip>
          ) : (
            <Tag color="purple">{source.toUpperCase()}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'File',
      dataIndex: 'hasFile',
      key: 'hasFile',
      width: 100,
      render: (hasFile, record) => (
        hasFile ? (
          <Tooltip title={record.fileSize}>
            <Tag icon={<FileOutlined />} color="green">
              {record.fileSize}
            </Tag>
          </Tooltip>
        ) : (
          <Tag color="orange">No File</Tag>
        )
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.isActive ? (
            <Tooltip title="Active">
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          ) : (
            <Tooltip title="Inactive">
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
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
      title: 'Actions',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Deploy to Endpoints">
            <Button
              type="text"
              size="small"
              icon={<RocketOutlined />}
              style={{ color: '#1890ff' }}
              onClick={() => handleDeploy(record)}
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
          {record.hasFile ? (
            <Tooltip title="Download">
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record.packageId)}
              />
            </Tooltip>
          ) : (
            <Upload
              showUploadList={false}
              beforeUpload={(file) => {
                handleUploadFile(record.packageId, file);
                return false;
              }}
            >
              <Tooltip title="Upload File">
                <Button
                  type="text"
                  size="small"
                  icon={<UploadOutlined />}
                  loading={uploadingPackageId === record.packageId}
                />
              </Tooltip>
            </Upload>
          )}
          <Popconfirm
            title="Delete Package"
            description="Are you sure you want to delete this package?"
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
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Packages"
              value={stats?.totalPackages || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Packages"
              value={stats?.activePackages || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Bundles"
              value={stats?.totalBundles || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Size"
              value={stats?.totalSize || '0 B'}
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
          dataSource={packages}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} packages`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
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

      {/* Package Details Drawer */}
      <Drawer
        title="Package Details"
        placement="right"
        width={500}
        open={detailsDrawerVisible}
        onClose={() => {
          setDetailsDrawerVisible(false);
          setSelectedPackage(null);
        }}
      >
        {selectedPackage && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              {getPlatformIcon(selectedPackage.platform)}
              <Title level={4} style={{ margin: 0 }}>
                {selectedPackage.displayName}
              </Title>
            </Space>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Package ID</Text>
                <div><Text code>{selectedPackage.packageId}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Version</Text>
                <div><Text strong>{selectedPackage.version}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Platform</Text>
                <div><Tag>{selectedPackage.platform}</Tag></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Install Source</Text>
                <div><Tag color="purple">{selectedPackage.installSource}</Tag></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Category</Text>
                <div>{selectedPackage.category ? <Tag color="blue">{selectedPackage.category}</Tag> : '-'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Vendor</Text>
                <div>{selectedPackage.vendor || '-'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Architecture</Text>
                <div>{selectedPackage.architecture || '-'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">File Size</Text>
                <div>{selectedPackage.fileSize || 'No file uploaded'}</div>
              </Col>
            </Row>

            <Divider />

            <Text type="secondary">Description</Text>
            <div style={{ marginTop: 8 }}>
              {selectedPackage.description || 'No description provided'}
            </div>

            <Divider />

            <Text type="secondary">Tags</Text>
            <div style={{ marginTop: 8 }}>
              {selectedPackage.tags && selectedPackage.tags.length > 0 ? (
                <Space wrap>
                  {selectedPackage.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )}
            </div>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Text type="secondary">Silent Install</Text>
                <div>{selectedPackage.silentInstall ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Requires Reboot</Text>
                <div>{selectedPackage.requiresReboot ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Supports Rollback</Text>
                <div>{selectedPackage.supportsRollback ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}</div>
              </Col>
            </Row>

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">
                Created: {new Date(selectedPackage.createdAt).toLocaleString()}
              </Text>
              <Space>
                <Button icon={<EditOutlined />} onClick={() => handleEdit(selectedPackage)}>
                  Edit
                </Button>
                {selectedPackage.hasFile && (
                  <Button
                    icon={<DownloadOutlined />}
                    type="primary"
                    onClick={() => handleDownload(selectedPackage.packageId)}
                  >
                    Download
                  </Button>
                )}
              </Space>
            </Space>
          </div>
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
          setDeployingPackage(null);
          setSelectedAgents([]);
          deployForm.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setDeployModalVisible(false);
              setDeployingPackage(null);
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
        {deployingPackage && (
          <>
            {/* Package Info */}
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Space>
                {getPlatformIcon(deployingPackage.platform)}
                <div>
                  <Text strong>{deployingPackage.displayName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {deployingPackage.packageId} • v{deployingPackage.version} • {deployingPackage.installSource.toUpperCase()}
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
                      {deployingPackage.platform === 'cross-platform'
                        ? 'All Platforms'
                        : deployingPackage.platform.charAt(0).toUpperCase() + deployingPackage.platform.slice(1) + ' Only'}
                    </Tag>
                  </Space>
                }
                required
                help={
                  getCompatibleAgents(deployingPackage.platform).length === 0
                    ? `No ${deployingPackage.platform} endpoints available`
                    : `${getCompatibleAgents(deployingPackage.platform).length} compatible endpoint(s) available`
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
                  {getCompatibleAgents(deployingPackage.platform).map((agent) => (
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
