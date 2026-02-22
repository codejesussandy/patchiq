import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  WindowsOutlined,
  AppleOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  App,
  Tag,
  Button,
  Progress,
  Upload,
  Spin,
  Switch,
  Tooltip,
  Input,
  Select,
  DatePicker,
} from 'antd';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useAssetHardware, useAssetTelemetry, useRefreshAssetInventory, useUpdateAsset } from '../../../../hooks/useAssets';
import type { Asset } from '../../../../types/asset.types';
import TagDisplay from '../TagDisplay';
import TagSelector from '../TagSelector';

const TELEMETRY_POLL_INTERVAL = 30_000;

/* ── Shared shadcn-inspired styles ─────────────────────────── */

const cardStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  backgroundColor: '#fff',
  marginBottom: 16,
  overflow: 'hidden',
};

const cardHeaderStyle: CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#eef0f4',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const cardTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#111827',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const cardBodyStyle: CSSProperties = {
  padding: 16,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  fontWeight: 500,
  marginBottom: 2,
  letterSpacing: '0.01em',
};

const valueStyle: CSSProperties = {
  fontSize: 13,
  color: '#111827',
  fontWeight: 500,
};

const monoValueStyle: CSSProperties = {
  ...valueStyle,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  fontSize: 12,
};

const gridStyle = (cols: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: '14px 20px',
});

/* ── OS icon helpers ──────────────────────────────────────── */

function getOSIconStyle(osType?: string): { bg: string; color: string } {
  const os = (osType || '').toLowerCase();
  if (os.includes('mac') || os.includes('darwin') || os.includes('apple')) return { bg: '#f5f5f5', color: '#333' };
  if (os.includes('linux') || os.includes('ubuntu') || os.includes('debian') || os.includes('centos') || os.includes('fedora') || os.includes('rhel')) return { bg: '#fef0ea', color: '#E95420' };
  return { bg: '#eff6ff', color: '#3b82f6' }; // Windows / default
}

function getOSIcon(osType?: string) {
  const os = (osType || '').toLowerCase();
  const { color } = getOSIconStyle(osType);
  if (os.includes('mac') || os.includes('darwin') || os.includes('apple')) {
    return <AppleOutlined style={{ fontSize: 24, color }} />;
  }
  if (os.includes('linux') || os.includes('ubuntu') || os.includes('debian') || os.includes('centos') || os.includes('fedora') || os.includes('rhel')) {
    return <span style={{ fontSize: 22, lineHeight: 1 }}>🐧</span>;
  }
  return <WindowsOutlined style={{ fontSize: 24, color }} />;
}

/* ── Small reusable pieces ─────────────────────────────────── */

const SectionCard = ({ title, extra, children }: { title: ReactNode; extra?: ReactNode; children: ReactNode }) => (
  <div style={cardStyle}>
    <div style={cardHeaderStyle}>
      <div style={cardTitleStyle}>{title}</div>
      {extra && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{extra}</div>}
    </div>
    <div style={cardBodyStyle}>{children}</div>
  </div>
);

const Field = ({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) => (
  <div>
    <div style={labelStyle}>{label}</div>
    <div style={mono ? monoValueStyle : valueStyle}>{value || 'N/A'}</div>
  </div>
);

const StatusDot = ({ connected }: { connected: boolean }) => (
  <span style={{
    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
    backgroundColor: connected ? '#22c55e' : '#ef4444',
  }} />
);

/* ── Component ─────────────────────────────────────────────── */

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
  const [editingCost, setEditingCost] = useState(false);
  const [costForm, setCostForm] = useState({
    cost: asset.cost?.cost || '',
    currency: asset.cost?.currency || '',
    currentCost: asset.cost?.currentCost || '',
    depreciationType: asset.cost?.depreciationType || '',
    invoiceNumber: asset.cost?.invoiceNumber || '',
    purchaseDate: asset.cost?.purchaseDate || '',
    salvageValue: asset.cost?.salvageValue || '',
  });
  const [savingCost, setSavingCost] = useState(false);
  const updateAssetMutation = useUpdateAsset();

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

  const handleSaveCost = async () => {
    setSavingCost(true);
    try {
      await updateAssetMutation.mutateAsync({
        id: asset.id,
        data: {
          purchaseCost: costForm.cost && !isNaN(parseFloat(costForm.cost)) ? parseFloat(costForm.cost) : null,
          currentValue: costForm.currentCost && !isNaN(parseFloat(costForm.currentCost)) ? parseFloat(costForm.currentCost) : null,
          salvageValue: costForm.salvageValue && !isNaN(parseFloat(costForm.salvageValue)) ? parseFloat(costForm.salvageValue) : null,
          currency: costForm.currency || null,
          depreciationType: costForm.depreciationType || null,
          invoiceNumber: costForm.invoiceNumber || null,
          purchaseDate: costForm.purchaseDate || null,
        } as Partial<Asset>,
      });
      message.success('Cost properties updated successfully');
      setEditingCost(false);
    } catch {
      message.error('Failed to update cost properties');
    } finally {
      setSavingCost(false);
    }
  };

  const handleCancelCost = () => {
    setCostForm({
      cost: asset.cost?.cost || '',
      currency: asset.cost?.currency || '',
      currentCost: asset.cost?.currentCost || '',
      depreciationType: asset.cost?.depreciationType || '',
      invoiceNumber: asset.cost?.invoiceNumber || '',
      purchaseDate: asset.cost?.purchaseDate || '',
      salvageValue: asset.cost?.salvageValue || '',
    });
    setEditingCost(false);
  };

  const formatUptime = () => {
    if (telemetry?.systemUptime?.uptimeHuman) return telemetry.systemUptime.uptimeHuman;
    if (telemetry?.systemUptime?.uptimeSeconds) {
      const s = telemetry.systemUptime.uptimeSeconds;
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${d}d ${h}h ${m}m ${sec}s`;
    }
    return asset.performance?.systemUptime ?? 'N/A';
  };

  const getProgressStatus = (pct: number) => pct > 90 ? 'exception' as const : pct > 70 ? 'active' as const : 'normal' as const;

  const memPct = telemetry?.memory?.usagePercent ?? asset.performance?.memoryUtilization ?? 0;
  const cpuPct = telemetry?.cpu?.usagePercent ?? asset.performance?.cpuUtilization ?? 0;
  const diskPct = telemetry?.disk?.drives?.[0]?.usagePercent ?? asset.performance?.diskUtilization ?? 0;

  const diskSize = asset.diskSize || asset.storage?.size || (hardware?.storage?.[0] ? (() => {
    const mainDrive = hardware.storage.find(d => d.mountPoint === '/' || d.mountPoint === '/System/Volumes/Data' || d.name?.toLowerCase().includes('macintosh')) || hardware.storage[0];
    const capacity = parseFloat(mainDrive?.capacity || '0');
    return capacity >= 1000 ? `${(capacity / 1024).toFixed(1)}TB` : `${Math.round(capacity)}GB`;
  })() : 'N/A');

  const memSize = asset.memorySize || asset.ram?.size || (hardware?.memory?.length
    ? `${hardware.memory.reduce((acc, m) => acc + parseFloat(m.capacity || '0'), 0).toFixed(0)} GB`
    : (telemetry?.memory?.totalBytes ? `${(telemetry.memory.totalBytes / (1024 * 1024 * 1024)).toFixed(0)} GB` : 'N/A'));

  const btnSmall: CSSProperties = {
    borderRadius: 6, border: '1px solid #e5e7eb', color: '#374151',
    fontSize: 12, fontWeight: 500, height: 28, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
  };

  return (
    <div>
      {/* Asset Identity Header */}
      <div style={{
        ...cardStyle,
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          backgroundColor: getOSIconStyle(asset.osType).bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {getOSIcon(asset.osType)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{asset.name}</span>
            <Tag style={{
              borderRadius: 9999, fontSize: 11, fontWeight: 500, lineHeight: '18px',
              padding: '0 8px', border: 'none',
              backgroundColor: asset.operationalStatus === 'CONNECTED' ? '#dcfce7' : '#fee2e2',
              color: asset.operationalStatus === 'CONNECTED' ? '#166534' : '#991b1b',
            }}>
              <StatusDot connected={asset.operationalStatus === 'CONNECTED'} />{' '}
              {asset.operationalStatus}
            </Tag>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {asset.assetType || 'Endpoint'} &middot; {asset.osType || 'N/A'} &middot; {asset.ipAddress || 'No IP'}
          </div>
        </div>
        <div>
          <Tag color="blue" style={{ borderRadius: 4, fontSize: 12 }}>{asset.status}</Tag>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div style={{ ...cardStyle, padding: 16 }}>
        <div style={gridStyle(3)}>
          <Field label="Asset ID" value={asset.assetId || asset.id} mono />
          <Field label="Host Name" value={asset.hostname || asset.name} mono />
          <Field label="OS" value={asset.osType} />
          <Field label="IP Address" value={asset.ipAddress} mono />
          <Field label="MAC Address" value={asset.macAddress || hardware?.networkAdapters?.[0]?.macAddress} mono />
          <Field label="Asset Type" value={asset.assetType || 'Endpoint'} />
        </div>
      </div>

      {/* Agent Status */}
      {asset.agent && (
        <SectionCard
          title={<><StatusDot connected={asset.agent.status === 'CONNECTED'} /> Agent Status</>}
          extra={
            <Button
              icon={<ReloadOutlined spin={refreshingInventory} />}
              onClick={handleRefreshInventory}
              loading={refreshingInventory}
              style={btnSmall}
            >
              Refresh Inventory
            </Button>
          }
        >
          <div style={gridStyle(4)}>
            <Field label="Status" value={
              <Tag style={{
                borderRadius: 9999, fontSize: 11, fontWeight: 500, lineHeight: '18px',
                padding: '0 8px', border: 'none',
                backgroundColor: asset.agent.status === 'CONNECTED' ? '#dcfce7' : '#fee2e2',
                color: asset.agent.status === 'CONNECTED' ? '#166534' : '#991b1b',
              }}>{asset.agent.status}</Tag>
            } />
            <Field label="Agent Version" value={asset.agent.version || 'Unknown'} />
            <Field label="Last Heartbeat" value={asset.agent.lastHeartbeatRelative || 'Never'} />
            <Field label="Agent ID" value={`${asset.agent.id?.substring(0, 8) || 'N/A'}...`} mono />
          </div>
        </SectionCard>
      )}

      {/* Performance */}
      <SectionCard
        title={
          <>
            Performance
            {telemetryLastUpdated && (
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>
                Updated {telemetryLastUpdated.toLocaleTimeString()}
              </span>
            )}
            {loadingTelemetry && telemetry && <Spin size="small" style={{ marginLeft: 8 }} />}
          </>
        }
        extra={
          <>
            <Tooltip title={`Auto-refresh every ${TELEMETRY_POLL_INTERVAL / 1000}s`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Auto</span>
                <Switch size="small" checked={autoRefreshEnabled} onChange={setAutoRefreshEnabled} />
              </div>
            </Tooltip>
            <Tooltip title="Refresh now">
              <Button type="text" size="small" icon={<ReloadOutlined spin={loadingTelemetry} />} onClick={() => refetchTelemetry()} disabled={loadingTelemetry} style={{ color: '#6b7280' }} />
            </Tooltip>
          </>
        }
      >
        {loadingTelemetry && !telemetry ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin size="small" />
            <span style={{ marginLeft: 8, fontSize: 13, color: '#6b7280' }}>Fetching telemetry...</span>
          </div>
        ) : (
          <div style={gridStyle(4)}>
            <Field label="System Uptime" value={formatUptime()} />
            <div>
              <div style={labelStyle}>Memory</div>
              <div style={{ ...valueStyle, marginBottom: 4 }}>{typeof memPct === 'number' ? memPct.toFixed(1) : memPct}%</div>
              <Progress percent={memPct} showInfo={false} size="small" status={getProgressStatus(memPct)} strokeColor={memPct > 90 ? '#ef4444' : memPct > 70 ? '#f59e0b' : '#3b82f6'} trailColor="#f3f4f6" />
            </div>
            <div>
              <div style={labelStyle}>CPU</div>
              <div style={{ ...valueStyle, marginBottom: 4 }}>{typeof cpuPct === 'number' ? cpuPct.toFixed(1) : cpuPct}%</div>
              <Progress percent={cpuPct} showInfo={false} size="small" status={getProgressStatus(cpuPct)} strokeColor={cpuPct > 90 ? '#ef4444' : cpuPct > 70 ? '#f59e0b' : '#3b82f6'} trailColor="#f3f4f6" />
            </div>
            <div>
              <div style={labelStyle}>Disk</div>
              <div style={{ ...valueStyle, marginBottom: 4 }}>{typeof diskPct === 'number' ? diskPct.toFixed(1) : diskPct}%</div>
              <Progress percent={diskPct} showInfo={false} size="small" status={getProgressStatus(diskPct)} strokeColor={diskPct > 90 ? '#ef4444' : diskPct > 70 ? '#f59e0b' : '#3b82f6'} trailColor="#f3f4f6" />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Allotment */}
      <SectionCard title="Allotment">
        <div style={gridStyle(2)}>
          <div>
            <div style={labelStyle}>Owner</div>
            <div style={valueStyle}>{asset.owner?.name ?? 'Not Assigned'}</div>
            {asset.owner?.email && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{asset.owner.email}</div>}
            {asset.owner?.phone && <div style={{ fontSize: 12, color: '#6b7280' }}>{asset.owner.phone}</div>}
          </div>
          <Field label="User" value="Not Assigned" />
        </div>
      </SectionCard>

      {/* Battery */}
      {hardware?.battery && asset && (asset.assetType === 'Laptop' || asset.assetType === 'Mobile' || asset.assetType === 'Tablet') && (
        <SectionCard title="Battery">
          <div style={gridStyle(4)}>
            <Field label="Battery Health" value={hardware.battery.health} />
            <Field label="Cycle Count" value={hardware.battery.cycleCount} />
            <div>
              <div style={labelStyle}>Charge Level</div>
              <div style={{ ...valueStyle, marginBottom: 4 }}>{hardware.battery.chargeLevel}%</div>
              <Progress percent={hardware.battery.chargeLevel} showInfo={false} size="small" status={hardware.battery.chargeLevel < 20 ? 'exception' : undefined} strokeColor={hardware.battery.chargeLevel < 20 ? '#ef4444' : '#22c55e'} trailColor="#f3f4f6" />
            </div>
            <Field label="Charging Status" value={
              <Tag style={{
                borderRadius: 9999, fontSize: 11, fontWeight: 500, border: 'none',
                backgroundColor: hardware.battery.chargingStatus === 'Charging' ? '#dcfce7' : hardware.battery.chargingStatus === 'Discharging' ? '#fef3c7' : '#f3f4f6',
                color: hardware.battery.chargingStatus === 'Charging' ? '#166534' : hardware.battery.chargingStatus === 'Discharging' ? '#92400e' : '#374151',
              }}>{hardware.battery.chargingStatus}</Tag>
            } />
          </div>
          {(hardware.battery.batteryCapacity || hardware.battery.estimatedRuntime || hardware.battery.temperature) && (
            <>
              <div style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0' }} />
              <div style={gridStyle(3)}>
                {hardware.battery.batteryCapacity && <Field label="Battery Capacity" value={hardware.battery.batteryCapacity} />}
                {hardware.battery.estimatedRuntime && <Field label="Estimated Runtime" value={hardware.battery.estimatedRuntime} />}
                {hardware.battery.temperature && <Field label="Temperature" value={hardware.battery.temperature} />}
              </div>
            </>
          )}
        </SectionCard>
      )}

      {/* Location */}
      <SectionCard
        title="Location"
        extra={<Button onClick={handleAutoDetectLocation} loading={locatingAsset} style={btnSmall}>Auto Detect</Button>}
      >
        <div style={gridStyle(2)}>
          <div>
            <div style={labelStyle}>Base Location</div>
            <div style={valueStyle}>{asset.location?.base?.address ?? 'N/A'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {asset.location?.base?.latitude ?? '-'}, {asset.location?.base?.longitude ?? '-'}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Installed Location</div>
            <div style={valueStyle}>{asset.location?.installed?.address ?? 'N/A'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {asset.location?.installed?.latitude ?? '-'}, {asset.location?.installed?.longitude ?? '-'}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Asset Details */}
      <SectionCard title="Asset Details">
        <div style={gridStyle(3)}>
          <Field label="Alias" value={asset.alias || asset.hostname} />
          <Field label="Disk Size" value={diskSize} />
          <Field label="IP Version" value={asset.ipVersion || (asset.ipAddress ? (asset.ipAddress.includes(':') ? 'IPv6' : 'IPv4') : 'N/A')} />
          <Field label="MAC" value={asset.mac || asset.macAddress || hardware?.networkAdapters?.[0]?.macAddress} mono />
          <Field label="Memory Size" value={memSize} />
          <Field label="Model" value={asset.model} />
          <Field label="OS Version" value={asset.osVersion} />
          <Field label="Serial Number" value={asset.serialNumber || hardware?.bios?.serialNumber} mono />
          <Field label="System SKU" value={asset.systemSKU || hardware?.baseBoard?.productId} />
        </div>
      </SectionCard>

      {/* Procurement Properties */}
      <SectionCard title="Procurement Properties">
        <div style={gridStyle(3)}>
          <Field label="AMC Cost" value={asset.procurement?.amcCost} />
          <Field label="AMC Expiry Date" value={asset.procurement?.amcExpiryDate} />
          <Field label="AMC Vendor" value={asset.procurement?.amcVendor} />
          <Field label="End Of Life" value={asset.procurement?.endOfLife} />
          <Field label="Expiry Date" value={asset.procurement?.expiryDate} />
          <Field label="Warranty Expiry" value={asset.procurement?.warrantyExpiryDate} />
          <Field label="Warranty Year & Month" value={asset.procurement?.warrantyYearAndMonth} />
        </div>
      </SectionCard>

      {/* Cost Properties */}
      <SectionCard
        title="Cost Properties"
        extra={editingCost ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <Button onClick={handleSaveCost} loading={savingCost} style={{ ...btnSmall, backgroundColor: '#111827', color: '#fff', border: 'none' }}>Save</Button>
            <Button onClick={handleCancelCost} disabled={savingCost} style={btnSmall}>Cancel</Button>
          </div>
        ) : (
          <Button type="text" onClick={() => setEditingCost(true)} style={{ fontSize: 12, color: '#6b7280' }}>Edit</Button>
        )}
      >
        <div style={gridStyle(3)}>
          <Field label="Asset Age" value={asset.cost?.age} />
          {editingCost ? (
            <>
              <div>
                <div style={labelStyle}>Cost</div>
                <Input size="small" type="number" value={costForm.cost} onChange={e => setCostForm(f => ({ ...f, cost: e.target.value }))} />
              </div>
              <div>
                <div style={labelStyle}>Currency</div>
                <Select size="small" style={{ width: '100%' }} value={costForm.currency || undefined} onChange={v => setCostForm(f => ({ ...f, currency: v }))} placeholder="Select currency" allowClear>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="INR">INR</Select.Option>
                  <Select.Option value="EUR">EUR</Select.Option>
                  <Select.Option value="GBP">GBP</Select.Option>
                </Select>
              </div>
              <div>
                <div style={labelStyle}>Current Cost</div>
                <Input size="small" type="number" value={costForm.currentCost} onChange={e => setCostForm(f => ({ ...f, currentCost: e.target.value }))} />
              </div>
              <div>
                <div style={labelStyle}>Depreciation Type</div>
                <Select size="small" style={{ width: '100%' }} value={costForm.depreciationType || undefined} onChange={v => setCostForm(f => ({ ...f, depreciationType: v }))} placeholder="Select type" allowClear>
                  <Select.Option value="Straight Line">Straight Line</Select.Option>
                  <Select.Option value="Double Declining Balance">Double Declining Balance</Select.Option>
                  <Select.Option value="Sum of Years Digits">Sum of Years Digits</Select.Option>
                </Select>
              </div>
              <div>
                <div style={labelStyle}>Invoice No.</div>
                <Input size="small" value={costForm.invoiceNumber} onChange={e => setCostForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
              </div>
              <div>
                <div style={labelStyle}>Purchase Date</div>
                <DatePicker size="small" style={{ width: '100%' }} value={costForm.purchaseDate ? dayjs(costForm.purchaseDate) : null} onChange={(_, dateStr) => setCostForm(f => ({ ...f, purchaseDate: dateStr as string }))} />
              </div>
              <div>
                <div style={labelStyle}>Salvage Value</div>
                <Input size="small" type="number" value={costForm.salvageValue} onChange={e => setCostForm(f => ({ ...f, salvageValue: e.target.value }))} />
              </div>
            </>
          ) : (
            <>
              <Field label="Cost" value={asset.cost?.cost} />
              <Field label="Currency" value={asset.cost?.currency} />
              <Field label="Current Cost" value={asset.cost?.currentCost} />
              <Field label="Depreciation Type" value={asset.cost?.depreciationType} />
              <Field label="Invoice No." value={asset.cost?.invoiceNumber} />
              <Field label="Purchase Date" value={asset.cost?.purchaseDate} />
              <Field label="Salvage Value" value={asset.cost?.salvageValue} />
            </>
          )}
        </div>
      </SectionCard>

      {/* Attachment */}
      <SectionCard title="Attachment">
        <Upload fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} customRequest={handleFileUpload} multiple>
          <Button icon={<UploadOutlined />} style={btnSmall}>Add</Button>
        </Upload>
      </SectionCard>

      {/* Tags */}
      <SectionCard
        title="Tags"
        extra={editingTags ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <Button onClick={onSaveTags} style={{ ...btnSmall, backgroundColor: '#111827', color: '#fff', border: 'none' }}>Save</Button>
            <Button onClick={() => { onEditTagsToggle(false); onSelectedTagsChange(asset.tagIds || []); }} style={btnSmall}>Cancel</Button>
          </div>
        ) : (
          <Button type="text" onClick={() => onEditTagsToggle(true)} style={{ fontSize: 12, color: '#6b7280' }}>Edit</Button>
        )}
      >
        {editingTags ? (
          <TagSelector value={selectedTags} onChange={onSelectedTagsChange} placeholder="Select or create tags" showCreateButton />
        ) : (
          <div>{selectedTags.length > 0 ? <TagDisplay tagIds={selectedTags} maxVisible={10} /> : <span style={{ fontSize: 13, color: '#9ca3af' }}>No tags assigned</span>}</div>
        )}
      </SectionCard>
    </div>
  );
};
