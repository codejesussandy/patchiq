import {
  DesktopOutlined,
  UsbOutlined,
  PrinterOutlined,
  SoundOutlined,
  WifiOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Row, Col, Card, Typography } from 'antd';

const { Text } = Typography;

interface PeripheralsSummaryCardsProps {
  monitorCount: number;
  usbDeviceCount: number;
  printerCount: number;
  audioDeviceCount: number;
  bluetoothDeviceCount: number;
  webcamCount: number;
}

export const PeripheralsSummaryCards = ({
  monitorCount,
  usbDeviceCount,
  printerCount,
  audioDeviceCount,
  bluetoothDeviceCount,
  webcamCount,
}: PeripheralsSummaryCardsProps) => (
  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
    <Col span={4}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <DesktopOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{monitorCount}</div>
        <Text type="secondary">Monitors</Text>
      </Card>
    </Col>
    <Col span={4}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <UsbOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{usbDeviceCount}</div>
        <Text type="secondary">USB Devices</Text>
      </Card>
    </Col>
    <Col span={4}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <PrinterOutlined style={{ fontSize: 24, color: '#722ed1', marginBottom: 8 }} />
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{printerCount}</div>
        <Text type="secondary">Printers</Text>
      </Card>
    </Col>
    <Col span={4}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <SoundOutlined style={{ fontSize: 24, color: '#fa8c16', marginBottom: 8 }} />
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{audioDeviceCount}</div>
        <Text type="secondary">Audio</Text>
      </Card>
    </Col>
    <Col span={4}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <WifiOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{bluetoothDeviceCount}</div>
        <Text type="secondary">Bluetooth</Text>
      </Card>
    </Col>
    <Col span={4}>
      <Card size="small" style={{ textAlign: 'center' }}>
        <VideoCameraOutlined style={{ fontSize: 24, color: '#13c2c2', marginBottom: 8 }} />
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{webcamCount}</div>
        <Text type="secondary">Webcams</Text>
      </Card>
    </Col>
  </Row>
);
