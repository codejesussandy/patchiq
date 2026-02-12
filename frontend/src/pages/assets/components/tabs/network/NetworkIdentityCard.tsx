import {
  LaptopOutlined,
  GlobalOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Tooltip,
} from 'antd';

const { Text } = Typography;

interface NetworkIdentity {
  hostname: string;
  fqdn?: string;
  domainName?: string;
  isDomainJoined?: boolean;
  workgroup?: string;
  domainRole?: string;
}

interface NetworkIdentityCardProps {
  identity: NetworkIdentity;
  vpnConnected?: boolean;
  vpnName?: string;
  publicIpAddress?: string;
}

export const NetworkIdentityCard = ({ identity, vpnConnected, vpnName, publicIpAddress }: NetworkIdentityCardProps) => {
  return (
    <Card
      title={
        <Space>
          <LaptopOutlined />
          <span>Network Identity</span>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Space>
          {vpnConnected && (
            <Tag color="green" icon={<CloudOutlined />}>
              VPN: {vpnName || 'Connected'}
            </Tag>
          )}
          {publicIpAddress && (
            <Tooltip title="Public IP">
              <Tag icon={<GlobalOutlined />}>{publicIpAddress}</Tag>
            </Tooltip>
          )}
        </Space>
      }
    >
      <Row gutter={[24, 16]}>
        <Col span={6}>
          <Text type="secondary">Hostname</Text>
          <div>
            <Text strong copyable>{identity.hostname}</Text>
          </div>
        </Col>
        {identity.fqdn && (
          <Col span={6}>
            <Text type="secondary">FQDN</Text>
            <div>
              <Text copyable style={{ fontSize: '13px' }}>{identity.fqdn}</Text>
            </div>
          </Col>
        )}
        {identity.domainName && (
          <Col span={6}>
            <Text type="secondary">Domain</Text>
            <div>
              <Text strong>{identity.domainName}</Text>
              {identity.isDomainJoined && (
                <Tag color="blue" style={{ marginLeft: 8 }}>Joined</Tag>
              )}
            </div>
          </Col>
        )}
        {identity.workgroup && (
          <Col span={6}>
            <Text type="secondary">Workgroup</Text>
            <div>
              <Text>{identity.workgroup}</Text>
            </div>
          </Col>
        )}
        {identity.domainRole && (
          <Col span={6}>
            <Text type="secondary">Domain Role</Text>
            <div>
              <Tag>{identity.domainRole}</Tag>
            </div>
          </Col>
        )}
      </Row>
    </Card>
  );
};
