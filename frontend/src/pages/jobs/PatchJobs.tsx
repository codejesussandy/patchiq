import { useState } from 'react';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CloseOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
} from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Space,
  Tag,
  Typography,
  Popconfirm,
  Modal,
  Form,
  Select,
  Radio,
  Row,
  Col,
  Divider,
  InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SeverityBadge, OSIcon } from '../../components/patches';
import { DataTable } from '../../components/shared/DataTable';
import { useDeploymentPolicies, useDeleteDeploymentPolicy, useSoftwareAgents } from '../../hooks/useJobs';
import { usePatches, useCreateDeployment } from '../../hooks/usePatches';
import type { DeploymentPolicy } from '../../services/jobs.service';
import type { Patch } from '../../services/patch.service';
import { JobToolbar, exportToCsv } from './components';

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

export const PatchJobs = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');

  const { data: rawPolicies, isLoading: loading, refetch: refetchPolicies } = useDeploymentPolicies();
  const deletePolicyMutation = useDeleteDeploymentPolicy();
  const createDeploymentMutation = useCreateDeployment();

  const policies: PolicyItem[] = (rawPolicies || []).map((p: DeploymentPolicy) => ({
    id: p.id,
    policyId: p.policyId || p.id,
    name: p.name,
    description: p.description || '',
    type: p.type || 'INSTANT',
    createdBy: p.createdBy || 'System',
    createdOn: p.createdOn || p.createdAt || '',
  }));

  // Install/Deployment Modal
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [installForm] = Form.useForm();
  const [configType, setConfigType] = useState<'INSTALL' | 'ROLLBACK'>('INSTALL');
  const [selectedPatches, setSelectedPatches] = useState<Patch[]>([]);

  // Patches Selection Modal
  const [patchesModalVisible, setPatchesModalVisible] = useState(false);
  const [patchesSearchText, setPatchesSearchText] = useState('');
  const [selectedPatchIds, setSelectedPatchIds] = useState<React.Key[]>([]);

  const { data: allPatchesData, isLoading: patchesLoading, refetch: refetchPatches } = usePatches();
  const allPatches = allPatchesData?.data || [];
  const { data: agents = [] } = useSoftwareAgents();

  const handleDelete = (id: string) => {
    deletePolicyMutation.mutate(id, {
      onSuccess: () => message.success('Policy deleted successfully'),
      onError: () => message.error('Failed to delete policy'),
    });
  };

  const handleEdit = (record: PolicyItem) => {
    message.info(`Editing policy: ${record.name}`);
  };

  const handleCreate = () => {
    setConfigType('INSTALL');
    installForm.resetFields();
    setSelectedPatches([]);
    setSelectedPatchIds([]);
    setInstallModalVisible(true);
  };

  const handleAddPatches = () => {
    setSelectedPatchIds(selectedPatches.map(p => p.id));
    if (!patchesModalVisible) {
      refetchPatches();
      setPatchesModalVisible(true);
    }
  };

  const handlePatchesSelect = () => {
    const selected = allPatches.filter(p => selectedPatchIds.includes(p.id));
    setSelectedPatches(selected);
    installForm.setFieldValue('patches', selected.length > 0 ? selected : undefined);
    setPatchesModalVisible(false);
    setSelectedPatchIds([]);
    setPatchesSearchText('');
  };

  const handleInstallSubmit = async () => {
    if (selectedPatches.length === 0) {
      message.warning('Please add at least one patch');
      return;
    }
    try {
      const values = await installForm.validateFields();
      if (!values.endpoints || values.endpoints.length === 0) {
        message.warning('Please select at least one target endpoint');
        return;
      }
      const patchesPayload = selectedPatches.map(p => ({
        id: p.id,
        patchId: p.patchId ?? undefined,
        name: p.software ?? p.title ?? undefined,
        description: p.description ?? undefined,
        severity: p.severity ?? undefined,
        type: configType,
      }));
      createDeploymentMutation.mutate({
        name: values.name, description: values.description, targetAgentIds: values.endpoints,
        patches: patchesPayload, retryCount: values.retryCount || 1,
      }, {
        onSuccess: (result) => {
          message.success(`Patch deployment created: ${result.deploymentId || 'Success'}`);
          setInstallModalVisible(false);
          installForm.resetFields();
          setSelectedPatches([]);
          setSelectedPatchIds([]);
        },
        onError: (error: unknown) => {
          message.error((error as Error).message || 'Failed to create patch deployment');
        },
      });
    } catch {
      // form validation failed — ant design shows field errors
    }
  };

  const handleRefresh = async () => {
    await refetchPolicies();
    message.success('Data refreshed successfully');
  };

  const handleExport = () => {
    exportToCsv(
      filteredItems.length > 0 ? filteredItems : policies,
      [
        { header: 'ID', accessor: (i) => i.policyId },
        { header: 'Name', accessor: (i) => i.name },
        { header: 'Description', accessor: (i) => i.description },
        { header: 'Type', accessor: (i) => i.type },
        { header: 'Created By', accessor: (i) => i.createdBy },
        { header: 'Created On', accessor: (i) => i.createdOn },
      ],
      'patch_jobs',
      message,
    );
  };

  const columns: ColumnsType<PolicyItem> = [
    { title: 'ID', dataIndex: 'policyId', key: 'policyId', sorter: (a, b) => a.policyId.localeCompare(b.policyId), render: (text: string) => <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text> },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Description', dataIndex: 'description', key: 'description', sorter: (a, b) => a.description.localeCompare(b.description), render: (text: string) => <Text ellipsis style={{ maxWidth: 300 }}>{text || '-'}</Text> },
    {
      title: 'Type', dataIndex: 'type', key: 'type',
      sorter: (a, b) => a.type.localeCompare(b.type),
      render: (type: string) => <Tag color="cyan" style={{ margin: 0 }}>{type}</Tag>,
      filters: [{ text: 'SCHEDULE', value: 'SCHEDULE' }, { text: 'INSTANT', value: 'INSTANT' }],
      onFilter: (value, record) => record.type === value,
    },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', sorter: (a, b) => a.createdBy.localeCompare(b.createdBy) },
    {
      title: 'Created On', dataIndex: 'createdOn', key: 'createdOn',
      sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
      render: (text: string, record: PolicyItem) => (
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text>{text}</Text>
          <Space>
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#1890ff' }} />
            <Popconfirm title="Delete policy" description="Are you sure you want to delete this policy?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
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
      <JobToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onCreate={handleCreate}
        loading={loading}
      />

      <DataTable
        columns={columns}
        data={filteredItems}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
        scroll={{ x: 'max-content' }}
      />

      {/* Install/Deployment Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Create Patch Deployment</span>
            <Button type="text" icon={<CloseOutlined />} onClick={() => { setInstallModalVisible(false); installForm.resetFields(); setSelectedPatches([]); }} />
          </div>
        }
        open={installModalVisible}
        onCancel={() => { setInstallModalVisible(false); installForm.resetFields(); setSelectedPatches([]); }}
        width={900}
        footer={[
          <Button key="reset" onClick={() => { installForm.resetFields(); setConfigType('INSTALL'); setSelectedPatches([]); setSelectedPatchIds([]); }}>Reset</Button>,
          <Button key="draft" onClick={() => { message.info('Saved as draft'); setInstallModalVisible(false); }}>Save As Draft</Button>,
          <Button key="publish" type="primary" onClick={handleInstallSubmit}>Publish</Button>,
        ]}
        closeIcon={null}
      >
        <Form form={installForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter name' }]}>
            <Input placeholder="Name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Description" style={{ resize: 'vertical' }} />
          </Form.Item>
          <Form.Item name="configType" label={<span>Configuration Type <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select configuration type' }]} initialValue="INSTALL">
            <Radio.Group value={configType} onChange={(e) => setConfigType(e.target.value)}>
              <Radio value="INSTALL">Install</Radio>
              <Radio value="ROLLBACK">Rollback</Radio>
            </Radio.Group>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scope" label={<span>Scope <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select scope' }]}>
                <Select placeholder="Select One" style={{ width: '100%' }}>
                  <Option value="GLOBAL">Global</Option>
                  <Option value="GROUP">Group</Option>
                  <Option value="ENDPOINT">Endpoint</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endpoints" label={<span>Target Endpoints <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select at least one endpoint' }]}>
                <Select placeholder="Select target endpoints" style={{ width: '100%' }} mode="multiple" showSearch optionFilterProp="children">
                  {agents.map(agent => (
                    <Option key={agent.id} value={agent.id}>
                      <Space>
                        {agent.osType === 'windows' && <WindowsOutlined style={{ color: '#1890ff' }} />}
                        {agent.osType === 'darwin' && <AppleOutlined />}
                        {agent.osType === 'linux' && <LinuxOutlined />}
                        {agent.hostname} ({agent.agentId})
                        <Tag color={agent.status === 'ONLINE' ? 'green' : 'orange'}>{agent.status}</Tag>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="patches" label={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Patches <Text type="danger">*</Text></span>
              <Button type="link" icon={<PlusOutlined />} style={{ padding: 0 }} onClick={handleAddPatches}>+ Add Patches</Button>
            </div>
          } rules={[{ required: true, message: 'Please add at least one patch' }]}>
            {selectedPatches.length > 0 && (
              <DataTable
                data={selectedPatches}
                rowKey="id"
                pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `showing 1-${total} of ${total} items` }}
                columns={[
                  { title: 'ID', dataIndex: 'patchId', key: 'patchId', sorter: true, render: (text: string) => <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text> },
                  { title: 'Name', dataIndex: 'software', key: 'software', sorter: true, render: (text: string) => <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text> },
                  { title: 'Severity', dataIndex: 'severity', key: 'severity', sorter: true, render: (severity: string) => <SeverityBadge severity={severity} /> },
                  { title: 'Platform', dataIndex: 'os', key: 'os', sorter: true, render: (os: string) => <OSIcon os={os} /> },
                  { title: 'Category', dataIndex: 'category', key: 'category', sorter: true },
                  { title: 'KBID', dataIndex: 'kbNumber', key: 'kbNumber', sorter: true },
                  { title: '', key: 'action', width: 50, render: (_: unknown, record: Patch) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { const updated = selectedPatches.filter(p => p.id !== record.id); setSelectedPatches(updated); installForm.setFieldValue('patches', updated.length > 0 ? updated : undefined); }} /> },
                ]}
                size="small"
              />
            )}
          </Form.Item>

          <Divider />
          <Title level={5} style={{ marginBottom: 16, color: '#1890ff' }}>Configuration Settings</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deploymentPolicy" label={<span>Deployment Policy <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select deployment policy' }]}>
                <Select placeholder="Please Select" style={{ width: '100%' }}>
                  <Option value="policy1">Policy 1</Option>
                  <Option value="policy2">Policy 2</Option>
                  <Option value="policy3">Policy 3</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="notifyTo" label="Notify to">
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
              <Form.Item name="retryCount" label={<span>Retry Count <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter retry count' }]}>
                <InputNumber placeholder="Retry Count" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batchSize" label="Batch Size">
                <InputNumber placeholder="Batch Size" style={{ width: '100%' }} min={1} />
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
              <Button icon={<CloseOutlined />} type="text" onClick={() => { setPatchesModalVisible(false); setPatchesSearchText(''); setSelectedPatchIds([]); }} />
            </Space>
          </div>
        }
        open={patchesModalVisible}
        onCancel={() => { setPatchesModalVisible(false); setPatchesSearchText(''); setSelectedPatchIds([]); }}
        width={1200}
        footer={[
          <Button key="cancel" onClick={() => { setPatchesModalVisible(false); setPatchesSearchText(''); setSelectedPatchIds([]); }}>Cancel</Button>,
          <Button key="select" type="primary" onClick={handlePatchesSelect} disabled={selectedPatchIds.length === 0}>Select</Button>,
        ]}
        closeIcon={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Input placeholder="Search..." prefix={<span />} value={patchesSearchText} onChange={(e) => setPatchesSearchText(e.target.value)} style={{ width: 300 }} />
        </div>
        <DataTable
          rowSelection={{ selectedRowKeys: selectedPatchIds, onChange: (keys: React.Key[]) => setSelectedPatchIds(keys) }}
          data={allPatches.filter(p =>
            p.patchId.toLowerCase().includes(patchesSearchText.toLowerCase()) ||
            p.software.toLowerCase().includes(patchesSearchText.toLowerCase()) ||
            p.category.toLowerCase().includes(patchesSearchText.toLowerCase())
          )}
          rowKey="id"
          loading={patchesLoading}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
          columns={[
            { title: 'ID', dataIndex: 'patchId', key: 'patchId', sorter: (a, b) => a.patchId.localeCompare(b.patchId), render: (text: string) => <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text> },
            { title: 'Name', dataIndex: 'software', key: 'software', sorter: (a, b) => a.software.localeCompare(b.software), render: (text: string) => <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text> },
            { title: 'Severity', dataIndex: 'severity', key: 'severity', sorter: (a, b) => a.severity.localeCompare(b.severity), render: (severity: string) => <SeverityBadge severity={severity} /> },
            { title: 'Platform', dataIndex: 'os', key: 'os', sorter: (a, b) => a.os.localeCompare(b.os), render: (os: string) => <OSIcon os={os} /> },
            { title: 'Category', dataIndex: 'category', key: 'category', sorter: (a, b) => a.category.localeCompare(b.category) },
            { title: 'KBID', dataIndex: 'kbNumber', key: 'kbNumber', sorter: (a, b) => (a.kbNumber || '').localeCompare(b.kbNumber || '') },
          ]}
          scroll={{ x: 'max-content' }}
        />
      </Modal>
    </div>
  );
};
