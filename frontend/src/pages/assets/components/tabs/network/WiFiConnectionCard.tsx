import { WifiOutlined } from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Progress,
} from 'antd';

const { Text } = Typography;

interface WiFiConnection {
  ssid?: string;
  bssid?: string;
  signalStrength?: number;
  securityType?: string;
  protocol?: string;
  channel?: number;
  band?: string;
  linkSpeed?: string;
  frequency?: number;
}

interface WiFiConnectionCardProps {
  wifiConnection: WiFiConnection;
}

const getWifiSignalColor = (strength?: number) => {
  if (strength === undefined) return '#d9d9d9';
  if (strength >= 75) return '#52c41a';
  if (strength >= 50) return '#faad14';
  if (strength >= 25) return '#fa8c16';
  return '#ff4d4f';
};

const getWifiSecurityColor = (security?: string) => {
  switch (security) {
    case 'WPA3':
    case 'WPA3-Enterprise':
      return 'success';
    case 'WPA2':
    case 'WPA2-Enterprise':
      return 'processing';
    case 'WPA':
      return 'warning';
    case 'WEP':
    case 'Open':
      return 'error';
    default:
      return 'default';
  }
};

export const WiFiConnectionCard = ({ wifiConnection }: WiFiConnectionCardProps) => {
  if (!wifiConnection.ssid) return null;

  return (
    <Card
      title={
        <Space>
          <WifiOutlined />
          <span>WiFi Connection</span>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Space>
          {wifiConnection.securityType && (
            <Tag color={getWifiSecurityColor(wifiConnection.securityType)}>
              {wifiConnection.securityType}
            </Tag>
          )}
          {wifiConnection.protocol && (
            <Tag>{wifiConnection.protocol}</Tag>
          )}
        </Space>
      }
    >
      <Row gutter={[24, 16]}>
        <Col span={6}>
          <Text type="secondary">SSID</Text>
          <div>
            <Text strong>{wifiConnection.ssid}</Text>
          </div>
        </Col>
        <Col span={6}>
          <Text type="secondary">Signal Strength</Text>
          <div>
            <Progress
              percent={wifiConnection.signalStrength || 0}
              size="small"
              strokeColor={getWifiSignalColor(wifiConnection.signalStrength)}
              format={(percent) => `${percent}%`}
            />
          </div>
        </Col>
        {wifiConnection.channel && (
          <Col span={4}>
            <Text type="secondary">Channel</Text>
            <div>
              <Text strong>{wifiConnection.channel}</Text>
              {wifiConnection.band && (
                <Tag style={{ marginLeft: 8 }}>{wifiConnection.band}</Tag>
              )}
            </div>
          </Col>
        )}
        {wifiConnection.linkSpeed && (
          <Col span={4}>
            <Text type="secondary">Link Speed</Text>
            <div>
              <Text strong>{wifiConnection.linkSpeed}</Text>
            </div>
          </Col>
        )}
        {wifiConnection.frequency && (
          <Col span={4}>
            <Text type="secondary">Frequency</Text>
            <div>
              <Text>{wifiConnection.frequency} MHz</Text>
            </div>
          </Col>
        )}
      </Row>
      {wifiConnection.bssid && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">BSSID: </Text>
          <Text copyable style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {wifiConnection.bssid}
          </Text>
        </div>
      )}
    </Card>
  );
};
