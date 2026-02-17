import { useState } from 'react';
import {
  WindowsOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  App,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Progress,
  Upload,
  Spin,
  Divider,
  Switch,
  Tooltip,
} from 'antd';
import type { UploadFile } from 'antd';
import { useAssetHardware, useAssetTelemetry, useRefreshAssetInventory } from '../../../../hooks/useAssets';
import type { Asset } from '../../../../types/asset.types';
import TagDisplay from '../TagDisplay';
import TagSelector from '../TagSelector';

const { Title, Text } = Typography;
const TELEMETRY_POLL_INTERVAL = 30_000;

interface DetailsTabProps {
  asset: Asset;
  editingTags: boolean;
  selectedTags: string[];
  onEditTagsToggle: (editing: boolean) => void;
  onSelectedTagsChange: (tags: string[]) => void;
  onSaveTags: () => void;
}

export const DetailsTab = ({
  asset, editingTags, selectedTags,
  onEditTagsToggle, onSelectedTagsChange, onSaveTags,
}: DetailsTabProps) => {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [locatingAsset, setLocatingAsset] = useState(false);
  const [refreshingInventory, setRefreshingInventory] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const { data: hardware } = useAssetHardware(asset.id);
  const { data: telemetry, isLoading: loadingTelemetry, dataUpdatedAt: telemetryUpdatedAt, refetch: refetchTelemetry } = useAssetTelemetry(asset.id, {
    refetchInterval: autoRefreshEnabled ? TELEMETRY_POLL_INTERVAL : undefined,
  });
  const refreshInventoryMutation = useRefreshAssetInventory();
  const telemetryLastUpdated = telemetryUpdatedAt ? new Date(telemetryUpdatedAt) : null;

  const handleFileUpload = ({ file, onSuccess }: { file: { name: string }; onSuccess: (status: string) => void }) => {
    setTimeout(() => { message.success(`${file.name} uploaded successfully`); onSuccess('ok'); }, 1000);
  };

  const handleAutoDetectLocation = async () => {
    setLocatingAsset(true);
    try {
      if (!navigator.geolocation) { message.error('Geolocation is not supported by your browser'); setLocatingAsset(false); return; }
      navigator.geolocation.getCurrentPosition(
        () => { message.success('Location detected successfully!'); setLocatingAsset(false); },
        (error) => {
          let errorMsg = 'Unable to detect location';
          if (error.code === error.PERMISSION_DENIED) errorMsg = 'Permission denied. Please enable location access.';
          else if (error.code === error.POSITION_UNAVAILABLE) errorMsg = 'Location information is unavailable.';
          else if (error.code === error.TIMEOUT) errorMsg = 'Location request timed out.';
          message.error(errorMsg);
          setLocatingAsset(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } catch { message.error('Failed to detect location'); setLocatingAsset(false); }
  };

  const handleRefreshInventory = async () => {
    setRefreshingInventory(true);
    try {
      const result = await refreshInventoryMutation.mutateAsync(asset.id);
      message.success(`${result.message}. The data will update shortly.`);
      setTimeout(() => { setRefreshingInventory(false); message.info('Asset data refreshed'); }, 5000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      message.error(err?.response?.data?.error || 'Failed to refresh inventory');
      setRefreshingInventory(false);
    }
  };

  return (
    <div>
      {/* Asset Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <WindowsOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        <div>
          <Title level={4} style={{ margin: 0 }}>{asset.name}</Title>
          <Space>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: asset.operationalStatus === 'CONNECTED' ? '#52c41a' : '#ff4d4f', display: 'inline-block' }} />
            <Text type="secondary">{asset.operationalStatus}</Text>
          </Space>
        </div>
      </div>

      {/* Asset Info Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}><Text type="secondary">Asset ID</Text><div><Text strong>{asset.assetId || asset.id || 'N/A'}</Text></div></Col>
        <Col span={12}><Text type="secondary">Asset type</Text><div><Text strong>{asset.assetType || 'Endpoint'}</Text></div></Col>
        <Col span={12}><Text type="secondary">Host Name</Text><div><Text strong style={{ fontFamily: 'monospace' }}>{asset.hostname || asset.name || 'N/A'}</Text></div></Col>
        <Col span={12}><Text type="secondary">OS</Text><div><Text strong>{asset.osType || 'N/A'}</Text></div></Col>
        <Col span={12}><Text type="secondary">IP Address</Text><div><Text strong style={{ fontFamily: 'monospace' }}>{asset.ipAddress || 'N/A'}</Text></div></Col>
        <Col span={12}><Text type="secondary">MAC Address</Text><div><Text strong style={{ fontFamily: 'monospace' }}>{asset.macAddress || (hardware?.networkAdapters?.[0]?.macAddress) || 'N/A'}</Text></div></Col>
      </Row>

      {/* Status */}
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">Status</Text>
        <div><Tag color="blue">{asset.status}</Tag><Button size="small" type="text">Manage</Button></div>
      </div>

      {/* Agent Status */}
      {asset.agent && (
        <Card
          title={
            <Space>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: asset.agent.status === 'CONNECTED' ? '#52c41a' : '#ff4d4f', display: 'inline-block' }} />
              <span>Agent Status</span>
              <Tag color={asset.agent.status === 'CONNECTED' ? 'green' : 'red'}>{asset.agent.status}</Tag>
              {asset.agent.status !== 'CONNECTED' && asset.agent.lastHeartbeatRelative && <Text type="secondary" style={{ fontSize: 16 }}>Last seen: {asset.agent.lastHeartbeatRelative}</Text>}
            </Space>
          }
          extra={<Button type="primary" icon={<ReloadOutlined spin={refreshingInventory} />} onClick={handleRefreshInventory} loading={refreshingInventory} size="small">Refresh Inventory</Button>}
          size="small" style={{ marginBottom: 24 }}
        >
          <Row gutter={16}>
            <Col span={6}><Text type="secondary">Agent Version</Text><div><Text strong>{asset.agent.version || 'Unknown'}</Text></div></Col>
            <Col span={6}><Text type="secondary">Last Heartbeat</Text><div><Text strong>{asset.agent.lastHeartbeatRelative || 'Never'}</Text></div></Col>
            <Col span={6}><Text type="secondary">Heartbeat Interval</Text><div><Text strong>{asset.agent.heartbeatInterval || 60} seconds</Text></div></Col>
            <Col span={6}><Text type="secondary">Agent ID</Text><div><Text strong style={{ fontFamily: 'monospace', fontSize: '16px' }}>{asset.agent.id?.substring(0, 8) || 'N/A'}...</Text></div></Col>
          </Row>
        </Card>
      )}

      {/* Performance */}
      <Card
        title={<Space><span>Performance</span>{telemetryLastUpdated && <Text type="secondary" style={{ fontSize: '16px', fontWeight: 'normal' }}>Last updated: {telemetryLastUpdated.toLocaleTimeString()}</Text>}{loadingTelemetry && telemetry && <Spin size="small" />}</Space>}
        extra={
          <Space>
            <Tooltip title={`Auto-refresh every ${TELEMETRY_POLL_INTERVAL / 1000}s`}>
              <Space><Text type="secondary" style={{ fontSize: '16px' }}>Auto-refresh</Text><Switch size="small" checked={autoRefreshEnabled} onChange={setAutoRefreshEnabled} /></Space>
            </Tooltip>
            <Tooltip title="Refresh now"><Button type="text" size="small" icon={<ReloadOutlined spin={loadingTelemetry} />} onClick={() => refetchTelemetry()} disabled={loadingTelemetry} /></Tooltip>
          </Space>
        }
        size="small" style={{ marginBottom: 24 }}
      >
        {loadingTelemetry && !telemetry ? (
          <div style={{ textAlign: 'center', padding: '20px' }}><Spin size="small" /><Text type="secondary" style={{ marginLeft: 8 }}>Fetching telemetry...</Text></div>
        ) : (
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">System Uptime</Text>
              <div><Text strong>{telemetry?.systemUptime?.uptimeHuman ? telemetry.systemUptime.uptimeHuman : telemetry?.systemUptime?.uptimeSeconds ? (() => { const s = telemetry.systemUptime.uptimeSeconds; const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return `${d} day${d !== 1 ? 's' : ''}, ${h} hr${h !== 1 ? 's' : ''}, ${m} min, ${sec} sec`; })() : asset.performance?.systemUptime ?? 'N/A'}</Text></div>
            </Col>
            <Col span={6}>
              <div><Text type="secondary">Memory Utilization</Text><div><Text strong>{telemetry?.memory?.usagePercent?.toFixed(1) ?? asset.performance?.memoryUtilization ?? 0}%</Text></div>
                <Progress percent={telemetry?.memory?.usagePercent ?? asset.performance?.memoryUtilization ?? 0} showInfo={false} size="small" status={(telemetry?.memory?.usagePercent ?? 0) > 90 ? 'exception' : (telemetry?.memory?.usagePercent ?? 0) > 70 ? 'active' : 'normal'} /></div>
            </Col>
            <Col span={6}>
              <div><Text type="secondary">CPU Utilization</Text><div><Text strong>{telemetry?.cpu?.usagePercent?.toFixed(1) ?? asset.performance?.cpuUtilization ?? 0}%</Text></div>
                <Progress percent={telemetry?.cpu?.usagePercent ?? asset.performance?.cpuUtilization ?? 0} showInfo={false} size="small" status={(telemetry?.cpu?.usagePercent ?? 0) > 90 ? 'exception' : (telemetry?.cpu?.usagePercent ?? 0) > 70 ? 'active' : 'normal'} /></div>
            </Col>
            <Col span={6}>
              <div><Text type="secondary">Disk Utilization</Text><div><Text strong>{telemetry?.disk?.drives?.[0]?.usagePercent?.toFixed(1) ?? asset.performance?.diskUtilization ?? 0}%</Text></div>
                <Progress percent={telemetry?.disk?.drives?.[0]?.usagePercent ?? asset.performance?.diskUtilization ?? 0} showInfo={false} size="small" status={(telemetry?.disk?.drives?.[0]?.usagePercent ?? 0) > 90 ? 'exception' : (telemetry?.disk?.drives?.[0]?.usagePercent ?? 0) > 70 ? 'active' : 'normal'} /></div>
            </Col>
          </Row>
        )}
      </Card>

      {/* Allotment */}
      <Card title="Allotment" size="small" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}><Text type="secondary">Owner</Text><div><Text strong>{asset.owner?.name ?? 'Not Assigned'}</Text></div><div><Text type="secondary">{asset.owner?.email ?? '-'}</Text></div><div><Text type="secondary">{asset.owner?.phone ?? '-'}</Text></div></Col>
          <Col span={12}><Text type="secondary">User</Text><div><Text>Not Assigned</Text></div></Col>
        </Row>
      </Card>

      {/* Battery */}
      {hardware?.battery && asset && (asset.assetType === 'Laptop' || asset.assetType === 'Mobile' || asset.assetType === 'Tablet') && (
        <Card title="Battery" size="small" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}><Text type="secondary">Battery Health</Text><div><Text strong>{hardware.battery.health}</Text></div></Col>
            <Col span={6}><Text type="secondary">Cycle Count</Text><div><Text strong>{hardware.battery.cycleCount}</Text></div></Col>
            <Col span={6}><div><Text type="secondary">Charge Level</Text><div><Text strong>{hardware.battery.chargeLevel}%</Text></div><Progress percent={hardware.battery.chargeLevel} showInfo={false} size="small" status={hardware.battery.chargeLevel < 20 ? 'exception' : undefined} /></div></Col>
            <Col span={6}><Text type="secondary">Charging Status</Text><div><Tag color={hardware.battery.chargingStatus === 'Charging' ? 'green' : hardware.battery.chargingStatus === 'Discharging' ? 'orange' : 'default'}>{hardware.battery.chargingStatus}</Tag></div></Col>
          </Row>
          {(hardware.battery.batteryCapacity || hardware.battery.estimatedRuntime || hardware.battery.temperature) && (
            <>
              <Divider />
              <Row gutter={16}>
                {hardware.battery.batteryCapacity && <Col span={8}><Text type="secondary">Battery Capacity</Text><div><Text strong>{hardware.battery.batteryCapacity}</Text></div></Col>}
                {hardware.battery.estimatedRuntime && <Col span={8}><Text type="secondary">Estimated Runtime</Text><div><Text strong>{hardware.battery.estimatedRuntime}</Text></div></Col>}
                {hardware.battery.temperature && <Col span={8}><Text type="secondary">Temperature</Text><div><Text strong>{hardware.battery.temperature}</Text></div></Col>}
              </Row>
            </>
          )}
        </Card>
      )}

      {/* Location */}
      <Card title="Location" size="small" style={{ marginBottom: 24 }} extra={<Button size="small" onClick={handleAutoDetectLocation} loading={locatingAsset}>Auto Detect</Button>}>
        <Row gutter={16}>
          <Col span={12}><Text type="secondary">Base Location</Text><div><Text strong>{asset.location?.base?.address ?? 'N/A'}</Text></div><div><Text type="secondary">Latitude: {asset.location?.base?.latitude ?? '-'} Longitude: {asset.location?.base?.longitude ?? '-'}</Text></div></Col>
          <Col span={12}><Text type="secondary">Installed Location</Text><div><Text strong>{asset.location?.installed?.address ?? 'N/A'}</Text></div><div><Text type="secondary">Latitude: {asset.location?.installed?.latitude ?? '-'} Longitude: {asset.location?.installed?.longitude ?? '-'}</Text></div></Col>
        </Row>
      </Card>

      {/* Asset Details */}
      <Card title="Asset Details" size="small" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 8]}>
          <Col span={8}><Text type="secondary">Alias</Text><div>{asset.alias || asset.hostname || 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Disk Size</Text><div>{asset.diskSize || asset.storage?.size || (hardware?.storage?.[0] ? (() => { const mainDrive = hardware.storage.find(d => d.mountPoint === '/' || d.mountPoint === '/System/Volumes/Data' || d.name?.toLowerCase().includes('macintosh')) || hardware.storage[0]; const capacity = parseFloat(mainDrive?.capacity || '0'); return capacity >= 1000 ? `${(capacity / 1024).toFixed(1)}TB` : `${Math.round(capacity)}GB`; })() : 'N/A')}</div></Col>
          <Col span={8}><Text type="secondary">IP Version</Text><div>{asset.ipVersion || (asset.ipAddress ? (asset.ipAddress.includes(':') ? 'IPv6' : 'IPv4') : 'N/A')}</div></Col>
          <Col span={8}><Text type="secondary">MAC</Text><div style={{ fontFamily: 'monospace', fontSize: '13px' }}>{asset.mac || asset.macAddress || (hardware?.networkAdapters?.[0]?.macAddress) || 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Memory Size</Text><div>{asset.memorySize || asset.ram?.size || (hardware?.memory?.length ? `${hardware.memory.reduce((acc, m) => acc + parseFloat(m.capacity || '0'), 0).toFixed(0)} GB` : (telemetry?.memory?.totalBytes ? `${(telemetry.memory.totalBytes / (1024 * 1024 * 1024)).toFixed(0)} GB` : 'N/A'))}</div></Col>
          <Col span={8}><Text type="secondary">Model</Text><div>{asset.model || 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">OS Version</Text><div>{asset.osVersion || 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Serial Number</Text><div style={{ fontFamily: 'monospace', fontSize: '13px' }}>{asset.serialNumber || hardware?.bios?.serialNumber || 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">System SKU</Text><div>{asset.systemSKU || hardware?.baseBoard?.productId || 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Procurement Properties */}
      <Card title="Procurement Properties" size="small" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 8]}>
          <Col span={8}><Text type="secondary">AMC Cost</Text><div>{asset.procurement?.amcCost ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">AMC Expiry Date</Text><div>{asset.procurement?.amcExpiryDate ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">AMC Vendor</Text><div>{asset.procurement?.amcVendor ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">End Of Life</Text><div>{asset.procurement?.endOfLife ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Expiry Date</Text><div>{asset.procurement?.expiryDate ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Warranty Expiry</Text><div>{asset.procurement?.warrantyExpiryDate ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Warranty Year & Month</Text><div>{asset.procurement?.warrantyYearAndMonth ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Cost Properties */}
      <Card title="Cost Properties" size="small" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 8]}>
          <Col span={8}><Text type="secondary">Asset Age</Text><div>{asset.cost?.age ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Cost</Text><div>{asset.cost?.cost ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Currency</Text><div>{asset.cost?.currency ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Current Cost</Text><div>{asset.cost?.currentCost ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Depreciation Type</Text><div>{asset.cost?.depreciationType ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Invoice No.</Text><div>{asset.cost?.invoiceNumber ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Purchase Date</Text><div>{asset.cost?.purchaseDate ?? 'N/A'}</div></Col>
          <Col span={8}><Text type="secondary">Salvage Value</Text><div>{asset.cost?.salvageValue ?? 'N/A'}</div></Col>
        </Row>
      </Card>

      {/* Attachment */}
      <Card title="Attachment" size="small" style={{ marginBottom: 24 }}>
        <Upload fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} customRequest={handleFileUpload} multiple>
          <Button type="primary" icon={<UploadOutlined />}>Add</Button>
        </Upload>
      </Card>

      {/* Tags */}
      <Card title="Tags" size="small"
        extra={editingTags ? (
          <Space size="small">
            <Button size="small" type="primary" onClick={onSaveTags}>Save</Button>
            <Button size="small" onClick={() => { onEditTagsToggle(false); onSelectedTagsChange(asset.tagIds || []); }}>Cancel</Button>
          </Space>
        ) : (
          <Button size="small" type="text" onClick={() => onEditTagsToggle(true)}>Edit</Button>
        )}
      >
        {editingTags ? (
          <TagSelector value={selectedTags} onChange={onSelectedTagsChange} placeholder="Select or create tags" showCreateButton />
        ) : (
          <div>{selectedTags.length > 0 ? <TagDisplay tagIds={selectedTags} maxVisible={10} /> : <Text type="secondary">No tags assigned</Text>}</div>
        )}
      </Card>
    </div>
  );
};
