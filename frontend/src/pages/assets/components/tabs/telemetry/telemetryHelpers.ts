export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatBytesPerSec = (bytes: number): string => {
  return `${formatBytes(bytes)}/s`;
};

export const formatUptime = (seconds?: number): string => {
  if (!seconds) return '\u2014';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '< 1m';
};

export const getUsageColor = (percent: number): string => {
  if (percent >= 90) return '#ff4d4f';
  if (percent >= 70) return '#faad14';
  if (percent >= 50) return '#1890ff';
  return '#52c41a';
};

export const formatChartTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
