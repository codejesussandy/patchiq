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
  onPatchTabChange,
  onAssetTabChange,
  onSideMenuClick,
  onExpandedMenusChange,
}: NavigationSidebarProps) => {
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
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
    setPinned((prev) => !prev);
    if (!pinned) {
      setHoverExpanded(false);
    }
  };

  return (
    <Sider
      role="navigation"
      aria-label="Primary navigation"
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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePin(); } }}
              role="button"
              tabIndex={0}
              aria-label="Unpin sidebar"
              style={{ cursor: 'pointer', fontSize: '16px', color: '#1677ff' }}
            />
          ) : (
            <MenuUnfoldOutlined
              onClick={togglePin}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePin(); } }}
              role="button"
              tabIndex={0}
              aria-label="Pin sidebar"
              style={{ cursor: 'pointer', fontSize: '16px' }}
            />
          )}
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
          style={{ background: 'transparent', border: 'none' }}
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
          style={{ background: 'transparent', border: 'none' }}
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
            style={{ background: 'transparent', border: 'none', paddingTop: '8px' }}
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
