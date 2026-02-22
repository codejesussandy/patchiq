import { useState, useRef, useCallback } from 'react';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Layout, Menu, Tooltip } from 'antd';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  patchesTabItems,
  assetTabItems,
  type MenuItem,
} from './menuConfig';

const { Sider } = Layout;

const TRANSITION = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

/* shadcn-inspired overrides for Ant Menu inside the sidebar */
const sidebarMenuCSS = `
  .shadcn-sidebar .ant-menu {
    background: transparent !important;
    border-inline-end: none !important;
    font-size: 13px !important;
  }
  .shadcn-sidebar .ant-menu-item,
  .shadcn-sidebar .ant-menu-submenu-title {
    margin: 2px 8px !important;
    padding-left: 12px !important;
    border-radius: 8px !important;
    height: 40px !important;
    line-height: 40px !important;
    color: #64748b !important;
    transition: all 0.15s ease !important;
  }
  .shadcn-sidebar .ant-menu-item:hover,
  .shadcn-sidebar .ant-menu-submenu-title:hover {
    background: #f1f5f9 !important;
    color: #0f172a !important;
  }
  .shadcn-sidebar .ant-menu-item-selected {
    background: #f1f5f9 !important;
    color: #0f172a !important;
    font-weight: 500 !important;
  }
  .shadcn-sidebar .ant-menu-item-selected::after {
    display: none !important;
  }
  .shadcn-sidebar .ant-menu-submenu-selected > .ant-menu-submenu-title {
    color: #0f172a !important;
    font-weight: 500 !important;
  }
  .shadcn-sidebar .ant-menu-item .ant-menu-item-icon,
  .shadcn-sidebar .ant-menu-submenu-title .ant-menu-item-icon,
  .shadcn-sidebar .ant-menu-item .anticon,
  .shadcn-sidebar .ant-menu-submenu-title .anticon {
    font-size: 20px !important;
    color: inherit !important;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease !important;
  }
  .shadcn-sidebar .ant-menu-item:hover .ant-menu-item-icon,
  .shadcn-sidebar .ant-menu-submenu-title:hover .ant-menu-item-icon,
  .shadcn-sidebar .ant-menu-item:hover .anticon,
  .shadcn-sidebar .ant-menu-submenu-title:hover .anticon {
    color: #3b82f6 !important;
    transform: scale(1.15) !important;
  }
  .shadcn-sidebar .ant-menu-sub {
    background: transparent !important;
  }
  .shadcn-sidebar .ant-menu-sub .ant-menu-item {
    padding-left: 40px !important;
    font-size: 12.5px !important;
    height: 32px !important;
    line-height: 32px !important;
  }
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title {
    padding: 0 !important;
    padding-inline: 0 !important;
    margin: 2px 10px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: #64748b !important;
    width: 44px !important;
    height: 40px !important;
    line-height: 40px !important;
    border-radius: 8px !important;
    text-indent: 0 !important;
    overflow: visible !important;
  }
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item .ant-menu-title-content,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title .ant-menu-title-content {
    display: none !important;
  }
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item .anticon,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item .ant-menu-item-icon,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title .anticon,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title .ant-menu-item-icon {
    font-size: 20px !important;
    color: #475569 !important;
    margin: 0 !important;
    padding: 0 !important;
    position: static !important;
    min-width: auto !important;
    line-height: 1 !important;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease !important;
    transform: none !important;
  }
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item:hover,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title:hover {
    background: #f1f5f9 !important;
    color: #0f172a !important;
  }
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item:hover .anticon,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item:hover .ant-menu-item-icon,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title:hover .anticon,
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-submenu-title:hover .ant-menu-item-icon {
    color: #3b82f6 !important;
    transform: scale(1.15) !important;
  }
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item-selected {
    color: #0f172a !important;
    background: #e2e8f0 !important;
  }
  .shadcn-sidebar .ant-menu-inline-collapsed .ant-menu-item-selected .anticon {
    color: #0f172a !important;
  }

  .shadcn-sidebar::-webkit-scrollbar {
    width: 4px;
  }
  .shadcn-sidebar::-webkit-scrollbar-track {
    background: transparent;
  }
  .shadcn-sidebar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 4px;
  }
  .shadcn-sidebar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
`;

interface SidebarConfig {
  title: string;
  items: MenuItem[];
}

interface NavigationSidebarProps {
  sidebarConfig: SidebarConfig;
  selectedPatchTab: string;
  selectedAssetTab: string;
  selectedSideMenu: string[];
  expandedMenus: string[];
  pinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  onPatchTabChange: (key: string) => void;
  onAssetTabChange: (key: string) => void;
  onSideMenuClick: (key: string) => void;
  onExpandedMenusChange: (keys: string[]) => void;
}

export const NavigationSidebar = ({
  sidebarConfig,
  selectedPatchTab,
  selectedAssetTab,
  selectedSideMenu,
  expandedMenus,
  pinned: pinnedProp,
  onPinnedChange,
  onPatchTabChange,
  onAssetTabChange,
  onSideMenuClick,
  onExpandedMenusChange,
}: NavigationSidebarProps) => {
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [pinnedInternal, setPinnedInternal] = useState(false);
  const pinned = pinnedProp ?? pinnedInternal;
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExpanded = pinned || hoverExpanded;

  const handleSiderMouseEnter = useCallback(() => {
    if (pinned) return;
    hoverTimerRef.current = setTimeout(() => {
      setHoverExpanded(true);
    }, 150);
  }, [pinned]);

  const handleSiderMouseLeave = useCallback(() => {
    if (pinned) return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverExpanded(false);
  }, [pinned]);

  const togglePin = () => {
    const newPinned = !pinned;
    if (onPinnedChange) {
      onPinnedChange(newPinned);
    } else {
      setPinnedInternal(newPinned);
    }
    if (newPinned) {
      setHoverExpanded(false);
    }
  };

  return (
    <Sider
      role="navigation"
      aria-label="Primary navigation"
      className="shadcn-sidebar"
      collapsed={!isExpanded}
      trigger={null}
      width={SIDEBAR_EXPANDED_WIDTH}
      collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
      onMouseEnter={handleSiderMouseEnter}
      onMouseLeave={handleSiderMouseLeave}
      style={{
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        position: 'fixed',
        left: 0,
        top: 60,
        bottom: 0,
        overflow: 'hidden',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        transition: `width 0.25s cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      <style>{sidebarMenuCSS}</style>

      {/* Sidebar Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'space-between' : 'center',
          minHeight: 44,
          transition: TRANSITION,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: '13px',
            color: '#0f172a',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            opacity: isExpanded ? 1 : 0,
            maxWidth: isExpanded ? 160 : 0,
            transition: `opacity 0.2s ease, max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {sidebarConfig.title}
        </span>
        <Tooltip title={pinned ? 'Unpin sidebar' : 'Pin sidebar'} placement="right">
          <span
            onClick={togglePin}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePin(); } }}
            role="button"
            tabIndex={0}
            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
            style={{
              cursor: 'pointer',
              fontSize: '15px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 6,
              flexShrink: 0,
              color: pinned ? '#3b82f6' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
          >
            {pinned ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          </span>
        </Tooltip>
      </div>

      {/* Patches Section */}
      {sidebarConfig.title === 'Patches' && (
        <Menu
          mode="inline"
          inlineCollapsed={!isExpanded}
          selectedKeys={[selectedPatchTab]}
          items={patchesTabItems as MenuProps['items']}
          onClick={({ key }) => onPatchTabChange(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 4 }}
        />
      )}

      {/* Assets Section */}
      {sidebarConfig.title === 'Assets' && (
        <Menu
          mode="inline"
          inlineCollapsed={!isExpanded}
          selectedKeys={[selectedAssetTab]}
          items={assetTabItems as MenuProps['items']}
          onClick={({ key }) => onAssetTabChange(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 4 }}
        />
      )}

      {/* Other Sections (Vulnerability, Settings) */}
      {sidebarConfig.title !== 'Assets' && sidebarConfig.title !== 'Patches' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Menu
            mode="inline"
            inlineCollapsed={!isExpanded}
            selectedKeys={selectedSideMenu}
            openKeys={isExpanded ? expandedMenus : []}
            items={sidebarConfig.items as MenuProps['items']}
            onClick={({ key }) => onSideMenuClick(key)}
            onOpenChange={(keys) => onExpandedMenusChange(keys as string[])}
            style={{ background: 'transparent', border: 'none', marginTop: 4 }}
          />
        </div>
      )}
    </Sider>
  );
};

/** Get the current sidebar width based on expansion state and config presence */
export const getSidebarWidth = (hasSidebar: boolean, isExpanded: boolean): number => {
  if (!hasSidebar) return 0;
  return isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
};
