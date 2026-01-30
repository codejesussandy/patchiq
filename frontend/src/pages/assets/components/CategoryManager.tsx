import { useState, useEffect } from 'react';
import {
  App,
  Layout,
  Button,
  Menu,
  Modal,
  Form,
  Input,
  Select,
  Tooltip,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { categoryService } from '../../../services/category.service';
import type { Category, SubCategory } from '../../../types/asset.types';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [createCategoryModalVisible, setCreateCategoryModalVisible] = useState(false);
  const [createSubCategoryModalVisible, setCreateSubCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string | null>(null);
  const [categoryForm] = Form.useForm();
  const [subCategoryForm] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getSubCategories(),
      ]);
      setCategories(cats);
      setSubCategories(subs);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  const handleCreateCategory = async (values: any) => {
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, values);
        message.success('Category updated successfully');
      } else {
        await categoryService.createCategory(values);
        message.success('Category created successfully');
      }
      fetchCategories();
      setCreateCategoryModalVisible(false);
      setEditingCategory(null);
      categoryForm.resetFields();
    } catch (error) {
      message.error('Failed to save category');
    }
  };

  const handleCreateSubCategory = async (values: any) => {
    try {
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
      setCreateSubCategoryModalVisible(false);
      setEditingSubCategory(null);
      subCategoryForm.resetFields();
    } catch (error) {
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
          if (selectedCategoryId === id) {
            onCategorySelect(null);
          }
          fetchCategories();
        } catch (error) {
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
        } catch (error) {
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
      key: null as any,
      label: 'All Assets',
      style: {
        fontWeight: selectedCategoryId === null ? 'bold' : 'normal',
        backgroundColor: selectedCategoryId === null ? '#f0f0f0' : 'transparent',
      },
      onClick: () => onCategorySelect(null),
    },
    ...categories.map((cat) => ({
      key: cat.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>{cat.name}</span>
          <span
            onClick={(e) => e.stopPropagation()}
            onClickCapture={(e) => e.stopPropagation()}
          >
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'edit',
                    icon: <EditOutlined />,
                    label: 'Edit',
                    onClick: (e) => {
                      e.domEvent.stopPropagation();
                      handleEditCategory(cat);
                    },
                  },
                  {
                    key: 'add-sub',
                    icon: <PlusOutlined />,
                    label: 'Add Sub-category',
                    onClick: (e) => {
                      e.domEvent.stopPropagation();
                      handleOpenCreateSubCategory(cat.id);
                    },
                  },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: 'Delete',
                    danger: true,
                    onClick: (e) => {
                      e.domEvent.stopPropagation();
                      handleDeleteCategory(cat.id);
                    },
                  },
                ],
              }}
              trigger={['click']}
             >
               <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
               }} />
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
              <span
                onClick={(e) => e.stopPropagation()}
                onClickCapture={(e) => e.stopPropagation()}
              >
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'edit',
                        icon: <EditOutlined />,
                        label: 'Edit',
                        onClick: (e) => {
                          e.domEvent.stopPropagation();
                          handleEditSubCategory(subCat, cat.id);
                        },
                      },
                      {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: 'Delete',
                        danger: true,
                        onClick: (e) => {
                          e.domEvent.stopPropagation();
                          handleDeleteSubCategory(subCat.id);
                        },
                      },
                    ],
                  }}
                   trigger={['click']}
                 >
                   <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => {
                     e.stopPropagation();
                     e.preventDefault();
                   }} />
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
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Categories</h3>
            <Tooltip title="Create Category">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingCategory(null);
                  categoryForm.resetFields();
                  setCreateCategoryModalVisible(true);
                }}
              />
            </Tooltip>
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedCategoryId ? [selectedCategoryId] : []}
            items={menuItems}
            style={{ borderRight: 'none' }}
          />
        </div>
      </Sider>

      {/* Create/Edit Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        open={createCategoryModalVisible}
        onOk={() => categoryForm.submit()}
        onCancel={() => {
          setCreateCategoryModalVisible(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCreateCategory}
        >
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Basic Information</h4>
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
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <Input.TextArea placeholder="e.g., Desktop and laptop computers for office use" rows={3} />
            </Form.Item>

            <Form.Item
              label="Color"
              name="color"
              rules={[{ required: true, message: 'Please select a color' }]}
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Management</h4>
            <Form.Item label="Owner" name="owner">
              <Input placeholder="e.g., John Smith" />
            </Form.Item>

            <Form.Item label="Manager" name="manager">
              <Input placeholder="e.g., Sarah Johnson" />
            </Form.Item>

            <Form.Item label="Priority" name="priority">
              <Select placeholder="Select priority">
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Configuration</h4>
            <Form.Item label="Budget" name="budget">
              <Input placeholder="e.g., $50,000" />
            </Form.Item>

            <Form.Item label="Maintenance Schedule" name="maintenanceSchedule">
              <Input placeholder="e.g., Monthly, Weekly, Quarterly" />
            </Form.Item>

            <Form.Item label="SLA Target" name="slaTarget">
              <Input placeholder="e.g., 99.5%" />
            </Form.Item>

            <Form.Item label="Tags" name="tags">
              <Select mode="tags" placeholder="Add tags" />
            </Form.Item>

            <Form.Item label="Compliance Required" name="complianceRequired" valuePropName="checked">
              <input type="checkbox" />
            </Form.Item>

            <Form.Item label="Compliance Tags" name="complianceTags">
              <Select mode="tags" placeholder="e.g., ISO27001, GDPR, SOC2" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Create/Edit Sub-Category Modal */}
      <Modal
        title={editingSubCategory ? 'Edit Sub-Category' : 'Create Sub-Category'}
        open={createSubCategoryModalVisible}
        onOk={() => subCategoryForm.submit()}
        onCancel={() => {
          setCreateSubCategoryModalVisible(false);
          setEditingSubCategory(null);
          subCategoryForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={subCategoryForm}
          layout="vertical"
          onFinish={handleCreateSubCategory}
        >
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Basic Information</h4>
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
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <Input.TextArea placeholder="e.g., Windows-based desktop computers" rows={3} />
            </Form.Item>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Organization</h4>
            <Form.Item
              label="Business Unit"
              name="businessUnit"
              rules={[{ required: true, message: 'Please enter business unit' }]}
            >
              <Input placeholder="e.g., Engineering" />
            </Form.Item>

            <Form.Item
              label="Department"
              name="department"
              rules={[{ required: true, message: 'Please enter department' }]}
            >
              <Input placeholder="e.g., IT" />
            </Form.Item>

            <Form.Item label="Owner" name="owner">
              <Input placeholder="e.g., Robert Lee" />
            </Form.Item>

            <Form.Item label="Manager" name="manager">
              <Input placeholder="e.g., Sarah Johnson" />
            </Form.Item>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Priority & Status</h4>
            <Form.Item
              label="Criticality"
              name="criticality"
              rules={[{ required: true, message: 'Please select criticality level' }]}
            >
              <Select placeholder="Select criticality">
                <Select.Option value="Critical">Critical</Select.Option>
                <Select.Option value="High">High</Select.Option>
                <Select.Option value="Medium">Medium</Select.Option>
                <Select.Option value="Low">Low</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="Priority" name="priority">
              <Select placeholder="Select priority">
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
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Service Level</h4>
            <Form.Item label="Uptime Target" name="uptime">
              <Input placeholder="e.g., 99.5%" />
            </Form.Item>

            <Form.Item label="Maintenance Window" name="maintenanceWindow">
              <Input placeholder="e.g., Every 2nd Sunday, Monthly, Rolling maintenance" />
            </Form.Item>

            <Form.Item label="Tags" name="tags">
              <Select mode="tags" placeholder="Add tags" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};
