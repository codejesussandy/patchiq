import { Typography } from 'antd';

const { Title, Text } = Typography;

export const UserManagement = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ textAlign: 'center', paddingTop: '40px' }}>
        <Title level={3} style={{ margin: 0 }}>User Management</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Manage users, roles, and access control</Text>
      </div>
    </div>
  );
};
