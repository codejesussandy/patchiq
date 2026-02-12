import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  SearchOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  EditOutlined,
  FolderOutlined,
  FileTextOutlined,
  DesktopOutlined,
  WindowsOutlined,
  AppleOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  BugOutlined,
  SecurityScanOutlined,
  WarningOutlined,
  ExceptionOutlined,
  PlusOutlined,
  LogoutOutlined,
  CheckOutlined,
  BankOutlined,
  BellOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, Input, Avatar, Button, Tooltip, Tag, Popover, Divider } from 'antd';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categoryService } from '../services/category.service';
import { settingsService } from '../services/settings.service';
import type { Category, SubCategory } from '../types/asset.types';
import { CategoryManagementModal } from './CategoryManagementModal';
import { AIChatPanel } from './chat/AIChatPanel';
import { SparklesIcon } from './chat/SparklesIcon';
import { Logo } from './Logo';
import { NotificationDropdown } from './NotificationDropdown';

const { Header, Sider, Content } = Layout;

const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_EXPANDED_WIDTH = 224;
const CATEGORY_PANEL_WIDTH = 220;

interface MainLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  key: string;
  icon?: ReactNode;
  label: string | ReactNode;
  children?: MenuItem[];
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, logout } = useAuth();
  const [_collapsed, _setCollapsed] = useState(true); // Start collapsed
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryManagementModalOpen, setCategoryManagementModalOpen] = useState(false);
  const [expandedAssetSections, setExpandedAssetSections] = useState<string[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [selectedAssetTab, setSelectedAssetTab] = useState<string>('all-assets');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(user?.organizationId || null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedPatchTab, setSelectedPatchTab] = useState<string>('all-patches');
  const [chatOpen, setChatOpen] = useState(false);

  // Sidebar is visually expanded when pinned or hovered
  const isExpanded = pinned || hoverExpanded;

  const handleSiderMouseEnter = () => {
    if (pinned) return;
    hoverTimerRef.current = setTimeout(() => {
      setHoverExpanded(true);
    }, 150);
  };

  const handleSiderMouseLeave = () => {
    if (pinned) return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverExpanded(false);
  };

  const togglePin = () => {
    setPinned((prev) => !prev);
    if (!pinned) {
      setHoverExpanded(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getSubCategories(),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSubCategories(Array.isArray(subs) ? subs : []);
    } catch {
      // silently fail — category sidebar will just be empty
    }
  };

  const fetchOrganizations = async () => {
    try {
      const orgs = await settingsService.getOrganizations();
      setOrganizations(Array.isArray(orgs) ? orgs : []);
    } catch {
      // Silently fail — orgs dropdown will just be empty
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchCategories();
    fetchOrganizations();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'ADMIN': return 'red';
      case 'MANAGER': return 'orange';
      default: return 'blue';
    }
  };

  const handleOrgSwitch = (orgId: string) => {
    setSelectedOrgId(orgId);
    // Could persist via API in the future
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await logout();
      navigate('/login');
    } catch {
      // AuthContext handles the error message
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- sync route to UI state */
  // Update selected asset tab based on current route
  useEffect(() => {
    if (location.pathname.startsWith('/assets')) {
      const parentKey = location.pathname === '/assets' || location.pathname === '/assets/'
        ? 'all-assets'
        : location.pathname === '/assets/software-inventory'
        ? 'software-inventory'
        : location.pathname === '/assets/software-license'
        ? 'software-license'
        : location.pathname === '/assets/hub'
        ? 'software-hub'
        : 'all-assets';

      setSelectedAssetTab(parentKey);
      if (searchParams.get('category')) {
        setExpandedAssetSections(['cat-' + searchParams.get('category')]);
      }
    }
  }, [location.pathname, searchParams]);

  // Update selected patch tab based on current route
  useEffect(() => {
    if (location.pathname.startsWith('/patches')) {
      const parentKey = location.pathname === '/patches' || location.pathname === '/patches/'
        ? 'all-patches'
        : location.pathname.startsWith('/patches/deployed')
        ? 'patch-deployed'
        : location.pathname === '/patches/test-approve'
        ? 'patch-test-approve'
        : location.pathname === '/patches/zero-touch'
        ? 'zero-touch'
        : location.pathname === '/patches/patch-jobs'
        ? 'patch-jobs'
        : 'all-patches';

      setSelectedPatchTab(parentKey);
    }
  }, [location.pathname]);

  // Auto-expand menus for settings sub-pages
  useEffect(() => {
    if (location.pathname.startsWith('/settings/user-management')) {
      setExpandedMenus(['user-management']);
      if (location.pathname === '/settings/user-management') {
        navigate('/settings/user-management/organization', { replace: true });
      }
    } else if (location.pathname.startsWith('/settings/system-settings')) {
      setExpandedMenus(['system-settings']);
    } else if (location.pathname.startsWith('/settings/agent-management')) {
      setExpandedMenus(['agent-management']);
    } else if (location.pathname.startsWith('/settings/patch-management')) {
      setExpandedMenus(['patch-management']);
    } else if (location.pathname.startsWith('/discovery')) {
      setExpandedMenus(['discovery']);
    } else {
      setExpandedMenus([]);
    }
  }, [location.pathname, navigate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCategoryManagementClose = () => {
    setCategoryManagementModalOpen(false);
    fetchCategories();
  };

  const topMenuItems = [
    { key: '/dashboard', label: 'Dashboard' },
    { key: '/assets', label: 'Assets' },
    { key: '/patches', label: 'Patches' },
    { key: '/vulnerability', label: 'Vulnerability' },
    { key: '/reports', label: 'Reports' },
  ];

  const patchesTabItems: MenuItem[] = [
    { key: 'all-patches', icon: <FolderOutlined />, label: 'All Patches' },
    { key: 'patch-deployed', icon: <CreditCardOutlined />, label: 'Patch Deployments' },
    { key: 'patch-test-approve', icon: <EnvironmentOutlined />, label: 'Patch Test and Approve' },
    { key: 'zero-touch', icon: <EnvironmentOutlined />, label: 'Zero Touch Deployment' },
    { key: 'patch-jobs', icon: <SafetyOutlined />, label: 'Patch Jobs' },
  ];

  const patchOsCategories: MenuItem[] = [
    { key: 'os-windows', icon: <WindowsOutlined />, label: 'Windows' },
    { key: 'os-macos', icon: <AppleOutlined />, label: 'Mac' },
    { key: 'os-linux', icon: <DesktopOutlined />, label: 'Linux' },
  ];

  const getCategoryMenuItems = (): MenuItem[] => {
    const categoryList = Array.isArray(categories) ? categories : [];
    const subCategoryList = Array.isArray(subCategories) ? subCategories : [];

    return categoryList.map((cat) => ({
      key: `cat-${cat.id}`,
      label: cat.name,
      children: subCategoryList
        .filter((sub) => sub.categoryId === cat.id)
        .map((subCat) => ({
          key: `cat-${cat.id}-${subCat.id}`,
          label: subCat.name,
        })),
    }));
  };

  const vulnerabilityMenuItems: MenuItem[] = [
    { key: 'zero-day-vulnerabilities', icon: <SecurityScanOutlined />, label: 'Zero Day Vulnerabilities' },
    { key: 'vulnerabilities', icon: <WarningOutlined />, label: 'Vulnerabilities' },
    { key: 'manage-exception', icon: <ExceptionOutlined />, label: 'Manage Exception' },
    { key: 'vulnerability-jobs', icon: <BugOutlined />, label: 'Vulnerability Jobs' },
  ];

  const settingsMenuItems: MenuItem[] = [
    {
      key: 'user-management',
      icon: <UserOutlined />,
      label: 'User Management',
      children: [
        { key: 'user-management-organization', label: 'Organization' },
        { key: 'user-management-location', label: 'Location' },
        { key: 'user-management-roles', label: 'User Roles' },
        { key: 'user-management-users', label: 'Users' },
        { key: 'user-management-password-policies', label: 'Password Policies' },
      ],
    },
    {
      key: 'system-settings',
      icon: <SettingOutlined />,
      label: 'Company Configuration',
      children: [
        { key: 'system-settings-branding', label: 'Branding' },
        { key: 'system-settings-vendor-logo', label: 'Vendor Logo' },
        { key: 'system-settings-mail-server', label: 'Mail Server Configurations' },
        { key: 'system-settings-proxy-server', label: 'Proxy Server Configurations' },
        { key: 'system-settings-ldap-server', label: 'LDAP Server Configurations' },
        { key: 'system-settings-risk-score', label: 'Risk Score Settings' },
        { key: 'system-settings-remote-desktop', label: 'Remote Desktop Settings' },
        { key: 'system-settings-server', label: 'Server Settings' },
      ],
    },
    { key: 'notification-preferences', icon: <BellOutlined />, label: 'Notification Preferences' },
    { key: 'vulnerability-preference', icon: <FileTextOutlined />, label: 'Vulnerability Preference' },
    { key: 'market-place', icon: <FolderOutlined />, label: 'Market Place' },
    {
      key: 'discovery',
      icon: <UserOutlined />,
      label: 'Discovery',
      children: [
        { key: 'discovery-ip-discovery', label: 'IP Discovery' },
        { key: 'discovery-device-credentials', label: 'Device Credentials' },
      ],
    },
    {
      key: 'agent-management',
      icon: <DesktopOutlined />,
      label: 'Agent Management',
      children: [
        { key: 'agent-management-approval-settings', label: 'Agent Approval Settings' },
        { key: 'agent-management-versions', label: 'Agent Versions' },
        { key: 'agent-management-configuration', label: 'Agent Configuration' },
        { key: 'agent-management-approvals', label: 'Agent Approvals' },
        { key: 'agent-management-enroll-secret', label: 'Enroll Secret' },
        { key: 'agent-management-red-hat-nomination', label: 'Red Hat Agent Nomination' },
      ],
    },
    { key: 'jobs', icon: <WindowsOutlined />, label: 'Jobs' },
    {
      key: 'patch-management',
      icon: <EditOutlined />,
      label: 'Patch Management',
      children: [
        { key: 'patch-management-patch-preferences', label: 'Patch Preferences' },
        { key: 'patch-management-distribution-server', label: 'Distribution Server' },
      ],
    },
    { key: 'policy-management', icon: <CreditCardOutlined />, label: 'Alert Management' },
    { key: 'audit', icon: <FileTextOutlined />, label: 'Audit' },
    { key: 'platform-license', icon: <CreditCardOutlined />, label: 'Platform License' },
  ];

  const handleTopMenuClick = (key: string) => {
    navigate(key);
  };

  const handleSideMenuClick = (key: string) => {
    // Patches OS categories
    if (key.startsWith('os-')) {
      const os = key.replace('os-', '');
      const osMap: Record<string, string> = {
        'windows': 'Windows',
        'macos': 'MacOS',
        'linux': 'Linux',
      };
      setTimeout(() => setSearchParams({ os: osMap[os] || os }), 0);
      return;
    }
    // Assets - handle category clicks
    else if (key.startsWith('cat-')) {
      const parts = key.split('-');
      if (parts.length === 2) {
        setTimeout(() => setSearchParams({ category: parts[1] }), 0);
      } else if (parts.length === 3) {
        setTimeout(() => setSearchParams({ category: parts[1], subcategory: parts[2] }), 0);
      }
    }
    // Vulnerability
    else if (key === 'zero-day-vulnerabilities') navigate('/vulnerability/zero-day-vulnerabilities');
    else if (key === 'vulnerabilities') navigate('/vulnerability/vulnerabilities');
    else if (key === 'manage-exception') navigate('/vulnerability/manage-exception');
    else if (key === 'vulnerability-jobs') navigate('/vulnerability/vulnerability-jobs/list');
    // Discovery
    else if (key === 'discovery-ip-discovery') navigate('/discovery/ip-discovery');
    else if (key === 'discovery-device-credentials') navigate('/discovery/device-credentials');
    // Settings - User Management sub-menus
    else if (key === 'user-management-organization') navigate('/settings/user-management/organization');
    else if (key === 'user-management-location') navigate('/settings/user-management/location');
    else if (key === 'user-management-roles') navigate('/settings/user-management/user-roles');
    else if (key === 'user-management-users') navigate('/settings/user-management/users');
    else if (key === 'user-management-password-policies') navigate('/settings/user-management/password-policies');
    // Settings - System Settings sub-menus
    else if (key === 'system-settings-branding') navigate('/settings/system-settings/branding');
    else if (key === 'system-settings-vendor-logo') navigate('/settings/system-settings/vendor-logo');
    else if (key === 'system-settings-mail-server') navigate('/settings/system-settings/mail-server');
    else if (key === 'system-settings-proxy-server') navigate('/settings/system-settings/proxy-server');
    else if (key === 'system-settings-ldap-server') navigate('/settings/system-settings/ldap-server');
    else if (key === 'system-settings-risk-score') navigate('/settings/system-settings/risk-score');
    else if (key === 'system-settings-remote-desktop') navigate('/settings/system-settings/remote-desktop');
    else if (key === 'system-settings-server') navigate('/settings/system-settings/server-settings');
    // Settings - Agent Management sub-menus
    else if (key === 'agent-management-approval-settings') navigate('/settings/agent-management/approval-settings');
    else if (key === 'agent-management-versions') navigate('/settings/agent-management/versions');
    else if (key === 'agent-management-configuration') navigate('/settings/agent-management/configuration');
    else if (key === 'agent-management-approvals') navigate('/settings/agent-management/approvals');
    else if (key === 'agent-management-enroll-secret') navigate('/settings/agent-management/enroll-secret');
    else if (key === 'agent-management-red-hat-nomination') navigate('/settings/agent-management/red-hat-nomination');
    // Settings - Patch Management sub-menus
    else if (key === 'patch-management-patch-preferences') navigate('/settings/patch-management/patch-preferences');
    else if (key === 'patch-management-distribution-server') navigate('/settings/patch-management/distribution-server');
    // Settings top-level
    else if (key === 'user-management') navigate('/settings/user-management/organization');
    else if (key === 'system-settings') navigate('/settings/system-settings/branding');
    else if (key === 'notification-preferences') navigate('/settings/notification-preferences');
    else if (key === 'vulnerability-preference') navigate('/settings/vulnerability-preference');
    else if (key === 'market-place') navigate('/settings/market-place');
    else if (key === 'discovery') navigate('/discovery/ip-discovery');
    else if (key === 'agent-management') navigate('/settings/agent-management/approval-settings');
    else if (key === 'jobs') navigate('/settings/jobs');
    else if (key === 'patch-management') navigate('/settings/patch-management');
    else if (key === 'policy-management') navigate('/settings/policy-management');
    else if (key === 'audit') navigate('/settings/audit');
    else if (key === 'platform-license') navigate('/settings/platform-license');
  };

  const handleAssetTabChange = (tab: string) => {
    setSelectedAssetTab(tab);
    setSearchParams({});

    switch (tab) {
      case 'all-assets':
        navigate('/assets');
        break;
      case 'software-inventory':
        navigate('/assets/software-inventory');
        break;
      case 'software-license':
        navigate('/assets/software-license');
        break;
      case 'software-hub':
        navigate('/assets/hub');
        break;
    }
  };

  const handlePatchTabChange = (tab: string) => {
    setSelectedPatchTab(tab);
    setSearchParams({});

    switch (tab) {
      case 'all-patches':
        navigate('/patches');
        break;
      case 'patch-deployed':
        navigate('/patches/deployed');
        break;
      case 'patch-test-approve':
        navigate('/patches/test-approve');
        break;
      case 'zero-touch':
        navigate('/patches/zero-touch');
        break;
      case 'patch-jobs':
        navigate('/patches/patch-jobs');
        break;
    }
  };

  const profileDropdownContent = (
    <div style={{ width: 280 }}>
      {/* User Info Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 12px' }}>
        <Avatar
          size={44}
          style={{
            backgroundColor: '#1677ff',
            fontSize: '16px',
            fontWeight: 600,
            flexShrink: 0,
          }}
          src={user?.avatar || undefined}
        >
          {getUserInitials()}
        </Avatar>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getUserDisplayName()}
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                onClick={() => handleOrgSwitch(org.id)}
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
                {selectedOrgId === org.id && <CheckOutlined style={{ color: '#1677ff', fontSize: 12 }} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#bfbfbf', padding: '4px 8px' }}>No organizations</div>
        )}
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* Menu Items */}
      <div style={{ padding: '4px 0' }}>
        <div
          onClick={() => { setProfileOpen(false); navigate('/settings/user-management/users'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '13px', transition: 'background 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <UserOutlined style={{ fontSize: 14, color: '#595959' }} />
          Profile
        </div>
        <div
          onClick={() => { setProfileOpen(false); navigate('/settings'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '13px', transition: 'background 0.15s' }}
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
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '13px', color: '#ff4d4f', transition: 'background 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#fff1f0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogoutOutlined style={{ fontSize: 14 }} />
          Logout
        </div>
      </div>
    </div>
  );

  const getSelectedTopMenu = () => {
    if (location.pathname.startsWith('/patches')) return ['/patches'];
    if (location.pathname.startsWith('/assets')) return ['/assets'];
    if (location.pathname.startsWith('/vulnerability')) return ['/vulnerability'];
    if (location.pathname.startsWith('/settings')) return ['/settings'];
    return [location.pathname];
  };

  const getSelectedSideMenu = () => {
    const categoryId = searchParams.get('category');
    const subCategoryId = searchParams.get('subcategory');
    const osFilter = searchParams.get('os');

    if (location.pathname.startsWith('/patches')) {
      if (osFilter) {
        const osMap: Record<string, string> = {
          'Windows': 'os-windows',
          'MacOS': 'os-macos',
          'Linux': 'os-linux',
        };
        return [osMap[osFilter] || ''];
      }
      return [];
    }
    if (location.pathname.startsWith('/assets')) {
      if (categoryId && subCategoryId) return [`cat-${categoryId}-${subCategoryId}`];
      if (categoryId) return [`cat-${categoryId}`];
      return [];
    }
    if (location.pathname.startsWith('/vulnerability/zero-day-vulnerabilities')) return ['zero-day-vulnerabilities'];
    if (location.pathname.startsWith('/vulnerability/vulnerabilities')) return ['vulnerabilities'];
    if (location.pathname.startsWith('/vulnerability/manage-exception')) return ['manage-exception'];
    if (location.pathname.startsWith('/vulnerability/vulnerability-jobs')) return ['vulnerability-jobs'];
    if (location.pathname === '/discovery/ip-discovery') return ['discovery-ip-discovery'];
    if (location.pathname === '/discovery/device-credentials') return ['discovery-device-credentials'];
    if (location.pathname === '/settings/user-management/organization') return ['user-management-organization'];
    if (location.pathname === '/settings/user-management/location') return ['user-management-location'];
    if (location.pathname === '/settings/user-management/roles') return ['user-management-roles'];
    if (location.pathname === '/settings/user-management/users') return ['user-management-users'];
    if (location.pathname === '/settings/user-management/password-policies') return ['user-management-password-policies'];
    if (location.pathname === '/settings/system-settings/branding') return ['system-settings-branding'];
    if (location.pathname === '/settings/system-settings/vendor-logo') return ['system-settings-vendor-logo'];
    if (location.pathname === '/settings/system-settings/mail-server') return ['system-settings-mail-server'];
    if (location.pathname === '/settings/system-settings/proxy-server') return ['system-settings-proxy-server'];
    if (location.pathname === '/settings/system-settings/ldap-server') return ['system-settings-ldap-server'];
    if (location.pathname === '/settings/system-settings/risk-score') return ['system-settings-risk-score'];
    if (location.pathname === '/settings/system-settings/remote-desktop') return ['system-settings-remote-desktop'];
    if (location.pathname === '/settings/system-settings/server-settings') return ['system-settings-server'];
    if (location.pathname === '/settings/agent-management/approval-settings') return ['agent-management-approval-settings'];
    if (location.pathname === '/settings/agent-management/versions') return ['agent-management-versions'];
    if (location.pathname === '/settings/agent-management/configuration') return ['agent-management-configuration'];
    if (location.pathname === '/settings/agent-management/approvals') return ['agent-management-approvals'];
    if (location.pathname === '/settings/agent-management/enroll-secret') return ['agent-management-enroll-secret'];
    if (location.pathname === '/settings/agent-management/red-hat-nomination') return ['agent-management-red-hat-nomination'];
    if (location.pathname === '/settings/patch-management/patch-preferences') return ['patch-management-patch-preferences'];
    if (location.pathname === '/settings/patch-management/distribution-server') return ['patch-management-distribution-server'];
    if (location.pathname === '/settings/system-settings') return ['system-settings'];
    if (location.pathname === '/settings/notification-preferences') return ['notification-preferences'];
    if (location.pathname === '/settings/vulnerability-preference') return ['vulnerability-preference'];
    if (location.pathname === '/settings/market-place') return ['market-place'];
    if (location.pathname === '/settings/jobs') return ['jobs'];
    if (location.pathname === '/settings/patch-management') return ['patch-management'];
    if (location.pathname === '/settings/policy-management') return ['policy-management'];
    if (location.pathname === '/settings/audit') return ['audit'];
    if (location.pathname === '/settings/platform-license') return ['platform-license'];
    return [];
  };

  // Determine which sidebar to show
  const getSidebarConfig = () => {
    if (location.pathname.startsWith('/patches')) {
      return { title: 'Patches', items: [] };
    }
    if (location.pathname.startsWith('/assets')) {
      return { title: 'Assets', items: [] };
    }
    if (location.pathname.startsWith('/vulnerability')) {
      return { title: 'Vulnerability', items: vulnerabilityMenuItems };
    }
    if (location.pathname.startsWith('/discovery') || location.pathname.startsWith('/settings')) {
      return { title: 'Settings', items: settingsMenuItems };
    }
    return null;
  };

  const sidebarConfig = getSidebarConfig();

  // Show category panel for assets and patches pages
  const showCategoryPanel = sidebarConfig?.title === 'Assets' || sidebarConfig?.title === 'Patches';

  // Calculate content margin
  const sidebarWidth = sidebarConfig
    ? (isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH)
    : 0;
  const categoryPanelWidth = showCategoryPanel ? CATEGORY_PANEL_WIDTH : 0;
  const contentMarginLeft = sidebarWidth + categoryPanelWidth;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Top Header */}
      <Header
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
          minWidth: 1200,
        }}
      >
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
          selectedKeys={getSelectedTopMenu()}
          items={topMenuItems}
          onClick={({ key }) => handleTopMenuClick(key)}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              width: searchExpanded ? 240 : 32,
              height: 32,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s ease, border-color 0.3s ease, background 0.3s ease',
              borderRadius: searchExpanded ? 6 : 16,
              border: searchExpanded ? '1px solid #d9d9d9' : '1px solid transparent',
              background: searchExpanded ? '#fff' : 'transparent',
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={() => {
              if (!searchExpanded) {
                setSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }
            }}
          >
            {/* Icon shown when collapsed */}
            <SearchOutlined
              style={{
                fontSize: 18,
                color: '#595959',
                position: 'absolute',
                opacity: searchExpanded ? 0 : 1,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none',
              }}
            />
            {/* Input shown when expanded */}
            <Input
              ref={searchInputRef}
              placeholder="Search..."
              prefix={<SearchOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />}
              variant="borderless"
              style={{
                width: '100%',
                opacity: searchExpanded ? 1 : 0,
                transition: 'opacity 0.2s ease 0.1s',
              }}
              onBlur={(e) => {
                if (!e.target.value) setSearchExpanded(false);
              }}
              onPressEnter={(e) => {
                if (!(e.target as HTMLInputElement).value) setSearchExpanded(false);
              }}
            />
          </div>
          <NotificationDropdown />
          <Tooltip title="AI Assistant">
            <Button
              type="text"
              icon={<SparklesIcon style={{ fontSize: 18, color: chatOpen ? '#1677ff' : '#595959' }} />}
              onClick={() => setChatOpen((prev) => !prev)}
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
            content={profileDropdownContent}
            trigger="click"
            open={profileOpen}
            onOpenChange={setProfileOpen}
            placement="bottomRight"
            arrow={false}
            styles={{ container: { padding: '12px 12px 8px' } }}
          >
            <div
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

      <Layout style={{ marginTop: '60px' }}>
        {/* Main Left Sidebar — collapses by default, expands on hover */}
        {sidebarConfig && (
          <Sider
            collapsed={!isExpanded}
            trigger={null}
            width={SIDEBAR_EXPANDED_WIDTH}
            collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
            onMouseEnter={handleSiderMouseEnter}
            onMouseLeave={handleSiderMouseLeave}
            style={{
              background: '#fafafa',
              borderRight: '1px solid #f0f0f0',
              position: 'fixed',
              left: 0,
              top: 60,
              bottom: 0,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 100,
              transition: 'width 0.2s',
            }}
          >
            {/* Sidebar Header */}
            <div
              style={{
                padding: !isExpanded ? '12px 0' : '16px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: !isExpanded ? 'center' : 'space-between',
                alignItems: 'center',
              }}
            >
              {isExpanded && (
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{sidebarConfig.title}</span>
              )}
              <Tooltip title={pinned ? 'Unpin sidebar' : 'Pin sidebar'} placement="right">
                {pinned ? (
                  <MenuFoldOutlined
                    onClick={togglePin}
                    style={{ cursor: 'pointer', fontSize: '16px', color: '#1677ff' }}
                  />
                ) : (
                  <MenuUnfoldOutlined
                    onClick={togglePin}
                    style={{ cursor: 'pointer', fontSize: '16px' }}
                  />
                )}
              </Tooltip>
            </div>

            {/* Patches Section */}
            {sidebarConfig?.title === 'Patches' && (
              <Menu
                mode="inline"
                inlineCollapsed={!isExpanded}
                selectedKeys={[selectedPatchTab]}
                items={patchesTabItems as MenuProps['items']}
                onClick={({ key }) => handlePatchTabChange(key)}
                style={{ background: 'transparent', border: 'none' }}
              />
            )}

            {/* Assets Section */}
            {sidebarConfig?.title === 'Assets' && (
              <Menu
                mode="inline"
                inlineCollapsed={!isExpanded}
                selectedKeys={[selectedAssetTab]}
                items={[
                  { key: 'all-assets', icon: <FolderOutlined />, label: 'All Assets' },
                  { key: 'software-inventory', icon: <FileTextOutlined />, label: 'Software Inventory' },
                  { key: 'software-license', icon: <DesktopOutlined />, label: 'Software Licenses' },
                  { key: 'software-hub', icon: <AppstoreOutlined />, label: 'Software Hub' },
                ]}
                onClick={({ key }) => handleAssetTabChange(key)}
                style={{ background: 'transparent', border: 'none' }}
              />
            )}

            {/* Other Sections (Vulnerability, Settings) */}
            {sidebarConfig?.title !== 'Assets' && sidebarConfig?.title !== 'Patches' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Menu
                  mode="inline"
                  inlineCollapsed={!isExpanded}
                  selectedKeys={getSelectedSideMenu()}
                  openKeys={isExpanded ? expandedMenus : []}
                  items={sidebarConfig?.items as MenuProps['items']}
                  onClick={({ key }) => handleSideMenuClick(key)}
                  onOpenChange={(keys) => setExpandedMenus(keys as string[])}
                  style={{ background: 'transparent', border: 'none', paddingTop: '8px' }}
                />
              </div>
            )}
          </Sider>
        )}

        {/* Secondary Category Panel — between main sidebar and content */}
        {showCategoryPanel && (
          <div
            style={{
              position: 'fixed',
              left: sidebarWidth,
              top: 60,
              bottom: 0,
              width: CATEGORY_PANEL_WIDTH,
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
              overflow: 'auto',
              zIndex: 50,
              transition: 'left 0.2s',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Category Panel Header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '12px', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Categories
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {sidebarConfig?.title === 'Assets' && (
                  <>
                    <Tooltip title="Add Category">
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => setCategoryManagementModalOpen(true)}
                      />
                    </Tooltip>
                    <Tooltip title="Manage Categories">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setCategoryManagementModalOpen(true)}
                      />
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

            {/* Category Items */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {sidebarConfig?.title === 'Patches' && (
                <Menu
                  mode="inline"
                  selectedKeys={getSelectedSideMenu()}
                  items={patchOsCategories as MenuProps['items']}
                  onClick={({ key }) => handleSideMenuClick(key)}
                  style={{ background: 'transparent', border: 'none', paddingTop: '4px' }}
                />
              )}

              {sidebarConfig?.title === 'Assets' && (
                <Menu
                  mode="inline"
                  selectedKeys={getSelectedSideMenu()}
                  openKeys={expandedAssetSections}
                  items={getCategoryMenuItems() as MenuProps['items']}
                  onClick={({ key }) => handleSideMenuClick(key)}
                  onOpenChange={(keys) => setExpandedAssetSections(keys as string[])}
                  style={{ background: 'transparent', border: 'none', paddingTop: '4px' }}
                />
              )}

              {/* Show "No categories" message if empty */}
              {sidebarConfig?.title === 'Assets' && getCategoryMenuItems().length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#bfbfbf', fontSize: '13px' }}>
                  No categories yet.
                  <br />
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setCategoryManagementModalOpen(true)}
                    style={{ padding: 0, marginTop: 4 }}
                  >
                    Add one
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <Layout
          style={{
            marginLeft: contentMarginLeft,
            transition: 'margin-left 0.2s',
            background: '#fff',
          }}
        >
          <Content
            style={{
              padding: '24px 32px',
              background: '#fff',
              minHeight: 'calc(100vh - 60px)',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>

      {/* Category Management Modal */}
      <CategoryManagementModal
        open={categoryManagementModalOpen}
        onClose={handleCategoryManagementClose}
      />

      {/* AI Chat Panel */}
      <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </Layout>
  );
};
