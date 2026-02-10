import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  App,
  Table,
  Input,
  Button,
  Dropdown,
  Space,
  Typography,
  Modal,
  Form,
  Select,
  DatePicker,
  Switch,
  Row,
  Col,
  Steps,
  Upload,
  List,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  DownloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  RocketOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { patchService, type Patch, type AffectedSoftware } from '../../services/patch.service';
import { settingsService } from '../../services/settings.service';
import { assetService } from '../../services/asset.service';
import { tagService } from '../../services/tag.service';
import { agentService, type Agent } from '../../services/agent.service';
import { vulnerabilityService } from '../../services/vulnerability.service';
import { SeverityBadge, OSIcon } from '../../components/patches';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================
// Patch Form Component (shared by Create & Edit)
// ============================================

interface PatchFormProps {
  form: ReturnType<typeof Form.useForm>[0];
  tags: Array<{ id: string; name: string }>;
  cveSuggestions: Array<{ cveId: string; severity: string; description: string }>;
  onCveFocus: (software?: string, vendor?: string) => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Divider orientation="left" orientationMargin={0} style={{ marginTop: 4, marginBottom: 16 }}>
    <Text strong style={{ fontSize: 13 }}>{children}</Text>
  </Divider>
);

const PatchFormFields = ({ form, tags, cveSuggestions, onCveFocus }: PatchFormProps) => (
  <Form form={form} layout="vertical">
    {/* --- Identity --- */}
    <SectionTitle>Identity</SectionTitle>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          name="software"
          label="Software Name"
          rules={[{ required: true, message: 'Please enter software name' }]}
        >
          <Input placeholder="e.g., 7-Zip 24.01" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="platform"
          label="Platform"
          rules={[{ required: true, message: 'Please select platform' }]}
        >
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

    {/* --- Classification --- */}
    <SectionTitle>Classification</SectionTitle>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          name="severity"
          label="Severity"
          rules={[{ required: true, message: 'Please select severity' }]}
        >
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
        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please select category' }]}
        >
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

    {/* --- Technical Details --- */}
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
        <Form.Item
          name="rebootRequired"
          label="Reboot Required"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item
          name="supportUninstallation"
          label="Supports Uninstall"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>
      </Col>
    </Row>

    {/* --- References --- */}
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
        locale={{ emptyText: 'No affected products added yet. Click "+ Add Affected Product" above.' }}
        columns={[
          { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName' },
          { title: 'Version', dataIndex: 'version', key: 'version', render: (v: string) => v || '-' },
          { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', render: (v: string) => v || '-' },
          { title: 'Platform', dataIndex: 'platform', key: 'platform', render: (v: string) => v || '-' },
          { title: 'Installed On', dataIndex: 'installedOn', key: 'installedOn', render: (v: number) => `${v ?? 0} endpoint${v !== 1 ? 's' : ''}` },
          {
            title: '',
            key: 'action',
            width: 50,
            render: (_: unknown, record: AffectedSoftware) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record.id)} />
            ),
          },
        ]}
      />

      <Modal
        title="Add Affected Product"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={handleAdd}
        confirmLoading={loading}
        okText="Add"
      >
        <Form form={addForm} layout="vertical">
          <Form.Item name="softwareName" label="Software Name" rules={[{ required: true, message: 'Required' }]}>
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
};

// ============================================
// Main Page
// ============================================

export const AllPatches = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const osFilter = searchParams.get('os');

  // Unified patch modal (create + edit)
  const [patchModalVisible, setPatchModalVisible] = useState(false);
  const [patchModalStep, setPatchModalStep] = useState(0);
  const [editingPatch, setEditingPatch] = useState<Patch | null>(null);
  const [form] = Form.useForm();
  const [savingPatch, setSavingPatch] = useState(false);

  // For step 2 (affected products)
  const [affectedProducts, setAffectedProducts] = useState<AffectedSoftware[]>([]);
  const [createdPatchId, setCreatedPatchId] = useState<string | null>(null);

  // Bulk Add Modal
  const [bulkAddModalVisible, setBulkAddModalVisible] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  // Filter Modal
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterForm] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<{
    severity?: string[];
    os?: string[];
    category?: string[];
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  }>({});

  // Deploy Modal
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployForm] = Form.useForm();
  const [deployLoading, setDeployLoading] = useState(false);

  // Dynamic option lists
  const [groups, setGroups] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // CVE auto-suggest
  const [cveSuggestions, setCveSuggestions] = useState<Array<{ cveId: string; severity: string; description: string }>>([]);

  useEffect(() => {
    fetchPatches();
    const fetchOptions = async () => {
      try {
        const [groupsData, _endpointsData, tagsData, agentsData] = await Promise.all([
          settingsService.getComputerGroups(),
          assetService.getAssets(),
          tagService.getTags(),
          agentService.getAgents(),
        ]);
        setGroups(groupsData);
        setTags(tagsData);
        setAgents(agentsData);
      } catch {
        // Silently fail - selects will just be empty
      }
    };
    fetchOptions();
  }, []);

  // Auto-open create form when navigated with ?createPatch=true&cve=CVE-XXXX
  useEffect(() => {
    const createPatch = searchParams.get('createPatch');
    const cve = searchParams.get('cve');
    const severity = searchParams.get('severity');

    if (createPatch === 'true') {
      openPatchModal(null);
      setTimeout(() => {
        const values: Record<string, unknown> = {};
        if (cve) values.cveNumbers = [cve];
        if (severity) values.severity = severity;
        form.setFieldsValue(values);
      }, 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPatches = async () => {
    setLoading(true);
    try {
      const data = await patchService.getPatches();
      setPatches(data);
    } catch {
      message.error('Failed to fetch patches');
    } finally {
      setLoading(false);
    }
  };

  const fetchCveSuggestions = async (software?: string, vendor?: string) => {
    if (!software) return;
    try {
      const suggestions = await vulnerabilityService.suggestCvesForSoftware(software, vendor);
      setCveSuggestions(suggestions);
    } catch {
      // Silently fail
    }
  };

  // ============================================
  // Unified Patch Modal (Create + Edit)
  // ============================================

  const openPatchModal = (patch: Patch | null) => {
    setEditingPatch(patch);
    setPatchModalStep(0);
    setCreatedPatchId(patch?.id || null);
    setAffectedProducts([]);
    form.resetFields();

    if (patch) {
      // Pre-populate form with existing patch data
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
    }

    setPatchModalVisible(true);
  };

  const closePatchModal = () => {
    setPatchModalVisible(false);
    setPatchModalStep(0);
    form.resetFields();
    setEditingPatch(null);
    setCreatedPatchId(null);
    setAffectedProducts([]);
  };

  const handlePatchModalNext = async () => {
    if (patchModalStep === 0) {
      // Validate and save/create the patch, then go to step 2
      try {
        await form.validateFields();
        setSavingPatch(true);

        const values = form.getFieldsValue();
        const payload = {
          software: values.software,
          platform: values.platform,
          os: values.platform, // os mirrors platform
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

        if (editingPatch) {
          await patchService.updatePatch(editingPatch.id, payload);
          // Load existing affected products
          const products = await patchService.getAffectedSoftwares(editingPatch.id);
          setAffectedProducts(products);
          setCreatedPatchId(editingPatch.id);
        } else if (createdPatchId) {
          // Already created on a previous attempt, just update
          await patchService.updatePatch(createdPatchId, payload);
          const products = await patchService.getAffectedSoftwares(createdPatchId);
          setAffectedProducts(products);
        } else {
          const created = await patchService.createPatch(payload);
          setCreatedPatchId(created.id);
          message.success('Patch created. Now add affected products.');
        }

        setPatchModalStep(1);
      } catch (error) {
        if ((error as { errorFields?: unknown }).errorFields) return;
        message.error('Failed to save patch');
      } finally {
        setSavingPatch(false);
      }
    } else {
      // Step 2 done — close
      closePatchModal();
      fetchPatches();
    }
  };

  // ============================================
  // Bulk Add
  // ============================================

  const handleBulkAddSubmit = async () => {
    if (fileList.length === 0) {
      message.error('Please upload a file');
      return;
    }
    const file = fileList[0];
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        message.error('CSV file must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      let successCount = 0;
      let failCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        try {
          await patchService.createPatch({
            software: row['software'] || row['name'] || '',
            platform: row['platform'] || row['os'] || 'Windows',
            description: row['description'] || '',
            category: row['category'] || 'Security Updates',
            severity: row['severity'] || 'Medium',
            bulletinId: row['bulletinid'] || row['bulletin_id'] || '',
            kbNumber: row['kbnumber'] || row['kb_number'] || row['kb'] || '',
            releaseDate: row['releasedate'] || row['release_date'] || '',
            architecture: row['architecture'] || '64 BIT',
          });
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) message.success(`Successfully imported ${successCount} patch(es)`);
      if (failCount > 0) message.warning(`Failed to import ${failCount} row(s)`);
      setBulkAddModalVisible(false);
      setFileList([]);
      fetchPatches();
    } catch {
      message.error('Failed to process bulk import');
    }
  };

  // ============================================
  // Filters
  // ============================================

  const handleFilterSubmit = () => {
    const values = filterForm.getFieldsValue();
    setActiveFilters({
      severity: values.severity?.length ? values.severity : undefined,
      os: values.os?.length ? values.os : undefined,
      category: values.category?.length ? values.category : undefined,
      dateRange: values.dateRange || undefined,
    });
    setFilterModalVisible(false);
  };

  const handleClearFilters = () => {
    filterForm.resetFields();
    setActiveFilters({});
  };

  const activeFilterCount = [
    activeFilters.severity,
    activeFilters.os,
    activeFilters.category,
    activeFilters.dateRange,
  ].filter(Boolean).length;

  // ============================================
  // Deploy
  // ============================================

  const getSelectedPatches = (): Patch[] => {
    return patches.filter((patch) => selectedRowKeys.includes(patch.id));
  };

  const handleOpenDeployModal = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one patch to deploy');
      return;
    }
    setDeployModalVisible(true);
  };

  const handleDeploySubmit = async () => {
    try {
      const values = await deployForm.validateFields();
      setDeployLoading(true);

      const selectedPatches = getSelectedPatches();
      const targetAgentIds = values.targetAgentIds as string[];

      if (!targetAgentIds || targetAgentIds.length === 0) {
        message.error('Please select at least one agent');
        setDeployLoading(false);
        return;
      }

      const deploymentPayload = {
        name: values.deploymentName || `Patch Deployment - ${selectedPatches.length} patches`,
        description: values.description,
        targetAgentIds,
        patches: selectedPatches.map(p => ({
          id: p.id,
          patchId: p.patchId,
          kbNumber: p.kbNumber,
        })),
        retryCount: values.retryCount || 1,
      };

      await patchService.createDeployment(deploymentPayload);

      message.success(`Deployment created for ${selectedPatches.length} patch(es) to ${targetAgentIds.length} agent(s)`);
      setDeployModalVisible(false);
      deployForm.resetFields();
      setSelectedRowKeys([]);

      Modal.confirm({
        title: 'Deployment Created',
        content: 'Would you like to view the deployment status?',
        okText: 'View Deployments',
        cancelText: 'Stay Here',
        onOk: () => navigate('/patches/deployed'),
      });
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Failed to create deployment');
    } finally {
      setDeployLoading(false);
    }
  };

  const handleCancelDeploy = () => {
    setDeployModalVisible(false);
    deployForm.resetFields();
  };

  // ============================================
  // Table
  // ============================================

  const columns: ColumnsType<Patch> = [
    {
      title: 'Software',
      dataIndex: 'software',
      key: 'software',
      width: 350,
      sorter: (a, b) => a.software.localeCompare(b.software),
    },
    {
      title: 'ID',
      dataIndex: 'patchId',
      key: 'patchId',
      width: 150,
    },
    {
      title: 'Endpoints',
      dataIndex: 'endpoints',
      key: 'endpoints',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.endpoints - b.endpoints,
    },
    {
      title: 'OS',
      dataIndex: 'os',
      key: 'os',
      width: 150,
      render: (os: string) => <OSIcon os={os as any} />,
      filters: [
        { text: 'Windows', value: 'Windows' },
        { text: 'MacOS', value: 'MacOS' },
        { text: 'Ubuntu', value: 'Ubuntu' },
        { text: 'Linux', value: 'Linux' },
      ],
      onFilter: (value, record) => record.os === value,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 140,
      render: (severity: string) => <SeverityBadge severity={severity as any} />,
      filters: [
        { text: 'CRITICAL', value: 'CRITICAL' },
        { text: 'High', value: 'High' },
        { text: 'Medium', value: 'Medium' },
        { text: 'Low', value: 'Low' },
        { text: 'UNSPECIFIED', value: 'UNSPECIFIED' },
      ],
      onFilter: (value, record) => record.severity === value,
    },
    {
      title: 'Op. Status Since',
      dataIndex: 'operationalStatusSince',
      key: 'operationalStatusSince',
      width: 200,
    },
  ];

  const filteredPatches = patches.filter((patch) => {
    const software = patch.software || '';
    const patchId = patch.patchId || '';
    const searchLower = searchText.toLowerCase();
    const matchesSearch = software.toLowerCase().includes(searchLower) ||
      patchId.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    if (osFilter) {
      if (osFilter === 'Linux') {
        if (patch.os !== 'Linux' && patch.os !== 'Ubuntu') return false;
      } else if (patch.os !== osFilter) {
        return false;
      }
    }

    if (activeFilters.severity && !activeFilters.severity.includes(patch.severity)) return false;
    if (activeFilters.os && !activeFilters.os.includes(patch.os)) return false;
    if (activeFilters.category && !activeFilters.category.includes(patch.category)) return false;
    if (activeFilters.dateRange) {
      const [start, end] = activeFilters.dateRange;
      const releaseDate = patch.releaseDate ? dayjs(patch.releaseDate) : null;
      if (!releaseDate || releaseDate.isBefore(start, 'day') || releaseDate.isAfter(end, 'day')) return false;
    }

    return true;
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // ============================================
  // Render
  // ============================================

  const isEditing = !!editingPatch;
  const activePatchId = editingPatch?.id || createdPatchId;

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          {osFilter ? `${osFilter} Patches` : 'All Patches'}
        </Title>
        <Space>
          <Button
            icon={<ScanOutlined />}
            loading={discovering}
            onClick={async () => {
              setDiscovering(true);
              try {
                const result = await patchService.discoverPatches();
                message.success(result.message);
                if (result.patchesCreated > 0) fetchPatches();
              } catch (err: any) {
                message.error(err?.response?.data?.error || 'Discovery failed');
              } finally {
                setDiscovering(false);
              }
            }}
          >
            Discover Patches
          </Button>
          <Button onClick={() => setBulkAddModalVisible(true)}>Bulk Add</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openPatchModal(null)}>
            Create Patch
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Input
            placeholder="Search"
            prefix={<SearchOutlined />}
            style={{ width: 320 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button icon={<FilterOutlined />} onClick={() => setFilterModalVisible(true)}>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          {activeFilterCount > 0 && (
            <Button type="link" size="small" onClick={handleClearFilters}>Clear filters</Button>
          )}
        </Space>

        {selectedRowKeys.length > 0 && (
          <Space>
            <Text strong>{selectedRowKeys.length} Selected</Text>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={handleOpenDeployModal}
            >
              Deploy
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'download',
                    label: 'Download CSV',
                    icon: <DownloadOutlined />,
                    onClick: () => {
                      const selected = getSelectedPatches();
                      if (selected.length === 0) return;
                      const headers = ['Software', 'Patch ID', 'OS', 'Severity', 'Category', 'KB Number', 'Release Date'];
                      const csvContent = [
                        headers.join(','),
                        ...selected.map((p) =>
                          [p.software, p.patchId, p.os, p.severity, p.category, p.kbNumber, p.releaseDate || '']
                            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                            .join(',')
                        ),
                      ].join('\n');
                      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `patches_${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      message.success(`Exported ${selected.length} patch(es)`);
                    },
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => {
                      Modal.confirm({
                        title: 'Delete Patches',
                        content: `Are you sure you want to delete ${selectedRowKeys.length} selected patch(es)?`,
                        okText: 'Delete',
                        okType: 'danger',
                        onOk: async () => {
                          let successCount = 0;
                          let failCount = 0;
                          for (const patchId of selectedRowKeys) {
                            try {
                              await patchService.deletePatch(patchId as string);
                              successCount++;
                            } catch {
                              failCount++;
                            }
                          }
                          if (successCount > 0) message.success(`Deleted ${successCount} patch(es)`);
                          if (failCount > 0) message.warning(`Failed to delete ${failCount} patch(es)`);
                          setSelectedRowKeys([]);
                          fetchPatches();
                        },
                      });
                    },
                  },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )}
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredPatches}
        rowKey="id"
        loading={loading}
        onRow={(record) => ({
          onClick: () => navigate(`/patches/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} patches found`,
        }}
        scroll={{ x: 1200 }}
        style={{ marginBottom: '16px' }}
      />

      {/* ============================================ */}
      {/* Unified Create/Edit Patch Modal              */}
      {/* ============================================ */}
      <Modal
        title={isEditing ? 'Edit Patch' : 'Create Patch'}
        open={patchModalVisible}
        onCancel={closePatchModal}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {patchModalStep > 0 ? (
              <Button onClick={() => setPatchModalStep(0)}>Back</Button>
            ) : (
              <div />
            )}
            <Space>
              <Button onClick={closePatchModal}>Cancel</Button>
              <Button type="primary" loading={savingPatch} onClick={handlePatchModalNext}>
                {patchModalStep === 0 ? 'Next' : 'Done'}
              </Button>
            </Space>
          </div>
        }
      >
        <Steps
          current={patchModalStep}
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Define Patch' },
            { title: 'Affected Products' },
          ]}
        />
        {patchModalStep === 0 ? (
          <PatchFormFields
            form={form}
            tags={tags}
            cveSuggestions={cveSuggestions}
            onCveFocus={fetchCveSuggestions}
          />
        ) : (
          <AffectedProductsStep
            patchId={activePatchId}
            affectedProducts={affectedProducts}
            setAffectedProducts={setAffectedProducts}
          />
        )}
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        title="Bulk Add Patches"
        open={bulkAddModalVisible}
        onCancel={() => {
          setBulkAddModalVisible(false);
          setFileList([]);
        }}
        onOk={handleBulkAddSubmit}
        okText="Upload and Import"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Upload a CSV file with patch data</Text>
        </div>
        <Upload.Dragger
          fileList={fileList}
          beforeUpload={(file) => {
            setFileList([file]);
            return false;
          }}
          onRemove={() => setFileList([])}
          accept=".csv,.xlsx,.xls"
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">
            Support for CSV, XLSX, or XLS files. File should contain patch information.
          </p>
        </Upload.Dragger>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Filter Patches"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        width={600}
        footer={[
          <Button key="reset" onClick={() => { filterForm.resetFields(); setActiveFilters({}); setFilterModalVisible(false); }}>
            Reset
          </Button>,
          <Button key="cancel" onClick={() => setFilterModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="apply" type="primary" onClick={handleFilterSubmit}>
            Apply Filters
          </Button>,
        ]}
      >
        <Form form={filterForm} layout="vertical">
          <Form.Item name="severity" label="Severity">
            <Select mode="multiple" placeholder="Select severity levels" allowClear>
              <Option value="CRITICAL">CRITICAL</Option>
              <Option value="High">High</Option>
              <Option value="Medium">Medium</Option>
              <Option value="Low">Low</Option>
              <Option value="UNSPECIFIED">UNSPECIFIED</Option>
            </Select>
          </Form.Item>

          <Form.Item name="os" label="Operating System">
            <Select mode="multiple" placeholder="Select operating systems" allowClear>
              <Option value="Windows">Windows</Option>
              <Option value="MacOS">MacOS</Option>
              <Option value="Ubuntu">Ubuntu</Option>
              <Option value="Linux">Linux</Option>
            </Select>
          </Form.Item>

          <Form.Item name="category" label="Category">
            <Select mode="multiple" placeholder="Select categories" allowClear>
              <Option value="Security Updates">Security Updates</Option>
              <Option value="Application Updates">Application Updates</Option>
              <Option value="Critical Updates">Critical Updates</Option>
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="Release Date Range">
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Deploy Modal */}
      <Modal
        title={
          <Space>
            <RocketOutlined />
            <span>Deploy Patches ({selectedRowKeys.length} selected)</span>
          </Space>
        }
        open={deployModalVisible}
        onCancel={handleCancelDeploy}
        width={700}
        footer={[
          <Button key="cancel" onClick={handleCancelDeploy}>
            Cancel
          </Button>,
          <Button
            key="deploy"
            type="primary"
            icon={<RocketOutlined />}
            loading={deployLoading}
            onClick={handleDeploySubmit}
          >
            Deploy Now
          </Button>,
        ]}
      >
        <Form form={deployForm} layout="vertical">
          <Form.Item
            name="deploymentName"
            label="Deployment Name"
            initialValue={`Patch Deployment - ${dayjs().format('YYYY-MM-DD HH:mm')}`}
          >
            <Input placeholder="Enter deployment name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>

          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Selected Patches:</Text>
            <div style={{
              maxHeight: 150,
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: 12,
              backgroundColor: '#fafafa'
            }}>
              <List
                size="small"
                dataSource={getSelectedPatches()}
                renderItem={(patch) => (
                  <List.Item style={{ padding: '4px 0', border: 'none' }}>
                    <Space>
                      <Text>{patch.software}</Text>
                      {patch.kbNumber && <Text type="secondary">({patch.kbNumber})</Text>}
                      <SeverityBadge severity={patch.severity} />
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </div>

          <Divider />

          <Form.Item
            name="targetAgentIds"
            label="Target Agents"
            rules={[{ required: true, message: 'Please select at least one agent' }]}
            extra={`${agents.filter(a => a.status === 'Connected').length} agents online`}
          >
            <Select
              mode="multiple"
              placeholder="Select agents to deploy patches to"
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={agents.map((agent) => ({
                value: agent.id,
                label: `${agent.hostname || agent.name} (${agent.os})`,
                disabled: agent.status !== 'Connected',
              }))}
              optionRender={(option) => {
                const agent = agents.find(a => a.id === option.value);
                return (
                  <Space>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: agent?.status === 'Connected' ? '#52c41a' : '#ff4d4f',
                      display: 'inline-block'
                    }} />
                    <span>{option.label}</span>
                    {agent?.status !== 'Connected' && (
                      <Text type="secondary" style={{ fontSize: 12 }}>(Offline)</Text>
                    )}
                  </Space>
                );
              }}
            />
          </Form.Item>

          <Form.Item
            name="retryCount"
            label="Retry Count"
            initialValue={1}
            extra="Number of times to retry failed installations"
          >
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
