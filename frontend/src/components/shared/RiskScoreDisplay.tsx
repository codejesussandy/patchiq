import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';

const { Text } = Typography;

interface RiskScoreDisplayProps {
  score: number | null | undefined;
  showLabel?: boolean;
  size?: 'small' | 'default';
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#ff4d4f';
  if (score >= 60) return '#fa8c16';
  if (score >= 40) return '#faad14';
  return '#52c41a';
};

const getScoreLevel = (score: number): string => {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

const tooltipContent = (
  <div style={{ maxWidth: 280 }}>
    <div style={{ fontWeight: 600, marginBottom: 6 }}>Risk Score Calculation</div>
    <div style={{ fontSize: 16, lineHeight: 1.6 }}>
      The risk score (0–100) is a weighted composite of:
      <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
        <li><strong>CVSS Score</strong> — base vulnerability severity</li>
        <li><strong>Severity Weight</strong> — criticality classification</li>
        <li><strong>Threat Intelligence</strong> — active exploitation data</li>
        <li><strong>Endpoint Exposure</strong> — number of affected assets</li>
      </ul>
      Weights are configurable in Settings &gt; Risk Score.
    </div>
    <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.65)' }}>
      80–100 Critical · 60–79 High · 40–59 Medium · 0–39 Low
    </div>
  </div>
);

export const RiskScoreDisplay = ({ score, showLabel = false, size = 'default' }: RiskScoreDisplayProps) => {
  if (score == null) return <Text type="secondary">—</Text>;

  const color = getScoreColor(score);
  const level = getScoreLevel(score);
  const fontSize = size === 'small' ? 13 : 14;

  return (
    <Tooltip title={tooltipContent} placement="top">
      <span style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Text strong style={{ color, fontSize }}>{score.toFixed(0)}</Text>
        {showLabel && <Text style={{ color, fontSize: fontSize - 1 }}>({level})</Text>}
        <InfoCircleOutlined style={{ color: '#bfbfbf', fontSize: 16 }} />
      </span>
    </Tooltip>
  );
};
