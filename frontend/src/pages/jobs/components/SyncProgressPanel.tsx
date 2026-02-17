import { CloudDownloadOutlined } from '@ant-design/icons';
import { Card, Row, Col, Space, Tag, Typography, Progress, Statistic } from 'antd';

const { Text } = Typography;

interface SyncProgress {
  currentSource: string;
  currentBatch: number;
  totalBatches: number;
  processedCVEs: number;
  currentCVE: string;
  totalLoaded: number;
  estimatedTotal: number;
  startedAt: string;
  elapsedSeconds: number;
}

interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface SyncProgressPanelProps {
  progress: SyncProgress;
  severityCounts?: SeverityCounts;
}

const getSourceColor = (source: string): string => {
  switch (source) {
    case 'NVD': return 'blue';
    case 'CISA KEV': return 'red';
    case 'EPSS': return 'green';
    case 'GitHub': return 'purple';
    default: return 'default';
  }
};

const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const SyncProgressPanel = ({ progress, severityCounts }: SyncProgressPanelProps) => {
  const percent = progress.estimatedTotal === 0
    ? 0
    : Math.min(Math.round((progress.totalLoaded / progress.estimatedTotal) * 100), 99);

  return (
    <Card style={{ marginBottom: 24, background: '#f6f8fa' }} bodyStyle={{ padding: 16 }}>
      <Row gutter={16} align="middle">
        <Col span={24} style={{ marginBottom: 12 }}>
          <Space>
            <CloudDownloadOutlined style={{ fontSize: 18, color: '#1890ff' }} />
            <Text strong>Syncing from:</Text>
            <Tag color={getSourceColor(progress.currentSource)}>{progress.currentSource}</Tag>
            {progress.currentSource === 'NVD' && (
              <Text type="secondary">Batch {progress.currentBatch} of {progress.totalBatches}</Text>
            )}
          </Space>
        </Col>

        <Col span={24} style={{ marginBottom: 12 }}>
          <Progress percent={percent} status="active" strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} />
        </Col>

        <Col span={6}>
          <Statistic title="CVEs Loaded" value={progress.totalLoaded} valueStyle={{ fontSize: 20, color: '#1890ff' }} />
        </Col>
        <Col span={6}>
          <Statistic title="Estimated Total" value={progress.estimatedTotal || '...'} valueStyle={{ fontSize: 20, color: '#666' }} />
        </Col>
        <Col span={6}>
          <Statistic title="Elapsed Time" value={formatElapsedTime(progress.elapsedSeconds)} valueStyle={{ fontSize: 20, color: '#52c41a' }} />
        </Col>
        <Col span={6}>
          <div>
            <Text type="secondary" style={{ fontSize: 16 }}>Current CVE</Text>
            <div><Text code style={{ fontSize: 16 }}>{progress.currentCVE || 'Processing...'}</Text></div>
          </div>
        </Col>

        {severityCounts && (
          <Col span={24} style={{ marginTop: 12 }}>
            <Space size="large">
              <Tag color="red">Critical: {severityCounts.critical.toLocaleString()}</Tag>
              <Tag color="orange">High: {severityCounts.high.toLocaleString()}</Tag>
              <Tag color="gold">Medium: {severityCounts.medium.toLocaleString()}</Tag>
              <Tag color="green">Low: {severityCounts.low.toLocaleString()}</Tag>
            </Space>
          </Col>
        )}
      </Row>
    </Card>
  );
};
