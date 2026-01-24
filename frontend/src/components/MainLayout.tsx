import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Layout, Menu, Input, Avatar, Dropdown, Select, Button } from 'antd';
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
} from '@ant-design/icons';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Logo } from './Logo';
import { categoryService } from '../services/category.service';
import type { Category, SubCategory } from '../types/asset.types';
import { CategoryManagementModal } from './CategoryManagementModal';
import { NotificationDropdown } from './NotificationDropdown';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  key: string;
  icon?: ReactNode;
  label: string | ReactNode;
  children?: MenuItem[];
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categoryManagementModalOpen, setCategoryManagementModalOpen] = useState(false);
  const [expandedAssetSections, setExpandedAssetSections] = useState<string[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [selectedAssetTab, setSelectedAssetTab] = useState<string>('all-assets');
  const [selectedPatchTab, setSelectedPatchTab] = useState<string>('all-patches');

  const fetchCategories = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getSubCategories(),
      ]);
      // Ensure we're setting arrays
      setCategories(Array.isArray(cats) ? cats : []);
      setSubCategories(Array.isArray(subs) ? subs : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Silently fail - categories are optional
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Update selected asset tab and auto-expand categories based on current route
  useEffect(() => {
    if (location.pathname.startsWith('/assets')) {
      const parentKey = location.pathname === '/assets' || location.pathname === '/assets/'
        ? 'all-assets'
        : location.pathname === '/assets/software-inventory'
        ? 'software-inventory'
        : location.pathname === '/assets/software-license'
        ? 'software-license'
        : location.pathname === '/assets/os-license'
        ? 'os-license'
        : 'all-assets';

      setSelectedAssetTab(parentKey);
      // Auto-expand categories if a category filter is applied
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
        : location.pathname === '/patches/deployed'
        ? 'patch-deployed'
        : location.pathname === '/patches/test-approve'
        ? 'patch-test-approve'
        : location.pathname === '/patches/zero-touch'
        ? 'zero-touch'
        : 'all-patches';

      setSelectedPatchTab(parentKey);
    }
  }, [location.pathname]);

  // Auto-expand User Management menu when visiting its sub-pages
  // Auto-navigate to organization if just /settings/user-management
  // Auto-expand System Settings menu when visiting its sub-pages
  // Auto-expand Agent Management menu when visiting its sub-pages
  // Auto-expand Patch Management menu when visiting its sub-pages
  // Auto-expand Discovery menu when visiting discovery routes
  useEffect(() => {
    if (location.pathname.startsWith('/settings/user-management')) {
      setExpandedMenus(['user-management']);
      // If the path is exactly /settings/user-management (shouldn't happen due to redirect, but just in case)
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

  const handleCategoryManagementClose = () => {
    setCategoryManagementModalOpen(false);
    fetchCategories();
  };

  const topMenuItems = [
    { key: '/dashboard', label: 'Dashboard' },
    { key: '/patches', label: 'Patches' },
    { key: '/assets', label: 'Assets' },
    { key: '/vulnerability', label: 'Vulnerability' },
    { key: '/jobs', label: 'Jobs' },
    { key: '/reports', label: 'Reports' },
  ];

  const patchesTabItems: MenuItem[] = [
    {
      key: 'all-patches',
      icon: <FolderOutlined />,
      label: 'All Patches',
    },
    {
      key: 'patch-deployed',
      icon: <CreditCardOutlined />,
      label: 'Patch Deployed',
    },
    {
      key: 'patch-test-approve',
      icon: <EnvironmentOutlined />,
      label: 'Patch Test and Approve',
    },
    {
      key: 'zero-touch',
      icon: <EnvironmentOutlined />,
      label: 'Zero Touch Deployment',
    },
  ];

  const patchOsCategories: MenuItem[] = [
    {
      key: 'os-windows',
      icon: <WindowsOutlined />,
      label: 'Windows',
    },
    {
      key: 'os-macos',
      icon: <AppleOutlined />,
      label: 'Mac',
    },
    {
      key: 'os-linux',
      icon: <DesktopOutlined />,
      label: 'Linux',
    },
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
    {
      key: 'zero-day-vulnerabilities',
      icon: <SecurityScanOutlined />,
      label: 'Zero Day Vulnerabilities',
    },
    {
      key: 'vulnerabilities',
      icon: <WarningOutlined />,
      label: 'Vulnerabilities',
    },
    {
      key: 'manage-exception',
      icon: <ExceptionOutlined />,
      label: 'Manage Exception',
    },
  ];

  const jobsMenuItems: MenuItem[] = [
    {
      key: 'software-jobs',
      icon: <AppstoreOutlined />,
      label: 'Software Jobs',
    },
    {
      key: 'configuration-jobs',
      icon: <SettingOutlined />,
      label: 'Configuration Jobs',
    },
    {
      key: 'patch-jobs',
      icon: <SafetyOutlined />,
      label: 'Patch Jobs',
    },
    {
      key: 'vulnerability-jobs',
      icon: <BugOutlined />,
      label: 'Vulnerability Jobs',
    },
  ];

  const settingsMenuItems: MenuItem[] = [
    {
      key: 'software-hub',
      icon: <AppstoreOutlined />,
      label: 'Software Hub',
    },
    {
      key: 'user-management',
      icon: <UserOutlined />,
      label: 'User Management',
      children: [
        {
          key: 'user-management-organization',
          label: 'Organization',
        },
        {
          key: 'user-management-department',
          label: 'Department',
        },
        {
          key: 'user-management-location',
          label: 'Location',
        },
        {
          key: 'user-management-roles',
          label: 'User Roles',
        },
        {
          key: 'user-management-users',
          label: 'Users',
        },
        {
          key: 'user-management-password-policies',
          label: 'Password Policies',
        },
      ],
    },
    {
      key: 'system-settings',
      icon: <SettingOutlined />,
      label: 'System Settings',
      children: [
        {
          key: 'system-settings-branding',
          label: 'Branding',
        },
        {
          key: 'system-settings-vendor-logo',
          label: 'Vendor Logo',
        },
        {
          key: 'system-settings-mail-server',
          label: 'Mail Server Configurations',
        },
        {
          key: 'system-settings-proxy-server',
          label: 'Proxy Server Configurations',
        },
        {
          key: 'system-settings-ldap-server',
          label: 'LDAP Server Configurations',
        },
        {
          key: 'system-settings-risk-score',
          label: 'Risk Score Settings',
        },
        {
          key: 'system-settings-remote-desktop',
          label: 'Remote Desktop Settings',
        },
        {
          key: 'system-settings-server',
          label: 'Server Settings',
        },
      ],
    },
    {
      key: 'vulnerability-preference',
      icon: <FileTextOutlined />,
      label: 'Vulnerability Preference',
    },
    {
      key: 'market-place',
      icon: <FolderOutlined />,
      label: 'Market Place',
    },
    {
      key: 'discovery',
      icon: <UserOutlined />,
      label: 'Discovery',
      children: [
        {
          key: 'discovery-ip-discovery',
          label: 'IP Discovery',
        },
        {
          key: 'discovery-device-credentials',
          label: 'Device Credentials',
        },
      ],
    },
    {
      key: 'agent-management',
      icon: <DesktopOutlined />,
      label: 'Agent Management',
      children: [
        {
          key: 'agent-management-approval-settings',
          label: 'Agent Approval Settings',
        },
        {
          key: 'agent-management-versions',
          label: 'Agent Versions',
        },
        {
          key: 'agent-management-configuration',
          label: 'Agent Configuration',
        },
        {
          key: 'agent-management-approvals',
          label: 'Agent Approvals',
        },
        {
          key: 'agent-management-enroll-secret',
          label: 'Enroll Secret',
        },
        {
          key: 'agent-management-red-hat-nomination',
          label: 'Red Hat Agent Nomination',
        },
      ],
    },
    {
      key: 'jobs',
      icon: <WindowsOutlined />,
      label: 'Jobs',
    },
    {
      key: 'patch-management',
      icon: <EditOutlined />,
      label: 'Patch Management',
      children: [
        {
          key: 'patch-management-computer-groups',
          label: 'Computer Groups',
        },
        {
          key: 'patch-management-patch-preferences',
          label: 'Patch Preferences',
        },
        {
          key: 'patch-management-distribution-server',
          label: 'Distribution Server',
        },
      ],
    },
    {
      key: 'policy-management',
      icon: <CreditCardOutlined />,
      label: 'Alert Management',
    },
    {
      key: 'audit',
      icon: <FileTextOutlined />,
      label: 'Audit',
    },
    {
      key: 'platform-license',
      icon: <CreditCardOutlined />,
      label: 'Platform License',
    },
  ];

  const handleTopMenuClick = (key: string) => {
    navigate(key);
  };

  const handleSideMenuClick = (key: string) => {
    // Patches OS categories
    if (key.startsWith('os-')) {
      const os = key.replace('os-', '');
      // Map to actual OS values
      const osMap: Record<string, string> = {
        'windows': 'Windows',
        'macos': 'MacOS',
        'linux': 'Linux',
      };
      setTimeout(() => setSearchParams({ os: osMap[os] || os }), 0);
      return;
    }
    // Assets - handle category clicks (use selectedAssetTab to determine page)
    else if (key.startsWith('cat-')) {
      const parts = key.split('-');
      if (parts.length === 2) {
        // Category without subcategory: cat-{categoryId}
        setTimeout(() => setSearchParams({ category: parts[1] }), 0);
      } else if (parts.length === 3) {
        // Category with subcategory: cat-{categoryId}-{subCategoryId}
        setTimeout(() => setSearchParams({ category: parts[1], subcategory: parts[2] }), 0);
      }
    }
    // Vulnerability
    else if (key === 'zero-day-vulnerabilities') navigate('/vulnerability/zero-day-vulnerabilities');
    else if (key === 'vulnerabilities') navigate('/vulnerability/vulnerabilities');
    else if (key === 'manage-exception') navigate('/vulnerability/manage-exception');
    // Jobs
    else if (key === 'software-jobs') navigate('/jobs/software-jobs/catalog');
    else if (key === 'configuration-jobs') navigate('/jobs/configuration-jobs/catalog');
    else if (key === 'patch-jobs') navigate('/jobs/patch-jobs');
    else if (key === 'vulnerability-jobs') navigate('/jobs/vulnerability-jobs');
    // Discovery - now under Settings
    else if (key === 'discovery-ip-discovery') navigate('/discovery/ip-discovery');
    else if (key === 'discovery-device-credentials') navigate('/discovery/device-credentials');
    // Software Hub
    else if (key === 'software-hub') navigate('/hub');
    // Settings - User Management sub-menus
    else if (key === 'user-management-organization') navigate('/settings/user-management/organization');
    else if (key === 'user-management-department') navigate('/settings/user-management/department');
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
    else if (key === 'patch-management-computer-groups') navigate('/settings/patch-management/computer-groups');
    else if (key === 'patch-management-patch-preferences') navigate('/settings/patch-management/patch-preferences');
    else if (key === 'patch-management-distribution-server') navigate('/settings/patch-management/distribution-server');
    // Settings
    else if (key === 'user-management') navigate('/settings/user-management/organization');
    else if (key === 'system-settings') navigate('/settings/system-settings/branding');
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
    setSearchParams({}); // Clear category filters when changing tabs

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
      case 'os-license':
        navigate('/assets/os-license');
        break;
    }
  };

  const handlePatchTabChange = (tab: string) => {
    setSelectedPatchTab(tab);
    setSearchParams({}); // Clear OS filters when changing tabs

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
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
    },
    {
      key: 'settings',
      label: 'Settings',
    },
    {
      key: 'logout',
      label: 'Logout',
      danger: true,
    },
  ];

  // Determine selected keys based on current path
  const getSelectedTopMenu = () => {
    if (location.pathname.startsWith('/patches')) return ['/patches'];
    if (location.pathname.startsWith('/assets')) return ['/assets'];
    if (location.pathname.startsWith('/vulnerability')) return ['/vulnerability'];
    if (location.pathname.startsWith('/jobs')) return ['/jobs'];
    if (location.pathname.startsWith('/hub')) return ['/settings'];
    if (location.pathname.startsWith('/settings')) return ['/settings'];
    return [location.pathname];
  };

  const getSelectedSideMenu = () => {
    const categoryId = searchParams.get('category');
    const subCategoryId = searchParams.get('subcategory');
    const osFilter = searchParams.get('os');

    // Patches - return OS category selections
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
    // Assets - only return category selections, not page tabs
    if (location.pathname.startsWith('/assets')) {
      if (categoryId && subCategoryId) return [`cat-${categoryId}-${subCategoryId}`];
      if (categoryId) return [`cat-${categoryId}`];
      return [];
    }
    // Vulnerability
    if (location.pathname.startsWith('/vulnerability/zero-day-vulnerabilities')) return ['zero-day-vulnerabilities'];
    if (location.pathname.startsWith('/vulnerability/vulnerabilities')) return ['vulnerabilities'];
    if (location.pathname.startsWith('/vulnerability/manage-exception')) return ['manage-exception'];
    // Jobs
    if (location.pathname.startsWith('/jobs/software-jobs')) return ['software-jobs'];
    if (location.pathname.startsWith('/jobs/configuration-jobs')) return ['configuration-jobs'];
    if (location.pathname === '/jobs/patch-jobs') return ['patch-jobs'];
    if (location.pathname === '/jobs/vulnerability-jobs') return ['vulnerability-jobs'];
    // Discovery - now under Settings
    if (location.pathname === '/discovery/ip-discovery') return ['discovery-ip-discovery'];
    if (location.pathname === '/discovery/device-credentials') return ['discovery-device-credentials'];
    // Settings - User Management
    if (location.pathname === '/settings/user-management/organization') return ['user-management-organization'];
    if (location.pathname === '/settings/user-management/department') return ['user-management-department'];
    if (location.pathname === '/settings/user-management/location') return ['user-management-location'];
    if (location.pathname === '/settings/user-management/roles') return ['user-management-roles'];
    if (location.pathname === '/settings/user-management/users') return ['user-management-users'];
    if (location.pathname === '/settings/user-management/password-policies') return ['user-management-password-policies'];
    // Settings - System Settings
    if (location.pathname === '/settings/system-settings/branding') return ['system-settings-branding'];
    if (location.pathname === '/settings/system-settings/vendor-logo') return ['system-settings-vendor-logo'];
    if (location.pathname === '/settings/system-settings/mail-server') return ['system-settings-mail-server'];
    if (location.pathname === '/settings/system-settings/proxy-server') return ['system-settings-proxy-server'];
    if (location.pathname === '/settings/system-settings/ldap-server') return ['system-settings-ldap-server'];
    if (location.pathname === '/settings/system-settings/risk-score') return ['system-settings-risk-score'];
    if (location.pathname === '/settings/system-settings/remote-desktop') return ['system-settings-remote-desktop'];
    if (location.pathname === '/settings/system-settings/server-settings') return ['system-settings-server'];
    // Settings - Agent Management
    if (location.pathname === '/settings/agent-management/approval-settings') return ['agent-management-approval-settings'];
    if (location.pathname === '/settings/agent-management/versions') return ['agent-management-versions'];
    if (location.pathname === '/settings/agent-management/configuration') return ['agent-management-configuration'];
    if (location.pathname === '/settings/agent-management/approvals') return ['agent-management-approvals'];
    if (location.pathname === '/settings/agent-management/enroll-secret') return ['agent-management-enroll-secret'];
    if (location.pathname === '/settings/agent-management/red-hat-nomination') return ['agent-management-red-hat-nomination'];
    // Settings - Patch Management
    if (location.pathname === '/settings/patch-management/computer-groups') return ['patch-management-computer-groups'];
    if (location.pathname === '/settings/patch-management/patch-preferences') return ['patch-management-patch-preferences'];
    if (location.pathname === '/settings/patch-management/distribution-server') return ['patch-management-distribution-server'];
    // Software Hub
    if (location.pathname === '/hub') return ['software-hub'];
    // Settings
    if (location.pathname === '/settings/system-settings') return ['system-settings'];
    if (location.pathname === '/settings/vulnerability-preference') return ['vulnerability-preference'];
    if (location.pathname === '/settings/market-place') return ['market-place'];
    if (location.pathname === '/settings/jobs') return ['jobs'];
    if (location.pathname === '/settings/patch-management') return ['patch-management'];
    if (location.pathname === '/settings/policy-management') return ['policy-management'];
    if (location.pathname === '/settings/audit') return ['audit'];
    if (location.pathname === '/settings/platform-license') return ['platform-license'];
    return [];
  };

  // Determine which sidebar to show and its config
  const getSidebarConfig = () => {
    if (location.pathname.startsWith('/patches')) {
      return { title: 'Patches', items: [] }; // Items not needed for Patches (using separate tabs and categories)
    }
    if (location.pathname.startsWith('/assets')) {
      return { title: 'Assets', items: [] }; // Items not needed for Assets (using separate tabs and categories)
    }
    if (location.pathname.startsWith('/vulnerability')) {
      return { title: 'Vulnerability', items: vulnerabilityMenuItems };
    }
    if (location.pathname.startsWith('/jobs')) {
      return { title: 'Jobs', items: jobsMenuItems };
    }
    if (location.pathname.startsWith('/hub') || location.pathname.startsWith('/discovery') || location.pathname.startsWith('/settings')) {
      return { title: 'Settings', items: settingsMenuItems };
    }
    return null;
  };

  const sidebarConfig = getSidebarConfig();

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
        {/* Logo and Title */}
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

        {/* Location Dropdown */}
        <Select
          defaultValue="Gurugram"
          style={{ width: 140, marginRight: '32px', flexShrink: 0 }}
          options={[
            { value: 'gurugram', label: 'Gurugram' },
            { value: 'delhi', label: 'Delhi' },
            { value: 'mumbai', label: 'Mumbai' },
          ]}
        />

        {/* Top Navigation Menu */}
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

        {/* Right Side Icons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexShrink: 0,
        }}>
          <Input
            placeholder="Search"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: 240 }}
          />
          <SettingOutlined
            onClick={() => navigate('/settings')}
            style={{ fontSize: '18px', cursor: 'pointer', color: '#595959', flexShrink: 0 }}
          />
          <NotificationDropdown />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar
              style={{ backgroundColor: '#52c41a', cursor: 'pointer', flexShrink: 0 }}
              size="default"
            >
              CH
            </Avatar>
          </Dropdown>
        </div>
      </Header>

      <Layout style={{ marginTop: '60px' }}>
        {/* Left Sidebar */}
        {sidebarConfig && (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            trigger={null}
            width={224}
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
            }}
          >
            <div
              style={{
                padding: collapsed ? '12px 0' : '16px 24px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: collapsed ? 'center' : 'space-between',
                alignItems: 'center',
              }}
            >
              {!collapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{sidebarConfig.title}</span>
                  {sidebarConfig.title === 'Assets' && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => setCategoryManagementModalOpen(true)}
                      title="Edit Categories"
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </div>
              )}
              {collapsed ? (
                <MenuUnfoldOutlined
                  onClick={() => setCollapsed(false)}
                  style={{ cursor: 'pointer', fontSize: '16px' }}
                />
              ) : (
                <MenuFoldOutlined
                  onClick={() => setCollapsed(true)}
                  style={{ cursor: 'pointer', fontSize: '16px' }}
                />
              )}
            </div>

            {/* Patches Section: Show tabs and OS categories */}
            {sidebarConfig?.title === 'Patches' && (
              <>
                {/* Patch Tabs Menu */}
                <Menu
                  mode="inline"
                  selectedKeys={[selectedPatchTab]}
                  items={patchesTabItems as any}
                  onClick={({ key }) => handlePatchTabChange(key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                />

                {/* OS Categories Label */}
                <div
                  style={{
                    padding: '12px 24px',
                    borderBottom: '1px solid #f0f0f0',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: '#8c8c8c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Categories
                </div>

                {/* OS Categories Menu */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <Menu
                    mode="inline"
                    selectedKeys={getSelectedSideMenu()}
                    items={patchOsCategories as any}
                    onClick={({ key }) => handleSideMenuClick(key)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      paddingTop: '8px',
                    }}
                  />
                </div>
              </>
            )}

            {/* Assets Section: Show tabs and categories */}
            {sidebarConfig?.title === 'Assets' && (
              <>
                {/* Asset Tabs Menu */}
                <Menu
                  mode="inline"
                  selectedKeys={[selectedAssetTab]}
                  items={[
                    { key: 'all-assets', icon: <FolderOutlined />, label: 'All Assets' },
                    { key: 'software-inventory', icon: <FileTextOutlined />, label: 'Software Inventory' },
                    { key: 'software-license', icon: <DesktopOutlined />, label: 'Software License' },
                    { key: 'os-license', icon: <DesktopOutlined />, label: 'OS License' },
                  ]}
                  onClick={({ key }) => handleAssetTabChange(key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                />

                {/* Categories Label */}
                <div
                  style={{
                    padding: '12px 24px',
                    borderBottom: '1px solid #f0f0f0',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: '#8c8c8c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Categories
                </div>

                {/* Categories Menu */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <Menu
                    mode="inline"
                    selectedKeys={getSelectedSideMenu()}
                    openKeys={expandedAssetSections}
                    items={getCategoryMenuItems() as any}
                    onClick={({ key }) => handleSideMenuClick(key)}
                    onOpenChange={(keys) => setExpandedAssetSections(keys as string[])}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      paddingTop: '8px',
                    }}
                  />
                </div>
              </>
            )}

            {/* Other Sections (Vulnerability, Jobs, Settings): Show regular menu */}
            {sidebarConfig?.title !== 'Assets' && sidebarConfig?.title !== 'Patches' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Menu
                  mode="inline"
                  selectedKeys={getSelectedSideMenu()}
                  openKeys={expandedMenus}
                  items={sidebarConfig?.items as any}
                  onClick={({ key }) => handleSideMenuClick(key)}
                  onOpenChange={(keys) => setExpandedMenus(keys as string[])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    paddingTop: '8px',
                  }}
                />
              </div>
            )}

          </Sider>
        )}

        {/* Main Content */}
        <Layout
          style={{
            marginLeft: sidebarConfig ? (collapsed ? 80 : 224) : 0,
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
    </Layout>
  );
};
