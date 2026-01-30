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
  Radio,
  Checkbox,
  TimePicker,
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
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { patchService, type Patch, type AffectedSoftware } from '../../services/patch.service';
import { settingsService } from '../../services/settings.service';
import { assetService } from '../../services/asset.service';
import { tagService } from '../../services/tag.service';
import { SeverityBadge, OSIcon } from '../../components/patches';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const AllPatches = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Get OS filter from URL params
  const osFilter = searchParams.get('os');

  // Create Patch Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  // Edit Patch Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPatch, setEditingPatch] = useState<Patch | null>(null);
  const [editForm] = Form.useForm();

  // For Create Patch Step 2
  const [affectedProducts, setAffectedProducts] = useState<AffectedSoftware[]>([]);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [addProductForm] = Form.useForm();
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [createdPatchId, setCreatedPatchId] = useState<string | null>(null);

  // Bulk Add Modal
  const [bulkAddModalVisible, setBulkAddModalVisible] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  // Filter Modal
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterForm] = Form.useForm();

  // Deploy Modal
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployForm] = Form.useForm();
  const [deployLoading, setDeployLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [deployScope, setDeployScope] = useState<'all' | 'groups' | 'custom'>('all');

  // Dynamic option lists
  const [groups, setGroups] = useState<any[]>([]);
  const [endpointsList, setEndpointsList] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    fetchPatches();
    const fetchOptions = async () => {
      try {
        const [groupsData, endpointsData, tagsData] = await Promise.all([
          settingsService.getComputerGroups(),
          assetService.getAssets(),
          tagService.getTags(),
        ]);
        setGroups(groupsData);
        setEndpointsList(endpointsData);
        setTags(tagsData);
      } catch {
        // Silently fail - selects will just be empty
      }
    };
    fetchOptions();
  }, []);

  const fetchPatches = async () => {
    setLoading(true);
    try {
      const data = await patchService.getPatches();
      setPatches(data);
    } catch (error) {
      message.error('Failed to fetch patches');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatch = (patch: Patch) => {
    navigate(`/patches/${patch.id}`);
  };

  const handleEditPatchSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingPatch) {
        await patchService.updatePatch(editingPatch.id, {
          ...editingPatch,
          software: values.name,
          platform: values.platform,
          description: values.description,
          category: values.category,
          severity: values.severity,
          bulletinId: values.bulletinId,
          kbNumber: values.kbNumber,
          releaseDate: values.releaseDate?.format('YYYY-MM-DD'),
          rebootRequired: values.rebootRequired,
          supportUninstallation: values.supportUninstallation,
          architecture: values.architecture,
          referenceUrl: values.referenceUrl,
          languagesSupported: values.languagesSupported,
          tags: values.tags,
        });
        message.success('Patch updated successfully');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingPatch(null);
        fetchPatches();
      }
    } catch (error) {
      message.error('Failed to update patch');
    }
  };

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
    } catch (error) {
      message.error('Failed to process bulk import');
    }
  };

  const handleFilterSubmit = async () => {
    try {
      await filterForm.validateFields();
      // Apply filters logic here
      message.success('Filters applied successfully');
      setFilterModalVisible(false);
    } catch (error) {
      message.error('Failed to apply filters');
    }
  };

  // Get selected patches for deploy modal
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
      
      // Create deployment payload
      const deploymentPayload = {
        name: `Bulk Deployment - ${selectedPatches.length} patches`,
        type: 'INSTALL' as const,
        patchIds: selectedRowKeys as string[],
        scope: deployScope,
        groupIds: deployScope === 'groups' ? values.groups : [],
        endpointIds: deployScope === 'custom' ? values.endpoints : [],
        schedule: scheduleType === 'immediate' 
          ? { type: 'immediate' }
          : { 
              type: 'scheduled',
              date: values.scheduleDate?.format('YYYY-MM-DD'),
              time: values.scheduleTime?.format('HH:mm'),
            },
        options: {
          rebootPolicy: values.rebootPolicy || 'if_required',
          notifyUsers: values.notifyUsers || false,
          forceRestart: values.forceRestart || false,
          forceRestartTimeout: values.forceRestartTimeout || 30,
        },
      };

      // Call the deployment API
      await patchService.createDeployment(deploymentPayload);

      message.success(`Deployment created successfully for ${selectedPatches.length} patch(es)`);
      setDeployModalVisible(false);
      deployForm.resetFields();
      setSelectedRowKeys([]);
      setScheduleType('immediate');
      setDeployScope('all');

      // Ask user if they want to navigate to deployed page
      Modal.confirm({
        title: 'Deployment Created',
        content: 'Would you like to view the deployment status?',
        okText: 'View Deployments',
        cancelText: 'Stay Here',
        onOk: () => navigate('/patches/deployed'),
      });
    } catch (error) {
      message.error('Failed to create deployment');
    } finally {
      setDeployLoading(false);
    }
  };

  const handleCancelDeploy = () => {
    setDeployModalVisible(false);
    deployForm.resetFields();
    setScheduleType('immediate');
    setDeployScope('all');
  };

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
    // Text search filter - add null checks
    const software = patch.software || '';
    const patchId = patch.patchId || '';
    const searchLower = searchText.toLowerCase();
    const matchesSearch = software.toLowerCase().includes(searchLower) ||
      patchId.toLowerCase().includes(searchLower);

    // OS filter from URL params
    if (osFilter) {
      // Handle Linux category to include Ubuntu and Linux
      if (osFilter === 'Linux') {
        if (patch.os !== 'Linux' && patch.os !== 'Ubuntu') {
          return false;
        }
      } else if (patch.os !== osFilter) {
        return false;
      }
    }

    return matchesSearch;
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const handleCreatePatch = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields();

        // If creating a new patch, save it now so we can add affected products
        if (!editingPatch && !createdPatchId) {
          const values = form.getFieldsValue();
          const created = await patchService.createPatch(values);
          setCreatedPatchId(created.id);
          message.success('Patch created. Now add affected products.');
        } else if (editingPatch) {
          // Update step 1 fields
          const values = form.getFieldsValue();
          await patchService.updatePatch(editingPatch.id, {
            ...editingPatch,
            ...values,
            releaseDate: values.releaseDate?.format('YYYY-MM-DD') || editingPatch.releaseDate,
          });
          // Load existing affected products
          const products = await patchService.getAffectedSoftwares(editingPatch.id);
          setAffectedProducts(products);
        }

        setCurrentStep(1);
      } catch (error) {
        if ((error as { errorFields?: unknown }).errorFields) return; // validation error
        message.error('Failed to save patch');
      }
    } else {
      // Step 2 complete — close modal
      setCreateModalVisible(false);
      setCurrentStep(0);
      form.resetFields();
      setEditingPatch(null);
      setCreatedPatchId(null);
      setAffectedProducts([]);
      fetchPatches();
    }
  };

  const handleAddAffectedProduct = async () => {
    try {
      const values = await addProductForm.validateFields();
      const patchId = editingPatch?.id || createdPatchId;
      if (!patchId) return;

      setAddProductLoading(true);
      const product = await patchService.addAffectedProduct(patchId, {
        softwareName: values.softwareName,
        version: values.version,
        vendor: values.vendor,
        platform: values.platform,
      });
      setAffectedProducts((prev) => [...prev, product]);
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
    const patchId = editingPatch?.id || createdPatchId;
    if (!patchId) return;

    try {
      await patchService.removeAffectedProduct(patchId, productId);
      setAffectedProducts((prev) => prev.filter((p) => p.id !== productId));
      message.success('Affected product removed');
    } catch {
      message.error('Failed to remove affected product');
    }
  };

  const renderCreatePatchStep1 = () => (
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
              {tags.map((t) => (
                <Option key={t.id} value={t.name}>{t.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );

  const renderCreatePatchStep2 = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Affected Products</Title>
        <Button type="link" onClick={() => { addProductForm.resetFields(); setAddProductModalVisible(true); }}>
          + Add Affected Product
        </Button>
      </div>

      <Table
        dataSource={affectedProducts}
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

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          {osFilter ? `${osFilter} Patches` : 'All Patches'}
        </Title>
        <Space>
          <Button onClick={() => setBulkAddModalVisible(true)}>Bulk Add</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingPatch(null);
            setCurrentStep(0);
            form.resetFields();
            setCreateModalVisible(true);
          }}>
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
          <Button icon={<FilterOutlined />} onClick={() => setFilterModalVisible(true)}>Filter</Button>
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
                  { key: 'download', label: 'Download', icon: <DownloadOutlined /> },
                  { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true },
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
          onClick: () => handleViewPatch(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} assets found`,
        }}
        scroll={{ x: 1200 }}
        style={{ marginBottom: '16px' }}
      />

      {/* Create Patch Modal */}
      <Modal
        title={editingPatch ? "Edit Patch" : "Add New Patch"}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setCurrentStep(0);
          form.resetFields();
          setEditingPatch(null);
        }}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(0)}>Back</Button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <Button onClick={() => {
                setCreateModalVisible(false);
                setCurrentStep(0);
                form.resetFields();
                setEditingPatch(null);
              }}>
                Cancel
              </Button>
              <Button type="primary" onClick={handleCreatePatch} style={{ marginLeft: 8 }}>
                {currentStep === 0 ? 'Next' : (editingPatch ? 'Update Patch' : 'Submit Patch')}
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
        {currentStep === 0 ? renderCreatePatchStep1() : renderCreatePatchStep2()}
      </Modal>

      {/* Edit Patch Modal */}
      <Modal
        title="Edit Patch"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingPatch(null);
        }}
        onOk={handleEditPatchSubmit}
        okText="Update Patch"
        width={800}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
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
                  {tags.map((t) => (
                    <Option key={t.id} value={t.name}>{t.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
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
          <Text type="secondary">Upload a CSV or Excel file with patch data</Text>
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
        onCancel={() => {
          setFilterModalVisible(false);
          filterForm.resetFields();
        }}
        onOk={handleFilterSubmit}
        okText="Apply Filters"
        width={600}
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
            {scheduleType === 'immediate' ? 'Deploy Now' : 'Schedule Deployment'}
          </Button>,
        ]}
      >
        <Form form={deployForm} layout="vertical">
          {/* Selected Patches Summary */}
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
                      <SeverityBadge severity={patch.severity} />
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </div>

          <Divider />

          {/* Deployment Scope */}
          <Form.Item label="Deployment Scope" required>
            <Radio.Group 
              value={deployScope} 
              onChange={(e) => setDeployScope(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="all">All Endpoints</Radio>
                <Radio value="groups">Specific Groups</Radio>
                {deployScope === 'groups' && (
                  <Form.Item
                    name="groups"
                    rules={[{ required: deployScope === 'groups', message: 'Please select at least one group' }]}
                    style={{ marginBottom: 0, marginLeft: 24 }}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Select groups"
                      style={{ width: '100%' }}
                    >
                      {groups.map((g) => (
                        <Option key={g.id} value={g.id}>{g.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
                <Radio value="custom">Custom Endpoint Selection</Radio>
                {deployScope === 'custom' && (
                  <Form.Item
                    name="endpoints"
                    rules={[{ required: deployScope === 'custom', message: 'Please select at least one endpoint' }]}
                    style={{ marginBottom: 0, marginLeft: 24 }}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Select endpoints"
                      style={{ width: '100%' }}
                    >
                      {endpointsList.map((e) => (
                        <Option key={e.id} value={e.id}>{e.hostname || e.name || e.id}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </Space>
            </Radio.Group>
          </Form.Item>

          <Divider />

          {/* Schedule */}
          <Form.Item label="Schedule" required>
            <Radio.Group 
              value={scheduleType} 
              onChange={(e) => setScheduleType(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="immediate">
                  <Space>
                    <RocketOutlined />
                    Deploy Immediately
                  </Space>
                </Radio>
                <Radio value="scheduled">
                  <Space>
                    <ClockCircleOutlined />
                    Schedule for later
                  </Space>
                </Radio>
                {scheduleType === 'scheduled' && (
                  <Row gutter={16} style={{ marginLeft: 24, marginTop: 8 }}>
                    <Col span={12}>
                      <Form.Item
                        name="scheduleDate"
                        rules={[{ required: scheduleType === 'scheduled', message: 'Please select date' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <DatePicker 
                          style={{ width: '100%' }} 
                          placeholder="Select date"
                          disabledDate={(current) => current && current < dayjs().startOf('day')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="scheduleTime"
                        rules={[{ required: scheduleType === 'scheduled', message: 'Please select time' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <TimePicker 
                          style={{ width: '100%' }} 
                          placeholder="Select time"
                          format="HH:mm"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </Space>
            </Radio.Group>
          </Form.Item>

          <Divider />

          {/* Deployment Options */}
          <Form.Item label="Deployment Options">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item
                name="rebootPolicy"
                label="Reboot Policy"
                initialValue="if_required"
                style={{ marginBottom: 12 }}
              >
                <Select style={{ width: '100%' }}>
                  <Option value="if_required">Reboot if required by patch</Option>
                  <Option value="always">Always reboot after installation</Option>
                  <Option value="never">Never reboot (may require manual reboot)</Option>
                  <Option value="prompt_user">Prompt user to reboot</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="notifyUsers"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Checkbox>Notify users before deployment</Checkbox>
              </Form.Item>

              <Form.Item
                name="forceRestart"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Space>
                  <Checkbox 
                    onChange={(e) => {
                      if (!e.target.checked) {
                        deployForm.setFieldValue('forceRestartTimeout', undefined);
                      }
                    }}
                  >
                    Force restart after timeout
                  </Checkbox>
                  <Form.Item
                    name="forceRestartTimeout"
                    noStyle
                  >
                    <Select 
                      placeholder="Minutes" 
                      style={{ width: 100 }}
                      disabled={!deployForm.getFieldValue('forceRestart')}
                    >
                      <Option value={15}>15 min</Option>
                      <Option value={30}>30 min</Option>
                      <Option value={60}>60 min</Option>
                      <Option value={120}>2 hours</Option>
                    </Select>
                  </Form.Item>
                </Space>
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
