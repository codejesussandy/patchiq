import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Table,
  Typography,
  Space,
  Spin,
  Empty,
  Badge,
  Progress,
  Collapse,
} from 'antd';
import {
  DesktopOutlined,
  UsbOutlined,
  PrinterOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  WifiOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  PeripheralInventory,
  Monitor,
  USBDevice,
  DockingStation,
  Printer,
  AudioDevice,
  BluetoothDevice,
  Webcam,
} from '../../../../types/peripheral.types';
import { assetService } from '../../../../services/asset.service';

const { Text } = Typography;
const { Panel } = Collapse;

interface PeripheralsTabProps {
  assetId: string;
}

const getConnectionTypeColor = (type?: string) => {
  switch (type) {
    case 'HDMI':
      return 'purple';
    case 'DisplayPort':
      return 'blue';
    case 'USB-C':
    case 'Thunderbolt':
      return 'cyan';
    case 'VGA':
    case 'DVI':
      return 'orange';
    case 'Internal':
      return 'green';
    default:
      return 'default';
  }
};

const getUSBSpeedColor = (speed?: string) => {
  switch (speed) {
    case 'SuperPlus':
    case 'Super':
      return 'blue';
    case 'High':
      return 'green';
    case 'Full':
      return 'orange';
    case 'Low':
      return 'red';
    default:
      return 'default';
  }
};

const getPrinterStatusColor = (status?: string) => {
  switch (status) {
    case 'Ready':
      return 'success';
    case 'Busy':
      return 'processing';
    case 'Offline':
    case 'Error':
      return 'error';
    case 'PaperJam':
    case 'LowToner':
      return 'warning';
    default:
      return 'default';
  }
};

const getUSBDeviceClassIcon = (deviceClass?: string) => {
  switch (deviceClass) {
    case 'HID':
      return <AppstoreOutlined />;
    case 'MassStorage':
      return <UsbOutlined />;
    case 'Audio':
      return <SoundOutlined />;
    case 'Video':
      return <VideoCameraOutlined />;
    case 'Printer':
      return <PrinterOutlined />;
    default:
      return <UsbOutlined />;
  }
};

export const PeripheralsTab = ({ assetId }: PeripheralsTabProps) => {
  const [peripherals, setPeripherals] = useState<PeripheralInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPeripheralsData();
  }, [assetId]);

  const fetchPeripheralsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetService.getAssetPeripherals(assetId);
      setPeripherals(data);
    } catch (err) {
      console.error('Failed to fetch peripherals data:', err);
      setError('Failed to load peripherals information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !peripherals) {
    return <Empty description={error || 'No peripherals data available'} />;
  }

  const monitorColumns: ColumnsType<Monitor> = [
    {
      title: 'Monitor',
      key: 'monitor',
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Space>
            <Text strong>{record.name || record.model || 'Unknown Monitor'}</Text>
            {record.isPrimary && <Tag color="blue">Primary</Tag>}
            {record.isBuiltIn && <Tag color="green">Built-in</Tag>}
          </Space>
          {record.manufacturer && (
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.manufacturer}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Resolution',
      key: 'resolution',
      width: 150,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text>{record.resolution || '—'}</Text>
          {record.refreshRate && (
            <Text type="secondary" style={{ fontSize: '11px' }}>{record.refreshRate} Hz</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Connection',
      dataIndex: 'connectionType',
      key: 'connectionType',
      width: 120,
      render: (type?: string) => (
        <Tag color={getConnectionTypeColor(type)}>{type || 'Unknown'}</Tag>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'screenSizeInches',
      key: 'screenSizeInches',
      width: 80,
      render: (size?: number) => (size ? `${size}"` : '—'),
    },
    {
      title: 'Scaling',
      dataIndex: 'scalingPercent',
      key: 'scalingPercent',
      width: 80,
      render: (scaling?: number) => (scaling ? `${scaling}%` : '—'),
    },
    {
      title: 'Serial',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 150,
      render: (serial?: string) =>
        serial ? (
          <Text copyable style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            {serial}
          </Text>
        ) : (
          '—'
        ),
    },
  ];

  const usbColumns: ColumnsType<USBDevice> = [
    {
      title: 'Device',
      key: 'device',
      render: (_, record) => (
        <Space>
          {getUSBDeviceClassIcon(record.deviceClass)}
          <div>
            <Text strong>{record.name || 'Unknown USB Device'}</Text>
            {record.manufacturer && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>{record.manufacturer}</Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'deviceClass',
      key: 'deviceClass',
      width: 120,
      render: (deviceClass?: string) => <Tag>{deviceClass || 'Unknown'}</Tag>,
    },
    {
      title: 'USB Version',
      dataIndex: 'usbVersion',
      key: 'usbVersion',
      width: 100,
      render: (version?: string) => (version ? `USB ${version}` : '—'),
    },
    {
      title: 'Speed',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      render: (speed?: string) => (
        <Tag color={getUSBSpeedColor(speed)}>{speed || 'Unknown'}</Tag>
      ),
    },
    {
      title: 'Port',
      dataIndex: 'hubPort',
      key: 'hubPort',
      width: 80,
      render: (port?: string) => port || '—',
    },
    {
      title: 'Connected',
      dataIndex: 'connectedAt',
      key: 'connectedAt',
      width: 150,
      render: (date?: string) =>
        date ? new Date(date).toLocaleString() : '—',
    },
  ];

  const printerColumns: ColumnsType<Printer> = [
    {
      title: 'Printer',
      key: 'printer',
      render: (_, record) => (
        <Space>
          <PrinterOutlined />
          <div>
            <Space>
              <Text strong>{record.name || 'Unknown Printer'}</Text>
              {record.isDefault && <Tag color="blue">Default</Tag>}
              {record.isShared && <Tag>Shared</Tag>}
            </Space>
            {record.manufacturer && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {record.manufacturer} {record.model}
                </Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Connection',
      dataIndex: 'connectionType',
      key: 'connectionType',
      width: 100,
      render: (type?: string) => <Tag>{type || 'Unknown'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status?: string) => (
        <Badge status={getPrinterStatusColor(status)} text={status || 'Unknown'} />
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip?: string) =>
        ip ? (
          <Text copyable style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {ip}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      title: 'Capabilities',
      dataIndex: 'capabilities',
      key: 'capabilities',
      render: (caps?: string[]) =>
        caps && caps.length > 0 ? (
          <Space wrap size={[4, 4]}>
            {caps.map((cap) => (
              <Tag key={cap} style={{ fontSize: '11px' }}>
                {cap}
              </Tag>
            ))}
          </Space>
        ) : (
          '—'
        ),
    },
  ];

  const audioColumns: ColumnsType<AudioDevice> = [
    {
      title: 'Device',
      key: 'device',
      render: (_, record) => (
        <Space>
          <SoundOutlined />
          <div>
            <Space>
              <Text strong>{record.name || 'Unknown Audio Device'}</Text>
              {record.isDefault && <Tag color="blue">Default</Tag>}
            </Space>
            {record.manufacturer && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>{record.manufacturer}</Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type?: string) => (
        <Tag color={type === 'Output' ? 'green' : type === 'Input' ? 'blue' : 'purple'}>
          {type || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Device Type',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 120,
      render: (deviceType?: string) => deviceType || '—',
    },
    {
      title: 'Connection',
      dataIndex: 'connectionType',
      key: 'connectionType',
      width: 100,
      render: (type?: string) => <Tag>{type || 'Unknown'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 80,
      render: (enabled?: boolean) =>
        enabled !== undefined ? (
          <Badge status={enabled ? 'success' : 'default'} text={enabled ? 'Enabled' : 'Disabled'} />
        ) : (
          '—'
        ),
    },
    {
      title: 'Sample Rate',
      dataIndex: 'sampleRate',
      key: 'sampleRate',
      width: 100,
      render: (rate?: number) => (rate ? `${rate} Hz` : '—'),
    },
  ];

  const bluetoothColumns: ColumnsType<BluetoothDevice> = [
    {
      title: 'Device',
      key: 'device',
      render: (_, record) => (
        <Space>
          <WifiOutlined />
          <div>
            <Text strong>{record.name || 'Unknown Bluetooth Device'}</Text>
            {record.manufacturer && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>{record.manufacturer}</Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type?: string) => <Tag>{type || 'Unknown'}</Tag>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Badge
            status={record.connected ? 'success' : 'default'}
            text={record.connected ? 'Connected' : 'Disconnected'}
          />
          {record.paired && <Tag style={{ marginTop: 4 }}>Paired</Tag>}
        </Space>
      ),
    },
    {
      title: 'Battery',
      dataIndex: 'batteryLevel',
      key: 'batteryLevel',
      width: 100,
      render: (battery?: number) =>
        battery !== undefined ? (
          <Progress
            percent={battery}
            size="small"
            status={battery < 20 ? 'exception' : undefined}
          />
        ) : (
          '—'
        ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 150,
      render: (addr?: string) =>
        addr ? (
          <Text copyable style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            {addr}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      title: 'Last Connected',
      dataIndex: 'lastConnected',
      key: 'lastConnected',
      width: 150,
      render: (date?: string) =>
        date ? new Date(date).toLocaleString() : '—',
    },
  ];

  const hasMonitors = peripherals.monitors && peripherals.monitors.length > 0;
  const hasUSBDevices = peripherals.usbDevices && peripherals.usbDevices.length > 0;
  const hasDockingStations = peripherals.dockingStations && peripherals.dockingStations.length > 0;
  const hasPrinters = peripherals.printers && peripherals.printers.length > 0;
  const hasAudioDevices = peripherals.audioDevices && peripherals.audioDevices.length > 0;
  const hasBluetoothDevices = peripherals.bluetoothDevices && peripherals.bluetoothDevices.length > 0;
  const hasWebcams = peripherals.webcams && peripherals.webcams.length > 0;

  const defaultActiveKeys = [
    hasMonitors && 'monitors',
    hasUSBDevices && 'usb',
    hasDockingStations && 'docks',
    hasPrinters && 'printers',
    hasAudioDevices && 'audio',
    hasBluetoothDevices && 'bluetooth',
    hasWebcams && 'webcams',
  ].filter(Boolean) as string[];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <DesktopOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {peripherals.monitorCount ?? peripherals.monitors?.length ?? 0}
            </div>
            <Text type="secondary">Monitors</Text>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <UsbOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {peripherals.usbDeviceCount ?? peripherals.usbDevices?.length ?? 0}
            </div>
            <Text type="secondary">USB Devices</Text>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <PrinterOutlined style={{ fontSize: 24, color: '#722ed1', marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {peripherals.printers?.length ?? 0}
            </div>
            <Text type="secondary">Printers</Text>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <SoundOutlined style={{ fontSize: 24, color: '#fa8c16', marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {peripherals.audioDevices?.length ?? 0}
            </div>
            <Text type="secondary">Audio</Text>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <WifiOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {peripherals.bluetoothDevices?.length ?? 0}
            </div>
            <Text type="secondary">Bluetooth</Text>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <VideoCameraOutlined style={{ fontSize: 24, color: '#13c2c2', marginBottom: 8 }} />
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {peripherals.webcams?.length ?? 0}
            </div>
            <Text type="secondary">Webcams</Text>
          </Card>
        </Col>
      </Row>

      {/* Peripheral Sections */}
      <Collapse defaultActiveKey={defaultActiveKeys}>
        {/* Monitors */}
        {hasMonitors && (
          <Panel
            header={
              <Space>
                <DesktopOutlined />
                <span>Monitors ({peripherals.monitors!.length})</span>
              </Space>
            }
            key="monitors"
          >
            <Table
              columns={monitorColumns}
              dataSource={peripherals.monitors}
              rowKey={(record) => record.id || record.serialNumber || record.name || Math.random().toString()}
              pagination={false}
              size="small"
            />
          </Panel>
        )}

        {/* Docking Stations */}
        {hasDockingStations && (
          <Panel
            header={
              <Space>
                <AppstoreOutlined />
                <span>Docking Stations ({peripherals.dockingStations!.length})</span>
              </Space>
            }
            key="docks"
          >
            <Row gutter={[16, 16]}>
              {peripherals.dockingStations!.map((dock: DockingStation, index: number) => (
                <Col span={12} key={dock.id || index}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Text strong>{dock.name || dock.model || 'Unknown Dock'}</Text>
                        {dock.connectionType && <Tag>{dock.connectionType}</Tag>}
                      </Space>
                      {dock.manufacturer && (
                        <Text type="secondary">{dock.manufacturer}</Text>
                      )}
                      {dock.powerDeliveryWatts && (
                        <Text type="secondary">Power Delivery: {dock.powerDeliveryWatts}W</Text>
                      )}
                      {dock.availablePorts && (
                        <Space wrap>
                          {dock.availablePorts.usb_a && (
                            <Tag>USB-A: {dock.availablePorts.usb_a}</Tag>
                          )}
                          {dock.availablePorts.usb_c && (
                            <Tag>USB-C: {dock.availablePorts.usb_c}</Tag>
                          )}
                          {dock.availablePorts.hdmi && (
                            <Tag>HDMI: {dock.availablePorts.hdmi}</Tag>
                          )}
                          {dock.availablePorts.displayPort && (
                            <Tag>DP: {dock.availablePorts.displayPort}</Tag>
                          )}
                          {dock.availablePorts.ethernet && (
                            <Tag>Ethernet: {dock.availablePorts.ethernet}</Tag>
                          )}
                        </Space>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Panel>
        )}

        {/* USB Devices */}
        {hasUSBDevices && (
          <Panel
            header={
              <Space>
                <UsbOutlined />
                <span>USB Devices ({peripherals.usbDevices!.length})</span>
              </Space>
            }
            key="usb"
          >
            <Table
              columns={usbColumns}
              dataSource={peripherals.usbDevices}
              rowKey={(record) => record.id || record.serialNumber || Math.random().toString()}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Panel>
        )}

        {/* Printers */}
        {hasPrinters && (
          <Panel
            header={
              <Space>
                <PrinterOutlined />
                <span>Printers ({peripherals.printers!.length})</span>
              </Space>
            }
            key="printers"
          >
            <Table
              columns={printerColumns}
              dataSource={peripherals.printers}
              rowKey={(record) => record.id || record.name || Math.random().toString()}
              pagination={false}
              size="small"
            />
          </Panel>
        )}

        {/* Audio Devices */}
        {hasAudioDevices && (
          <Panel
            header={
              <Space>
                <SoundOutlined />
                <span>Audio Devices ({peripherals.audioDevices!.length})</span>
              </Space>
            }
            key="audio"
          >
            <Table
              columns={audioColumns}
              dataSource={peripherals.audioDevices}
              rowKey={(record) => record.id || record.name || Math.random().toString()}
              pagination={false}
              size="small"
            />
          </Panel>
        )}

        {/* Bluetooth Devices */}
        {hasBluetoothDevices && (
          <Panel
            header={
              <Space>
                <WifiOutlined />
                <span>Bluetooth Devices ({peripherals.bluetoothDevices!.length})</span>
                {peripherals.bluetoothEnabled && <Tag color="blue">Enabled</Tag>}
              </Space>
            }
            key="bluetooth"
          >
            <Table
              columns={bluetoothColumns}
              dataSource={peripherals.bluetoothDevices}
              rowKey={(record) => record.id || record.address || Math.random().toString()}
              pagination={false}
              size="small"
            />
          </Panel>
        )}

        {/* Webcams */}
        {hasWebcams && (
          <Panel
            header={
              <Space>
                <VideoCameraOutlined />
                <span>Webcams ({peripherals.webcams!.length})</span>
              </Space>
            }
            key="webcams"
          >
            <Row gutter={[16, 16]}>
              {peripherals.webcams!.map((webcam: Webcam, index: number) => (
                <Col span={8} key={index}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Space orientation="vertical">
                      <Space>
                        <VideoCameraOutlined />
                        <Text strong>{webcam.name || 'Unknown Webcam'}</Text>
                        {webcam.isBuiltIn && <Tag color="green">Built-in</Tag>}
                      </Space>
                      {webcam.manufacturer && (
                        <Text type="secondary">{webcam.manufacturer}</Text>
                      )}
                      {webcam.resolution && (
                        <Text type="secondary">Resolution: {webcam.resolution}</Text>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Panel>
        )}
      </Collapse>

      {!hasMonitors && !hasUSBDevices && !hasDockingStations && !hasPrinters && !hasAudioDevices && !hasBluetoothDevices && !hasWebcams && (
        <Empty description="No peripheral devices detected" />
      )}
    </div>
  );
};
