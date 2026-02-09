import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  App,
  Typography,
  Button,
  Tabs,
  Card,
  Row,
  Col,
  Tag,
  Badge,
  Table,
  Divider,
  Space,
  Breadcrumb,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Steps,
  Dropdown,
  Radio,
  InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  MoreOutlined,
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  CloseOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { patchService, type Patch, type AffectedSoftware, type FileDetail, type Vulnerability, type Endpoint } from '../../services/patch.service';
import { patchRecommendationService } from '../../services/patch-recommendation.service';
import type { PatchRecommendation } from '../../types/patch-recommendation.types';
import { settingsService } from '../../services/settings.service';
import { assetService } from '../../services/asset.service';
import { tagService } from '../../services/tag.service';
import { SeverityBadge, EndpointDetailsDrawer, OSIcon } from '../../components/patches';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const PatchDetails = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [patch, setPatch] = useState<Patch | null>(null);
  const [affectedSoftwares, setAffectedSoftwares] = useState<AffectedSoftware[]>([]);
  const [fileDetails, setFileDetails] = useState<FileDetail[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [recommendations, setRecommendations] = useState<PatchRecommendation[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [endpointDrawerOpen, setEndpointDrawerOpen] = useState(false);
  
  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  // Affected Products in edit step 2
  const [editAffectedProducts, setEditAffectedProducts] = useState<AffectedSoftware[]>([]);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [addProductForm] = Form.useForm();
  const [addProductLoading, setAddProductLoading] = useState(false);

  // Install/Deployment Modal
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [installForm] = Form.useForm();
  const [configType, setConfigType] = useState<'install' | 'rollback'>('install');
  const [selectedPatches, setSelectedPatches] = useState<Patch[]>([]);
  
  // Patches Selection Modal
  const [patchesModalVisible, setPatchesModalVisible] = useState(false);
  const [allPatches, setAllPatches] = useState<Patch[]>([]);
  const [patchesSearchText, setPatchesSearchText] = useState('');
  const [selectedPatchIds, setSelectedPatchIds] = useState<React.Key[]>([]);
  const [patchesLoading, setPatchesLoading] = useState(false);

  // Dynamic option lists
  const [endpointOptions, setEndpointOptions] = useState<any[]>([]);
  const [deploymentPolicies, setDeploymentPolicies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tagOptions, setTagOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [endpointsData, policiesData, usersData, tagsData] = await Promise.all([
          assetService.getAssets(),
          settingsService.getDeploymentPolicies(),
          settingsService.getUsers(),
          tagService.getTags(),
        ]);
        setEndpointOptions(endpointsData);
        setDeploymentPolicies(policiesData);
        setUsers(usersData);
        setTagOptions(tagsData);
      } catch {
        // Silently fail
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (id) {
      fetchPatchDetails(id);
    }
  }, [id]);

  const fetchPatchDetails = async (patchId: string) => {
    setLoading(true);
    try {
      const patchData = await patchService.getPatch(patchId);
      setPatch(patchData);

      // Fetch related data
      const [softwares, files, vulns, eps, recs] = await Promise.all([
        patchService.getAffectedSoftwares(patchId),
        patchService.getFileDetails(patchId),
        patchService.getVulnerabilities(patchId),
        patchService.getEndpoints(patchId),
        patchRecommendationService.getPatchRecommendations(patchId).catch(() => ({ data: [] })),
      ]);
      setAffectedSoftwares(softwares);
      setFileDetails(files);
      setVulnerabilities(vulns);
      setEndpoints(eps);
      setRecommendations(recs.data || []);
    } catch (error) {
      message.error('Failed to fetch patch details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/patches');
  };

  const handleEdit = () => {
    if (patch) {
      setCurrentStep(0);
      // Pre-fill the form with patch details
      form.setFieldsValue({
        software: patch.software,
        platform: patch.platform,
        description: patch.description,
        category: patch.category,
        severity: patch.severity,
        bulletinId: patch.bulletinId,
        kbNumber: patch.kbNumber,
        releaseDate: patch.releaseDate ? dayjs(patch.releaseDate) : null,
        rebootRequired: patch.rebootRequired === true ? true : patch.rebootRequired === false ? false : 'maybe',
        supportUninstallation: patch.supportUninstallation,
        architecture: patch.architecture,
        referenceUrl: patch.referenceUrl,
        languagesSupported: patch.languagesSupported || [],
        tags: patch.tags || [],
      });
      setEditModalVisible(true);
    }
  };

  const handleEditSubmit = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields();
        // Save step 1 changes
        if (patch) {
          const values = form.getFieldsValue();
          await patchService.updatePatch(patch.id, {
            ...patch,
            ...values,
            releaseDate: values.releaseDate?.format('YYYY-MM-DD') || patch.releaseDate,
          });
          // Load existing affected products for step 2
          const products = await patchService.getAffectedSoftwares(patch.id);
          setEditAffectedProducts(products);
        }
        setCurrentStep(1);
      } catch (error) {
        if ((error as { errorFields?: unknown }).errorFields) return;
        message.error('Failed to save patch');
      }
    } else {
      // Step 2 done — close modal
      message.success('Patch updated successfully');
      setEditModalVisible(false);
      setCurrentStep(0);
      form.resetFields();
      setEditAffectedProducts([]);
      if (patch) fetchPatchDetails(patch.id);
    }
  };

  const renderEditFormStep1 = () => (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="software"
            label="Name"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="platform"
            label="Platform"
            rules={[{ required: true, message: 'Please select platform' }]}
          >
            <Select placeholder="Select a platform">
              <Option value="Windows">Windows</Option>
              <Option value="MacOS">MacOS</Option>
              <Option value="Linux">Linux</Option>
              <Option value="Ubuntu">Ubuntu</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Description">
        <TextArea rows={3} placeholder="Textarea" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select category' }]}
          >
            <Select placeholder="Select">
              <Option value="Security Updates">Security Updates</Option>
              <Option value="Application Updates">Application Updates</Option>
              <Option value="Critical Updates">Critical Updates</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="severity"
            label="Severity"
            rules={[{ required: true, message: 'Please select severity' }]}
          >
            <Select placeholder="Select">
              <Option value="CRITICAL">CRITICAL</Option>
              <Option value="High">High</Option>
              <Option value="Medium">Medium</Option>
              <Option value="Low">Low</Option>
              <Option value="UNSPECIFIED">UNSPECIFIED</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="bulletinId"
            label="Bulletin ID"
            rules={[{ required: true, message: 'Please enter bulletin ID' }]}
          >
            <Input placeholder="Enter ID" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="kbNumber"
            label="KB Number"
            rules={[{ required: true, message: 'Please enter KB number' }]}
          >
            <Input placeholder="Enter KB number" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="releaseDate"
            label="Release Date"
            rules={[{ required: true, message: 'Please select release date' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="Enter release date" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="rebootRequired"
            label="Reboot Required"
            rules={[{ required: true, message: 'Please select' }]}
          >
            <Select placeholder="Select">
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
              <Option value="maybe">May Be</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="supportUninstallation"
            label="Support Uninstallation"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="architecture"
            label="Architecture"
            rules={[{ required: true, message: 'Please select architecture' }]}
          >
            <Select placeholder="Select">
              <Option value="64 BIT">64 BIT</Option>
              <Option value="32 BIT">32 BIT</Option>
              <Option value="Universal">Universal</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="referenceUrl"
        label="Reference URL"
        rules={[{ required: true, message: 'Please enter reference URL' }]}
      >
        <Input placeholder="Enter reference URL" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="languagesSupported"
            label="Languages Supported"
            rules={[{ required: true, message: 'Please select languages' }]}
          >
            <Select mode="multiple" placeholder="Select">
              <Option value="English">English</Option>
              <Option value="Spanish">Spanish</Option>
              <Option value="French">French</Option>
              <Option value="German">German</Option>
              <Option value="Chinese">Chinese</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="tags"
            label="Tags"
            rules={[{ required: true, message: 'Please select tags' }]}
          >
            <Select mode="tags" placeholder="Select">
              {tagOptions.map((t) => (
                <Option key={t.id} value={t.name}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  const handleAddAffectedProduct = async () => {
    try {
      const values = await addProductForm.validateFields();
      if (!patch) return;

      setAddProductLoading(true);
      const product = await patchService.addAffectedProduct(patch.id, {
        softwareName: values.softwareName,
        version: values.version,
        vendor: values.vendor,
        platform: values.platform,
      });
      setEditAffectedProducts((prev) => [...prev, product]);
      setAddProductModalVisible(false);
      addProductForm.resetFields();
      message.success('Affected product added');
    } catch (error) {
      if (!(error as { errorFields?: unknown }).errorFields) {
        message.error('Failed to add affected product');
      }
    } finally {
      setAddProductLoading(false);
    }
  };

  const handleRemoveAffectedProduct = async (productId: string) => {
    if (!patch) return;
    try {
      await patchService.removeAffectedProduct(patch.id, productId);
      setEditAffectedProducts((prev) => prev.filter((p) => p.id !== productId));
      message.success('Affected product removed');
    } catch {
      message.error('Failed to remove affected product');
    }
  };

  const renderEditFormStep2 = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Affected Products</Title>
        <Button type="link" onClick={() => { addProductForm.resetFields(); setAddProductModalVisible(true); }}>
          + Add Affected Product
        </Button>
      </div>

      <Table
        dataSource={editAffectedProducts}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'No affected products added yet. Click "Add Affected Product" above.' }}
        columns={[
          { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName' },
          { title: 'Version', dataIndex: 'version', key: 'version', render: (v: string) => v || '-' },
          { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', render: (v: string) => v || '-' },
          { title: 'Platform', dataIndex: 'platform', key: 'platform', render: (v: string) => v || '-' },
          { title: 'Installed On', dataIndex: 'installedOn', key: 'installedOn', render: (v: number) => `${v} endpoint${v !== 1 ? 's' : ''}` },
          {
            title: '',
            key: 'action',
            width: 50,
            render: (_: unknown, record: AffectedSoftware) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveAffectedProduct(record.id)} />
            ),
          },
        ]}
      />

      <Modal
        title="Add Affected Product"
        open={addProductModalVisible}
        onCancel={() => setAddProductModalVisible(false)}
        onOk={handleAddAffectedProduct}
        confirmLoading={addProductLoading}
        okText="Add"
      >
        <Form form={addProductForm} layout="vertical">
          <Form.Item name="softwareName" label="Software Name" rules={[{ required: true, message: 'Please enter software name' }]}>
            <Input placeholder="e.g., Microsoft Office" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="version" label="Version">
                <Input placeholder="e.g., 2021" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="vendor" label="Vendor">
                <Input placeholder="e.g., Microsoft" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="platform" label="Platform">
            <Select placeholder="Select platform" allowClear>
              <Option value="Windows">Windows</Option>
              <Option value="MacOS">MacOS</Option>
              <Option value="Linux">Linux</Option>
              <Option value="Cross-platform">Cross-platform</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  const handleEndpointClick = (endpointId: string) => {
    setSelectedEndpointId(endpointId);
    setEndpointDrawerOpen(true);
  };

  const handleEndpointDrawerClose = () => {
    setEndpointDrawerOpen(false);
    setSelectedEndpointId(null);
  };

  // Handle Approve/Not Approve
  const handleApproveToggle = () => {
    if (!patch) return;
    
    const isApproved = patch.approvalStatus === 'Approved';
    const actionText = isApproved ? 'not approve' : 'approve';
    
    Modal.confirm({
      title: `Do you want to ${actionText} this patch?`,
      onOk: async () => {
        try {
          const newStatus = isApproved ? 'Not Approved' : 'Approved';
          await patchService.updatePatch(patch.id, {
            ...patch,
            approvalStatus: newStatus,
          });
          message.success(`Patch ${actionText}d successfully`);
          fetchPatchDetails(patch.id);
        } catch (error) {
          message.error(`Failed to ${actionText} patch`);
        }
      },
    });
  };

  // Handle Decline
  const handleDecline = () => {
    if (!patch) return;
    
    Modal.confirm({
      title: 'Do you want to decline this patch?',
      onOk: async () => {
        try {
          await patchService.updatePatch(patch.id, {
            ...patch,
            approvalStatus: 'Declined',
          });
          message.success('Patch declined successfully');
          fetchPatchDetails(patch.id);
        } catch (error) {
          message.error('Failed to decline patch');
        }
      },
    });
  };

  // Fetch all patches for selection
  const fetchAllPatches = async () => {
    setPatchesLoading(true);
    try {
      const data = await patchService.getPatches();
      setAllPatches(data);
    } catch (error) {
      message.error('Failed to fetch patches');
    } finally {
      setPatchesLoading(false);
    }
  };

  // Handle Install
  const handleInstall = () => {
    if (!patch) return;
    setConfigType('install');
    installForm.resetFields();
    // Pre-select current patch
    setSelectedPatches([patch]);
    setSelectedPatchIds([patch.id]);
    setInstallModalVisible(true);
  };

  // Handle Add Patches button click
  const handleAddPatches = () => {
    // Pre-select already selected patches when opening modal
    setSelectedPatchIds(selectedPatches.map(p => p.id));
    if (!patchesModalVisible) {
      fetchAllPatches();
      setPatchesModalVisible(true);
    }
  };

  // Handle patch selection in modal
  const handlePatchesSelect = () => {
    const selected = allPatches.filter(p => selectedPatchIds.includes(p.id));
    setSelectedPatches(selected);
    setPatchesModalVisible(false);
    setSelectedPatchIds([]);
    setPatchesSearchText('');
  };

  // Handle patch selection change (checkboxes)
  const handlePatchSelectionChange = (selectedRowKeys: React.Key[]) => {
    setSelectedPatchIds(selectedRowKeys);
  };

  // Get action menu items for dropdown
  const getActionMenuItems = (): MenuProps['items'] => {
    if (!patch) return [];
    
    const isApproved = patch.approvalStatus === 'Approved';
    const isDeclined = patch.approvalStatus === 'Declined';
    
    const items: MenuProps['items'] = [
      {
        key: 'approve',
        label: isApproved ? 'Not Approve' : 'Approve',
        onClick: handleApproveToggle,
      },
      {
        key: 'decline',
        label: 'Decline',
        onClick: handleDecline,
      },
    ];

    // Only show Install if not declined
    if (!isDeclined) {
      items.push({
        key: 'install',
        label: 'Install',
        onClick: handleInstall,
      });
    }

    return items;
  };

  // Handle Install Form Submit
  const handleInstallSubmit = async () => {
    if (selectedPatches.length === 0) {
      message.warning('Please add at least one patch');
      return;
    }
    
    try {
      const values = await installForm.validateFields();
      const deploymentPayload = {
        name: values.name,
        description: values.description,
        type: configType.toUpperCase() as 'INSTALL' | 'ROLLBACK',
        patchIds: selectedPatches.map(p => p.id),
        scope: values.scope,
        endpointIds: values.endpoints || [],
        deploymentPolicy: values.deploymentPolicy,
        retryCount: values.retryCount,
        batchSize: values.batchSize,
        notifyTo: values.notifyTo,
      };

      await patchService.createDeployment(deploymentPayload);
      message.success('Patch deployment created successfully');
      setInstallModalVisible(false);
      installForm.resetFields();
      setSelectedPatches(patch ? [patch] : []);
      setSelectedPatchIds([]);
    } catch (error) {
      message.error('Failed to create patch deployment');
    }
  };

  const renderDetailsTab = () => {
    if (!patch) return null;

    return (
      <div>
        <Card bordered={false} style={{ backgroundColor: '#f5f5f5', marginBottom: 16 }}>
          <Title level={5} style={{ marginTop: 0 }}>
            {patch.software} ({patch.kbNumber})
          </Title>
          <Text type="secondary">{patch.description}</Text>

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col span={6}>
              <div>
                <Text type="secondary">Category</Text>
                <div><strong>{patch.category}</strong></div>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary">Severity</Text>
                <div><SeverityBadge severity={patch.severity} /></div>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary">Approval Status</Text>
                <div><Tag color="success">{patch.approvalStatus || 'N/A'}</Tag></div>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary">Test Status</Text>
                <div><Tag color="error">{patch.testStatus || 'N/A'}</Tag></div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={6}>
              <div>
                <Text type="secondary">Architecture</Text>
                <div><strong>{patch.architecture}</strong></div>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary">Bulletin ID</Text>
                <div><strong>{patch.bulletinId}</strong></div>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary">KB</Text>
                <div><strong>{patch.kbNumber}</strong></div>
              </div>
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary">Reference URL</Text>
                <div><a href={patch.referenceUrl} target="_blank" rel="noopener noreferrer">View</a></div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={6}>
              <div>
                <Text type="secondary">UUID</Text>
                <div><strong>{patch.patchId}</strong></div>
              </div>
            </Col>
          </Row>
        </Card>

        <Card title="Patch Details" bordered={false} style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div>
                <Text type="secondary">Tags</Text>
                <div>
                  {patch.tags?.map((tag) => (
                    <Tag key={tag} color="blue">{tag}</Tag>
                  ))}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">Released On</Text>
                <div><strong>{patch.releasedOn || patch.releaseDate}</strong></div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <div>
                <Text type="secondary">Source</Text>
                <div><strong>{patch.source || 'N/A'}</strong></div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">Status</Text>
                <div><strong>{patch.status || 'N/A'}</strong></div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <div>
                <Text type="secondary">Reboot Required</Text>
                <div><strong>{patch.rebootRequired ? 'Yes' : 'No'}</strong></div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">Download Status</Text>
                <div><strong>{patch.downloadStatus || 'N/A'}</strong></div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <div>
                <Text type="secondary">Created At</Text>
                <div><strong>{patch.createdAt || 'N/A'}</strong></div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">Downloaded On</Text>
                <div><strong>{patch.downloadedOn || 'N/A'}</strong></div>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <div>
                <Text type="secondary">Last Updated At</Text>
                <div><strong>{patch.lastUpdatedAt || 'N/A'}</strong></div>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text type="secondary">Size</Text>
                <div><strong>{patch.size || 'N/A'}</strong></div>
              </div>
            </Col>
          </Row>

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">CVE Number</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {patch.cveNumbers?.map((cve) => (
                <Tag key={cve} color="blue">{cve}</Tag>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Supersede KB Details" bordered={false}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Update Replace By</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {patch.supersededBy?.length ? (
                patch.supersededBy.map((kb) => (
                  <Tag key={kb} color="blue">{kb}</Tag>
                ))
              ) : (
                <strong>No KBs Found</strong>
              )}
            </div>
          </div>

          <div>
            <Text type="secondary">Update Replaces Following</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {patch.supersedes?.length ? (
                patch.supersedes.map((kb) => (
                  <Tag key={kb} color="blue">{kb}</Tag>
                ))
              ) : (
                <strong>No KBs Found</strong>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!patch) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={4}>Patch not found</Title>
        <Button type="primary" onClick={handleBack}>
          Back to All Patches
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: <a onClick={handleBack}>All Patches</a> },
            { title: patch.software },
          ]}
        />
      </div>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {patch.software}
          </Title>
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>
          <Dropdown menu={{ items: getActionMenuItems() }} trigger={['click']}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="details"
        items={[
          {
            key: 'details',
            label: 'Details',
            children: renderDetailsTab(),
          },
          {
            key: 'endpoints',
            label: 'Endpoints',
            children: (
              <Table
                dataSource={endpoints}
                rowKey="id"
                columns={[
                  {
                    title: 'Name',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string, record: Endpoint) => (
                      <Button
                        type="link"
                        style={{ padding: 0 }}
                        onClick={() => handleEndpointClick(record.id)}
                      >
                        {name}
                      </Button>
                    ),
                  },
                  { title: 'OS', dataIndex: 'os', key: 'os' },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => (
                      <Tag color={status === 'Online' ? 'success' : 'error'}>{status}</Tag>
                    ),
                  },
                  { title: 'Last Seen', dataIndex: 'lastSeen', key: 'lastSeen' },
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 80,
                    render: (_: unknown, record: Endpoint) => (
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handleEndpointClick(record.id)}
                        title="View Details"
                      />
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'recommendations',
            label: `Recommendations (${recommendations.length})`,
            children: (
              <Table
                dataSource={recommendations}
                rowKey="id"
                columns={[
                  {
                    title: 'Asset',
                    dataIndex: ['asset', 'name'],
                    key: 'assetName',
                    render: (name: string, record: PatchRecommendation) => (
                      <Button
                        type="link"
                        style={{ padding: 0 }}
                        onClick={() => navigate(`/assets/${record.asset.id}`)}
                      >
                        {name}
                      </Button>
                    ),
                  },
                  {
                    title: 'OS',
                    dataIndex: ['asset', 'os'],
                    key: 'os',
                    render: (os: string) => <Text>{os}</Text>,
                  },
                  {
                    title: 'CVE',
                    dataIndex: ['vulnerability', 'cveId'],
                    key: 'cveId',
                    render: (cveId: string) => <Text strong>{cveId}</Text>,
                  },
                  {
                    title: 'Severity',
                    dataIndex: 'severity',
                    key: 'severity',
                    render: (severity: string) => {
                      const colorMap: Record<string, string> = {
                        CRITICAL: '#ff4d4f',
                        HIGH: '#fa8c16',
                        MEDIUM: '#faad14',
                        LOW: '#52c41a',
                      };
                      return <Tag color={colorMap[severity] || '#d9d9d9'}>{severity}</Tag>;
                    },
                  },
                  {
                    title: 'Risk Score',
                    dataIndex: 'riskScore',
                    key: 'riskScore',
                    render: (score: number | null) => <Text>{score?.toFixed(0) || '-'}</Text>,
                    sorter: (a: PatchRecommendation, b: PatchRecommendation) =>
                      (a.riskScore || 0) - (b.riskScore || 0),
                    defaultSortOrder: 'descend' as const,
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => {
                      const statusMap: Record<string, 'success' | 'processing' | 'error' | 'warning' | 'default'> = {
                        verified: 'success',
                        deployed: 'processing',
                        accepted: 'processing',
                        failed: 'error',
                        rejected: 'error',
                        recommended: 'warning',
                      };
                      return (
                        <Badge
                          status={statusMap[status] || 'default'}
                          text={status.charAt(0).toUpperCase() + status.slice(1)}
                        />
                      );
                    },
                  },
                  {
                    title: 'Affected Software',
                    dataIndex: 'affectedSoftware',
                    key: 'affectedSoftware',
                    render: (text: string) => <Text type="secondary">{text || '-'}</Text>,
                  },
                ]}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} recommendations`,
                }}
              />
            ),
          },
          {
            key: 'affected-softwares',
            label: 'Affected Softwares',
            children: (
              <Table
                dataSource={affectedSoftwares}
                rowKey="id"
                columns={[
                  { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName', width: 300 },
                  { title: 'Version', dataIndex: 'version', key: 'version', width: 180 },
                  { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', width: 200 },
                  { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 120 },
                  { title: 'Installed On (Endpoints)', dataIndex: 'installedOn', key: 'installedOn', width: 180, align: 'center' as const },
                ]}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} affected softwares`,
                }}
              />
            ),
          },
          {
            key: 'file-details',
            label: 'File Details',
            children: (
              <Table
                dataSource={fileDetails}
                rowKey="id"
                columns={[
                  { title: 'File Name', dataIndex: 'fileName', key: 'fileName' },
                  { title: 'Version', dataIndex: 'version', key: 'version' },
                  { title: 'Size', dataIndex: 'size', key: 'size' },
                  { title: 'Path', dataIndex: 'path', key: 'path' },
                ]}
              />
            ),
          },
          {
            key: 'vulnerabilities',
            label: 'Vulnerabilities',
            children: (
              <Table
                dataSource={vulnerabilities}
                rowKey="id"
                columns={[
                  { title: 'CVE Number', dataIndex: 'cveNumber', key: 'cveNumber' },
                  {
                    title: 'Severity',
                    dataIndex: 'severity',
                    key: 'severity',
                    render: (severity) => <Tag color={severity === 'Critical' ? 'red' : 'orange'}>{severity}</Tag>,
                  },
                  { title: 'Description', dataIndex: 'description', key: 'description' },
                  { title: 'Published Date', dataIndex: 'publishedDate', key: 'publishedDate' },
                ]}
              />
            ),
          },
        ]}
      />

      <EndpointDetailsDrawer
        open={endpointDrawerOpen}
        endpointId={selectedEndpointId}
        onClose={handleEndpointDrawerClose}
      />

      {/* Edit Patch Modal */}
      <Modal
        title="Edit Patch"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setCurrentStep(0);
          form.resetFields();
        }}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(0)}>Back</Button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <Button onClick={() => {
                setEditModalVisible(false);
                setCurrentStep(0);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" onClick={handleEditSubmit} style={{ marginLeft: 8 }}>
                {currentStep === 0 ? 'Next' : 'Update Patch'}
              </Button>
            </div>
          </div>
        }
      >
        <Steps
          current={currentStep}
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Define Patch' },
            { title: 'Affected Products' },
          ]}
        />
        {currentStep === 0 ? renderEditFormStep1() : renderEditFormStep2()}
      </Modal>

      {/* Install/Deployment Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Create Patch Deployment</span>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => {
                setInstallModalVisible(false);
                installForm.resetFields();
              }}
            />
          </div>
        }
        open={installModalVisible}
        onCancel={() => {
          setInstallModalVisible(false);
          installForm.resetFields();
        }}
        width={900}
        footer={[
          <Button key="reset" onClick={() => {
            installForm.resetFields();
            setConfigType('install');
            if (patch) {
              setSelectedPatches([patch]);
              setSelectedPatchIds([patch.id]);
            } else {
              setSelectedPatches([]);
              setSelectedPatchIds([]);
            }
          }}>
            Reset
          </Button>,
          <Button key="publish" type="primary" onClick={handleInstallSubmit}>
            Publish
          </Button>,
        ]}
        closeIcon={null}
      >
        <Form
          form={installForm}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input placeholder="Name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Description" style={{ resize: 'vertical' }} />
          </Form.Item>

          <Form.Item
            name="configType"
            label={
              <span>
                Configuration Type <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select configuration type' }]}
            initialValue="install"
          >
            <Radio.Group
              value={configType}
              onChange={(e) => setConfigType(e.target.value)}
            >
              <Radio value="install">Install</Radio>
              <Radio value="rollback">Rollback</Radio>
            </Radio.Group>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
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
                  <Option value="Global">Global</Option>
                  <Option value="Group">Group</Option>
                  <Option value="Endpoint">Endpoint</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endpoints"
                label="Endpoints"
              >
                <Select placeholder="Please Select" style={{ width: '100%' }} mode="multiple">
                  {endpointOptions.map((e) => (
                    <Option key={e.id} value={e.id}>{e.hostname || e.name || e.id}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="patches"
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  Patches <Text type="danger">*</Text>
                </span>
                <Button type="link" icon={<PlusOutlined />} style={{ padding: 0 }} onClick={handleAddPatches}>
                  + Add Patches
                </Button>
              </div>
            }
            rules={[{ required: true, message: 'Please add at least one patch' }]}
          >
            {selectedPatches.length > 0 && (
              <Table
                dataSource={selectedPatches}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `showing 1-${total} of ${total} items`,
                }}
                columns={[
                  {
                    title: 'ID',
                    dataIndex: 'patchId',
                    key: 'patchId',
                    sorter: true,
                    render: (text: string) => (
                      <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
                    ),
                  },
                  {
                    title: 'Name',
                    dataIndex: 'software',
                    key: 'software',
                    sorter: true,
                    render: (text: string) => (
                      <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
                    ),
                  },
                  {
                    title: 'Severity',
                    dataIndex: 'severity',
                    key: 'severity',
                    sorter: true,
                    render: (severity: string) => <SeverityBadge severity={severity as any} />,
                  },
                  {
                    title: 'Platform',
                    dataIndex: 'os',
                    key: 'os',
                    sorter: true,
                    render: (os: string) => <OSIcon os={os as any} />,
                  },
                  {
                    title: 'Category',
                    dataIndex: 'category',
                    key: 'category',
                    sorter: true,
                  },
                  {
                    title: 'KBID',
                    dataIndex: 'kbNumber',
                    key: 'kbNumber',
                    sorter: true,
                  },
                  {
                    title: '',
                    key: 'action',
                    width: 50,
                    render: (_: any, record: Patch) => (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          const updated = selectedPatches.filter(p => p.id !== record.id);
                          setSelectedPatches(updated);
                        }}
                      />
                    ),
                  },
                ]}
                size="small"
              />
            )}
          </Form.Item>

          <Divider />

          <Title level={5} style={{ marginBottom: 16, color: '#1890ff' }}>
            Configuration Settings
          </Title>

          <Row gutter={16}>
            <Col span={12}>
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
                  {deploymentPolicies.map((p) => (
                    <Option key={p.id} value={p.id}>{p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="notifyTo"
                label="Notify to"
              >
                <Select placeholder="Please Select" style={{ width: '100%' }} mode="multiple">
                  {users.map((u) => (
                    <Option key={u.id} value={u.id}>{u.name || u.email}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="retryCount"
                label={
                  <span>
                    Retry Count <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter retry count' }]}
              >
                <InputNumber
                  placeholder="Retry Count"
                  style={{ width: '100%' }}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="batchSize"
                label="Batch Size"
              >
                <InputNumber
                  placeholder="Batch Size"
                  style={{ width: '100%' }}
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Select Patches Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>Select Patches</span>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchAllPatches}
                loading={patchesLoading}
              >
                Refresh
              </Button>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => {
                  setPatchesModalVisible(false);
                  setPatchesSearchText('');
                  setSelectedPatchIds([]);
                }}
              />
            </Space>
          </div>
        }
        open={patchesModalVisible}
        onCancel={() => {
          setPatchesModalVisible(false);
          setPatchesSearchText('');
          setSelectedPatchIds([]);
        }}
        width={1200}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setPatchesModalVisible(false);
              setPatchesSearchText('');
              setSelectedPatchIds([]);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="select"
            type="primary"
            onClick={handlePatchesSelect}
            disabled={selectedPatchIds.length === 0}
          >
            Select
          </Button>,
        ]}
        closeIcon={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={patchesSearchText}
            onChange={(e) => setPatchesSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>

        <Table
          rowSelection={{
            selectedRowKeys: selectedPatchIds,
            onChange: handlePatchSelectionChange,
          }}
          dataSource={allPatches.filter(p =>
            p.patchId.toLowerCase().includes(patchesSearchText.toLowerCase()) ||
            p.software.toLowerCase().includes(patchesSearchText.toLowerCase()) ||
            p.category.toLowerCase().includes(patchesSearchText.toLowerCase())
          )}
          rowKey="id"
          loading={patchesLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `showing ${range[0]}-${range[1]} of ${total} items`,
          }}
          columns={[
            {
              title: 'ID',
              dataIndex: 'patchId',
              key: 'patchId',
              sorter: (a, b) => a.patchId.localeCompare(b.patchId),
              render: (text: string) => (
                <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
              ),
            },
            {
              title: 'Name',
              dataIndex: 'software',
              key: 'software',
              sorter: (a, b) => a.software.localeCompare(b.software),
              render: (text: string) => (
                <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
              ),
            },
            {
              title: 'Severity',
              dataIndex: 'severity',
              key: 'severity',
              sorter: (a, b) => a.severity.localeCompare(b.severity),
              render: (severity: string) => <SeverityBadge severity={severity as any} />,
            },
            {
              title: 'Platform',
              dataIndex: 'os',
              key: 'os',
              sorter: (a, b) => a.os.localeCompare(b.os),
              render: (os: string) => <OSIcon os={os as any} />,
            },
            {
              title: 'Category',
              dataIndex: 'category',
              key: 'category',
              sorter: (a, b) => a.category.localeCompare(b.category),
            },
            {
              title: 'KBID',
              dataIndex: 'kbNumber',
              key: 'kbNumber',
              sorter: (a, b) => (a.kbNumber || '').localeCompare(b.kbNumber || ''),
            },
          ]}
          scroll={{ x: 'max-content' }}
        />
      </Modal>
    </div>
  );
};
