import { useState } from 'react';
import {
  EditOutlined,
  DeleteOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
} from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Space,
  Typography,
  Select,
  Modal,
  Form,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useHubBundles, useHubPackages, useDeleteBundle, useCreateBundle } from '../../hooks/useHub';
import { hubService } from '../../services/hub.service';
import type { HubBundle, SoftwarePackage } from '../../types/hub.types';
import { JobToolbar, TransferListPicker, exportToCsv } from './components';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type BundleItem = {
  id: string;
  name: string;
  description: string;
  os: ('Windows' | 'Mac' | 'Linux')[];
  softwares: number;
  softwaresList?: string[];
  createdBy: string;
  createdOn: string;
};

const platformToDisplayOs = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'windows': return 'Windows';
    case 'macos': case 'darwin': return 'Mac';
    case 'linux': return 'Linux';
    case 'cross-platform': return 'cross-platform';
    default: return 'Linux';
  }
};

const getOSIcons = (os: string[]) => (
  <Space>
    {os.map((o) => {
      switch (o) {
        case 'Windows': return <WindowsOutlined key={o} style={{ fontSize: 18, color: '#1890ff' }} />;
        case 'Mac': return <AppleOutlined key={o} style={{ fontSize: 18, color: '#000' }} />;
        case 'Linux': return <LinuxOutlined key={o} style={{ fontSize: 18, color: '#000' }} />;
        default: return null;
      }
    })}
  </Space>
);

export const SoftwareJobsBundle = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<BundleItem | null>(null);
  const [form] = Form.useForm();
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);

  const { data: rawBundles, isLoading: loading, refetch: refetchBundles } = useHubBundles();
  const { data: rawPackages, refetch: refetchPackages } = useHubPackages({ limit: 100 });
  const deleteBundleMutation = useDeleteBundle();
  const createBundleMutation = useCreateBundle();

  const bundleItems: BundleItem[] = (rawBundles || []).map((b: HubBundle) => ({
    id: b.id,
    name: b.name,
    description: b.description || '',
    os: [platformToDisplayOs(b.platform)],
    softwares: b.packages?.length || 0,
    softwaresList: b.packages?.map((p: { id: string }) => p.id) || [],
    createdBy: 'System',
    createdOn: b.createdAt || '',
  }));

  const transferItems = ((rawPackages?.data || []) as SoftwarePackage[]).map((p: SoftwarePackage) => {
    const displayOs = platformToDisplayOs(p.platform);
    return {
      key: p.id,
      title: p.displayName || p.name,
      subtitle: p.installSource || 'APPLICATION',
      os: displayOs === 'cross-platform' ? ['Windows', 'Mac', 'Linux'] : [displayOs],
    };
  });

  const handleDelete = (id: string) => {
    deleteBundleMutation.mutate(id, {
      onSuccess: () => { message.success('Bundle deleted successfully'); setSelectedRowKeys([]); },
      onError: () => message.error('Failed to delete bundle'),
    });
  };

  const handleEdit = (record: BundleItem) => {
    setEditingItem(record);
    form.setFieldsValue({ bundleName: record.name, os: record.os[0], description: record.description });
    setSelectedApplications(record.softwaresList || []);
    setCreateModalVisible(true);
  };

  const handleModalClose = () => {
    setCreateModalVisible(false);
    setEditingItem(null);
    setSelectedApplications([]);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedApplications.length === 0) {
        message.error('Please select at least one application');
        return;
      }
      const osValue = Array.isArray(values.os) ? values.os[0] : values.os;
      const platformMap: Record<string, string> = { Windows: 'windows', Mac: 'darwin', Linux: 'linux' };
      const apiData = { name: values.bundleName, platform: platformMap[osValue] || 'linux', description: values.description || '', packageIds: selectedApplications };

      if (editingItem) {
        await hubService.deleteBundle(editingItem.id);
        createBundleMutation.mutate(apiData, {
          onSuccess: () => { message.success('Bundle updated successfully'); handleModalClose(); },
          onError: () => message.error('Failed to save bundle'),
        });
      } else {
        createBundleMutation.mutate(apiData, {
          onSuccess: () => { message.success('Bundle created successfully'); handleModalClose(); },
          onError: () => message.error('Failed to save bundle'),
        });
      }
    } catch {
      // form validation failed — ant design shows field errors
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchBundles(), refetchPackages()]);
    message.success('Data refreshed successfully');
  };

  const handleExport = () => {
    exportToCsv(
      filteredItems.length > 0 ? filteredItems : bundleItems,
      [
        { header: 'Name', accessor: (i) => i.name },
        { header: 'Description', accessor: (i) => i.description },
        { header: 'OS', accessor: (i) => i.os.join(', ') },
        { header: 'Softwares', accessor: (i) => i.softwares },
        { header: 'Created By', accessor: (i) => i.createdBy },
        { header: 'Created On', accessor: (i) => i.createdOn },
      ],
      'software_bundle',
      message,
    );
  };

  const filteredItems = bundleItems.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<BundleItem> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Description', dataIndex: 'description', key: 'description', sorter: (a, b) => a.description.localeCompare(b.description) },
    { title: 'OS', dataIndex: 'os', key: 'os', render: (os: string[]) => getOSIcons(os) },
    { title: 'Softwares', dataIndex: 'softwares', key: 'softwares', align: 'center', sorter: (a, b) => a.softwares - b.softwares },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', sorter: (a, b) => a.createdBy.localeCompare(b.createdBy) },
    { title: 'Created On', dataIndex: 'createdOn', key: 'createdOn', sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime() },
    {
      title: '', key: 'action', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }} />
          <Popconfirm title="Delete bundle" description="Are you sure?" onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id); }} onCancel={(e) => e?.stopPropagation()} okText="Yes" cancelText="No">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <JobToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onCreate={() => { setCreateModalVisible(true); setSelectedApplications([]); form.resetFields(); }}
        loading={loading}
      />

      <DataTable
        rowSelection={{ type: 'radio', selectedRowKeys, onChange: (keys: React.Key[]) => setSelectedRowKeys(keys) }}
        columns={columns}
        data={filteredItems}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingItem ? 'Edit Application Bundle' : 'Create Application Bundle'}
        open={createModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>Reset</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>,
        ]}
        width={1000}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="bundleName" label={<span>Bundle Name <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter bundle name' }]}>
            <Input placeholder="Name" />
          </Form.Item>

          <Form.Item name="os" label={<span>OS <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select OS' }]} initialValue="Windows">
            <Select placeholder="Select OS" onChange={() => { setSelectedApplications([]); }}>
              <Option value="Windows"><Space><WindowsOutlined />Windows</Space></Option>
              <Option value="Mac"><Space><AppleOutlined />Mac</Space></Option>
              <Option value="Linux"><Space><LinuxOutlined />Linux</Space></Option>
            </Select>
          </Form.Item>

          <Form.Item label={<span>Applications <Text type="danger">*</Text></span>}>
            <TransferListPicker
              selectedKeys={selectedApplications}
              onSelectedKeysChange={setSelectedApplications}
              items={transferItems}
            />
          </Form.Item>

          <Form.Item name="description" label={<span>Description <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please enter description' }]}>
            <TextArea rows={3} placeholder="Description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
