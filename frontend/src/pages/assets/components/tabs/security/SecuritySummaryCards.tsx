import {
  LockOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { Row, Col, Card, Tag, Typography, Space } from 'antd';

const { Text } = Typography;

interface SecuritySummaryCardsProps {
  encryption?: {
    driveEncryptionEnabled?: boolean;
    encryptionType?: string;
  };
  firewall?: {
    enabled?: boolean;
    productName?: string;
  };
  antivirus?: {
    installed?: boolean;
    xdrInstalled?: boolean;
  };
  secureBootEnabled?: boolean;
  uacEnabled?: boolean;
}

export const SecuritySummaryCards = ({ encryption, firewall, antivirus, secureBootEnabled, uacEnabled }: SecuritySummaryCardsProps) => (
  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
    <Col span={6}>
      <Card size="small" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <Space align="center">
          <LockOutlined style={{ fontSize: 24, color: encryption?.driveEncryptionEnabled ? '#52c41a' : '#ff4d4f' }} />
          <div>
            <Text type="secondary" style={{ fontSize: 16 }}>Encryption</Text>
            <div><Text strong>{encryption?.driveEncryptionEnabled ? 'Enabled' : 'Disabled'}</Text></div>
            {encryption?.encryptionType && <Tag>{encryption.encryptionType}</Tag>}
          </div>
        </Space>
      </Card>
    </Col>
    <Col span={6}>
      <Card size="small" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <Space align="center">
          <SafetyOutlined style={{ fontSize: 24, color: firewall?.enabled ? '#52c41a' : '#ff4d4f' }} />
          <div>
            <Text type="secondary" style={{ fontSize: 16 }}>Firewall</Text>
            <div><Text strong>{firewall?.enabled ? 'Enabled' : 'Disabled'}</Text></div>
            {firewall?.productName && <Text type="secondary" style={{ fontSize: 11 }}>{firewall.productName}</Text>}
          </div>
        </Space>
      </Card>
    </Col>
    <Col span={6}>
      <Card size="small" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <Space align="center">
          <SecurityScanOutlined style={{ fontSize: 24, color: antivirus?.installed ? '#52c41a' : '#ff4d4f' }} />
          <div>
            <Text type="secondary" style={{ fontSize: 16 }}>Antivirus</Text>
            <div><Text strong>{antivirus?.installed ? 'Installed' : 'Not Installed'}</Text></div>
            {antivirus?.xdrInstalled && <Tag color="blue">XDR</Tag>}
          </div>
        </Space>
      </Card>
    </Col>
    <Col span={6}>
      <Card size="small" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <Space align="center">
          <DesktopOutlined style={{ fontSize: 24, color: secureBootEnabled ? '#52c41a' : '#faad14' }} />
          <div>
            <Text type="secondary" style={{ fontSize: 16 }}>Secure Boot</Text>
            <div><Text strong>{secureBootEnabled ? 'Enabled' : 'Disabled'}</Text></div>
            {uacEnabled !== undefined && <Text type="secondary" style={{ fontSize: 11 }}>UAC: {uacEnabled ? 'On' : 'Off'}</Text>}
          </div>
        </Space>
      </Card>
    </Col>
  </Row>
);
