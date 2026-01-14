import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Dropdown,
  Typography,
  Modal,
  Form,
  message,
  Select,
} from 'antd';
import {
  SearchOutlined,
  MoreOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;

interface Department {
  id: string;
  name: string;
  organization?: string;
  description?: string;
  createdAt?: string;
}

export const Department = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/departments');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDept(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    form.setFieldsValue({
      name: dept.name,
      organization: dept.organization,
      description: dept.description,
    });
    setModalVisible(true);
  };

  const handleDelete = (dept: Department) => {
    Modal.confirm({
      title: 'Delete Department',
      content: `Are you sure you want to delete ${dept.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`/api/settings/departments/${dept.id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete');
          message.success(`${dept.name} deleted successfully`);
          fetchDepartments();
        } catch (error) {
          message.error('Failed to delete department');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingDept) {
        const response = await fetch(`/api/settings/departments/${editingDept.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) throw new Error('Failed to update');
        message.success('Department updated successfully');
      } else {
        const response = await fetch('/api/settings/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) throw new Error('Failed to create');
        message.success('Department created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchDepartments();
    } catch (error) {
      message.error(`Failed to ${editingDept ? 'update' : 'create'} department`);
    }
  };

  const getActionMenuItems = (dept: Department): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => handleEdit(dept),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(dept),
    },
  ];

  const columns: ColumnsType<Department> = [
    {
      title: 'Department Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Organization',
      dataIndex: 'organization',
      key: 'organization',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredDepts = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={4}>Department Management</Title>
        <Text type="secondary">Organize users into departments</Text>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search departments"
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" icon={<TeamOutlined />} onClick={handleCreate}>
            Add Department
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredDepts}
        rowKey="id"
        loading={loading}
        pagination={false}
        style={{ marginBottom: '16px' }}
      />

      <Text type="secondary">
        Total {filteredDepts.length} Department{filteredDepts.length !== 1 ? 's' : ''} Found
      </Text>

      {/* Create/Edit Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TeamOutlined style={{ color: '#1890ff' }} />
            <span>{editingDept ? 'Edit' : 'Add'} Department</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setModalVisible(false);
              form.resetFields();
            }}
          >
            Close
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingDept ? 'Update' : 'Create'} Department
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Organization"
            name="organization"
            rules={[{ required: true, message: 'Please select an organization' }]}
          >
            <Select
              placeholder="Select Organization"
              options={[
                { value: 'org1', label: 'Organization 1' },
                { value: 'org2', label: 'Organization 2' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Department Name"
            name="name"
            rules={[{ required: true, message: 'Please enter department name' }]}
          >
            <Input placeholder="Enter department name" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="Enter description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
