import {
  Modal,
  Form,
  Input,
  Select,
} from 'antd';
import type { FormInstance } from 'antd';
import type { Category } from '../../../types/asset.types';

interface CategoryFormModalProps {
  open: boolean;
  editing: Category | null;
  form: FormInstance;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}

export const CategoryFormModal = ({ open, editing, form, onSubmit, onCancel }: CategoryFormModalProps) => {
  return (
    <Modal
      title={editing ? 'Edit Category' : 'Create Category'}
      open={open}
      onOk={() => form.submit()}
      onCancel={onCancel}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ marginBottom: '12px', fontWeight: 600 }}>Basic Information</h4>
          <Form.Item label="Category Name" name="name" rules={[{ required: true, message: 'Please enter category name' }]}>
            <Input placeholder="e.g., Workstations" />
          </Form.Item>
          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please enter description' }]}>
            <Input.TextArea placeholder="e.g., Desktop and laptop computers for office use" rows={3} />
          </Form.Item>
          <Form.Item label="Color" name="color" rules={[{ required: true, message: 'Please select a color' }]}>
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
  );
};
