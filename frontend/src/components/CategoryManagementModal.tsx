import { useState, useEffect } from 'react';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import {
  App,
  Modal,
  Button,
  Form,
  Input,
  Select,
  Tree,
  Dropdown,
} from 'antd';
import { categoryService } from '../services/category.service';
import type { Category, SubCategory } from '../types/asset.types';

interface CategoryManagementModalProps {
  open: boolean;
  onClose: () => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  open,
  onClose,
}) => {
  const { message } = App.useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [subCategoryModalVisible, setSubCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string | null>(null);
  const [categoryForm] = Form.useForm();
  const [subCategoryForm] = Form.useForm();

  const fetchCategories = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getSubCategories(),
      ]);
      setCategories(cats);
      setSubCategories(subs);
    } catch {
      message.error('Failed to fetch categories');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleSaveCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, values);
        message.success('Category updated successfully');
      } else {
        await categoryService.createCategory(values);
        message.success('Category created successfully');
      }
      fetchCategories();
      setEditModalVisible(false);
      setEditingCategory(null);
      categoryForm.resetFields();
    } catch {
      message.error('Failed to save category');
    }
  };

  const handleSaveSubCategory = async () => {
    try {
      const values = await subCategoryForm.validateFields();
      if (!selectedParentCategoryId) {
        message.error('Please select a parent category');
        return;
      }

      const subCategoryData = {
        ...values,
        categoryId: selectedParentCategoryId,
      };

      if (editingSubCategory) {
        await categoryService.updateSubCategory(editingSubCategory.id, subCategoryData);
        message.success('Sub-category updated successfully');
      } else {
        await categoryService.createSubCategory(subCategoryData);
        message.success('Sub-category created successfully');
      }
      fetchCategories();
      setSubCategoryModalVisible(false);
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
          await categoryService.deleteCategory(id);
          message.success('Category deleted successfully');
          fetchCategories();
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
          await categoryService.deleteSubCategory(id);
          message.success('Sub-category deleted successfully');
          fetchCategories();
        } catch {
          message.error('Failed to delete sub-category');
        }
      },
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue(category);
    setEditModalVisible(true);
  };

  const handleEditSubCategory = (subCategory: SubCategory, parentId: string) => {
    setEditingSubCategory(subCategory);
    setSelectedParentCategoryId(parentId);
    subCategoryForm.setFieldsValue(subCategory);
    setSubCategoryModalVisible(true);
  };

  const handleOpenCreateSubCategory = (categoryId: string) => {
    setSelectedParentCategoryId(categoryId);
    setEditingSubCategory(null);
    subCategoryForm.resetFields();
    setSubCategoryModalVisible(true);
  };

  const treeData = categories.map((cat) => ({
    title: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span>{cat.name}</span>
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'edit',
                  icon: <EditOutlined />,
                  label: 'Edit',
                  onClick: () => handleEditCategory(cat),
                },
                {
                  key: 'add-sub',
                  icon: <PlusOutlined />,
                  label: 'Add Sub-category',
                  onClick: () => handleOpenCreateSubCategory(cat.id),
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: 'Delete',
                  danger: true,
                  onClick: () => handleDeleteCategory(cat.id),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </span>
      </div>
    ),
    key: cat.id,
    children: subCategories
      .filter((sub) => sub.categoryId === cat.id)
      .map((subCat) => ({
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '12px' }}>
            <span>{subCat.name}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: 'Edit',
                      onClick: () => handleEditSubCategory(subCat, cat.id),
                    },
                    { type: 'divider' },
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: 'Delete',
                      danger: true,
                      onClick: () => handleDeleteSubCategory(subCat.id),
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} />
              </Dropdown>
            </span>
          </div>
        ),
        key: `${cat.id}-${subCat.id}`,
      })),
  }));

  return (
    <>
      {/* Main Management Modal */}
      <Modal
        title="Manage Categories"
        open={open}
        onCancel={onClose}
        width={800}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          <Button
            key="add-category"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCategory(null);
              categoryForm.resetFields();
              setEditModalVisible(true);
            }}
          >
            Add Category
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#666', fontSize: '12px' }}>
            Manage categories and sub-categories. Hover over items to see edit/delete options.
          </p>
        </div>
        <Tree
          treeData={treeData}
          defaultExpandAll
          showIcon={false}
        />
      </Modal>

      {/* Edit/Create Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        open={editModalVisible}
        onOk={handleSaveCategory}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        width={700}
      >
        <Form
          form={categoryForm}
          layout="vertical"
        >
          <Form.Item
            label="Category Name"
            name="name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g., Workstations" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea placeholder="e.g., Desktop and laptop computers for office use" rows={2} />
          </Form.Item>

          <Form.Item
            label="Color"
            name="color"
          >
            <Select placeholder="Select color">
              <Select.Option value="blue">Blue</Select.Option>
              <Select.Option value="green">Green</Select.Option>
              <Select.Option value="red">Red</Select.Option>
              <Select.Option value="orange">Orange</Select.Option>
              <Select.Option value="purple">Purple</Select.Option>
              <Select.Option value="cyan">Cyan</Select.Option>
              <Select.Option value="magenta">Magenta</Select.Option>
              <Select.Option value="volcano">Volcano</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Owner" name="owner">
            <Input placeholder="e.g., John Smith" />
          </Form.Item>

          <Form.Item label="Status" name="status">
            <Select placeholder="Select status">
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit/Create Sub-Category Modal */}
      <Modal
        title={editingSubCategory ? 'Edit Sub-Category' : 'Create Sub-Category'}
        open={subCategoryModalVisible}
        onOk={handleSaveSubCategory}
        onCancel={() => {
          setSubCategoryModalVisible(false);
          setEditingSubCategory(null);
          subCategoryForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={subCategoryForm}
          layout="vertical"
        >
          <Form.Item
            label="Sub-Category Name"
            name="name"
            rules={[{ required: true, message: 'Please enter sub-category name' }]}
          >
            <Input placeholder="e.g., Windows PCs" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea placeholder="e.g., Windows-based desktop computers" rows={2} />
          </Form.Item>

          <Form.Item
            label="Criticality"
            name="criticality"
          >
            <Select placeholder="Select criticality">
              <Select.Option value="Critical">Critical</Select.Option>
              <Select.Option value="High">High</Select.Option>
              <Select.Option value="Medium">Medium</Select.Option>
              <Select.Option value="Low">Low</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Status" name="status">
            <Select placeholder="Select status">
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
