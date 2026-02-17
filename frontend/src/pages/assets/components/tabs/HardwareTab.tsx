import {
  WindowsOutlined,
  AppleOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Typography,
  Progress,
  Button,
} from 'antd';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetHardware } from '../../../../hooks/useAssets';

const { Title, Text } = Typography;

interface HardwareTabProps {
  assetId: string;
  osType?: string;
  manufacturer?: string;
  model?: string;
}

export const HardwareTab = ({ assetId, osType, manufacturer, model }: HardwareTabProps) => {
  const { data: hardware, isLoading: loadingHardware } = useAssetHardware(assetId);

  if (loadingHardware) return <div>Loading hardware data...</div>;
  if (!hardware) return <div>No hardware data available</div>;

  const networkColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'IP ADDRESS V4', dataIndex: 'ipAddressV4', key: 'ipAddressV4' },
    { title: 'IP ADDRESS V6', dataIndex: 'ipAddressV6', key: 'ipAddressV6' },
    { title: 'MAC ADDRESS', dataIndex: 'macAddress', key: 'macAddress' },
    { title: 'DHCP SERV', dataIndex: 'dhcpServer', key: 'dhcpServer' },
  ];

  const isMac = osType?.toLowerCase().includes('mac') || osType?.toLowerCase().includes('darwin');
  const isLinux = osType?.toLowerCase().includes('linux');

  return (
    <div>
      {/* Device Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px', background: '#f5f5f5', borderRadius: '8px', marginBottom: 24 }}>
          <div style={{ fontSize: '80px', color: isMac ? '#000' : isLinux ? '#E95420' : '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '120px' }}>
            {isMac ? <AppleOutlined /> : isLinux ? <DesktopOutlined style={{ color: '#E95420' }} /> : <WindowsOutlined />}
          </div>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
              {model || hardware.bios?.name || 'Unknown Device'}
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {manufacturer || hardware.bios?.manufacturer || 'Unknown Manufacturer'}
            </Text>
          </div>
        </div>
      </div>

      {/* BIOS Details */}
      <Card title="BIOS Information" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}><Text type="secondary">Install Date</Text><div>{hardware.bios?.installDate ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">BIOS Version</Text><div>{hardware.bios?.biosVersion ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Manufacturer</Text><div>{hardware.bios?.manufacturer ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Description</Text><div>{hardware.bios?.description ?? 'N/A'}</div></Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}><Text type="secondary">Secure Boot State</Text><div>{hardware.bios?.secureBootState ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Serial Number</Text><div>{hardware.bios?.serialNumber ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Processor */}
      <Card
        title={<div><div style={{ fontWeight: 600 }}>{hardware.processor?.name ?? 'Unknown Processor'}</div><Text type="secondary" style={{ fontSize: '16px' }}>PROCESSOR DETAILS</Text></div>}
        size="small" style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={6}><Text type="secondary">Logical Processors</Text><div>{hardware.processor?.logicalProcessors ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Manufacturer</Text><div>{hardware.processor?.manufacturer ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Number of Core</Text><div>{hardware.processor?.numberOfCores ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Processor Speed</Text><div>{hardware.processor?.processorSpeed ?? 'N/A'}</div></Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}><Text type="secondary">Secure Boot State</Text><div style={{ fontSize: '11px', wordBreak: 'break-all' }}>{hardware.processor?.secureBootState ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Baseboard */}
      <Card
        title={<div><div style={{ fontWeight: 600 }}>{hardware.baseBoard?.name ?? 'Unknown Baseboard'}</div><Text type="secondary" style={{ fontSize: '16px' }}>BASEBOARD DETAILS</Text></div>}
        size="small" style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={6}><Text type="secondary">Part Number</Text><div>{hardware.baseBoard?.partNumber ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Product ID</Text><div>{hardware.baseBoard?.productId ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Serial Number</Text><div>{hardware.baseBoard?.serialNumber ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary">Tag</Text><div>{hardware.baseBoard?.tag ?? 'N/A'}</div></Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}><Text type="secondary">Version</Text><div>{hardware.baseBoard?.version ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Storage */}
      <Card
        title={
          <div>
            <div style={{ fontWeight: 600 }}>
              {(hardware.storage || []).length} Partition -{' '}
              {(() => {
                const storage = hardware.storage || [];
                const mainDrive = storage.find(d => d.mountPoint === '/' || d.mountPoint === '/System/Volumes/Data' || d.name?.toLowerCase().includes('macintosh')) || storage[0];
                const capacity = parseFloat(mainDrive?.capacity || '0');
                return capacity >= 1000 ? `${(capacity / 1024).toFixed(1)} TB` : `${Math.round(capacity)} GB`;
              })()}
            </div>
            <Text type="secondary" style={{ fontSize: '16px' }}>STORAGE</Text>
          </div>
        }
        size="small" style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          {(hardware.storage || []).map((drive, idx) => {
            const usedGB = parseFloat(drive.used?.replace(/[^0-9.]/g, '') || '0');
            const capacityGB = parseFloat(drive.capacity?.replace(/[^0-9.]/g, '') || '1');
            const usedPercent = capacityGB > 0 ? Math.round((usedGB / capacityGB) * 100) : 0;
            const progressColor = usedPercent > 90 ? '#ff4d4f' : usedPercent > 70 ? '#faad14' : '#52c41a';
            return (
              <Col span={12} key={idx}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Row gutter={8}>
                    <Col span={12}><Text type="secondary">Drive</Text><div style={{ fontWeight: 600 }}>{drive.drive}</div></Col>
                    <Col span={12}><Text type="secondary">Capacity</Text><div><span style={{ color: progressColor }}>{drive.used}</span> / {drive.capacity}</div></Col>
                  </Row>
                  <Row style={{ marginTop: 8 }}>
                    <Col span={24}><Progress percent={usedPercent} strokeColor={progressColor} size="small" format={() => `${usedPercent}% used`} /></Col>
                  </Row>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={8}><Text type="secondary">Format</Text><div>{drive.format}</div></Col>
                    <Col span={8}><Text type="secondary">Type</Text><div>{drive.type}</div></Col>
                    <Col span={8}><Text type="secondary">Serial number</Text><div style={{ fontSize: '11px' }}>{drive.serialNumber}</div></Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="link" size="small">Show Less &#x02C4;</Button>
        </div>
      </Card>

      {/* Memory */}
      <Card
        title={
          <div>
            <div style={{ fontWeight: 600 }}>{(hardware.memory || []).length} Slots - {(hardware.memory || []).reduce((acc, m) => acc + parseFloat(m.capacity || '0'), 0)} GB</div>
            <Text type="secondary" style={{ fontSize: '16px' }}>MEMORY</Text>
          </div>
        }
        size="small" style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          {(hardware.memory || []).map((mem, idx) => (
            <Col span={12} key={idx}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Row gutter={8}>
                  <Col span={12}><Text type="secondary">{mem.slot}</Text><div style={{ fontWeight: 600 }}>{mem.name}</div></Col>
                  <Col span={12}><Text type="secondary">Capacity</Text><div>{mem.capacity}</div></Col>
                </Row>
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={8}><Text type="secondary">Bank Label</Text><div>{mem.bankLabel}</div></Col>
                  <Col span={8}><Text type="secondary">Locator</Text><div>{mem.locator}</div></Col>
                  <Col span={8}><Text type="secondary">Memory Type</Text><div>{mem.memoryType}</div></Col>
                </Row>
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={12}><Text type="secondary">Serial Number</Text><div>{mem.serialNumber}</div></Col>
                  <Col span={12}><Text type="secondary">Part Number</Text><div style={{ fontSize: '11px' }}>{mem.partNumber}</div></Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Network Adapters */}
      <Card
        title={<div><div style={{ fontWeight: 600 }}>{(hardware.networkAdapters || []).length} Network Adapters</div><Text type="secondary" style={{ fontSize: '16px' }}>NETWORK ADAPTERS</Text></div>}
        size="small"
      >
        <DataTable
          columns={networkColumns}
          data={hardware.networkAdapters}
          rowKey="id"
          pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (total) => `Total ${total} Application found` }}
          size="small"
        />
      </Card>
    </div>
  );
};
