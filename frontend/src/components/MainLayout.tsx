import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Grid, Layout } from 'antd';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categoryService } from '../services/category.service';
import { settingsService } from '../services/settings.service';
import type { Category, SubCategory } from '../types/asset.types';
import { CategoryManagementModal } from './CategoryManagementModal';
import { AIChatPanel } from './chat/AIChatPanel';
import {
  HeaderBar,
  NavigationSidebar,
  CategoryPanel,
  vulnerabilityMenuItems,
  settingsMenuItems,
  sideMenuRoutes,
  routeToSideMenuKey,
  assetTabRoutes,
  patchTabRoutes,
  osFilterMap,
  osParamToKey,
  SIDEBAR_COLLAPSED_WIDTH,
  CATEGORY_PANEL_WIDTH,
} from './layout';

const { Content } = Layout;

interface MainLayoutProps {
  children: ReactNode;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(user?.organizationId || null);

  // UI state
  const [selectedAssetTab, setSelectedAssetTab] = useState<string>('all-assets');
  const [selectedPatchTab, setSelectedPatchTab] = useState<string>('all-patches');
  const [expandedAssetSections, setExpandedAssetSections] = useState<string[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [categoryManagementModalOpen, setCategoryManagementModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────

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

  // ── Route sync effects ─────────────────────────────────────────

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

  // ── Navigation handlers ────────────────────────────────────────

  const handleSideMenuClick = (key: string) => {
    if (key.startsWith('os-')) {
      const os = key.replace('os-', '');
      setTimeout(() => setSearchParams({ os: osFilterMap[os] || os }), 0);
    } else if (key.startsWith('cat-')) {
      const parts = key.split('-');
      if (parts.length === 2) {
        setTimeout(() => setSearchParams({ category: parts[1] }), 0);
      } else if (parts.length === 3) {
        setTimeout(() => setSearchParams({ category: parts[1], subcategory: parts[2] }), 0);
      }
    } else if (sideMenuRoutes[key]) {
      navigate(sideMenuRoutes[key]);
    }
  };

  const handleAssetTabChange = (tab: string) => {
    setSelectedAssetTab(tab);
    setSearchParams({});
    if (assetTabRoutes[tab]) navigate(assetTabRoutes[tab]);
  };

  const handlePatchTabChange = (tab: string) => {
    setSelectedPatchTab(tab);
    setSearchParams({});
    if (patchTabRoutes[tab]) navigate(patchTabRoutes[tab]);
  };

  // ── Derived state ──────────────────────────────────────────────

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
      if (osFilter && osParamToKey[osFilter]) return [osParamToKey[osFilter]];
      return [];
    }
    if (location.pathname.startsWith('/assets')) {
      if (categoryId && subCategoryId) return [`cat-${categoryId}-${subCategoryId}`];
      if (categoryId) return [`cat-${categoryId}`];
      return [];
    }
    // Look up in reverse route map
    const key = routeToSideMenuKey[location.pathname];
    return key ? [key] : [];
  };

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
  const isTabletOrSmaller = !screens.lg;
  const showSidebar = sidebarConfig && !isTabletOrSmaller;
  const showCategoryPanel = (sidebarConfig?.title === 'Assets' || sidebarConfig?.title === 'Patches') && !isTabletOrSmaller;
  const sidebarWidth = showSidebar ? SIDEBAR_COLLAPSED_WIDTH : 0;
  const categoryPanelWidth = showCategoryPanel ? CATEGORY_PANEL_WIDTH : 0;
  const contentMarginLeft = sidebarWidth + categoryPanelWidth;

  // ── Render ─────────────────────────────────────────────────────

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <HeaderBar
        selectedTopMenu={getSelectedTopMenu()}
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        onOrgSwitch={setSelectedOrgId}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((prev) => !prev)}
      />

      <Layout style={{ marginTop: '60px' }}>
        {showSidebar && (
          <NavigationSidebar
            sidebarConfig={sidebarConfig}
            selectedPatchTab={selectedPatchTab}
            selectedAssetTab={selectedAssetTab}
            selectedSideMenu={getSelectedSideMenu()}
            expandedMenus={expandedMenus}
            onPatchTabChange={handlePatchTabChange}
            onAssetTabChange={handleAssetTabChange}
            onSideMenuClick={handleSideMenuClick}
            onExpandedMenusChange={setExpandedMenus}
          />
        )}

        {showCategoryPanel && (
          <CategoryPanel
            sidebarTitle={sidebarConfig!.title}
            sidebarWidth={sidebarWidth}
            categories={categories}
            subCategories={subCategories}
            selectedSideMenu={getSelectedSideMenu()}
            expandedAssetSections={expandedAssetSections}
            onSideMenuClick={handleSideMenuClick}
            onExpandedSectionsChange={setExpandedAssetSections}
            onOpenCategoryModal={() => setCategoryManagementModalOpen(true)}
          />
        )}

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

      <CategoryManagementModal
        open={categoryManagementModalOpen}
        onClose={() => {
          setCategoryManagementModalOpen(false);
          fetchCategories();
        }}
      />

      <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </Layout>
  );
};
