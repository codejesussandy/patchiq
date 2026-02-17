import {
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  CheckOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { Avatar, Tag, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Organization {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface ProfileMenuProps {
  organizations: Organization[];
  selectedOrgId: string | null;
  onOrgSwitch: (orgId: string) => void;
  onClose: () => void;
}

export const ProfileMenu = ({ organizations, selectedOrgId, onOrgSwitch, onClose }: ProfileMenuProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.name) {
      const parts = user.name.split(' ');
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.name) return user.name;
    return user?.email || 'User';
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'ADMIN': return 'red';
      case 'MANAGER': return 'orange';
      default: return 'blue';
    }
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
      navigate('/login');
    } catch {
      // AuthContext handles the error message
    }
  };

  const hoverStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background 0.15s',
  };

  return (
    <div style={{ width: 280 }}>
      {/* User Info Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 12px' }}>
        <Avatar
          size={44}
          style={{ backgroundColor: '#1677ff', fontSize: '16px', fontWeight: 600, flexShrink: 0 }}
          src={user?.avatar || undefined}
        >
          {getUserInitials()}
        </Avatar>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getUserDisplayName()}
          </div>
          <div style={{ fontSize: '16px', color: '#8c8c8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
          <Tag color={getRoleBadgeColor()} style={{ marginTop: 4, fontSize: '11px', lineHeight: '18px' }}>
            {(user?.role || 'user').charAt(0).toUpperCase() + (user?.role || 'user').slice(1)}
          </Tag>
        </div>
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* Organization Selector */}
      <div style={{ padding: '8px 0' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <BankOutlined /> Organization
        </div>
        {organizations.length > 0 ? (
          <div style={{ maxHeight: 160, overflow: 'auto' }}>
            {organizations.map((org) => (
              <div
                key={org.id}
                onClick={() => onOrgSwitch(org.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: selectedOrgId === org.id ? '#e6f4ff' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (selectedOrgId !== org.id) e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = selectedOrgId === org.id ? '#e6f4ff' : 'transparent';
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: selectedOrgId === org.id ? 500 : 400 }}>
                  {org.name}
                </span>
                {selectedOrgId === org.id && <CheckOutlined style={{ color: '#1677ff', fontSize: 16 }} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '16px', color: '#bfbfbf', padding: '4px 8px' }}>No organizations</div>
        )}
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* Menu Items */}
      <div style={{ padding: '4px 0' }}>
        <div
          onClick={() => { onClose(); navigate('/settings/user-management/users'); }}
          style={hoverStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <UserOutlined style={{ fontSize: 14, color: '#595959' }} />
          Profile
        </div>
        <div
          onClick={() => { onClose(); navigate('/settings'); }}
          style={hoverStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <SettingOutlined style={{ fontSize: 14, color: '#595959' }} />
          Settings
        </div>
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* Logout */}
      <div style={{ padding: '4px 0 0' }}>
        <div
          onClick={handleLogout}
          style={{ ...hoverStyle, color: '#ff4d4f' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogoutOutlined style={{ fontSize: 14 }} />
          Logout
        </div>
      </div>
    </div>
  );
};
