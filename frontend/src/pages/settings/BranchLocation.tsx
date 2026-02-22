import { Typography } from 'antd';

const { Title, Text } = Typography;

export const BranchLocation = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <Title level={3} style={{ margin: 0 }}>Branch Location Settings</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Configure branch office locations</Text>
      </div>
    </div>
  );
};
