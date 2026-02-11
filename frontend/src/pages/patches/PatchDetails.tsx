import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  App,
  Typography,
  Button,
  Tabs,
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
  Descriptions,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  MoreOutlined,
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { patchService, type Patch, type AffectedSoftware, type FileDetail, type Vulnerability, type Endpoint } from '../../services/patch.service';
import { patchRecommendationService } from '../../services/patch-recommendation.service';
import type { PatchRecommendation } from '../../types/patch-recommendation.types';
import { tagService } from '../../services/tag.service';
import { agentService, type Agent } from '../../services/agent.service';
import { vulnerabilityService } from '../../services/vulnerability.service';
import { SeverityBadge, EndpointDetailsDrawer, OSIcon } from '../../components/patches';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================
// Shared form section header
// ============================================
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4, marginBottom: 16 }}>
    <Text strong style={{ fontSize: 13 }}>{children}</Text>
  </Divider>
);

// ============================================
// Reusable Patch Form (same structure as AllPatches)
// ============================================
interface PatchFormProps {
  form: ReturnType<typeof Form.useForm>[0];
  tags: Array<{ id: string; name: string }>;
  cveSuggestions: Array<{ cveId: string; severity: string; description: string }>;
  onCveFocus: (software?: string, vendor?: string) => void;
}

const PatchFormFields = ({ form, tags, cveSuggestions, onCveFocus }: PatchFormProps) => (
  <Form form={form} layout="vertical">
    <SectionTitle>Identity</SectionTitle>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="software" label="Software Name" rules={[{ required: true, message: 'Please enter software name' }]}>
          <Input placeholder="e.g., 7-Zip 24.01" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="platform" label="Platform" rules={[{ required: true, message: 'Please select platform' }]}>
          <Select placeholder="Select platform">
            <Option value="Windows">Windows</Option>
            <Option value="MacOS">MacOS</Option>
            <Option value="Linux">Linux</Option>
            <Option value="Ubuntu">Ubuntu</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="vendor" label="Vendor">
          <Input placeholder="e.g., Microsoft, Igor Pavlov" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="product" label="Product">
          <Input placeholder="e.g., 7-Zip, Visual Studio Code" />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item name="description" label="Description">
      <TextArea rows={2} placeholder="Brief description of the patch" />
    </Form.Item>

    <SectionTitle>Classification</SectionTitle>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="severity" label="Severity" rules={[{ required: true, message: 'Please select severity' }]}>
          <Select placeholder="Select severity">
            <Option value="CRITICAL">Critical</Option>
            <Option value="High">High</Option>
            <Option value="Medium">Medium</Option>
            <Option value="Low">Low</Option>
            <Option value="UNSPECIFIED">Unspecified</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
          <Select placeholder="Select category">
            <Option value="Security Updates">Security Updates</Option>
            <Option value="Application Updates">Application Updates</Option>
            <Option value="Critical Updates">Critical Updates</Option>
            <Option value="Feature Packs">Feature Packs</Option>
            <Option value="Driver Updates">Driver Updates</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="tags" label="Tags">
          <Select mode="tags" placeholder="Add tags">
            {tags.map((t) => (
              <Option key={t.id} value={t.name}>{t.name}</Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="cveNumbers" label="CVE Numbers">
          <Select
            mode="tags"
            placeholder="e.g., CVE-2024-12345"
            tokenSeparators={[',', ' ']}
            onFocus={() => {
              const software = form.getFieldValue('software');
              const vendor = form.getFieldValue('vendor');
              if (software) onCveFocus(software, vendor);
            }}
          >
            {cveSuggestions.map((s) => (
              <Option key={s.cveId} value={s.cveId}>
                {s.cveId} ({s.severity}) — {s.description.slice(0, 80)}...
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
    </Row>

    <SectionTitle>Technical Details</SectionTitle>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item name="bulletinId" label="Bulletin ID">
          <Input placeholder="e.g., MS24-001" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="kbNumber" label="KB Number">
          <Input placeholder="e.g., KB5034441" />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="releaseDate" label="Release Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item name="architecture" label="Architecture">
          <Select placeholder="Select" allowClear>
            <Option value="64 BIT">64-bit</Option>
            <Option value="32 BIT">32-bit</Option>
            <Option value="Universal">Universal</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="rebootRequired" label="Reboot Required" valuePropName="checked" initialValue={false}>
          <Switch />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="supportUninstallation" label="Supports Uninstall" valuePropName="checked" initialValue={false}>
          <Switch />
        </Form.Item>
      </Col>
    </Row>

    <SectionTitle>References</SectionTitle>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="referenceUrl" label="Reference URL">
          <Input placeholder="https://..." />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="languagesSupported" label="Languages Supported">
          <Select mode="multiple" placeholder="Select languages" allowClear>
            <Option value="English">English</Option>
            <Option value="Spanish">Spanish</Option>
            <Option value="French">French</Option>
            <Option value="German">German</Option>
            <Option value="Chinese">Chinese</Option>
            <Option value="Japanese">Japanese</Option>
            <Option value="Korean">Korean</Option>
            <Option value="Portuguese">Portuguese</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
  </Form>
);

// ============================================
// Affected Products Step
// ============================================
interface AffectedProductsStepProps {
  patchId: string | null;
  affectedProducts: AffectedSoftware[];
  setAffectedProducts: React.Dispatch<React.SetStateAction<AffectedSoftware[]>>;
}

const AffectedProductsStep = ({ patchId, affectedProducts, setAffectedProducts }: AffectedProductsStepProps) => {
  const { message } = App.useApp();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      if (!patchId) return;
      setLoading(true);
      const product = await patchService.addAffectedProduct(patchId, {
        softwareName: values.softwareName,
        version: values.version,
        vendor: values.vendor,
        platform: values.platform,
      });
      setAffectedProducts((prev) => [...prev, product]);
      setAddModalVisible(false);
      addForm.resetFields();
      message.success('Affected product added');
    } catch (error) {
      if (!(error as { errorFields?: unknown }).errorFields) {
        message.error('Failed to add affected product');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    if (!patchId) return;
    try {
      await patchService.removeAffectedProduct(patchId, productId);
      setAffectedProducts((prev) => prev.filter((p) => p.id !== productId));
      message.success('Affected product removed');
    } catch {
      message.error('Failed to remove affected product');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Affected Products</Title>
        <Button type="link" onClick={() => { addForm.resetFields(); setAddModalVisible(true); }}>
          + Add Affected Product
        </Button>
      </div>
      <Table
        dataSource={affectedProducts}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'No affected products. Click "+ Add Affected Product" above.' }}
        columns={[
          { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName' },
          { title: 'Version', dataIndex: 'version', key: 'version', render: (v: string) => v || '-' },
          { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', render: (v: string) => v || '-' },
          { title: 'Platform', dataIndex: 'platform', key: 'platform', render: (v: string) => v || '-' },
          { title: 'Installed On', dataIndex: 'installedOn', key: 'installedOn', render: (v: number) => `${v ?? 0} endpoint${v !== 1 ? 's' : ''}` },
          {
            title: '', key: 'action', width: 50,
            render: (_: unknown, record: AffectedSoftware) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record.id)} />
            ),
          },
        ]}
      />
      <Modal title="Add Affected Product" open={addModalVisible} onCancel={() => setAddModalVisible(false)} onOk={handleAdd} confirmLoading={loading} okText="Add">
        <Form form={addForm} layout="vertical">
          <Form.Item name="softwareName" label="Software Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="e.g., Microsoft Office" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="version" label="Version"><Input placeholder="e.g., 2021" /></Form.Item></Col>
            <Col span={12}><Form.Item name="vendor" label="Vendor"><Input placeholder="e.g., Microsoft" /></Form.Item></Col>
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
};

// ============================================
// Helper: format date nicely
// ============================================
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  const d = dayjs(date);
  return d.isValid() ? d.format('MMM D, YYYY') : '-';
};

// ============================================
// Main Component
// ============================================
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
  const [editStep, setEditStep] = useState(0);
  const [form] = Form.useForm();
  const [savingPatch, setSavingPatch] = useState(false);
  const [editAffectedProducts, setEditAffectedProducts] = useState<AffectedSoftware[]>([]);

  // Deploy Modal
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployForm] = Form.useForm();
  const [deployLoading, setDeployLoading] = useState(false);

  // Options
  const [tagOptions, setTagOptions] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cveSuggestions, setCveSuggestions] = useState<Array<{ cveId: string; severity: string; description: string }>>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [tagsData, agentsData] = await Promise.all([
          tagService.getTags(),
          agentService.getAgents(),
        ]);
        setTagOptions(tagsData);
        setAgents(agentsData);
      } catch { /* silently fail */ }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (id) fetchPatchDetails(id);
  }, [id]);

  const fetchPatchDetails = async (patchId: string) => {
    setLoading(true);
    try {
      const patchData = await patchService.getPatch(patchId);
      setPatch(patchData);

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
    } catch {
      message.error('Failed to fetch patch details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCveSuggestions = async (software?: string, vendor?: string) => {
    if (!software) return;
    try {
      const suggestions = await vulnerabilityService.suggestCvesForSoftware(software, vendor);
      setCveSuggestions(suggestions);
    } catch { /* silently fail */ }
  };

  // ============================================
  // Edit
  // ============================================

  const openEditModal = () => {
    if (!patch) return;
    setEditStep(0);
    form.resetFields();
    form.setFieldsValue({
      software: patch.software,
      platform: patch.platform || patch.os,
      vendor: patch.vendor,
      product: patch.product,
      description: patch.description,
      severity: patch.severity,
      category: patch.category,
      bulletinId: patch.bulletinId,
      kbNumber: patch.kbNumber,
      releaseDate: patch.releaseDate ? dayjs(patch.releaseDate) : undefined,
      rebootRequired: patch.rebootRequired ?? false,
      supportUninstallation: patch.supportUninstallation ?? false,
      architecture: patch.architecture,
      referenceUrl: patch.referenceUrl,
      languagesSupported: patch.languagesSupported || [],
      tags: patch.tags || [],
      cveNumbers: patch.cveNumbers || [],
    });
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditStep(0);
    form.resetFields();
    setEditAffectedProducts([]);
  };

  const handleEditNext = async () => {
    if (editStep === 0) {
      try {
        await form.validateFields();
        setSavingPatch(true);
        const values = form.getFieldsValue();
        const payload = {
          software: values.software,
          platform: values.platform,
          os: values.platform,
          vendor: values.vendor || undefined,
          product: values.product || undefined,
          description: values.description || undefined,
          severity: values.severity,
          category: values.category,
          bulletinId: values.bulletinId || undefined,
          kbNumber: values.kbNumber || undefined,
          releaseDate: values.releaseDate?.format('YYYY-MM-DD') || undefined,
          rebootRequired: values.rebootRequired ?? false,
          supportUninstallation: values.supportUninstallation ?? false,
          architecture: values.architecture || undefined,
          referenceUrl: values.referenceUrl || undefined,
          languagesSupported: values.languagesSupported || [],
          tags: values.tags || [],
          cveNumbers: values.cveNumbers || [],
        };
        await patchService.updatePatch(patch!.id, payload);
        const products = await patchService.getAffectedSoftwares(patch!.id);
        setEditAffectedProducts(products);
        setEditStep(1);
      } catch (error) {
        if ((error as { errorFields?: unknown }).errorFields) return;
        message.error('Failed to save patch');
      } finally {
        setSavingPatch(false);
      }
    } else {
      message.success('Patch updated successfully');
      closeEditModal();
      if (patch) fetchPatchDetails(patch.id);
    }
  };

  // ============================================
  // Actions (Approve / Decline)
  // ============================================

  const handleStatusChange = async (newStatus: string, actionText: string) => {
    if (!patch) return;
    try {
      await patchService.updatePatch(patch.id, { approvalStatus: newStatus });
      message.success(`Patch ${actionText} successfully`);
      fetchPatchDetails(patch.id);
    } catch {
      message.error(`Failed to ${actionText} patch`);
    }
  };

  // ============================================
  // Deploy
  // ============================================

  const handleDeploySubmit = async () => {
    if (!patch) return;
    try {
      const values = await deployForm.validateFields();
      setDeployLoading(true);

      const targetAgentIds = values.targetAgentIds as string[];
      await patchService.createDeployment({
        name: values.deploymentName || `Deploy ${patch.software}`,
        description: values.description,
        targetAgentIds,
        patches: [{ id: patch.id, patchId: patch.patchId, name: patch.software }],
        retryCount: values.retryCount || 1,
      });

      message.success(`Deployment created for ${patch.software} to ${targetAgentIds.length} agent(s)`);
      setDeployModalVisible(false);
      deployForm.resetFields();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Failed to create deployment');
    } finally {
      setDeployLoading(false);
    }
  };

  // ============================================
  // Action menu
  // ============================================

  const getActionMenuItems = (): MenuProps['items'] => {
    if (!patch) return [];
    const isApproved = patch.approvalStatus === 'Approved' || patch.approvalStatus === 'approved';
    return [
      {
        key: 'approve',
        label: isApproved ? 'Revoke Approval' : 'Approve',
        onClick: () => handleStatusChange(isApproved ? 'Pending' : 'Approved', isApproved ? 'approval revoked' : 'approved'),
      },
      {
        key: 'decline',
        label: 'Decline',
        danger: true,
        onClick: () => handleStatusChange('Rejected', 'declined'),
      },
    ];
  };

  // ============================================
  // Details Tab
  // ============================================

  const renderDetailsTab = () => {
    if (!patch) return null;

    const approvalColor = (() => {
      const s = (patch.approvalStatus || '').toLowerCase();
      if (s === 'approved') return 'success';
      if (s === 'rejected' || s === 'declined') return 'error';
      return 'default';
    })();

    const testColor = (() => {
      const s = (patch.testStatus || '').toLowerCase();
      if (s === 'passed' || s === 'tested') return 'success';
      if (s === 'failed' || s === 'test failed') return 'error';
      return 'default';
    })();

    return (
      <div>
        {/* Summary strip */}
        <div style={{ background: '#fafafa', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>
            {patch.software}
          </Title>
          {patch.description && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{patch.description}</Text>
          )}
          <Row gutter={[24, 12]}>
            <Col><Text type="secondary">Severity</Text><div><SeverityBadge severity={patch.severity} /></div></Col>
            <Col><Text type="secondary">Category</Text><div><Text strong>{patch.category}</Text></div></Col>
            <Col><Text type="secondary">Platform</Text><div><OSIcon os={patch.os as any} /></div></Col>
            <Col><Text type="secondary">Approval</Text><div><Tag color={approvalColor}>{patch.approvalStatus || 'Pending'}</Tag></div></Col>
            <Col><Text type="secondary">Test Status</Text><div><Tag color={testColor}>{patch.testStatus || 'Not Tested'}</Tag></div></Col>
            <Col><Text type="secondary">Endpoints</Text><div><Text strong>{patch.endpoints}</Text></div></Col>
          </Row>
        </div>

        {/* Main details */}
        <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Patch ID">{patch.patchId}</Descriptions.Item>
          <Descriptions.Item label="KB Number">{patch.kbNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Bulletin ID">{patch.bulletinId || '-'}</Descriptions.Item>
          <Descriptions.Item label="Architecture">{patch.architecture || '-'}</Descriptions.Item>
          <Descriptions.Item label="Vendor">{patch.vendor || '-'}</Descriptions.Item>
          <Descriptions.Item label="Product">{patch.product || '-'}</Descriptions.Item>
          <Descriptions.Item label="Release Date">{formatDate(patch.releaseDate)}</Descriptions.Item>
          <Descriptions.Item label="Created">{formatDate(patch.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Reboot Required">{patch.rebootRequired ? 'Yes' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Supports Uninstall">{patch.supportUninstallation ? 'Yes' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Reference URL">
            {patch.referenceUrl ? (
              <a href={patch.referenceUrl} target="_blank" rel="noopener noreferrer">{patch.referenceUrl}</a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Source">{patch.source || '-'}</Descriptions.Item>
        </Descriptions>

        {/* Tags & CVEs */}
        {(patch.tags?.length > 0 || (patch.cveNumbers && patch.cveNumbers.length > 0)) && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={24}>
              {patch.tags?.length > 0 && (
                <Col span={12}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Tags</Text>
                  <Space wrap>{patch.tags.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>)}</Space>
                </Col>
              )}
              {patch.cveNumbers && patch.cveNumbers.length > 0 && (
                <Col span={12}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>CVE Numbers</Text>
                  <Space wrap>{patch.cveNumbers.map((cve) => <Tag key={cve} color="orange">{cve}</Tag>)}</Space>
                </Col>
              )}
            </Row>
          </>
        )}

        {/* Supersedence — only show if data exists */}
        {((patch.supersededBy && patch.supersededBy.length > 0) || (patch.supersedes && patch.supersedes.length > 0)) && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Supersedence</Text>
            <Row gutter={24}>
              {patch.supersededBy && patch.supersededBy.length > 0 && (
                <Col span={12}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Replaced By</Text>
                  <Space wrap>{patch.supersededBy.map((kb) => <Tag key={kb}>{kb}</Tag>)}</Space>
                </Col>
              )}
              {patch.supersedes && patch.supersedes.length > 0 && (
                <Col span={12}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Replaces</Text>
                  <Space wrap>{patch.supersedes.map((kb) => <Tag key={kb}>{kb}</Tag>)}</Space>
                </Col>
              )}
            </Row>
          </>
        )}
      </div>
    );
  };

  // ============================================
  // Loading / Not Found
  // ============================================

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
        <Button type="primary" onClick={() => navigate('/patches')}>Back to All Patches</Button>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb items={[
          { title: <a onClick={() => navigate('/patches')}>All Patches</a> },
          { title: patch.software },
        ]} />
      </div>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patches')}>Back</Button>
          <Title level={3} style={{ margin: 0 }}>{patch.software}</Title>
          <SeverityBadge severity={patch.severity} />
        </Space>
        <Space>
          <Button icon={<RocketOutlined />} type="primary" onClick={() => setDeployModalVisible(true)}>
            Deploy
          </Button>
          <Button icon={<EditOutlined />} onClick={openEditModal}>Edit</Button>
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
            label: `Endpoints (${endpoints.length})`,
            children: (
              <Table
                dataSource={endpoints}
                rowKey="id"
                columns={[
                  {
                    title: 'Name', dataIndex: 'name', key: 'name',
                    render: (name: string, record: Endpoint) => (
                      <Button type="link" style={{ padding: 0 }} onClick={() => { setSelectedEndpointId(record.id); setEndpointDrawerOpen(true); }}>
                        {name}
                      </Button>
                    ),
                  },
                  { title: 'OS', dataIndex: 'os', key: 'os' },
                  {
                    title: 'Status', dataIndex: 'status', key: 'status',
                    render: (status: string) => <Tag color={status === 'Online' ? 'success' : 'error'}>{status}</Tag>,
                  },
                  { title: 'Last Seen', dataIndex: 'lastSeen', key: 'lastSeen' },
                  {
                    title: '', key: 'actions', width: 60,
                    render: (_: unknown, record: Endpoint) => (
                      <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedEndpointId(record.id); setEndpointDrawerOpen(true); }} />
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
                    title: 'Asset', dataIndex: ['asset', 'name'], key: 'assetName',
                    render: (name: string, record: PatchRecommendation) => (
                      <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/assets/${record.asset.id}`)}>
                        {name}
                      </Button>
                    ),
                  },
                  { title: 'OS', dataIndex: ['asset', 'os'], key: 'os' },
                  { title: 'CVE', dataIndex: ['vulnerability', 'cveId'], key: 'cveId', render: (cveId: string) => <Text strong>{cveId}</Text> },
                  {
                    title: 'Severity', dataIndex: 'severity', key: 'severity',
                    render: (severity: string) => {
                      const colorMap: Record<string, string> = { CRITICAL: '#ff4d4f', HIGH: '#fa8c16', MEDIUM: '#faad14', LOW: '#52c41a' };
                      return <Tag color={colorMap[severity] || '#d9d9d9'}>{severity}</Tag>;
                    },
                  },
                  {
                    title: 'Risk Score', dataIndex: 'riskScore', key: 'riskScore',
                    render: (score: number | null) => <Text>{score?.toFixed(0) || '-'}</Text>,
                    sorter: (a: PatchRecommendation, b: PatchRecommendation) => (a.riskScore || 0) - (b.riskScore || 0),
                    defaultSortOrder: 'descend' as const,
                  },
                  {
                    title: 'Status', dataIndex: 'status', key: 'status',
                    render: (status: string) => {
                      const statusMap: Record<string, 'success' | 'processing' | 'error' | 'warning' | 'default'> = {
                        verified: 'success', deployed: 'processing', accepted: 'processing', failed: 'error', rejected: 'error', recommended: 'warning',
                      };
                      return <Badge status={statusMap[status] || 'default'} text={status.charAt(0).toUpperCase() + status.slice(1)} />;
                    },
                  },
                  { title: 'Affected Software', dataIndex: 'affectedSoftware', key: 'affectedSoftware', render: (text: string) => <Text type="secondary">{text || '-'}</Text> },
                ]}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} recommendations` }}
              />
            ),
          },
          {
            key: 'affected-softwares',
            label: `Affected Software (${affectedSoftwares.length})`,
            children: (
              <Table
                dataSource={affectedSoftwares}
                rowKey="id"
                columns={[
                  { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName', width: 300 },
                  { title: 'Version', dataIndex: 'version', key: 'version', width: 180 },
                  { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', width: 200 },
                  { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 120 },
                  { title: 'Installed On', dataIndex: 'installedOn', key: 'installedOn', width: 150, align: 'center' as const },
                ]}
                pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} affected software` }}
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
            label: `Vulnerabilities (${vulnerabilities.length})`,
            children: (
              <Table
                dataSource={vulnerabilities}
                rowKey="id"
                columns={[
                  { title: 'CVE Number', dataIndex: 'cveNumber', key: 'cveNumber' },
                  {
                    title: 'Severity', dataIndex: 'severity', key: 'severity',
                    render: (severity: string) => <Tag color={severity === 'Critical' ? 'red' : 'orange'}>{severity}</Tag>,
                  },
                  { title: 'Description', dataIndex: 'description', key: 'description' },
                  { title: 'Published Date', dataIndex: 'publishedDate', key: 'publishedDate', render: (d: string) => formatDate(d) },
                ]}
              />
            ),
          },
        ]}
      />

      <EndpointDetailsDrawer
        open={endpointDrawerOpen}
        endpointId={selectedEndpointId}
        onClose={() => { setEndpointDrawerOpen(false); setSelectedEndpointId(null); }}
      />

      {/* ============================================ */}
      {/* Edit Patch Modal                             */}
      {/* ============================================ */}
      <Modal
        title="Edit Patch"
        open={editModalVisible}
        onCancel={closeEditModal}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {editStep > 0 ? <Button onClick={() => setEditStep(0)}>Back</Button> : <div />}
            <Space>
              <Button onClick={closeEditModal}>Cancel</Button>
              <Button type="primary" loading={savingPatch} onClick={handleEditNext}>
                {editStep === 0 ? 'Next' : 'Done'}
              </Button>
            </Space>
          </div>
        }
      >
        <Steps current={editStep} style={{ marginBottom: 24 }} items={[{ title: 'Define Patch' }, { title: 'Affected Products' }]} />
        {editStep === 0 ? (
          <PatchFormFields form={form} tags={tagOptions} cveSuggestions={cveSuggestions} onCveFocus={fetchCveSuggestions} />
        ) : (
          <AffectedProductsStep patchId={patch.id} affectedProducts={editAffectedProducts} setAffectedProducts={setEditAffectedProducts} />
        )}
      </Modal>

      {/* ============================================ */}
      {/* Deploy Modal                                 */}
      {/* ============================================ */}
      <Modal
        title={<Space><RocketOutlined /><span>Deploy {patch.software}</span></Space>}
        open={deployModalVisible}
        onCancel={() => { setDeployModalVisible(false); deployForm.resetFields(); }}
        width={650}
        footer={[
          <Button key="cancel" onClick={() => { setDeployModalVisible(false); deployForm.resetFields(); }}>Cancel</Button>,
          <Button key="deploy" type="primary" icon={<RocketOutlined />} loading={deployLoading} onClick={handleDeploySubmit}>Deploy Now</Button>,
        ]}
      >
        <Form form={deployForm} layout="vertical">
          <Form.Item name="deploymentName" label="Deployment Name" initialValue={`Deploy ${patch.software} - ${dayjs().format('YYYY-MM-DD HH:mm')}`}>
            <Input placeholder="Enter deployment name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>

          <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <Space>
              <Text strong>{patch.software}</Text>
              {patch.kbNumber && <Text type="secondary">({patch.kbNumber})</Text>}
              <SeverityBadge severity={patch.severity} />
              <OSIcon os={patch.os as any} />
            </Space>
          </div>

          <Form.Item
            name="targetAgentIds"
            label="Target Agents"
            rules={[{ required: true, message: 'Please select at least one agent' }]}
            extra={`${agents.filter(a => a.status === 'Connected').length} agents online`}
          >
            <Select
              mode="multiple"
              placeholder="Select agents to deploy to"
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={agents.map((agent) => ({
                value: agent.id,
                label: `${agent.hostname || agent.name} (${agent.os})`,
                disabled: agent.status !== 'Connected',
              }))}
              optionRender={(option) => {
                const agent = agents.find(a => a.id === option.value);
                return (
                  <Space>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: agent?.status === 'Connected' ? '#52c41a' : '#ff4d4f', display: 'inline-block' }} />
                    <span>{option.label}</span>
                    {agent?.status !== 'Connected' && <Text type="secondary" style={{ fontSize: 12 }}>(Offline)</Text>}
                  </Space>
                );
              }}
            />
          </Form.Item>

          <Form.Item name="retryCount" label="Retry Count" initialValue={1} extra="Number of times to retry failed installations">
            <Select style={{ width: 200 }}>
              <Option value={0}>No retries</Option>
              <Option value={1}>1 retry</Option>
              <Option value={2}>2 retries</Option>
              <Option value={3}>3 retries</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
