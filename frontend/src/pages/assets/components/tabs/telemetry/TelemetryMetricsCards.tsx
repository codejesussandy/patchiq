import {
  DashboardOutlined,
  HddOutlined,
  WifiOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Card, Row, Col, Space, Statistic, Progress, Badge, Typography } from 'antd';
import { formatBytes, formatBytesPerSec, formatUptime, getUsageColor } from './telemetryHelpers';

const { Text } = Typography;

interface TelemetryMetricsCardsProps {
  cpu: {
    usagePercent: number;
    temperature?: number;
  };
  memory: {
    usagePercent: number;
    usedBytes: number;
    totalBytes?: number;
    availableBytes: number;
  };
  network?: {
    totalBytesSentPerSec?: number;
    totalBytesReceivedPerSec?: number;
    internetConnected?: boolean;
    latencyMs?: number;
  };
  systemUptime?: {
    uptimeSeconds?: number;
  };
  batteryChargePercent?: number;
  batteryCharging?: boolean;
}

export const TelemetryMetricsCards = ({
  cpu,
  memory,
  network,
  systemUptime,
  batteryChargePercent,
  batteryCharging,
}: TelemetryMetricsCardsProps) => (
  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
    <Col span={6}>
      <Card size="small">
        <Statistic
          title={<Space><DashboardOutlined /><span>CPU Usage</span></Space>}
          value={cpu.usagePercent}
          suffix="%"
          styles={{ content: { color: getUsageColor(cpu.usagePercent) } }}
        />
        <Progress percent={cpu.usagePercent} showInfo={false} strokeColor={getUsageColor(cpu.usagePercent)} size="small" />
        {cpu.temperature !== undefined && (
          <Text type="secondary" style={{ fontSize: '11px' }}>Temp: {cpu.temperature}°C</Text>
        )}
      </Card>
    </Col>
    <Col span={6}>
      <Card size="small">
        <Statistic
          title={<Space><HddOutlined /><span>Memory Usage</span></Space>}
          value={memory.usagePercent}
          suffix="%"
          styles={{ content: { color: getUsageColor(memory.usagePercent) } }}
        />
        <Progress percent={memory.usagePercent} showInfo={false} strokeColor={getUsageColor(memory.usagePercent)} size="small" />
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {formatBytes(memory.usedBytes)} / {formatBytes(memory.totalBytes || memory.usedBytes + memory.availableBytes)}
        </Text>
      </Card>
    </Col>
    <Col span={6}>
      <Card size="small">
        <Statistic
          title={<Space><WifiOutlined /><span>Network</span></Space>}
          value={
            network?.totalBytesSentPerSec !== undefined
              ? formatBytesPerSec(network.totalBytesSentPerSec + (network.totalBytesReceivedPerSec || 0))
              : '\u2014'
          }
          styles={{ content: { fontSize: '20px' } }}
        />
        {network?.internetConnected !== undefined && (
          <Badge status={network.internetConnected ? 'success' : 'error'} text={network.internetConnected ? 'Connected' : 'Disconnected'} />
        )}
        {network?.latencyMs !== undefined && (
          <div><Text type="secondary" style={{ fontSize: '11px' }}>Latency: {network.latencyMs}ms</Text></div>
        )}
      </Card>
    </Col>
    <Col span={6}>
      <Card size="small">
        <Statistic
          title={<Space><ClockCircleOutlined /><span>System Uptime</span></Space>}
          value={formatUptime(systemUptime?.uptimeSeconds)}
          styles={{ content: { fontSize: '20px' } }}
        />
        {batteryChargePercent !== undefined && (
          <div style={{ marginTop: 8 }}>
            <Space>
              <ThunderboltOutlined style={{ color: batteryCharging ? '#52c41a' : '#faad14' }} />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Battery: {batteryChargePercent}%{batteryCharging && ' (Charging)'}
              </Text>
            </Space>
          </div>
        )}
      </Card>
    </Col>
  </Row>
);
