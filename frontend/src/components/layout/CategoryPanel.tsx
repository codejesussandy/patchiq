import {
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Menu, Button, Tooltip } from 'antd';
import type { Category, SubCategory } from '../../types/asset.types';
import {
  CATEGORY_PANEL_WIDTH,
  patchOsCategories,
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
        <span style={{ fontWeight: 600, fontSize: '16px', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Categories
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {sidebarTitle === 'Assets' && (
            <>
              <Tooltip title="Add Category">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={onOpenCategoryModal}
                />
              </Tooltip>
              <Tooltip title="Manage Categories">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={onOpenCategoryModal}
                />
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Category Items */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {sidebarTitle === 'Patches' && (
          <Menu
            mode="inline"
            selectedKeys={selectedSideMenu}
            items={patchOsCategories as MenuProps['items']}
            onClick={({ key }) => onSideMenuClick(key)}
            style={{ background: 'transparent', border: 'none', paddingTop: '4px' }}
          />
        )}

        {sidebarTitle === 'Assets' && (
          <Menu
            mode="inline"
            selectedKeys={selectedSideMenu}
            openKeys={expandedAssetSections}
            items={getCategoryMenuItems() as MenuProps['items']}
            onClick={({ key }) => onSideMenuClick(key)}
            onOpenChange={(keys) => onExpandedSectionsChange(keys as string[])}
            style={{ background: 'transparent', border: 'none', paddingTop: '4px' }}
          />
        )}

        {/* Show "No categories" message if empty */}
        {sidebarTitle === 'Assets' && getCategoryMenuItems().length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#bfbfbf', fontSize: '13px' }}>
            No categories yet.
            <br />
            <Button
              type="link"
              size="small"
              onClick={onOpenCategoryModal}
              style={{ padding: 0, marginTop: 4 }}
            >
              Add one
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export { CATEGORY_PANEL_WIDTH };
