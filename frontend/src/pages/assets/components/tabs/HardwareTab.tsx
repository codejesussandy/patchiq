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

  const cardBase = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 } as const;
  const cardHeadStyle = { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' };
  const sectionTitle = (main: string, sub: string) => (
    <div><div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{main}</div><div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>{sub}</div></div>
  );

  return (
    <div>
      {/* Device Header */}
      <div style={{ ...cardBase, display: 'flex', alignItems: 'center', gap: 24, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: '64px', color: isMac ? '#000' : isLinux ? '#E95420' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '80px' }}>
          {isMac ? <AppleOutlined /> : isLinux ? <DesktopOutlined style={{ color: '#E95420' }} /> : <WindowsOutlined />}
        </div>
        <div>
          <Title level={3} style={{ margin: 0, marginBottom: 4, color: '#111827' }}>
            {model || hardware.bios?.name || 'Unknown Device'}
          </Title>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {manufacturer || hardware.bios?.manufacturer || 'Unknown Manufacturer'}
          </Text>
        </div>
      </div>

      {/* BIOS Details */}
      <Card title="BIOS Information" size="small" style={cardBase} styles={{ header: cardHeadStyle }}>
        <Row gutter={[16, 14]}>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Install Date</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.bios?.installDate ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>BIOS Version</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.bios?.biosVersion ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Manufacturer</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.bios?.manufacturer ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Description</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.bios?.description ?? 'N/A'}</div></Col>
        </Row>
        <Row gutter={[16, 14]} style={{ marginTop: 14 }}>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Secure Boot State</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.bios?.secureBootState ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Serial Number</Text><div style={{ fontWeight: 500, color: '#111827', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{hardware.bios?.serialNumber ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Processor */}
      <Card title={sectionTitle(hardware.processor?.name ?? 'Unknown Processor', 'PROCESSOR DETAILS')} size="small" style={cardBase} styles={{ header: cardHeadStyle }}>
        <Row gutter={[16, 14]}>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Logical Processors</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.processor?.logicalProcessors ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Manufacturer</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.processor?.manufacturer ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Number of Core</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.processor?.numberOfCores ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Processor Speed</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.processor?.processorSpeed ?? 'N/A'}</div></Col>
        </Row>
        <Row gutter={[16, 14]} style={{ marginTop: 14 }}>
          <Col span={24}><Text type="secondary" style={{ fontSize: 12 }}>Secure Boot State</Text><div style={{ fontSize: '11px', wordBreak: 'break-all', fontWeight: 500, color: '#111827' }}>{hardware.processor?.secureBootState ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Baseboard */}
      <Card title={sectionTitle(hardware.baseBoard?.name ?? 'Unknown Baseboard', 'BASEBOARD DETAILS')} size="small" style={cardBase} styles={{ header: cardHeadStyle }}>
        <Row gutter={[16, 14]}>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Part Number</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.baseBoard?.partNumber ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Product ID</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.baseBoard?.productId ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Serial Number</Text><div style={{ fontWeight: 500, color: '#111827', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{hardware.baseBoard?.serialNumber ?? 'N/A'}</div></Col>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Tag</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.baseBoard?.tag ?? 'N/A'}</div></Col>
        </Row>
        <Row gutter={[16, 14]} style={{ marginTop: 14 }}>
          <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Version</Text><div style={{ fontWeight: 500, color: '#111827' }}>{hardware.baseBoard?.version ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Storage */}
      <Card
        title={sectionTitle(
          `${(hardware.storage || []).length} Partition - ${(() => {
            const storage = hardware.storage || [];
            const mainDrive = storage.find(d => d.mountPoint === '/' || d.mountPoint === '/System/Volumes/Data' || d.name?.toLowerCase().includes('macintosh')) || storage[0];
            const capacity = parseFloat(mainDrive?.capacity || '0');
            return capacity >= 1000 ? `${(capacity / 1024).toFixed(1)} TB` : `${Math.round(capacity)} GB`;
          })()}`,
          'STORAGE'
        )}
        size="small" style={cardBase} styles={{ header: cardHeadStyle }}
      >
        <Row gutter={[16, 16]}>
          {(hardware.storage || []).map((drive, idx) => {
            const usedGB = parseFloat(drive.used?.replace(/[^0-9.]/g, '') || '0');
            const capacityGB = parseFloat(drive.capacity?.replace(/[^0-9.]/g, '') || '1');
            const usedPercent = capacityGB > 0 ? Math.round((usedGB / capacityGB) * 100) : 0;
            const progressColor = usedPercent > 90 ? '#ff4d4f' : usedPercent > 70 ? '#faad14' : '#52c41a';
            return (
              <Col span={12} key={idx}>
                <div style={{ background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
                  <Row gutter={8}>
                    <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>Drive</Text><div style={{ fontWeight: 600, color: '#111827' }}>{drive.drive}</div></Col>
                    <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>Capacity</Text><div style={{ fontWeight: 500, color: '#111827' }}><span style={{ color: progressColor }}>{drive.used}</span> / {drive.capacity}</div></Col>
                  </Row>
                  <Row style={{ marginTop: 8 }}>
                    <Col span={24}><Progress percent={usedPercent} strokeColor={progressColor} size="small" format={() => `${usedPercent}% used`} /></Col>
                  </Row>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Format</Text><div style={{ fontWeight: 500, color: '#111827' }}>{drive.format}</div></Col>
                    <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Type</Text><div style={{ fontWeight: 500, color: '#111827' }}>{drive.type}</div></Col>
                    <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Serial number</Text><div style={{ fontSize: '11px', fontWeight: 500, color: '#111827' }}>{drive.serialNumber}</div></Col>
                  </Row>
                </div>
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
        title={sectionTitle(
          `${(hardware.memory || []).length} Slots - ${(hardware.memory || []).reduce((acc, m) => acc + parseFloat(m.capacity || '0'), 0)} GB`,
          'MEMORY'
        )}
        size="small" style={cardBase} styles={{ header: cardHeadStyle }}
      >
        <Row gutter={[16, 16]}>
          {(hardware.memory || []).map((mem, idx) => (
            <Col span={12} key={idx}>
              <div style={{ background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
                <Row gutter={8}>
                  <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>{mem.slot}</Text><div style={{ fontWeight: 600, color: '#111827' }}>{mem.name}</div></Col>
                  <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>Capacity</Text><div style={{ fontWeight: 500, color: '#111827' }}>{mem.capacity}</div></Col>
                </Row>
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Bank Label</Text><div style={{ fontWeight: 500, color: '#111827' }}>{mem.bankLabel}</div></Col>
                  <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Locator</Text><div style={{ fontWeight: 500, color: '#111827' }}>{mem.locator}</div></Col>
                  <Col span={8}><Text type="secondary" style={{ fontSize: 12 }}>Memory Type</Text><div style={{ fontWeight: 500, color: '#111827' }}>{mem.memoryType}</div></Col>
                </Row>
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>Serial Number</Text><div style={{ fontWeight: 500, color: '#111827', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{mem.serialNumber}</div></Col>
                  <Col span={12}><Text type="secondary" style={{ fontSize: 12 }}>Part Number</Text><div style={{ fontSize: '11px', fontWeight: 500, color: '#111827' }}>{mem.partNumber}</div></Col>
                </Row>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Network Adapters */}
      <Card
        title={sectionTitle(`${(hardware.networkAdapters || []).length} Network Adapters`, 'NETWORK ADAPTERS')}
        size="small"
        style={cardBase}
        styles={{ header: cardHeadStyle }}
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
