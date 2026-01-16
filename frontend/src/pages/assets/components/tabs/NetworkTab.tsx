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
  Tooltip,
  Descriptions,
  Progress,
} from 'antd';
import {
  WifiOutlined,
  GlobalOutlined,
  ApiOutlined,
  CloudOutlined,
  LaptopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { NetworkConfiguration, NetworkAdapterExpanded, IPConfiguration } from '../../../../types/network.types';
import { assetService } from '../../../../services/asset.service';

const { Text, Title } = Typography;

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
      return 'error';
    case 'Open':
      return 'error';
    default:
      return 'default';
  }
};

export const NetworkTab = ({ assetId }: NetworkTabProps) => {
  const [network, setNetwork] = useState<NetworkConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNetworkData();
  }, [assetId]);

  const fetchNetworkData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetService.getAssetNetwork(assetId);
      setNetwork(data);
    } catch (err) {
      console.error('Failed to fetch network data:', err);
      setError('Failed to load network information');
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

  if (error || !network) {
    return <Empty description={error || 'No network data available'} />;
  }

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
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status?: string) => (
        <Badge status={getAdapterStatusColor(status)} text={status || 'Unknown'} />
      ),
    },
    {
      title: 'MAC Address',
      dataIndex: 'macAddress',
      key: 'macAddress',
      width: 150,
      render: (mac: string) => <Text copyable style={{ fontFamily: 'monospace', fontSize: '12px' }}>{mac}</Text>,
    },
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
      },
    },
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
        ),
    },
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
        ),
    },
  ];

  return (
    <div>
      {/* Network Identity Card */}
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
            {network.vpnConnected && (
              <Tag color="green" icon={<CloudOutlined />}>
                VPN: {network.vpnName || 'Connected'}
              </Tag>
            )}
            {network.publicIpAddress && (
              <Tooltip title="Public IP">
                <Tag icon={<GlobalOutlined />}>{network.publicIpAddress}</Tag>
              </Tooltip>
            )}
          </Space>
        }
      >
        <Row gutter={[24, 16]}>
          <Col span={6}>
            <Text type="secondary">Hostname</Text>
            <div>
              <Text strong copyable>{network.identity.hostname}</Text>
            </div>
          </Col>
          {network.identity.fqdn && (
            <Col span={6}>
              <Text type="secondary">FQDN</Text>
              <div>
                <Text copyable style={{ fontSize: '13px' }}>{network.identity.fqdn}</Text>
              </div>
            </Col>
          )}
          {network.identity.domainName && (
            <Col span={6}>
              <Text type="secondary">Domain</Text>
              <div>
                <Text strong>{network.identity.domainName}</Text>
                {network.identity.isDomainJoined && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>Joined</Tag>
                )}
              </div>
            </Col>
          )}
          {network.identity.workgroup && (
            <Col span={6}>
              <Text type="secondary">Workgroup</Text>
              <div>
                <Text>{network.identity.workgroup}</Text>
              </div>
            </Col>
          )}
          {network.identity.domainRole && (
            <Col span={6}>
              <Text type="secondary">Domain Role</Text>
              <div>
                <Tag>{network.identity.domainRole}</Tag>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* WiFi Connection Card (if connected) */}
      {network.wifiConnection && network.wifiConnection.ssid && (
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
              {network.wifiConnection.securityType && (
                <Tag color={getWifiSecurityColor(network.wifiConnection.securityType)}>
                  {network.wifiConnection.securityType}
                </Tag>
              )}
              {network.wifiConnection.protocol && (
                <Tag>{network.wifiConnection.protocol}</Tag>
              )}
            </Space>
          }
        >
          <Row gutter={[24, 16]}>
            <Col span={6}>
              <Text type="secondary">SSID</Text>
              <div>
                <Text strong>{network.wifiConnection.ssid}</Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Signal Strength</Text>
              <div>
                <Progress
                  percent={network.wifiConnection.signalStrength || 0}
                  size="small"
                  strokeColor={getWifiSignalColor(network.wifiConnection.signalStrength)}
                  format={(percent) => `${percent}%`}
                />
              </div>
            </Col>
            {network.wifiConnection.channel && (
              <Col span={4}>
                <Text type="secondary">Channel</Text>
                <div>
                  <Text strong>{network.wifiConnection.channel}</Text>
                  {network.wifiConnection.band && (
                    <Tag style={{ marginLeft: 8 }}>{network.wifiConnection.band}</Tag>
                  )}
                </div>
              </Col>
            )}
            {network.wifiConnection.linkSpeed && (
              <Col span={4}>
                <Text type="secondary">Link Speed</Text>
                <div>
                  <Text strong>{network.wifiConnection.linkSpeed}</Text>
                </div>
              </Col>
            )}
            {network.wifiConnection.frequency && (
              <Col span={4}>
                <Text type="secondary">Frequency</Text>
                <div>
                  <Text>{network.wifiConnection.frequency} MHz</Text>
                </div>
              </Col>
            )}
          </Row>
          {network.wifiConnection.bssid && (
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">BSSID: </Text>
              <Text copyable style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {network.wifiConnection.bssid}
              </Text>
            </div>
          )}
        </Card>
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
        <Table
          columns={adapterColumns}
          dataSource={network.adapters}
          rowKey={(record) => record.id || record.macAddress}
          pagination={false}
          size="small"
          expandable={{
            expandedRowRender: (record) => renderIPConfiguration(record.ipConfiguration),
            rowExpandable: (record) => !!record.ipConfiguration,
          }}
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
