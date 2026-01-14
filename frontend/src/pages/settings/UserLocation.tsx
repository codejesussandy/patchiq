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
} from 'antd';
import {
  SearchOutlined,
  MoreOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  createdAt?: string;
}

export const UserLocation = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/locations');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLocation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    form.setFieldsValue({
      name: location.name,
      address: location.address,
      city: location.city,
      country: location.country,
    });
    setModalVisible(true);
  };

  const handleDelete = (location: Location) => {
    Modal.confirm({
      title: 'Delete Location',
      content: `Are you sure you want to delete ${location.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`/api/settings/locations/${location.id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete');
          message.success(`${location.name} deleted successfully`);
          fetchLocations();
        } catch (error) {
          message.error('Failed to delete location');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingLocation) {
        const response = await fetch(`/api/settings/locations/${editingLocation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) throw new Error('Failed to update');
        message.success('Location updated successfully');
      } else {
        const response = await fetch('/api/settings/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) throw new Error('Failed to create');
        message.success('Location created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchLocations();
    } catch (error) {
      message.error(`Failed to ${editingLocation ? 'update' : 'create'} location`);
    }
  };

  const getActionMenuItems = (location: Location): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => handleEdit(location),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(location),
    },
  ];

  const columns: ColumnsType<Location> = [
    {
      title: 'Location Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
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

  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={4}>Location Management</Title>
        <Text type="secondary">Manage branch locations and offices</Text>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search locations"
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" icon={<EnvironmentOutlined />} onClick={handleCreate}>
            Add Location
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredLocations}
        rowKey="id"
        loading={loading}
        pagination={false}
        style={{ marginBottom: '16px' }}
      />

      <Text type="secondary">
        Total {filteredLocations.length} Location{filteredLocations.length !== 1 ? 's' : ''} Found
      </Text>

      {/* Create/Edit Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EnvironmentOutlined style={{ color: '#1890ff' }} />
            <span>{editingLocation ? 'Edit' : 'Add'} Location</span>
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
            {editingLocation ? 'Update' : 'Create'} Location
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Location Name"
            name="name"
            rules={[{ required: true, message: 'Please enter location name' }]}
          >
            <Input placeholder="Enter location name" />
          </Form.Item>

          <Form.Item
            label="Address"
            name="address"
          >
            <Input placeholder="Enter address" />
          </Form.Item>

          <Form.Item
            label="City"
            name="city"
          >
            <Input placeholder="Enter city" />
          </Form.Item>

          <Form.Item
            label="Country"
            name="country"
          >
            <Input placeholder="Enter country" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
