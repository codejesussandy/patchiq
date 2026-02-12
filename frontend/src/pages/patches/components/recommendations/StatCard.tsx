import { Card, Typography, Spin } from 'antd';

const { Text } = Typography;

export const StatCard: React.FC<{
  title: string;
  value: number;
  color?: string;
  loading?: boolean;
}> = ({ title, value, color = '#1890ff', loading }) => (
  <Card style={{ textAlign: 'center', borderRadius: 8, height: '100%' }}>
    {loading ? (
      <Spin />
    ) : (
      <>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{title}</Text>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      </>
    )}
  </Card>
);
