import { Badge } from 'antd';

type BadgeStatus = 'success' | 'processing' | 'error' | 'default' | 'warning';

const defaultStatusMap: Record<string, BadgeStatus> = {
  VERIFIED: 'success',
  INSTALLED: 'success',
  SUCCESS: 'success',
  DEPLOYED: 'processing',
  ACCEPTED: 'processing',
  IN_PROGRESS: 'processing',
  PENDING: 'processing',
  CONNECTED: 'success',
  FAILED: 'error',
  REJECTED: 'error',
  ERROR: 'error',
  MISSING: 'error',
  RECOMMENDED: 'warning',
  DISCONNECTED: 'default',
};

interface StatusBadgeProps {
  status: string;
  statusMap?: Record<string, BadgeStatus>;
  text?: string;
}

export const StatusBadge = ({ status, statusMap, text }: StatusBadgeProps) => {
  const map = statusMap || defaultStatusMap;
  const badgeStatus = map[status] || 'default';
  const displayText = text ?? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return <Badge status={badgeStatus} text={displayText} />;
};

export const getStatusBadgeStatus = (
  status: string,
  statusMap?: Record<string, BadgeStatus>
): BadgeStatus => {
  const map = statusMap || defaultStatusMap;
  return map[status] || 'default';
};
