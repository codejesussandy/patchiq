import { useState } from 'react';
import {
  PlusOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  App,
  Layout,
  Button,
  Menu,
  Modal,
  Form,
  Tooltip,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  useCategories, useSubCategories,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateSubCategory, useUpdateSubCategory, useDeleteSubCategory,
} from '../../../hooks/useAssets';
import type { Category, SubCategory } from '../../../types/asset.types';
import { CategoryFormModal } from './CategoryFormModal';
import { SubCategoryFormModal } from './SubCategoryFormModal';

const { Sider } = Layout;

interface CategoryManagerProps {
  onCategorySelect: (categoryId: string | null) => void;
  selectedCategoryId: string | null;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onCategorySelect,
  selectedCategoryId,
  collapsed = false,
  onCollapse,
}) => {
  const { message } = App.useApp();

  const { data: categoriesData } = useCategories();
  const { data: subCategoriesData } = useSubCategories();
  const categories: Category[] = categoriesData || [];
  const subCategories: SubCategory[] = subCategoriesData || [];

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const createSubCategoryMutation = useCreateSubCategory();
  const updateSubCategoryMutation = useUpdateSubCategory();
  const deleteSubCategoryMutation = useDeleteSubCategory();

  const [createCategoryModalVisible, setCreateCategoryModalVisible] = useState(false);
  const [createSubCategoryModalVisible, setCreateSubCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string | null>(null);
  const [categoryForm] = Form.useForm();
  const [subCategoryForm] = Form.useForm();

  const handleCreateCategory = async (values: Record<string, unknown>) => {
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data: values as Partial<Category> });
        message.success('Category updated successfully');
      } else {
        await createCategoryMutation.mutateAsync(values as Omit<Category, 'id'>);
        message.success('Category created successfully');
      }
      setCreateCategoryModalVisible(false);
      setEditingCategory(null);
      categoryForm.resetFields();
    } catch {
      message.error('Failed to save category');
    }
  };

  const handleCreateSubCategory = async (values: Record<string, unknown>) => {
    try {
      if (!selectedParentCategoryId) {
        message.error('Please select a parent category');
        return;
      }
      const subCategoryData = { ...values, categoryId: selectedParentCategoryId };
      if (editingSubCategory) {
        await updateSubCategoryMutation.mutateAsync({ id: editingSubCategory.id, data: subCategoryData as Partial<SubCategory> });
        message.success('Sub-category updated successfully');
      } else {
        await createSubCategoryMutation.mutateAsync(subCategoryData as Omit<SubCategory, 'id'>);
        message.success('Sub-category created successfully');
      }
      setCreateSubCategoryModalVisible(false);
      setEditingSubCategory(null);
      subCategoryForm.resetFields();
    } catch {
      message.error('Failed to save sub-category');
    }
  };

  const handleDeleteCategory = (id: string) => {
    Modal.confirm({
      title: 'Delete Category',
      content: 'Are you sure you want to delete this category? All sub-categories will also be deleted.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteCategoryMutation.mutateAsync(id);
          message.success('Category deleted successfully');
          if (selectedCategoryId === id) onCategorySelect(null);
        } catch {
          message.error('Failed to delete category');
        }
      },
    });
  };

  const handleDeleteSubCategory = (id: string) => {
    Modal.confirm({
      title: 'Delete Sub-Category',
      content: 'Are you sure you want to delete this sub-category?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteSubCategoryMutation.mutateAsync(id);
          message.success('Sub-category deleted successfully');
        } catch {
          message.error('Failed to delete sub-category');
        }
      },
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue(category);
    setCreateCategoryModalVisible(true);
  };

  const handleEditSubCategory = (subCategory: SubCategory, parentId: string) => {
    setEditingSubCategory(subCategory);
    setSelectedParentCategoryId(parentId);
    subCategoryForm.setFieldsValue(subCategory);
    setCreateSubCategoryModalVisible(true);
  };

  const handleOpenCreateSubCategory = (categoryId: string) => {
    setSelectedParentCategoryId(categoryId);
    setEditingSubCategory(null);
    subCategoryForm.resetFields();
    setCreateSubCategoryModalVisible(true);
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'all-assets',
      label: 'All Assets',
      style: {
        fontWeight: selectedCategoryId === null ? 'bold' : 'normal',
        backgroundColor: selectedCategoryId === null ? '#f0f0f0' : 'transparent',
      },
      onClick: () => onCategorySelect(null),
      className: selectedCategoryId === null ? 'ant-menu-item-selected' : '',
    },
    ...categories.map((cat) => ({
      key: cat.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>{cat.name}</span>
          <span onClick={(e) => e.stopPropagation()} onClickCapture={(e) => e.stopPropagation()}>
            <Dropdown
              menu={{
                items: [
                  { key: 'edit', icon: <EditOutlined />, label: 'Edit', onClick: (e) => { e.domEvent.stopPropagation(); handleEditCategory(cat); } },
                  { key: 'add-sub', icon: <PlusOutlined />, label: 'Add Sub-category', onClick: (e) => { e.domEvent.stopPropagation(); handleOpenCreateSubCategory(cat.id); } },
                  { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true, onClick: (e) => { e.domEvent.stopPropagation(); handleDeleteCategory(cat.id); } },
                ],
              }}
              trigger={['click']}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
            </Dropdown>
          </span>
        </div>
      ),
      style: {
        fontWeight: selectedCategoryId === cat.id ? 'bold' : 'normal',
        backgroundColor: selectedCategoryId === cat.id ? '#f0f0f0' : 'transparent',
      },
      onClick: () => onCategorySelect(cat.id),
      children: subCategories
        .filter((sub) => sub.categoryId === cat.id)
        .map((subCat) => ({
          key: `${cat.id}-${subCat.id}`,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '12px' }}>
              <span>{subCat.name}</span>
              <span onClick={(e) => e.stopPropagation()} onClickCapture={(e) => e.stopPropagation()}>
                <Dropdown
                  menu={{
                    items: [
                      { key: 'edit', icon: <EditOutlined />, label: 'Edit', onClick: (e) => { e.domEvent.stopPropagation(); handleEditSubCategory(subCat, cat.id); } },
                      { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true, onClick: (e) => { e.domEvent.stopPropagation(); handleDeleteSubCategory(subCat.id); } },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                </Dropdown>
              </span>
            </div>
          ),
        })),
    })),
  ];

  return (
    <>
      <Sider
        width={220}
        collapsible
        collapsedWidth={0}
        collapsed={collapsed}
        onCollapse={onCollapse}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
      >
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Categories</h3>
            <Tooltip title="Create Category">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => { setEditingCategory(null); categoryForm.resetFields(); setCreateCategoryModalVisible(true); }}
              />
            </Tooltip>
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedCategoryId ? [selectedCategoryId] : ['all-assets']}
            items={menuItems}
            style={{ borderRight: 'none' }}
          />
        </div>
      </Sider>

      <CategoryFormModal
        open={createCategoryModalVisible}
        editing={editingCategory}
        form={categoryForm}
        onSubmit={handleCreateCategory}
        onCancel={() => { setCreateCategoryModalVisible(false); setEditingCategory(null); categoryForm.resetFields(); }}
      />

      <SubCategoryFormModal
        open={createSubCategoryModalVisible}
        editing={editingSubCategory}
        form={subCategoryForm}
        onSubmit={handleCreateSubCategory}
        onCancel={() => { setCreateSubCategoryModalVisible(false); setEditingSubCategory(null); subCategoryForm.resetFields(); }}
      />
    </>
  );
};
