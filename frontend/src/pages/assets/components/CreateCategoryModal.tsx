import { useState } from 'react';
import {
  App,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  Tag,
} from 'antd';
import type { TabsProps } from 'antd';
import { categoryService } from '../../../services/category.service';
import type { Category, SubCategory } from '../../../types/asset.types';

interface CreateCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (category: Category | SubCategory) => void;
}

interface CategoryFormValues {
  categoryName: string;
  categoryDescription?: string;
}

interface SubCategoryFormValues {
  parentCategory: string;
  subCategoryName: string;
  subCategoryDescription?: string;
  criticality?: string;
  businessUnit?: string;
  department?: string;
}

const COLORS = ['blue', 'cyan', 'geekblue', 'gold', 'green', 'lime', 'magenta', 'orange', 'purple', 'red', 'volcano', 'yellow'];

const CRITICALITY_OPTIONS = [
  { label: 'Critical', value: 'Critical' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('category');
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);

  const handleCreateCategory = async (values: CategoryFormValues) => {
    setLoading(true);
    try {
      const categoryData: Category = {
        id: `cat-${Date.now()}`,
        name: values.categoryName,
        description: values.categoryDescription || '',
        color: selectedColor,
        assetCount: 0,
      };

      await categoryService.createCategory(categoryData);
      message.success('Category created successfully');
      form.resetFields();
      setSelectedColor(COLORS[0]);
      onSuccess(categoryData);
      onClose();
    } catch (error) {
      message.error('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubCategory = async (values: SubCategoryFormValues) => {
    setLoading(true);
    try {
      const subCategoryData: SubCategory = {
        id: `subcat-${Date.now()}`,
        categoryId: values.parentCategory,
        name: values.subCategoryName,
        description: values.subCategoryDescription || '',
        criticality: (values.criticality || 'Medium') as SubCategory['criticality'],
        businessUnit: values.businessUnit || '',
        department: values.department || '',
        assetCount: 0,
      };

      await categoryService.createSubCategory(subCategoryData);
      message.success('Sub-category created successfully');
      form.resetFields();
      onSuccess(subCategoryData);
      onClose();
    } catch (error) {
      message.error('Failed to create sub-category');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (values: CategoryFormValues | SubCategoryFormValues) => {
    if (activeTab === 'category') {
      await handleCreateCategory(values as CategoryFormValues);
    } else {
      await handleCreateSubCategory(values as SubCategoryFormValues);
    }
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'category',
      label: 'Create Category',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            label="Category Name"
            name="categoryName"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g., Workstations, Servers, Mobile Devices" />
          </Form.Item>

          <Form.Item
            label="Description (Optional)"
            name="categoryDescription"
          >
            <Input.TextArea
              placeholder="Brief description of this category"
              rows={3}
            />
          </Form.Item>

          <Form.Item label="Color">
            <Select
              value={selectedColor}
              onChange={setSelectedColor}
              options={COLORS.map((color) => ({
                label: <Tag color={color}>{color}</Tag>,
                value: color,
              }))}
            />
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'subcategory',
      label: 'Create Sub-Category',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            label="Parent Category"
            name="parentCategory"
            rules={[{ required: true, message: 'Please select parent category' }]}
          >
            <Select placeholder="Select a category" />
          </Form.Item>

          <Form.Item
            label="Sub-Category Name"
            name="subCategoryName"
            rules={[{ required: true, message: 'Please enter sub-category name' }]}
          >
            <Input placeholder="e.g., Windows PCs, Linux Servers, iOS Devices" />
          </Form.Item>

          <Form.Item
            label="Description (Optional)"
            name="subCategoryDescription"
          >
            <Input.TextArea
              placeholder="Brief description of this sub-category"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Criticality Level"
            name="criticality"
          >
            <Select
              placeholder="Select criticality"
              options={CRITICALITY_OPTIONS}
              defaultValue="Medium"
            />
          </Form.Item>

          <Form.Item
            label="Business Unit (Optional)"
            name="businessUnit"
          >
            <Input placeholder="e.g., Engineering, Operations, Sales" />
          </Form.Item>

          <Form.Item
            label="Department (Optional)"
            name="department"
          >
            <Input placeholder="e.g., IT, DevOps, Infrastructure" />
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <Modal
      title="Create Category"
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      loading={loading}
      width={500}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Modal>
  );
};
