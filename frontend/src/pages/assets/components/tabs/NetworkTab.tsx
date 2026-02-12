import {
  WifiOutlined,
  GlobalOutlined,
  ApiOutlined,
  CloudOutlined,
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
  Badge,
  Tooltip,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetNetwork } from '../../../../hooks/useAssets';
import type { NetworkAdapterExpanded, IPConfiguration } from '../../../../types/network.types';
import { NetworkIdentityCard } from './network/NetworkIdentityCard';
import { WiFiConnectionCard } from './network/WiFiConnectionCard';

const { Text } = Typography;

interface NetworkTabProps {
  assetId: string;
}

const getAdapterTypeIcon = (type: string) => {
  switch (type) {
    case 'Ethernet':
      return <ApiOutlined />;
    case 'WiFi':
      return <WifiOutlined />;
    case 'Virtual':
    case 'VPN':
      return <CloudOutlined />;
    default:
      return <GlobalOutlined />;
  }
};

const getAdapterStatusColor = (status?: string) => {
  switch (status) {
    case 'Up':
      return 'success';
    case 'Down':
    case 'Disconnected':
      return 'error';
    default:
      return 'default';
  }
};

const renderIPConfiguration = (ipConfig?: IPConfiguration) => {
  if (!ipConfig) return <Text type="secondary">No IP configuration</Text>;

  return (
    <Descriptions size="small" column={2} bordered>
      {ipConfig.ipv4Address && (
        <Descriptions.Item label="IPv4 Address">
          <Text copyable>{ipConfig.ipv4Address}</Text>
          {ipConfig.ipv4SubnetMask && <Text type="secondary"> / {ipConfig.ipv4SubnetMask}</Text>}
        </Descriptions.Item>
      )}
      {ipConfig.ipv4Gateway && (
        <Descriptions.Item label="IPv4 Gateway">
          <Text copyable>{ipConfig.ipv4Gateway}</Text>
        </Descriptions.Item>
      )}
      {ipConfig.ipv6Address && (
        <Descriptions.Item label="IPv6 Address" span={2}>
          <Text copyable style={{ fontSize: '12px' }}>{ipConfig.ipv6Address}</Text>
        </Descriptions.Item>
      )}
      {ipConfig.dhcpEnabled !== undefined && (
        <Descriptions.Item label="DHCP">
          <Badge
            status={ipConfig.dhcpEnabled ? 'processing' : 'default'}
            text={ipConfig.dhcpEnabled ? 'Enabled' : 'Static'}
          />
        </Descriptions.Item>
      )}
      {ipConfig.dhcpServer && (
        <Descriptions.Item label="DHCP Server">
          <Text copyable>{ipConfig.dhcpServer}</Text>
        </Descriptions.Item>
      )}
      {ipConfig.dnsServers && ipConfig.dnsServers.length > 0 && (
        <Descriptions.Item label="DNS Servers" span={2}>
          <Space wrap>
            {ipConfig.dnsServers.map((dns, idx) => (
              <Tag key={idx}>{dns}</Tag>
            ))}
          </Space>
        </Descriptions.Item>
      )}
    </Descriptions>
  );
};

export const NetworkTab = ({ assetId }: NetworkTabProps) => {
  const { data: network, isLoading, isError } = useAssetNetwork(assetId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !network) {
    return <Empty description={isError ? 'Failed to load network information' : 'No network data available'} />;
  }

  const adapterColumns: ColumnsType<NetworkAdapterExpanded> = [
    {
      title: 'Adapter',
      key: 'adapter',
      width: 250,
      render: (_, record) => (
        <Space>
          {getAdapterTypeIcon(record.type)}
          <div>
            <Text strong>{record.name}</Text>
            {record.description && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>{record.description}</Text>
              </div>
            )}
          </div>
        </Space>
      ) },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status?: string) => (
        <Badge status={getAdapterStatusColor(status)} text={status || 'Unknown'} />
      ) },
    {
      title: 'MAC Address',
      dataIndex: 'macAddress',
      key: 'macAddress',
      width: 150,
      render: (mac: string) => <Text copyable style={{ fontFamily: 'monospace', fontSize: '12px' }}>{mac}</Text> },
    {
      title: 'IP Address',
      key: 'ipAddress',
      width: 150,
      render: (_, record) => {
        const ip = record.ipConfiguration?.ipv4Address;
        return ip ? (
          <Text copyable style={{ fontFamily: 'monospace' }}>{ip}</Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      } },
    {
      title: 'Speed',
      dataIndex: 'speedMbps',
      key: 'speedMbps',
      width: 100,
      render: (speed?: number) =>
        speed ? (
          <Text>{speed >= 1000 ? `${speed / 1000} Gbps` : `${speed} Mbps`}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ) },
    {
      title: 'Driver',
      key: 'driver',
      width: 120,
      render: (_, record) =>
        record.driverVersion ? (
          <Tooltip title={`Date: ${record.driverDate || 'Unknown'}`}>
            <Text style={{ fontSize: '12px' }}>{record.driverVersion}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ) },
  ];

  return (
    <div>
      <NetworkIdentityCard
        identity={network.identity}
        vpnConnected={network.vpnConnected}
        vpnName={network.vpnName}
        publicIpAddress={network.publicIpAddress}
      />

      {network.wifiConnection && (
        <WiFiConnectionCard wifiConnection={network.wifiConnection} />
      )}

      {/* Network Adapters */}
      <Card
        title={
          <Space>
            <ApiOutlined />
            <span>Network Adapters ({network.adapters.length})</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          network.primaryAdapter && (
            <Text type="secondary">Primary: {network.primaryAdapter}</Text>
          )
        }
      >
        <DataTable
          columns={adapterColumns}
          data={network.adapters}
          rowKey={(record) => record.id || record.macAddress}
          pagination={false}
          size="small"
          expandable={{
            expandedRowRender: (record) => renderIPConfiguration(record.ipConfiguration),
            rowExpandable: (record) => !!record.ipConfiguration }}
        />
      </Card>

      {/* Proxy Configuration (if configured) */}
      {network.proxyConfigured && (
        <Card
          title={
            <Space>
              <GlobalOutlined />
              <span>Proxy Configuration</span>
            </Space>
          }
          size="small"
        >
          <Row gutter={[24, 16]}>
            <Col span={8}>
              <Text type="secondary">Status</Text>
              <div>
                <Badge status="processing" text="Configured" />
              </div>
            </Col>
            {network.proxyServer && (
              <Col span={8}>
                <Text type="secondary">Proxy Server</Text>
                <div>
                  <Text copyable>{network.proxyServer}</Text>
                </div>
              </Col>
            )}
            {network.proxyPort && (
              <Col span={8}>
                <Text type="secondary">Port</Text>
                <div>
                  <Text>{network.proxyPort}</Text>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}
    </div>
  );
};
