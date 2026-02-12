import { Tag } from 'antd';

type SeverityBadgeProps = {
  severity: string;
};

export const SeverityBadge = ({ severity }: SeverityBadgeProps) => {
  const getColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return '#ff4d4f';
      case 'High':
        return '#ff7a45';
      case 'Medium':
        return '#ffa940';
      case 'Low':
        return '#52c41a';
      case 'UNSPECIFIED':
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  };

  return (
    <Tag
      color={getColor()}
      style={{
        border: 'none',
        fontWeight: 500,
      }}
    >
      {severity}
    </Tag>
  );
};
