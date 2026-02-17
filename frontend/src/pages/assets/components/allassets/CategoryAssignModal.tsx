import { Modal, Form, Select, Tag } from 'antd';
import type { Asset } from '../../../../types/asset.types';

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  criticality?: string;
}

interface CategoryAssignModalProps {
  open: boolean;
  asset: Asset | null;
  categories: Category[];
  subCategories: SubCategory[];
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  onSubCategoryChange: (value: string | null) => void;
  onSave: () => void;
  onClose: () => void;
}

export const CategoryAssignModal = ({
  open, asset, categories, subCategories,
  selectedCategory, selectedSubCategory,
  onCategoryChange, onSubCategoryChange, onSave, onClose,
}: CategoryAssignModalProps) => {
  return (
    <Modal
      title={`Assign Category - ${asset?.name || ''}`}
      open={open}
      onOk={onSave}
      onCancel={onClose}
      width={500}
    >
      <Form layout="vertical">
        <Form.Item label="Category" required>
          <Select
            placeholder="Select a category"
            value={selectedCategory}
            onChange={(value) => { onCategoryChange(value); onSubCategoryChange(null); }}
            options={categories.map((cat) => ({
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag color={cat.color || 'blue'} />
                  <span>{cat.name}</span>
                </div>
              ),
              value: cat.id,
            }))}
            allowClear
          />
        </Form.Item>

        {selectedCategory && (
          <Form.Item label="Sub-Category">
            <Select
              placeholder="Select a sub-category"
              value={selectedSubCategory}
              onChange={onSubCategoryChange}
              options={subCategories
                .filter((sub) => sub.categoryId === selectedCategory)
                .map((sub) => ({
                  label: (
                    <div>
                      <span>{sub.name}</span>
                      {sub.criticality && <Tag style={{ marginLeft: '8px' }}>{sub.criticality}</Tag>}
                    </div>
                  ),
                  value: sub.id,
                }))}
              allowClear
            />
          </Form.Item>
        )}

        {asset && selectedCategory && (
          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', marginTop: '12px' }}>
            <div style={{ fontSize: '16px', marginBottom: '4px' }}>
              <strong>Asset:</strong> {asset.name}
            </div>
            {selectedCategory && (
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                <strong>Category:</strong> {categories.find((c) => c.id === selectedCategory)?.name}
              </div>
            )}
            {selectedSubCategory && (
              <div style={{ fontSize: '16px' }}>
                <strong>Sub-Category:</strong> {subCategories.find((s) => s.id === selectedSubCategory)?.name}
              </div>
            )}
          </div>
        )}
      </Form>
    </Modal>
  );
};
