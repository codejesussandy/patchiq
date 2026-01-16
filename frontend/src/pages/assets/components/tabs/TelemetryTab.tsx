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
  Progress,
  Statistic,
  Badge,
  Tooltip,
  Divider,
  Alert,
} from 'antd';
import {
  DashboardOutlined,
  HddOutlined,
  WifiOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  BugOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import type {
  TelemetryPayload,
  TelemetryHistory,
  SystemErrors,
  ProcessInfo,
  TelemetryDataPoint,
} from '../../../../types/telemetry.types';
import { assetService } from '../../../../services/asset.service';

const { Text, Title } = Typography;

interface TelemetryTabProps {
  assetId: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatBytesPerSec = (bytes: number): string => {
  return `${formatBytes(bytes)}/s`;
};

const formatUptime = (seconds?: number): string => {
  if (!seconds) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
};

const getUsageColor = (percent: number): string => {
  if (percent >= 90) return '#ff4d4f';
  if (percent >= 70) return '#faad14';
  if (percent >= 50) return '#1890ff';
  return '#52c41a';
};

const formatChartTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const TelemetryTab = ({ assetId }: TelemetryTabProps) => {
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [history, setHistory] = useState<TelemetryHistory | null>(null);
  const [errors, setErrors] = useState<SystemErrors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTelemetryData();
  }, [assetId]);

  const fetchTelemetryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [telemetryData, historyData, errorsData] = await Promise.all([
        assetService.getAssetTelemetry(assetId),
        assetService.getAssetTelemetryHistory(assetId),
        assetService.getAssetErrors(assetId),
      ]);
      setTelemetry(telemetryData);
      setHistory(historyData);
      setErrors(errorsData);
    } catch (err) {
      console.error('Failed to fetch telemetry data:', err);
      setError('Failed to load telemetry information');
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

  if (error || !telemetry) {
    return <Empty description={error || 'No telemetry data available'} />;
  }

  const processColumns: ColumnsType<ProcessInfo> = [
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      width: 80,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'CPU %',
      dataIndex: 'cpuPercent',
      key: 'cpuPercent',
      width: 100,
      render: (percent?: number) => (
        <Progress
          percent={percent || 0}
          size="small"
          strokeColor={getUsageColor(percent || 0)}
          format={(p) => `${p?.toFixed(1)}%`}
        />
      ),
    },
    {
      title: 'Memory',
      key: 'memory',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.memoryBytes && (
            <Text style={{ fontSize: '12px' }}>{formatBytes(record.memoryBytes)}</Text>
          )}
          {record.memoryPercent !== undefined && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.memoryPercent.toFixed(1)}%
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 100,
      render: (user?: string) => user || '—',
    },
  ];

  // Prepare chart data
  const cpuChartData = history?.cpu?.map((point: TelemetryDataPoint) => ({
    time: formatChartTime(point.timestamp),
    value: point.value,
  })) || [];

  const memoryChartData = history?.memory?.map((point: TelemetryDataPoint) => ({
    time: formatChartTime(point.timestamp),
    value: point.value,
  })) || [];

  const networkChartData = history?.networkIn?.map((point: TelemetryDataPoint, index: number) => ({
    time: formatChartTime(point.timestamp),
    in: point.value,
    out: history?.networkOut?.[index]?.value || 0,
  })) || [];

  return (
    <div>
      {/* Pending Reboot Alert */}
      {telemetry.pendingReboot && (
        <Alert
          message="Pending Reboot"
          description="This system has pending updates that require a reboot."
          type="warning"
          showIcon
          icon={<ReloadOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Real-time Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <Space>
                  <DashboardOutlined />
                  <span>CPU Usage</span>
                </Space>
              }
              value={telemetry.cpu.usagePercent}
              suffix="%"
              valueStyle={{ color: getUsageColor(telemetry.cpu.usagePercent) }}
            />
            <Progress
              percent={telemetry.cpu.usagePercent}
              showInfo={false}
              strokeColor={getUsageColor(telemetry.cpu.usagePercent)}
              size="small"
            />
            {telemetry.cpu.temperature !== undefined && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Temp: {telemetry.cpu.temperature}°C
              </Text>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <Space>
                  <HddOutlined />
                  <span>Memory Usage</span>
                </Space>
              }
              value={telemetry.memory.usagePercent}
              suffix="%"
              valueStyle={{ color: getUsageColor(telemetry.memory.usagePercent) }}
            />
            <Progress
              percent={telemetry.memory.usagePercent}
              showInfo={false}
              strokeColor={getUsageColor(telemetry.memory.usagePercent)}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatBytes(telemetry.memory.usedBytes)} / {formatBytes(telemetry.memory.totalBytes || telemetry.memory.usedBytes + telemetry.memory.availableBytes)}
            </Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <Space>
                  <WifiOutlined />
                  <span>Network</span>
                </Space>
              }
              value={
                telemetry.network?.totalBytesSentPerSec !== undefined
                  ? formatBytesPerSec(telemetry.network.totalBytesSentPerSec + (telemetry.network.totalBytesReceivedPerSec || 0))
                  : '—'
              }
              valueStyle={{ fontSize: '20px' }}
            />
            {telemetry.network?.internetConnected !== undefined && (
              <Badge
                status={telemetry.network.internetConnected ? 'success' : 'error'}
                text={telemetry.network.internetConnected ? 'Connected' : 'Disconnected'}
              />
            )}
            {telemetry.network?.latencyMs !== undefined && (
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Latency: {telemetry.network.latencyMs}ms
                </Text>
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>System Uptime</span>
                </Space>
              }
              value={formatUptime(telemetry.systemUptime)}
              valueStyle={{ fontSize: '20px' }}
            />
            {telemetry.batteryChargePercent !== undefined && (
              <div style={{ marginTop: 8 }}>
                <Space>
                  <ThunderboltOutlined style={{ color: telemetry.batteryCharging ? '#52c41a' : '#faad14' }} />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Battery: {telemetry.batteryChargePercent}%
                    {telemetry.batteryCharging && ' (Charging)'}
                  </Text>
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Load Average (if available) */}
      {(telemetry.cpu.loadAverage1m !== undefined || telemetry.cpu.loadAverage5m !== undefined || telemetry.cpu.loadAverage15m !== undefined) && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Load Avg (1m)"
                value={telemetry.cpu.loadAverage1m?.toFixed(2) || '—'}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Load Avg (5m)"
                value={telemetry.cpu.loadAverage5m?.toFixed(2) || '—'}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Load Avg (15m)"
                value={telemetry.cpu.loadAverage15m?.toFixed(2) || '—'}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Historical Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* CPU History Chart */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <DashboardOutlined />
                <span>CPU History (24h)</span>
              </Space>
            }
            size="small"
          >
            {cpuChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cpuChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'CPU']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#1890ff"
                    fill="#1890ff"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No CPU history data" style={{ height: 200 }} />
            )}
          </Card>
        </Col>

        {/* Memory History Chart */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <HddOutlined />
                <span>Memory History (24h)</span>
              </Space>
            }
            size="small"
          >
            {memoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={memoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Memory']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#52c41a"
                    fill="#52c41a"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No memory history data" style={{ height: 200 }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Network History Chart */}
      {networkChartData.length > 0 && (
        <Card
          title={
            <Space>
              <WifiOutlined />
              <span>Network I/O History (24h)</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 24 }}
        >
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={networkChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatBytes(value)} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  formatBytesPerSec(value),
                  name === 'in' ? 'Received' : 'Sent',
                ]}
              />
              <Legend />
              <Line type="monotone" dataKey="in" stroke="#1890ff" name="Received" dot={false} />
              <Line type="monotone" dataKey="out" stroke="#52c41a" name="Sent" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Process Tables */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Top Processes by CPU */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <DashboardOutlined />
                <span>Top Processes by CPU</span>
              </Space>
            }
            size="small"
          >
            {telemetry.processes?.topByCpu && telemetry.processes.topByCpu.length > 0 ? (
              <Table
                columns={processColumns}
                dataSource={telemetry.processes.topByCpu.slice(0, 5)}
                rowKey="pid"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No process data" />
            )}
          </Card>
        </Col>

        {/* Top Processes by Memory */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <HddOutlined />
                <span>Top Processes by Memory</span>
              </Space>
            }
            size="small"
          >
            {telemetry.processes?.topByMemory && telemetry.processes.topByMemory.length > 0 ? (
              <Table
                columns={processColumns}
                dataSource={telemetry.processes.topByMemory.slice(0, 5)}
                rowKey="pid"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No process data" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Disk Telemetry */}
      {telemetry.disk?.drives && telemetry.disk.drives.length > 0 && (
        <Card
          title={
            <Space>
              <HddOutlined />
              <span>Disk I/O</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            {telemetry.disk.drives.map((drive, index) => (
              <Col span={8} key={drive.mountPoint || index}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>{drive.mountPoint || `Drive ${index + 1}`}</Text>
                    {drive.usagePercent !== undefined && (
                      <Progress
                        percent={drive.usagePercent}
                        size="small"
                        strokeColor={getUsageColor(drive.usagePercent)}
                      />
                    )}
                    <Row gutter={8}>
                      {drive.readBytesPerSec !== undefined && (
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            Read: {formatBytesPerSec(drive.readBytesPerSec)}
                          </Text>
                        </Col>
                      )}
                      {drive.writeBytesPerSec !== undefined && (
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            Write: {formatBytesPerSec(drive.writeBytesPerSec)}
                          </Text>
                        </Col>
                      )}
                    </Row>
                    {drive.latencyMs !== undefined && (
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Latency: {drive.latencyMs.toFixed(1)}ms
                      </Text>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* System Errors */}
      {errors && (
        <Card
          title={
            <Space>
              <BugOutlined />
              <span>System Errors</span>
            </Space>
          }
          size="small"
        >
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.applicationCrashCount24h ? '#fff1f0' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.applicationCrashCount24h ? '#ff4d4f' : '#52c41a' }}>
                  {errors.applicationCrashCount24h ?? 0}
                </div>
                <Text type="secondary">App Crashes (24h)</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.applicationCrashCount7d ? '#fff7e6' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.applicationCrashCount7d ? '#fa8c16' : '#52c41a' }}>
                  {errors.applicationCrashCount7d ?? 0}
                </div>
                <Text type="secondary">App Crashes (7d)</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.bsodCount30d ? '#fff1f0' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.bsodCount30d ? '#ff4d4f' : '#52c41a' }}>
                  {errors.bsodCount30d ?? 0}
                </div>
                <Text type="secondary">BSOD (30d)</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: errors.criticalEventCount24h ? '#fff1f0' : '#f6ffed' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: errors.criticalEventCount24h ? '#ff4d4f' : '#52c41a' }}>
                  {errors.criticalEventCount24h ?? 0}
                </div>
                <Text type="secondary">Critical Events (24h)</Text>
              </Card>
            </Col>
          </Row>

          {/* Last Crash Info */}
          {errors.lastCrash && (
            <>
              <Divider orientation="left" style={{ marginTop: 16 }}>Last Application Crash</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">Application</Text>
                  <div><Text strong>{errors.lastCrash.application || 'Unknown'}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Time</Text>
                  <div><Text>{new Date(errors.lastCrash.timestamp).toLocaleString()}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Error Code</Text>
                  <div><Text code>{errors.lastCrash.errorCode || 'N/A'}</Text></div>
                </Col>
              </Row>
              {errors.lastCrash.description && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Description: </Text>
                  <Text>{errors.lastCrash.description}</Text>
                </div>
              )}
            </>
          )}

          {/* Last BSOD Info */}
          {errors.lastBsod && (
            <>
              <Divider orientation="left">Last Blue Screen</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">Stop Code</Text>
                  <div><Text code>{errors.lastBsod.stopCode || 'Unknown'}</Text></div>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Time</Text>
                  <div><Text>{new Date(errors.lastBsod.timestamp).toLocaleString()}</Text></div>
                </Col>
                {errors.lastBsod.driverName && (
                  <Col span={8}>
                    <Text type="secondary">Driver</Text>
                    <div><Text>{errors.lastBsod.driverName}</Text></div>
                  </Col>
                )}
              </Row>
            </>
          )}
        </Card>
      )}
    </div>
  );
};
