import { Typography, Space, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ProcessInfo } from '../../../../../types/telemetry.types';
import { formatBytes, getUsageColor } from './telemetryHelpers';

const { Text } = Typography;

export const processColumns: ColumnsType<ProcessInfo> = [
  { title: 'PID', dataIndex: 'pid', key: 'pid', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true, render: (name: string) => <Text strong>{name}</Text> },
  {
    title: 'CPU %', dataIndex: 'cpuPercent', key: 'cpuPercent', width: 100,
    render: (percent?: number) => (
      <Progress percent={percent || 0} size="small" strokeColor={getUsageColor(percent || 0)} format={(p) => `${p?.toFixed(1)}%`} />
    ),
  },
  {
    title: 'Memory', key: 'memory', width: 120,
    render: (_, record) => (
      <Space orientation="vertical" size={0}>
        {record.memoryBytes && <Text style={{ fontSize: '16px' }}>{formatBytes(record.memoryBytes)}</Text>}
        {record.memoryPercent !== undefined && <Text type="secondary" style={{ fontSize: '11px' }}>{record.memoryPercent.toFixed(1)}%</Text>}
      </Space>
    ),
  },
  { title: 'User', dataIndex: 'user', key: 'user', width: 100, render: (user?: string) => user || '\u2014' },
];
