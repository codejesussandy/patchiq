import { useEffect, useState } from 'react';
import { SearchOutlined, MenuOutlined } from '@ant-design/icons';
import { Layout, Menu, Avatar, Button, Tooltip, Popover } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SparklesIcon } from '../chat/SparklesIcon';
import { Logo } from '../Logo';
import { NotificationDropdown } from '../NotificationDropdown';
import { GlobalSearchModal } from './GlobalSearchDropdown';
import { topMenuItems } from './menuConfig';
import { ProfileMenu } from './ProfileMenu';

const { Header } = Layout;

interface Organization {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

interface HeaderBarProps {
  selectedTopMenu: string[];
  organizations: Organization[];
  selectedOrgId: string | null;
  onOrgSwitch: (orgId: string) => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export const HeaderBar = ({
  selectedTopMenu,
  organizations,
  selectedOrgId,
  onOrgSwitch,
  chatOpen,
  onToggleChat,
  showMobileMenu = false,
  onMobileMenuToggle,
}: HeaderBarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const getSelectedOrgName = () => {
    const org = organizations.find((o) => o.id === selectedOrgId);
    return org?.name || user?.organization || 'No organization';
  };

  return (
    <>
      <Header
        role="banner"
        style={{
          position: 'fixed',
          top: 0,
          zIndex: 1000,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          height: '60px',
        }}
      >
        {showMobileMenu && (
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 20 }} />}
            onClick={onMobileMenuToggle}
            aria-label="Open navigation menu"
            style={{
              marginRight: 12,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginRight: '32px',
          flexShrink: 0,
          minWidth: 150,
        }}>
          <Logo size="medium" />
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#000', whiteSpace: 'nowrap' }}>Patch Manager</span>
        </div>

        <Menu
          mode="horizontal"
          selectedKeys={selectedTopMenu}
          items={topMenuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            flex: 1,
            minWidth: 400,
            border: 'none',
            background: 'transparent',
            lineHeight: '60px',
          }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexShrink: 0,
        }}>
          <Tooltip title="Search (Ctrl+K)">
            <Button
              type="text"
              icon={<SearchOutlined style={{ fontSize: 18, color: '#595959' }} />}
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
              }}
            />
          </Tooltip>

          <NotificationDropdown />
          <Tooltip title="AI Assistant">
            <Button
              type="text"
              icon={<SparklesIcon style={{ fontSize: 18, color: chatOpen ? '#1677ff' : '#595959' }} />}
              onClick={onToggleChat}
              aria-label="Toggle AI Assistant"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: chatOpen ? '#e6f4ff' : 'transparent',
              }}
            />
          </Tooltip>
          <Popover
            content={
              <ProfileMenu
                organizations={organizations}
                selectedOrgId={selectedOrgId}
                onOrgSwitch={onOrgSwitch}
                onClose={() => setProfileOpen(false)}
              />
            }
            trigger="click"
            open={profileOpen}
            onOpenChange={setProfileOpen}
            placement="bottomRight"
            arrow={false}
            styles={{ container: { padding: '12px 12px 8px' } }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label="User profile menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar
                size={32}
                style={{ backgroundColor: '#1677ff', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}
                src={user?.avatar || undefined}
              >
                {getUserInitials()}
              </Avatar>
              <div style={{ lineHeight: 1.2, maxWidth: 120, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getUserDisplayName()}
                </div>
                <div style={{ fontSize: '11px', color: '#8c8c8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getSelectedOrgName()}
                </div>
              </div>
            </div>
          </Popover>
        </div>
      </Header>

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
