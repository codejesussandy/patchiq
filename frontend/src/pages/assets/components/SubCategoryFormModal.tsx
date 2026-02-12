import {
  Modal,
  Form,
  Input,
  Select,
} from 'antd';
import type { FormInstance } from 'antd';
import type { SubCategory } from '../../../types/asset.types';

interface SubCategoryFormModalProps {
  open: boolean;
  editing: SubCategory | null;
  form: FormInstance;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const SubCategoryFormModal = ({ open, editing, form, onSubmit, onCancel }: SubCategoryFormModalProps) => {
  return (
    <Modal
      title={editing ? 'Edit Sub-Category' : 'Create Sub-Category'}
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Basic Information</h4>
          <Form.Item label="Sub-Category Name" name="name" rules={[{ required: true, message: 'Please enter sub-category name' }]}>
            <Input placeholder="e.g., Windows PCs" />
          </Form.Item>
          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please enter description' }]}>
            <Input.TextArea placeholder="e.g., Windows-based desktop computers" rows={3} />
          </Form.Item>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Organization</h4>
          <Form.Item label="Business Unit" name="businessUnit" rules={[{ required: true, message: 'Please enter business unit' }]}>
            <Input placeholder="e.g., Engineering" />
          </Form.Item>
          <Form.Item label="Department" name="department" rules={[{ required: true, message: 'Please enter department' }]}>
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
          <Form.Item label="Criticality" name="criticality" rules={[{ required: true, message: 'Please select criticality level' }]}>
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
  );
};
