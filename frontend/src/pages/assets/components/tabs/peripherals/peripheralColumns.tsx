import {
  UsbOutlined,
  PrinterOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  WifiOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { Tag, Typography, Space, Badge, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  Monitor,
  USBDevice,
  Printer,
  AudioDevice,
  BluetoothDevice,
} from '../../../../../types/peripheral.types';

const { Text } = Typography;

const getConnectionTypeColor = (type?: string) => {
  switch (type) {
    case 'HDMI': return 'purple';
    case 'DisplayPort': return 'blue';
    case 'USB-C': case 'Thunderbolt': return 'cyan';
    case 'VGA': case 'DVI': return 'orange';
    case 'Internal': return 'green';
    default: return 'default';
  }
};

const getUSBSpeedColor = (speed?: string) => {
  switch (speed) {
    case 'SuperPlus': case 'Super': return 'blue';
    case 'High': return 'green';
    case 'Full': return 'orange';
    case 'Low': return 'red';
    default: return 'default';
  }
};

const getPrinterStatusColor = (status?: string) => {
  switch (status) {
    case 'Ready': return 'success';
    case 'Busy': return 'processing';
    case 'Offline': case 'Error': return 'error';
    case 'PaperJam': case 'LowToner': return 'warning';
    default: return 'default';
  }
};

const getUSBDeviceClassIcon = (deviceClass?: string) => {
  switch (deviceClass) {
    case 'HID': return <AppstoreOutlined />;
    case 'MassStorage': return <UsbOutlined />;
    case 'Audio': return <SoundOutlined />;
    case 'Video': return <VideoCameraOutlined />;
    case 'Printer': return <PrinterOutlined />;
    default: return <UsbOutlined />;
  }
};

export const monitorColumns: ColumnsType<Monitor> = [
  {
    title: 'Monitor', key: 'monitor',
    render: (_, record) => (
      <Space orientation="vertical" size={0}>
        <Space>
          <Text strong>{record.name || record.model || 'Unknown Monitor'}</Text>
          {record.isPrimary && <Tag color="blue">Primary</Tag>}
          {record.isBuiltIn && <Tag color="green">Built-in</Tag>}
        </Space>
        {record.manufacturer && <Text type="secondary" style={{ fontSize: '12px' }}>{record.manufacturer}</Text>}
      </Space>
    ),
  },
  {
    title: 'Resolution', key: 'resolution', width: 150,
    render: (_, record) => (
      <Space orientation="vertical" size={0}>
        <Text>{record.resolution || '\u2014'}</Text>
        {record.refreshRate && <Text type="secondary" style={{ fontSize: '11px' }}>{record.refreshRate} Hz</Text>}
      </Space>
    ),
  },
  { title: 'Connection', dataIndex: 'connectionType', key: 'connectionType', width: 120, render: (type?: string) => <Tag color={getConnectionTypeColor(type)}>{type || 'Unknown'}</Tag> },
  { title: 'Size', dataIndex: 'screenSizeInches', key: 'screenSizeInches', width: 80, render: (size?: number) => (size ? `${size}"` : '\u2014') },
  { title: 'Scaling', dataIndex: 'scalingPercent', key: 'scalingPercent', width: 80, render: (scaling?: number) => (scaling ? `${scaling}%` : '\u2014') },
  { title: 'Serial', dataIndex: 'serialNumber', key: 'serialNumber', width: 150, render: (serial?: string) => serial ? <Text copyable style={{ fontSize: '11px', fontFamily: 'monospace' }}>{serial}</Text> : '\u2014' },
];

export const usbColumns: ColumnsType<USBDevice> = [
  {
    title: 'Device', key: 'device',
    render: (_, record) => (
      <Space>
        {getUSBDeviceClassIcon(record.deviceClass)}
        <div>
          <Text strong>{record.name || 'Unknown USB Device'}</Text>
          {record.manufacturer && <div><Text type="secondary" style={{ fontSize: '11px' }}>{record.manufacturer}</Text></div>}
        </div>
      </Space>
    ),
  },
  { title: 'Class', dataIndex: 'deviceClass', key: 'deviceClass', width: 120, render: (deviceClass?: string) => <Tag>{deviceClass || 'Unknown'}</Tag> },
  { title: 'USB Version', dataIndex: 'usbVersion', key: 'usbVersion', width: 100, render: (version?: string) => (version ? `USB ${version}` : '\u2014') },
  { title: 'Speed', dataIndex: 'speed', key: 'speed', width: 100, render: (speed?: string) => <Tag color={getUSBSpeedColor(speed)}>{speed || 'Unknown'}</Tag> },
  { title: 'Port', dataIndex: 'hubPort', key: 'hubPort', width: 80, render: (port?: string) => port || '\u2014' },
  { title: 'Connected', dataIndex: 'connectedAt', key: 'connectedAt', width: 150, render: (date?: string) => date ? new Date(date).toLocaleString() : '\u2014' },
];

export const printerColumns: ColumnsType<Printer> = [
  {
    title: 'Printer', key: 'printer',
    render: (_, record) => (
      <Space>
        <PrinterOutlined />
        <div>
          <Space>
            <Text strong>{record.name || 'Unknown Printer'}</Text>
            {record.isDefault && <Tag color="blue">Default</Tag>}
            {record.isShared && <Tag>Shared</Tag>}
          </Space>
          {record.manufacturer && <div><Text type="secondary" style={{ fontSize: '11px' }}>{record.manufacturer} {record.model}</Text></div>}
        </div>
      </Space>
    ),
  },
  { title: 'Connection', dataIndex: 'connectionType', key: 'connectionType', width: 100, render: (type?: string) => <Tag>{type || 'Unknown'}</Tag> },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (status?: string) => <Badge status={getPrinterStatusColor(status)} text={status || 'Unknown'} /> },
  { title: 'IP Address', dataIndex: 'ipAddress', key: 'ipAddress', width: 130, render: (ip?: string) => ip ? <Text copyable style={{ fontFamily: 'monospace', fontSize: '12px' }}>{ip}</Text> : '\u2014' },
  {
    title: 'Capabilities', dataIndex: 'capabilities', key: 'capabilities',
    render: (caps?: string[]) => caps && caps.length > 0 ? (
      <Space wrap size={[4, 4]}>{caps.map((cap) => <Tag key={cap} style={{ fontSize: '11px' }}>{cap}</Tag>)}</Space>
    ) : '\u2014',
  },
];

export const audioColumns: ColumnsType<AudioDevice> = [
  {
    title: 'Device', key: 'device',
    render: (_, record) => (
      <Space>
        <SoundOutlined />
        <div>
          <Space>
            <Text strong>{record.name || 'Unknown Audio Device'}</Text>
            {record.isDefault && <Tag color="blue">Default</Tag>}
          </Space>
          {record.manufacturer && <div><Text type="secondary" style={{ fontSize: '11px' }}>{record.manufacturer}</Text></div>}
        </div>
      </Space>
    ),
  },
  { title: 'Type', dataIndex: 'type', key: 'type', width: 80, render: (type?: string) => <Tag color={type === 'Output' ? 'green' : type === 'Input' ? 'blue' : 'purple'}>{type || 'Unknown'}</Tag> },
  { title: 'Device Type', dataIndex: 'deviceType', key: 'deviceType', width: 120, render: (deviceType?: string) => deviceType || '\u2014' },
  { title: 'Connection', dataIndex: 'connectionType', key: 'connectionType', width: 100, render: (type?: string) => <Tag>{type || 'Unknown'}</Tag> },
  { title: 'Status', dataIndex: 'isEnabled', key: 'isEnabled', width: 80, render: (enabled?: boolean) => enabled !== undefined ? <Badge status={enabled ? 'success' : 'default'} text={enabled ? 'Enabled' : 'Disabled'} /> : '\u2014' },
  { title: 'Sample Rate', dataIndex: 'sampleRate', key: 'sampleRate', width: 100, render: (rate?: number) => (rate ? `${rate} Hz` : '\u2014') },
];

export const bluetoothColumns: ColumnsType<BluetoothDevice> = [
  {
    title: 'Device', key: 'device',
    render: (_, record) => (
      <Space>
        <WifiOutlined />
        <div>
          <Text strong>{record.name || 'Unknown Bluetooth Device'}</Text>
          {record.manufacturer && <div><Text type="secondary" style={{ fontSize: '11px' }}>{record.manufacturer}</Text></div>}
        </div>
      </Space>
    ),
  },
  { title: 'Type', dataIndex: 'type', key: 'type', width: 100, render: (type?: string) => <Tag>{type || 'Unknown'}</Tag> },
  {
    title: 'Status', key: 'status', width: 120,
    render: (_, record) => (
      <Space orientation="vertical" size={0}>
        <Badge status={record.connected ? 'success' : 'default'} text={record.connected ? 'Connected' : 'Disconnected'} />
        {record.paired && <Tag style={{ marginTop: 4 }}>Paired</Tag>}
      </Space>
    ),
  },
  { title: 'Battery', dataIndex: 'batteryLevel', key: 'batteryLevel', width: 100, render: (battery?: number) => battery !== undefined ? <Progress percent={battery} size="small" status={battery < 20 ? 'exception' : undefined} /> : '\u2014' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: 150, render: (addr?: string) => addr ? <Text copyable style={{ fontSize: '11px', fontFamily: 'monospace' }}>{addr}</Text> : '\u2014' },
  { title: 'Last Connected', dataIndex: 'lastConnected', key: 'lastConnected', width: 150, render: (date?: string) => date ? new Date(date).toLocaleString() : '\u2014' },
];
