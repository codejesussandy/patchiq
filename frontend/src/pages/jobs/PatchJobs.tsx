import { useState } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Dropdown,
  Popconfirm,
  message,
  Modal,
  Form,
  Select,
  Radio,
  Row,
  Col,
  InputNumber,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { patchService, type Patch } from '../../services/patch.service';
import { SeverityBadge, OSIcon } from '../../components/patches';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

type PolicyItem = {
  id: string;
  policyId: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  createdBy: string;
  createdOn: string;
};

const mockPolicies: PolicyItem[] = [
  {
    id: '1',
    policyId: 'POLICY-2',
    name: 'Scheduled Patch Deployment',
    description: 'Scheduled Patch Deployment policy for automated updates',
    type: 'SCHEDULE',
    createdBy: 'Admin',
    createdOn: '2026/01/12 12:14:27 PM',
  },
  {
    id: '2',
    policyId: 'POLICY-1',
    name: 'OOB Instant deployment policy',
    description: '',
    type: 'INSTANT',
    createdBy: 'Admin',
    createdOn: '2025/11/27 10:15:32 PM',
  },
];

export const PatchJobs = () => {
  const [searchText, setSearchText] = useState('');
  const [policies, setPolicies] = useState<PolicyItem[]>(mockPolicies);
  const [loading, setLoading] = useState(false);

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

  const handleDelete = (id: string) => {
    setPolicies(policies.filter(item => item.id !== id));
    message.success('Policy deleted successfully');
  };

  const handleEdit = (record: PolicyItem) => {
    message.info(`Editing policy: ${record.name}`);
    // In real implementation, open edit modal
  };

  // Handle Create button
  const handleCreate = () => {
    setConfigType('install');
    installForm.resetFields();
    setSelectedPatches([]);
    setSelectedPatchIds([]);
    setInstallModalVisible(true);
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
      setSelectedPatches([]);
      setSelectedPatchIds([]);
    } catch (error) {
      message.error('Failed to create patch deployment');
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Data refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = filteredItems.length > 0 ? filteredItems : policies;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        ID: item.policyId,
        Name: item.name,
        Description: item.description,
        Type: item.type,
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
      link.setAttribute('download', `patch_jobs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Patch jobs exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const filterMenuItems: MenuProps['items'] = [
    { key: '1', label: 'Filter Option 1' },
    { key: '2', label: 'Filter Option 2' },
  ];

  const columns: ColumnsType<PolicyItem> = [
    {
      title: 'ID',
      dataIndex: 'policyId',
      key: 'policyId',
      sorter: (a, b) => a.policyId.localeCompare(b.policyId),
      render: (text: string) => (
        <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      sorter: (a, b) => a.type.localeCompare(b.type),
      render: (type: string) => (
        <Tag color="cyan" style={{ margin: 0 }}>{type}</Tag>
      ),
      filters: [
        { text: 'SCHEDULE', value: 'SCHEDULE' },
        { text: 'INSTANT', value: 'INSTANT' },
      ],
      onFilter: (value, record) => record.type === value,
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
      render: (text: string, record: PolicyItem) => (
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text>{text}</Text>
          <Space>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#1890ff' }}
            />
            <Popconfirm
              title="Delete policy"
              description="Are you sure you want to delete this policy?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </Space>
      ),
    },
  ];

  const filteredItems = policies.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.policyId.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      {/* Top Controls */}
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
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button type="primary" icon={<PlusOutlined />} htmlType="button" onClick={handleCreate}>
            Create
          </Button>
          <Dropdown menu={{ items: filterMenuItems }} trigger={['click']}>
            <Button icon={<FilterOutlined />} />
          </Dropdown>
        </Space>
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

      {/* Install/Deployment Modal - Same as PatchDetails */}
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
                setSelectedPatches([]);
              }}
            />
          </div>
        }
        open={installModalVisible}
        onCancel={() => {
          setInstallModalVisible(false);
          installForm.resetFields();
          setSelectedPatches([]);
        }}
        width={900}
        footer={[
          <Button key="reset" onClick={() => {
            installForm.resetFields();
            setConfigType('install');
            setSelectedPatches([]);
            setSelectedPatchIds([]);
          }}>
            Reset
          </Button>,
          <Button key="draft" onClick={() => {
            message.info('Saved as draft');
            setInstallModalVisible(false);
          }}>
            Save As Draft
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
                  <Option value="endpoint1">Endpoint 1</Option>
                  <Option value="endpoint2">Endpoint 2</Option>
                  <Option value="endpoint3">Endpoint 3</Option>
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
                  <Option value="policy1">Policy 1</Option>
                  <Option value="policy2">Policy 2</Option>
                  <Option value="policy3">Policy 3</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="notifyTo"
                label="Notify to"
              >
                <Select placeholder="Please Select" style={{ width: '100%' }} mode="multiple">
                  <Option value="user1">User 1</Option>
                  <Option value="user2">User 2</Option>
                  <Option value="user3">User 3</Option>
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
