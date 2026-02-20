import { useState } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  WindowsOutlined,
  AppleOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu, Button, Tooltip, theme } from 'antd';
import type { Category, SubCategory } from '../../types/asset.types';
import {
  CATEGORY_PANEL_WIDTH,
  type MenuItem,
} from './menuConfig';

interface CategoryPanelProps {
  sidebarTitle: string;
  sidebarWidth: number;
  categories: Category[];
  subCategories: SubCategory[];
  selectedSideMenu: string[];
  expandedAssetSections: string[];
  onSideMenuClick: (key: string) => void;
  onExpandedSectionsChange: (keys: string[]) => void;
  onOpenCategoryModal: () => void;
}

const osItems = [
  { key: 'os-windows', label: 'Windows', icon: WindowsOutlined, color: '#0078D4', bg: '#E8F4FD' },
  { key: 'os-macos', label: 'macOS', icon: AppleOutlined, color: '#555555', bg: '#F3F3F3' },
  { key: 'os-linux', label: 'Linux', icon: DesktopOutlined, color: '#E95420', bg: '#FEF0EA' },
];

export const CategoryPanel = ({
  sidebarTitle,
  sidebarWidth,
  categories,
  subCategories,
  selectedSideMenu,
  expandedAssetSections,
  onSideMenuClick,
  onExpandedSectionsChange,
  onOpenCategoryModal,
}: CategoryPanelProps) => {
  const { token } = theme.useToken();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

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

  return (
    <div
      style={{
        position: 'fixed',
        left: sidebarWidth,
        top: 60,
        bottom: 0,
        width: CATEGORY_PANEL_WIDTH,
        background: '#fafafa',
        borderRight: '1px solid #f0f0f0',
        overflow: 'auto',
        zIndex: 50,
        transition: 'left 0.2s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px 6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '11px', color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Platforms
        </span>
        {sidebarTitle === 'Assets' && (
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Add Category">
              <Button type="text" size="small" icon={<PlusOutlined style={{ fontSize: 11 }} />}
                onClick={onOpenCategoryModal}
                style={{ width: 22, height: 22, borderRadius: 4, color: token.colorTextTertiary }} />
            </Tooltip>
            <Tooltip title="Manage Categories">
              <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 11 }} />}
                onClick={onOpenCategoryModal}
                style={{ width: 22, height: 22, borderRadius: 4, color: token.colorTextTertiary }} />
            </Tooltip>
          </div>
        )}
      </div>

      {/* OS Category Cards */}
      <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {osItems.map((item) => {
          const isSelected = selectedSideMenu.includes(item.key);
          const isHovered = hoveredKey === item.key;
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              onClick={() => onSideMenuClick(item.key)}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isSelected ? item.bg : isHovered ? '#f0f0f0' : 'transparent',
                border: `1px solid ${isSelected ? item.color + '40' : 'transparent'}`,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSelected ? item.color : item.bg,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <Icon style={{ fontSize: 13, color: isSelected ? '#fff' : item.color }} />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? item.color : token.colorText,
                  transition: 'color 0.15s ease',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dynamic categories for Assets */}
      {sidebarTitle === 'Assets' && getCategoryMenuItems().length > 0 && (
        <>
          <div style={{ padding: '10px 12px 4px', marginTop: 4 }}>
            <span style={{ fontWeight: 600, fontSize: '11px', color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Custom Groups
            </span>
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedSideMenu}
            openKeys={expandedAssetSections}
            items={getCategoryMenuItems() as MenuProps['items']}
            onClick={({ key }) => onSideMenuClick(key)}
            onOpenChange={(keys) => onExpandedSectionsChange(keys as string[])}
            style={{ background: 'transparent', border: 'none', padding: '0 4px' }}
          />
        </>
      )}
    </div>
  );
};

export { CATEGORY_PANEL_WIDTH };
