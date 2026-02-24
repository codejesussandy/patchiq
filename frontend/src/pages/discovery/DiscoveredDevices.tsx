import { useState } from 'react';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { App, Input, Button, Modal, Form, Space, Typography, Tooltip, Tag, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useDiscoveredDevices, useEnrollDevice } from '../../hooks/useDiscovery';
import type { DiscoveredDevice, DiscoveredDeviceFilterState } from '../../types/discovery.types';
import { ColumnFilterModal } from '../settings/components/ColumnFilterModal';

const { Title, Text } = Typography;

const DEFAULT_FILTERS: DiscoveredDeviceFilterState = {
  showIpAddress: true, showHostname: true, showMacAddress: true, showDeviceType: true,
  showOs: true, showOpenPorts: true, showStatus: true, showDiscoveredAt: true,
};
const FILTER_COLUMNS = [
  { key: 'showIpAddress', label: 'Show IP Address' }, { key: 'showHostname', label: 'Show Hostname' },
  { key: 'showMacAddress', label: 'Show MAC Address' }, { key: 'showDeviceType', label: 'Show Device Type' },
  { key: 'showOs', label: 'Show OS' }, { key: 'showOpenPorts', label: 'Show Open Ports' },
  { key: 'showStatus', label: 'Show Status' }, { key: 'showDiscoveredAt', label: 'Show Discovered At' },
];

const STATUS_COLORS: Record<string, string> = { DISCOVERED: 'blue', ENROLLED: 'green', IGNORED: 'default' };
const DEVICE_TYPE_LABELS: Record<string, string> = {
  SERVER: 'Server', WORKSTATION: 'Workstation', NETWORK_DEVICE: 'Network Device',
  PRINTER: 'Printer', UNKNOWN: 'Unknown',
};

const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return e?.response?.data?.error?.message || e?.message || fallback;
};

export const DiscoveredDevices = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data: rawDevices = [], isLoading: loading, refetch } = useDiscoveredDevices({ status: statusFilter, search: searchText || undefined });
  const devices: DiscoveredDevice[] = Array.isArray(rawDevices) ? rawDevices : [];
  const enrollMutation = useEnrollDevice();

  const [filters, setFilters] = useState<DiscoveredDeviceFilterState>(DEFAULT_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [enrollingDevice, setEnrollingDevice] = useState<DiscoveredDevice | null>(null);
  const [enrollForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const handleEnroll = (device: DiscoveredDevice) => {
    setEnrollingDevice(device);
    enrollForm.setFieldsValue({ name: device.hostname || device.ipAddress, type: 'Endpoint' });
    setEnrollModalVisible(true);
  };

  const handleEnrollSubmit = async () => {
    try {
      const values = await enrollForm.validateFields();
      if (!enrollingDevice) return;
      await enrollMutation.mutateAsync({ id: enrollingDevice.id, data: values });
      message.success(`Device ${enrollingDevice.ipAddress} enrolled as asset`);
      setEnrollModalVisible(false); setEnrollingDevice(null); enrollForm.resetFields();
    } catch (err) { message.error(getApiErrorMessage(err, 'Failed to enroll device')); }
  };

  const handleExport = () => {
    const csv = [['IP Address', 'Hostname', 'MAC', 'Device Type', 'OS', 'Open Ports', 'Status', 'Discovered At'],
      ...filteredDevices.map((d) => [d.ipAddress, d.hostname || '', d.macAddress || '', d.deviceType || '', d.os || '', (d.openPorts || []).join(';'), d.status, d.discoveredAt])]
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'discovered-devices.csv'; a.click(); window.URL.revokeObjectURL(url);
    message.success('Devices exported successfully');
  };

  const handleApplyFilters = () => {
    const v = filterForm.getFieldsValue();
    setFilters(Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(k => [k, v[k] !== undefined ? v[k] : true])) as DiscoveredDeviceFilterState);
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };
  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('All columns shown'); };
  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const allColumns: ColumnsType<DiscoveredDevice> = [
    { title: 'IP Address', dataIndex: 'ipAddress', key: 'ipAddress', sorter: (a, b) => a.ipAddress.localeCompare(b.ipAddress),
      render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span> },
    { title: 'Hostname', dataIndex: 'hostname', key: 'hostname', render: (text: string) => text || '—' },
    { title: 'MAC Address', dataIndex: 'macAddress', key: 'macAddress', render: (text: string) => text ? <span style={{ fontFamily: 'monospace' }}>{text}</span> : '—' },
    { title: 'Device Type', dataIndex: 'deviceType', key: 'deviceType',
      filters: Object.entries(DEVICE_TYPE_LABELS).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.deviceType === value,
      render: (text: string) => DEVICE_TYPE_LABELS[text] || text || '—' },
    { title: 'OS', dataIndex: 'os', key: 'os',
      filters: [{ text: 'Linux', value: 'LINUX' }, { text: 'Windows', value: 'WINDOWS' }, { text: 'macOS', value: 'MACOS' }],
      onFilter: (value, record) => record.os === value,
      render: (text: string) => text || '—' },
    { title: 'Open Ports', dataIndex: 'openPorts', key: 'openPorts',
      render: (ports: number[]) => ports && ports.length > 0 ? <Space size={4} wrap>{ports.map((p) => <Tag key={p} style={{ fontFamily: 'monospace' }}>{p}</Tag>)}</Space> : '—' },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag> },
    { title: 'Discovered At', dataIndex: 'discoveredAt', key: 'discoveredAt',
      sorter: (a, b) => new Date(a.discoveredAt).getTime() - new Date(b.discoveredAt).getTime(),
      render: (text: string) => text ? new Date(text).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : '—' },
    { title: 'Actions', key: 'actions', width: 100, align: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'DISCOVERED' && (
            <Tooltip title="Enroll as Asset"><Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleEnroll(record)}
              loading={enrollMutation.isPending && (enrollMutation.variables as { id: string })?.id === record.id}>Enroll</Button></Tooltip>
          )}
          {record.status === 'ENROLLED' && <Tag color="green">Enrolled</Tag>}
          {record.status === 'IGNORED' && <Tag><StopOutlined /> Ignored</Tag>}
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'ipAddress') return filters.showIpAddress; if (col.key === 'hostname') return filters.showHostname;
    if (col.key === 'macAddress') return filters.showMacAddress; if (col.key === 'deviceType') return filters.showDeviceType;
    if (col.key === 'os') return filters.showOs; if (col.key === 'openPorts') return filters.showOpenPorts;
    if (col.key === 'status') return filters.showStatus; if (col.key === 'discoveredAt') return filters.showDiscoveredAt; return true;
  });

  const filteredDevices = devices.filter((d) => {
    if (!searchText) return true; const s = searchText.toLowerCase();
    return d.ipAddress.toLowerCase().includes(s) || (d.hostname && d.hostname.toLowerCase().includes(s)) || (d.macAddress && d.macAddress.toLowerCase().includes(s)) || (d.os && d.os.toLowerCase().includes(s));
  });
  const paginatedData = filteredDevices.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Discovered Devices</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Devices found through network discovery scans</Text>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search by IP, hostname, MAC, or OS" prefix={<SearchOutlined />} style={{ width: 360 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <Select placeholder="Status" allowClear style={{ width: 160 }} value={statusFilter} onChange={setStatusFilter}
          options={[{ label: 'Discovered', value: 'DISCOVERED' }, { label: 'Enrolled', value: 'ENROLLED' }, { label: 'Ignored', value: 'IGNORED' }]} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip title="Refresh"><Button type="text" icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button type="text" icon={<DownloadOutlined />} onClick={handleExport} /></Tooltip>
          <Tooltip title="Filter columns"><Button type="text" icon={<FilterOutlined />} onClick={() => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); }} style={{ color: hasHiddenColumns ? '#1890ff' : undefined }} /></Tooltip>
        </div>
      </div>

      <DataTable
        size="middle"
        columns={columns}
        data={paginatedData}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredDevices.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
      />

      <Modal title="Enroll Device as Asset" open={enrollModalVisible}
        onCancel={() => { setEnrollModalVisible(false); setEnrollingDevice(null); enrollForm.resetFields(); }} width={500}
        footer={[
          <Button key="cancel" onClick={() => { setEnrollModalVisible(false); setEnrollingDevice(null); enrollForm.resetFields(); }}>Cancel</Button>,
          <Button key="enroll" type="primary" onClick={handleEnrollSubmit} loading={enrollMutation.isPending}>Enroll</Button>,
        ]}>
        <Form form={enrollForm} layout="vertical" style={{ marginTop: '24px' }}>
          {enrollingDevice && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
              <Text type="secondary">IP:</Text> <Text strong style={{ fontFamily: 'monospace' }}>{enrollingDevice.ipAddress}</Text>
              {enrollingDevice.hostname && <><br /><Text type="secondary">Hostname:</Text> <Text strong>{enrollingDevice.hostname}</Text></>}
              {enrollingDevice.os && <><br /><Text type="secondary">OS:</Text> <Text strong>{enrollingDevice.os}</Text></>}
            </div>
          )}
          <Form.Item name="name" label="Asset Name" rules={[{ required: true, message: 'Please enter an asset name' }]}>
            <Input placeholder="e.g., Web Server 01" />
          </Form.Item>
          <Form.Item name="type" label="Asset Type">
            <Select options={[{ label: 'Endpoint', value: 'Endpoint' }, { label: 'Server', value: 'Server' }, { label: 'Network Device', value: 'Network Device' }, { label: 'Printer', value: 'Printer' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
