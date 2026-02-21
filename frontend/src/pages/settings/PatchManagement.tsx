import { Typography } from 'antd';

const { Title, Text } = Typography;

export const PatchManagement = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <Title level={3} style={{ margin: 0 }}>Patch Management</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Configure patch management settings</Text>
      </div>
    </div>
  );
};
