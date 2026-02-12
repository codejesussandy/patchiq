import { useState, useMemo } from 'react';
import { ReloadOutlined, DownloadOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { App,
  Button, Space, Input, Tag, Spin, Modal, Form, Select, Tooltip } from 'antd';
import type { ColumnsType} from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useRedHatAgentNominations, useUpdateRedHatAgentNomination } from '../../hooks/useSettings';
import { settingsService } from '../../services/settings.service';
import type { RedHatAgentNomination as RedHatAgentNominationType } from '../../types/settings.types';

const statusColors: Record<string, string> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error' };

export const RedHatAgentNomination = () => {
  const { message } = App.useApp();
  const { data: nominations = [], isLoading: loading, refetch } = useRedHatAgentNominations();
  const updateNominationMutation = useUpdateRedHatAgentNomination();
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNomination, setEditingNomination] = useState<RedHatAgentNominationType | null>(null);
  const [editForm] = Form.useForm();

  const filteredData = useMemo(() => {
    if (!searchText) return nominations;
    const searchLower = searchText.toLowerCase();
    return nominations.filter((nomination: RedHatAgentNominationType) =>
      nomination.name.toLowerCase().includes(searchLower) ||
      nomination.status.toLowerCase().includes(searchLower) ||
      nomination.updatedBy.toLowerCase().includes(searchLower)
    );
  }, [searchText, nominations]);

  const handleExport = async () => {
    try {
      const blob = await settingsService.exportRedHatAgentNominations('csv');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'red-hat-nominations.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Red Hat nominations exported successfully');
    } catch {
      message.error('Failed to export Red Hat nominations');
    }
  };

  const handleEdit = (nomination: RedHatAgentNominationType) => {
    setEditingNomination(nomination);
    editForm.setFieldsValue({
      name: nomination.name,
      status: nomination.status,
      endpoint: nomination.endpoint,
      scheduledTime: nomination.scheduledTime || '' });
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingNomination(null);
    editForm.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingNomination) {
        await updateNominationMutation.mutateAsync({
          id: editingNomination.id,
          data: {
            name: values.name,
            status: values.status,
            endpoint: values.endpoint,
            scheduledTime: values.scheduledTime || undefined } });
        message.success('Red Hat nomination updated successfully');
        handleModalClose();
      }
    } catch {
      message.error('Failed to update Red Hat nomination');
    }
  };

  const columns: ColumnsType<RedHatAgentNominationType> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '20%' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ) },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      width: '10%',
      align: 'center' as const },
    {
      title: 'Last Sync Time',
      dataIndex: 'lastSyncTime',
      key: 'lastSyncTime',
      width: '18%',
      render: (text) => <span style={{ fontSize: '12px' }}>{text}</span> },
    {
      title: 'Updated By',
      dataIndex: 'updatedBy',
      key: 'updatedBy',
      width: '12%' },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '18%',
      render: (text) => <span style={{ fontSize: '12px' }}>{text}</span> },
    {
      title: 'Actions',
      key: 'actions',
      width: '8%',
      align: 'right' as const,
      render: (_, record) => (
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Tooltip>
      ) },
  ];

  const total = filteredData.length;
  const paginatedData = filteredData.slice(
    ((pagination.current || 1) - 1) * (pagination.pageSize || 10),
    ((pagination.current || 1) * (pagination.pageSize || 10))
  );

  const startIndex = ((pagination.current || 1) - 1) * (pagination.pageSize || 10) + 1;
  const endIndex = Math.min((pagination.current || 1) * (pagination.pageSize || 10), total);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Red Hat Agent Nomination</h2>
        <Space>
          <Input
            placeholder="Search"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '200px' }}
            allowClear
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <DataTable<RedHatAgentNominationType>
          columns={columns}
          data={paginatedData}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total });
            },
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            showTotal: () => (
              <span style={{ marginRight: '16px' }}>
                Showing {startIndex}-{endIndex} of {total} items
              </span>
            ) }}
          style={{ marginTop: '16px' }}
          size="small"
        />
      </Spin>

      {/* Edit Modal */}
      <Modal
        title="Edit Red Hat Agent Nomination"
        open={modalVisible}
        onCancel={handleModalClose}
        width={600}
        footer={[
          <Button key="cancel" onClick={handleModalClose}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSave}
          >
            Save
          </Button>,
        ]}
      >
        <Form
          form={editForm}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter nomination name' }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select
              placeholder="Select Status"
              options={[
                { label: 'Pending', value: 'PENDING' },
                { label: 'Approved', value: 'APPROVED' },
                { label: 'Rejected', value: 'REJECTED' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Endpoint"
            name="endpoint"
            rules={[{ required: true, message: 'Please enter endpoint' }]}
          >
            <Input type="number" placeholder="Enter endpoint number" />
          </Form.Item>

          <Form.Item
            label="Scheduled Time"
            name="scheduledTime"
          >
            <Input
              type="time"
              placeholder="HH:mm"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
