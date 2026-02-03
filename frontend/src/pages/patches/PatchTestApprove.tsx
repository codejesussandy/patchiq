import { useState, useEffect } from 'react';
import {
  App,
  Table,
  Input,
  Button,
  Dropdown,
  Space,
  Typography,
  Modal,
  Tag,
  Form,
  Select,
  Radio,
  Empty,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  CheckOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { patchService, type PatchTest } from '../../services/patch.service';
import { settingsService } from '../../services/settings.service';
import { assetService } from '../../services/asset.service';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const PatchTestApprove = () => {
  const { message } = App.useApp();
  const [tests, setTests] = useState<PatchTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Create Test Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // View Details Modal
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingTest, setViewingTest] = useState<PatchTest | null>(null);

  // Dynamic option lists
  const [applications, setApplications] = useState<any[]>([]);
  const [computers, setComputers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    fetchTests();
    const fetchOptions = async () => {
      try {
        const [appsData, assetsData, groupsData] = await Promise.all([
          assetService.getSoftwareInventory(),
          assetService.getAssets(),
          settingsService.getComputerGroups(),
        ]);
        setApplications(appsData);
        setComputers(assetsData);
        setGroups(groupsData);
      } catch {
        // Silently fail
      }
    };
    fetchOptions();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await patchService.getPatchTests();
      setTests(data);
    } catch (error) {
      message.error('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    try {
      const values = await form.validateFields();
      await patchService.createPatchTest(values);
      message.success('Test created successfully');
      setCreateModalVisible(false);
      form.resetFields();
      fetchTests();
    } catch (error) {
      message.error('Failed to create test');
    }
  };

  const handleApproveTest = async (test: PatchTest) => {
    try {
      await patchService.approvePatchTest(test.id);
      message.success('Test approved successfully');
      fetchTests();
    } catch (error) {
      message.error('Failed to approve test');
    }
  };

  const handleViewTest = (test: PatchTest) => {
    setViewingTest(test);
    setViewModalVisible(true);
  };

  const handleDeleteTest = (test: PatchTest) => {
    Modal.confirm({
      title: 'Delete Test',
      content: `Are you sure you want to delete ${test.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await patchService.deletePatchTest(test.id);
          message.success('Test deleted successfully');
          fetchTests();
        } catch (error) {
          message.error('Failed to delete test');
        }
      },
    });
  };

  const getActionMenuItems = (test: PatchTest): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View Details',
      icon: <EyeOutlined />,
      onClick: () => handleViewTest(test),
    },
    {
      key: 'approve',
      label: 'Approve',
      icon: <CheckOutlined />,
      onClick: () => handleApproveTest(test),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDeleteTest(test),
    },
  ];

  const columns: ColumnsType<PatchTest> = [
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
    },
    {
      title: 'Application Type',
      dataIndex: 'applicationType',
      key: 'applicationType',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: 'Scope',
      dataIndex: 'scope',
      key: 'scope',
      render: (scope: string) => (
        <Tag color="green">{scope.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          'Pending': 'orange',
          'Approved': 'green',
          'Rejected': 'red',
          'In Progress': 'blue',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Created by',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 120,
    },
    {
      title: 'Created on',
      dataIndex: 'createdOn',
      key: 'createdOn',
      width: 150,
    },
    {
      title: '',
      key: 'action',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredTests = tests.filter((test) =>
    test.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderEmptyState = () => (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <Empty
        description={
          <Space orientation="vertical" size="large">
            <Text style={{ fontSize: 16, color: '#8c8c8c' }}>
              No patch tests configured yet
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setCreateModalVisible(true)}
            >
              Create Test
            </Button>
          </Space>
        }
      />
    </div>
  );

  if (!loading && tests.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Patch Test and Approve
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            Create
          </Button>
        </div>

        {renderEmptyState()}

        {/* Create Test Modal */}
        <Modal
          title="Create Patch Test"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          onOk={handleCreateTest}
          okText="Create Test"
          width={800}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Test Name"
              rules={[{ required: true, message: 'Please enter test name' }]}
            >
              <Input placeholder="Enter test name" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <TextArea rows={3} placeholder="Enter description" />
            </Form.Item>

            <Form.Item
              name="applicationType"
              label="Application Type"
              rules={[{ required: true, message: 'Please select application type' }]}
              initialValue="ALL"
            >
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="ALL">All Applications</Radio>
                  <Radio value="INCLUDE">Include Specific Applications</Radio>
                  <Radio value="EXCLUDE">Exclude Specific Applications</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.applicationType !== currentValues.applicationType
              }
            >
              {({ getFieldValue }) =>
                getFieldValue('applicationType') !== 'ALL' && (
                  <Form.Item
                    name="applications"
                    label="Select Applications"
                    rules={[{ required: true, message: 'Please select applications' }]}
                  >
                    <Select mode="multiple" placeholder="Select applications">
                      {applications.map((app) => (
                        <Option key={app.id} value={app.name || app.softwareName}>{app.name || app.softwareName}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )
              }
            </Form.Item>

            <Form.Item
              name="scope"
              label="Scope"
              rules={[{ required: true, message: 'Please select scope' }]}
              initialValue="ALL_COMPUTERS"
            >
              <Radio.Group>
                <Space orientation="vertical">
                  <Radio value="ALL_COMPUTERS">All Computers</Radio>
                  <Radio value="SCOPE">Scope</Radio>
                  <Radio value="SPECIFIC_GROUPS">Specific Groups</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.scope !== currentValues.scope
              }
            >
              {({ getFieldValue }) =>
                getFieldValue('scope') === 'SCOPE' && (
                  <Form.Item
                    name="computers"
                    label="Select Computers"
                    rules={[{ required: true, message: 'Please select computers' }]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Search and select computers"
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.label ?? option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {computers.map((c) => (
                        <Option key={c.id} value={c.id}>{c.hostname || c.name || c.id}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )
              }
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.scope !== currentValues.scope
              }
            >
              {({ getFieldValue }) =>
                getFieldValue('scope') === 'SPECIFIC_GROUPS' && (
                  <Form.Item
                    name="groups"
                    label="Select Groups"
                    rules={[{ required: true, message: 'Please select groups' }]}
                  >
                    <Select mode="multiple" placeholder="Select groups">
                      {groups.map((g) => (
                        <Option key={g.id} value={g.id}>{g.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )
              }
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          Patch Test and Approve
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          Create
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="Search tests"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredTests}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} tests found`,
        }}
        scroll={{ x: 1200 }}
      />

      {/* Create Test Modal */}
      <Modal
        title="Create Patch Test"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={handleCreateTest}
        okText="Create Test"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Test Name"
            rules={[{ required: true, message: 'Please enter test name' }]}
          >
            <Input placeholder="Enter test name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Enter description" />
          </Form.Item>

          <Form.Item
            name="applicationType"
            label="Application Type"
            rules={[{ required: true, message: 'Please select application type' }]}
            initialValue="ALL"
          >
            <Radio.Group>
              <Space orientation="vertical">
                <Radio value="ALL">All Applications</Radio>
                <Radio value="INCLUDE">Include Specific Applications</Radio>
                <Radio value="EXCLUDE">Exclude Specific Applications</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.applicationType !== currentValues.applicationType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('applicationType') !== 'ALL' && (
                <Form.Item
                  name="applications"
                  label="Select Applications"
                  rules={[{ required: true, message: 'Please select applications' }]}
                >
                  <Select mode="multiple" placeholder="Select applications">
                    {applications.map((app) => (
                      <Option key={app.id} value={app.name || app.softwareName}>{app.name || app.softwareName}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item
            name="scope"
            label="Scope"
            rules={[{ required: true, message: 'Please select scope' }]}
            initialValue="ALL_COMPUTERS"
          >
            <Radio.Group>
              <Space orientation="vertical">
                <Radio value="ALL_COMPUTERS">All Computers</Radio>
                <Radio value="SCOPE">Scope</Radio>
                <Radio value="SPECIFIC_GROUPS">Specific Groups</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.scope !== currentValues.scope
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('scope') === 'SCOPE' && (
                <Form.Item
                  name="computers"
                  label="Select Computers"
                  rules={[{ required: true, message: 'Please select computers' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Search and select computers"
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {computers.map((c) => (
                      <Option key={c.id} value={c.id}>{c.hostname || c.name || c.id}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.scope !== currentValues.scope
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('scope') === 'SPECIFIC_GROUPS' && (
                <Form.Item
                  name="groups"
                  label="Select Groups"
                  rules={[{ required: true, message: 'Please select groups' }]}
                >
                  <Select mode="multiple" placeholder="Select groups">
                    {groups.map((g) => (
                      <Option key={g.id} value={g.id}>{g.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* View Test Details Modal */}
      <Modal
        title="Test Details"
        open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setViewingTest(null); }}
        footer={[
          <Button key="close" onClick={() => { setViewModalVisible(false); setViewingTest(null); }}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {viewingTest && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Name</Text>
                <div><strong>{viewingTest.name}</strong></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Status</Text>
                <div><Tag color={
                  viewingTest.status === 'Approved' ? 'green' :
                  viewingTest.status === 'Rejected' ? 'red' :
                  viewingTest.status === 'In Progress' ? 'blue' : 'orange'
                }>{viewingTest.status}</Tag></div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Text type="secondary">Description</Text>
                <div><strong>{viewingTest.description || 'N/A'}</strong></div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Text type="secondary">Application Type</Text>
                <div><Tag color="blue">{viewingTest.applicationType}</Tag></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Scope</Text>
                <div><Tag color="green">{viewingTest.scope?.replace(/_/g, ' ')}</Tag></div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Text type="secondary">Created By</Text>
                <div><strong>{viewingTest.createdBy || 'N/A'}</strong></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Created On</Text>
                <div><strong>{viewingTest.createdOn || 'N/A'}</strong></div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};
