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

  const handleCategoryManagementClose = () => {
    setCategoryManagementModalOpen(false);
    fetchCategories();
  };

  const topMenuItems = [
    { key: '/dashboard', label: 'Dashboard' },
    { key: '/patches', label: 'Patches' },
    { key: '/assets', label: 'Assets' },
    { key: '/discovery', label: 'Discovery' },
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

  const discoveryMenuItems: MenuItem[] = [
    {
      key: 'ip-discovery',
      icon: <UserOutlined />,
      label: 'IP Discovery',
    },
    {
      key: 'device-credentials',
      icon: <CreditCardOutlined />,
      label: 'Device Credentials',
    },
    {
      key: 'agents',
      icon: <EnvironmentOutlined />,
      label: 'Agents',
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
      key: 'branch-location',
      icon: <EnvironmentOutlined />,
      label: 'Branch Location',
    },
    {
      key: 'user-management',
      icon: <UserOutlined />,
      label: 'User Management',
    },
    {
      key: 'policies',
      icon: <CreditCardOutlined />,
      label: 'Policies',
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
    // Discovery
    else if (key === 'ip-discovery') navigate('/discovery/ip-discovery');
    else if (key === 'device-credentials') navigate('/discovery/device-credentials');
    else if (key === 'agents') navigate('/discovery/agents');
    // Jobs
    else if (key === 'software-jobs') navigate('/jobs/software-jobs/catalog');
    else if (key === 'configuration-jobs') navigate('/jobs/configuration-jobs');
    else if (key === 'patch-jobs') navigate('/jobs/patch-jobs');
    else if (key === 'vulnerability-jobs') navigate('/jobs/vulnerability-jobs');
    // Settings
    else if (key === 'branch-location') navigate('/settings/branch-location');
    else if (key === 'user-management') navigate('/settings/user-management');
    else if (key === 'policies') navigate('/settings/policies');
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
    if (location.pathname.startsWith('/discovery')) return ['/discovery'];
    if (location.pathname.startsWith('/jobs')) return ['/jobs'];
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
    // Discovery
    if (location.pathname === '/discovery/ip-discovery') return ['ip-discovery'];
    if (location.pathname === '/discovery/device-credentials') return ['device-credentials'];
    if (location.pathname === '/discovery/agents') return ['agents'];
    // Jobs
    if (location.pathname.startsWith('/jobs/software-jobs')) return ['software-jobs'];
    if (location.pathname === '/jobs/configuration-jobs') return ['configuration-jobs'];
    if (location.pathname === '/jobs/patch-jobs') return ['patch-jobs'];
    if (location.pathname === '/jobs/vulnerability-jobs') return ['vulnerability-jobs'];
    // Settings
    if (location.pathname === '/settings/branch-location') return ['branch-location'];
    if (location.pathname === '/settings/user-management') return ['user-management'];
    if (location.pathname === '/settings/policies') return ['policies'];
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
    if (location.pathname.startsWith('/discovery')) {
      return { title: 'Discovery', items: discoveryMenuItems };
    }
    if (location.pathname.startsWith('/jobs')) {
      return { title: 'Jobs', items: jobsMenuItems };
    }
    if (location.pathname.startsWith('/settings')) {
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

            {/* Other Sections (Discovery, Settings): Show regular menu */}
            {sidebarConfig?.title !== 'Assets' && sidebarConfig?.title !== 'Patches' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Menu
                  mode="inline"
                  selectedKeys={getSelectedSideMenu()}
                  openKeys={expandedAssetSections}
                  items={sidebarConfig?.items as any}
                  onClick={({ key }) => handleSideMenuClick(key)}
                  onOpenChange={(keys) => setExpandedAssetSections(keys as string[])}
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
