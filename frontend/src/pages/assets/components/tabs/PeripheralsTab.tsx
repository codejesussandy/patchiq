import {
  DesktopOutlined,
  UsbOutlined,
  PrinterOutlined,
  SoundOutlined,
  VideoCameraOutlined,
  WifiOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Spin,
  Empty,
  Collapse,
} from 'antd';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetPeripherals } from '../../../../hooks/useAssets';
import type { DockingStation, Webcam } from '../../../../types/peripheral.types';
import {
  monitorColumns,
  usbColumns,
  printerColumns,
  audioColumns,
  bluetoothColumns,
} from './peripherals/peripheralColumns';
import { PeripheralsSummaryCards } from './peripherals/PeripheralsSummaryCards';

const { Text } = Typography;
const { Panel } = Collapse;

interface PeripheralsTabProps {
  assetId: string;
}

export const PeripheralsTab = ({ assetId }: PeripheralsTabProps) => {
  const { data: peripherals, isLoading, isError } = useAssetPeripherals(assetId);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spin size="large" /></div>;
  }

  if (isError || !peripherals) {
    return <Empty description={isError ? 'Failed to load peripherals information' : 'No peripherals data available'} />;
  }

  const hasMonitors = peripherals.monitors && peripherals.monitors.length > 0;
  const hasUSBDevices = peripherals.usbDevices && peripherals.usbDevices.length > 0;
  const hasDockingStations = peripherals.dockingStations && peripherals.dockingStations.length > 0;
  const hasPrinters = peripherals.printers && peripherals.printers.length > 0;
  const hasAudioDevices = peripherals.audioDevices && peripherals.audioDevices.length > 0;
  const hasBluetoothDevices = peripherals.bluetoothDevices && peripherals.bluetoothDevices.length > 0;
  const hasWebcams = peripherals.webcams && peripherals.webcams.length > 0;

  const defaultActiveKeys = [
    hasMonitors && 'monitors', hasUSBDevices && 'usb', hasDockingStations && 'docks',
    hasPrinters && 'printers', hasAudioDevices && 'audio', hasBluetoothDevices && 'bluetooth',
    hasWebcams && 'webcams',
  ].filter(Boolean) as string[];

  return (
    <div>
      <PeripheralsSummaryCards
        monitorCount={peripherals.monitorCount ?? peripherals.monitors?.length ?? 0}
        usbDeviceCount={peripherals.usbDeviceCount ?? peripherals.usbDevices?.length ?? 0}
        printerCount={peripherals.printers?.length ?? 0}
        audioDeviceCount={peripherals.audioDevices?.length ?? 0}
        bluetoothDeviceCount={peripherals.bluetoothDevices?.length ?? 0}
        webcamCount={peripherals.webcams?.length ?? 0}
      />

      <Collapse defaultActiveKey={defaultActiveKeys}>
        {hasMonitors && (
          <Panel header={<Space><DesktopOutlined /><span>Monitors ({peripherals.monitors!.length})</span></Space>} key="monitors">
            <DataTable columns={monitorColumns} data={peripherals.monitors} rowKey={(record) => record.id || record.serialNumber || record.name || Math.random().toString()} pagination={false} size="small" />
          </Panel>
        )}

        {hasDockingStations && (
          <Panel header={<Space><AppstoreOutlined /><span>Docking Stations ({peripherals.dockingStations!.length})</span></Space>} key="docks">
            <Row gutter={[16, 16]}>
              {peripherals.dockingStations!.map((dock: DockingStation, index: number) => (
                <Col span={12} key={dock.id || index}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Text strong>{dock.name || dock.model || 'Unknown Dock'}</Text>
                        {dock.connectionType && <Tag>{dock.connectionType}</Tag>}
                      </Space>
                      {dock.manufacturer && <Text type="secondary">{dock.manufacturer}</Text>}
                      {dock.powerDeliveryWatts && <Text type="secondary">Power Delivery: {dock.powerDeliveryWatts}W</Text>}
                      {dock.availablePorts && (
                        <Space wrap>
                          {dock.availablePorts.usb_a && <Tag>USB-A: {dock.availablePorts.usb_a}</Tag>}
                          {dock.availablePorts.usb_c && <Tag>USB-C: {dock.availablePorts.usb_c}</Tag>}
                          {dock.availablePorts.hdmi && <Tag>HDMI: {dock.availablePorts.hdmi}</Tag>}
                          {dock.availablePorts.displayPort && <Tag>DP: {dock.availablePorts.displayPort}</Tag>}
                          {dock.availablePorts.ethernet && <Tag>Ethernet: {dock.availablePorts.ethernet}</Tag>}
                        </Space>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Panel>
        )}

        {hasUSBDevices && (
          <Panel header={<Space><UsbOutlined /><span>USB Devices ({peripherals.usbDevices!.length})</span></Space>} key="usb">
            <DataTable columns={usbColumns} data={peripherals.usbDevices} rowKey={(record) => record.id || record.serialNumber || Math.random().toString()} pagination={{ pageSize: 10 }} size="small" />
          </Panel>
        )}

        {hasPrinters && (
          <Panel header={<Space><PrinterOutlined /><span>Printers ({peripherals.printers!.length})</span></Space>} key="printers">
            <DataTable columns={printerColumns} data={peripherals.printers} rowKey={(record) => record.id || record.name || Math.random().toString()} pagination={false} size="small" />
          </Panel>
        )}

        {hasAudioDevices && (
          <Panel header={<Space><SoundOutlined /><span>Audio Devices ({peripherals.audioDevices!.length})</span></Space>} key="audio">
            <DataTable columns={audioColumns} data={peripherals.audioDevices} rowKey={(record) => record.id || record.name || Math.random().toString()} pagination={false} size="small" />
          </Panel>
        )}

        {hasBluetoothDevices && (
          <Panel header={<Space><WifiOutlined /><span>Bluetooth Devices ({peripherals.bluetoothDevices!.length})</span>{peripherals.bluetoothEnabled && <Tag color="blue">Enabled</Tag>}</Space>} key="bluetooth">
            <DataTable columns={bluetoothColumns} data={peripherals.bluetoothDevices} rowKey={(record) => record.id || record.address || Math.random().toString()} pagination={false} size="small" />
          </Panel>
        )}

        {hasWebcams && (
          <Panel header={<Space><VideoCameraOutlined /><span>Webcams ({peripherals.webcams!.length})</span></Space>} key="webcams">
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
                      {webcam.manufacturer && <Text type="secondary">{webcam.manufacturer}</Text>}
                      {webcam.resolution && <Text type="secondary">Resolution: {webcam.resolution}</Text>}
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
