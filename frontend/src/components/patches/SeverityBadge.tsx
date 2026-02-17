import { Tag } from 'antd';

type SeverityBadgeProps = {
  severity: string;
  showIcon?: boolean;
};

const severityConfig: Record<string, { color: string; icon: string; label: string }> = {
  CRITICAL: { color: '#ff4d4f', icon: '●', label: 'Critical severity' },
  HIGH: { color: '#ff4d4f', icon: '▲', label: 'High severity' },
  MEDIUM: { color: '#faad14', icon: '■', label: 'Medium severity' },
  LOW: { color: '#52c41a', icon: '◆', label: 'Low severity' },
  UNSPECIFIED: { color: '#1890ff', icon: '○', label: 'Unspecified severity' },
};

export const SeverityBadge = ({ severity, showIcon = true }: SeverityBadgeProps) => {
  const key = severity.toUpperCase();
  const config = severityConfig[key] || { color: '#d9d9d9', icon: '○', label: `${severity} severity` };

  return (
    <Tag
      color={config.color}
      style={{ border: 'none', fontWeight: 500 }}
      role="status"
      aria-label={config.label}
    >
      {showIcon && <span aria-hidden="true" style={{ marginRight: 4 }}>{config.icon}</span>}
      {severity}
    </Tag>
  );
};
