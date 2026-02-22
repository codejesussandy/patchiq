import {
  DashboardOutlined,
  HddOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { Card, Row, Col, Space, Empty } from 'antd';
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
import type { TelemetryDataPoint } from '../../../../../types/telemetry.types';
import { formatBytes, formatBytesPerSec, formatChartTime } from './telemetryHelpers';

interface TelemetryChartsProps {
  history?: {
    cpu?: TelemetryDataPoint[];
    memory?: TelemetryDataPoint[];
    networkIn?: TelemetryDataPoint[];
    networkOut?: TelemetryDataPoint[];
  };
}

export const TelemetryCharts = ({ history }: TelemetryChartsProps) => {
  const cpuChartData = history?.cpu?.map((point) => ({
    time: formatChartTime(point.timestamp),
    value: point.value,
  })) || [];

  const memoryChartData = history?.memory?.map((point) => ({
    time: formatChartTime(point.timestamp),
    value: point.value,
  })) || [];

  const networkChartData = history?.networkIn?.map((point, index) => ({
    time: formatChartTime(point.timestamp),
    in: point.value,
    out: history?.networkOut?.[index]?.value || 0,
  })) || [];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title={<Space><DashboardOutlined /><span>CPU History (24h)</span></Space>} size="small" styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
            {cpuChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cpuChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <RechartsTooltip formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'CPU']} />
                  <Area type="monotone" dataKey="value" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No CPU history data" style={{ height: 200 }} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<Space><HddOutlined /><span>Memory History (24h)</span></Space>} size="small" styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
            {memoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={memoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <RechartsTooltip formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Memory']} />
                  <Area type="monotone" dataKey="value" stroke="#52c41a" fill="#52c41a" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No memory history data" style={{ height: 200 }} />
            )}
          </Card>
        </Col>
      </Row>

      {networkChartData.length > 0 && (
        <Card title={<Space><WifiOutlined /><span>Network I/O History (24h)</span></Space>} size="small" style={{ marginBottom: 24 }} styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={networkChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatBytes(value)} />
              <RechartsTooltip formatter={(value: number | undefined, name: string | undefined) => [formatBytesPerSec(value ?? 0), name === 'in' ? 'Received' : 'Sent']} />
              <Legend />
              <Line type="monotone" dataKey="in" stroke="#1890ff" name="Received" dot={false} />
              <Line type="monotone" dataKey="out" stroke="#52c41a" name="Sent" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
};
