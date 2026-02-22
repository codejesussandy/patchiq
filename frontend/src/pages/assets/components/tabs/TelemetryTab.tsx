import {
  DashboardOutlined,
  HddOutlined,
  ReloadOutlined,
  BugOutlined,
} from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Spin,
  Empty,
  Progress,
  Statistic,
  Divider,
  Alert,
} from 'antd';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetTelemetry, useAssetTelemetryHistory, useAssetErrors } from '../../../../hooks/useAssets';
import { TelemetryCharts } from './telemetry/TelemetryCharts';
import { processColumns } from './telemetry/telemetryColumns';
import { formatBytesPerSec, getUsageColor } from './telemetry/telemetryHelpers';
import { TelemetryMetricsCards } from './telemetry/TelemetryMetricsCards';

const { Text } = Typography;

interface TelemetryTabProps {
  assetId: string;
}

export const TelemetryTab = ({ assetId }: TelemetryTabProps) => {
  const { data: telemetry, isLoading: loadingTelemetry, isError: telemetryError } = useAssetTelemetry(assetId, { refetchInterval: 30_000 });
  const { data: history } = useAssetTelemetryHistory(assetId);
  const { data: errors } = useAssetErrors(assetId);

  if (loadingTelemetry) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spin size="large" /></div>;
  }

  if (telemetryError || !telemetry) {
    return <Empty description={telemetryError ? 'Failed to load telemetry information' : 'No telemetry data available'} />;
  }

  return (
    <div>
      {telemetry.pendingReboot && (
        <Alert message="Pending Reboot" description="This system has pending updates that require a reboot."
          type="warning" showIcon icon={<ReloadOutlined />} style={{ marginBottom: 16 }} />
      )}

      <TelemetryMetricsCards
        cpu={telemetry.cpu}
        memory={telemetry.memory}
        network={telemetry.network}
        systemUptime={telemetry.systemUptime}
        batteryChargePercent={telemetry.batteryChargePercent}
        batteryCharging={telemetry.batteryCharging}
      />

      {/* Load Average */}
      {(telemetry.cpu.loadAverage1m !== undefined || telemetry.cpu.loadAverage5m !== undefined || telemetry.cpu.loadAverage15m !== undefined) && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}><Statistic title="Load Avg (1m)" value={telemetry.cpu.loadAverage1m?.toFixed(2) || '\u2014'} styles={{ content: { fontSize: '16px' } }} /></Col>
            <Col span={8}><Statistic title="Load Avg (5m)" value={telemetry.cpu.loadAverage5m?.toFixed(2) || '\u2014'} styles={{ content: { fontSize: '16px' } }} /></Col>
            <Col span={8}><Statistic title="Load Avg (15m)" value={telemetry.cpu.loadAverage15m?.toFixed(2) || '\u2014'} styles={{ content: { fontSize: '16px' } }} /></Col>
          </Row>
        </Card>
      )}

      <TelemetryCharts history={history} />

      {/* Process Tables */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title={<Space><DashboardOutlined /><span>Top Processes by CPU</span></Space>} size="small" styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
            {telemetry.processes?.topByCpu && telemetry.processes.topByCpu.length > 0
              ? <DataTable columns={processColumns} data={telemetry.processes.topByCpu.slice(0, 5)} rowKey="pid" pagination={false} size="small" />
              : <Empty description="No process data" />}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<Space><HddOutlined /><span>Top Processes by Memory</span></Space>} size="small" styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
            {telemetry.processes?.topByMemory && telemetry.processes.topByMemory.length > 0
              ? <DataTable columns={processColumns} data={telemetry.processes.topByMemory.slice(0, 5)} rowKey="pid" pagination={false} size="small" />
              : <Empty description="No process data" />}
          </Card>
        </Col>
      </Row>

      {/* Disk I/O */}
      {telemetry.disk?.drives && telemetry.disk.drives.length > 0 && (
        <Card title={<Space><HddOutlined /><span>Disk I/O</span></Space>} size="small" style={{ marginBottom: 24 }} styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
          <Row gutter={[16, 16]}>
            {telemetry.disk.drives.map((drive, index) => (
              <Col span={8} key={drive.mountPoint || index}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text strong>{drive.mountPoint || `Drive ${index + 1}`}</Text>
                    {drive.usagePercent !== undefined && <Progress percent={drive.usagePercent} size="small" strokeColor={getUsageColor(drive.usagePercent)} />}
                    <Row gutter={8}>
                      {drive.readBytesPerSec !== undefined && <Col span={12}><Text type="secondary" style={{ fontSize: '11px' }}>Read: {formatBytesPerSec(drive.readBytesPerSec)}</Text></Col>}
                      {drive.writeBytesPerSec !== undefined && <Col span={12}><Text type="secondary" style={{ fontSize: '11px' }}>Write: {formatBytesPerSec(drive.writeBytesPerSec)}</Text></Col>}
                    </Row>
                    {drive.latencyMs !== undefined && <Text type="secondary" style={{ fontSize: '11px' }}>Latency: {drive.latencyMs.toFixed(1)}ms</Text>}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* System Errors */}
      {errors && (
        <Card title={<Space><BugOutlined /><span>System Errors</span></Space>} size="small" styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.applicationCrashCount24h ? '#fff1f0' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.applicationCrashCount24h ? '#ff4d4f' : '#52c41a' }}>{errors.applicationCrashCount24h ?? 0}</div>
                <Text type="secondary">App Crashes (24h)</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.applicationCrashCount7d ? '#fff7e6' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.applicationCrashCount7d ? '#fa8c16' : '#52c41a' }}>{errors.applicationCrashCount7d ?? 0}</div>
                <Text type="secondary">App Crashes (7d)</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.bsodCount30d ? '#fff1f0' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.bsodCount30d ? '#ff4d4f' : '#52c41a' }}>{errors.bsodCount30d ?? 0}</div>
                <Text type="secondary">BSOD (30d)</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.criticalEventCount24h ? '#fff1f0' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.criticalEventCount24h ? '#ff4d4f' : '#52c41a' }}>{errors.criticalEventCount24h ?? 0}</div>
                <Text type="secondary">Critical Events (24h)</Text>
              </Card>
            </Col>
          </Row>

          {errors.lastCrash && (
            <>
              <Divider titlePlacement="left" style={{ marginTop: 16 }}>Last Application Crash</Divider>
              <Row gutter={16}>
                <Col span={8}><Text type="secondary">Application</Text><div><Text strong>{errors.lastCrash.application || 'Unknown'}</Text></div></Col>
                <Col span={8}><Text type="secondary">Time</Text><div><Text>{new Date(errors.lastCrash.timestamp).toLocaleString()}</Text></div></Col>
                <Col span={8}><Text type="secondary">Error Code</Text><div><Text code>{errors.lastCrash.errorCode || 'N/A'}</Text></div></Col>
              </Row>
              {errors.lastCrash.description && <div style={{ marginTop: 8 }}><Text type="secondary">Description: </Text><Text>{errors.lastCrash.description}</Text></div>}
            </>
          )}

          {errors.lastBsod && (
            <>
              <Divider titlePlacement="left">Last Blue Screen</Divider>
              <Row gutter={16}>
                <Col span={8}><Text type="secondary">Stop Code</Text><div><Text code>{errors.lastBsod.stopCode || 'Unknown'}</Text></div></Col>
                <Col span={8}><Text type="secondary">Time</Text><div><Text>{new Date(errors.lastBsod.timestamp).toLocaleString()}</Text></div></Col>
                {errors.lastBsod.driverName && <Col span={8}><Text type="secondary">Driver</Text><div><Text>{errors.lastBsod.driverName}</Text></div></Col>}
              </Row>
            </>
          )}
        </Card>
      )}
    </div>
  );
};
