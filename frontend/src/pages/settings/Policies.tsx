import { Typography } from 'antd';

const { Title, Text } = Typography;

export const Policies = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <Title level={3} style={{ margin: 0 }}>Policies</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Manage system policies</Text>
      </div>
    </div>
  );
};
