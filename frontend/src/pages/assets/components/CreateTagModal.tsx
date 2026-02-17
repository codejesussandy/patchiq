import React from 'react';
import { App,
  Modal, Form, Input, Select, Checkbox, Button, Space, Divider } from 'antd';
import { useCreateTag, useUpdateTag } from '../../../hooks/useAssets';
import type { Tag as TagType } from '../../../types/asset.types';
import { sanitizeInput } from '../../../utils/sanitize';

interface CreateTagModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (tag: TagType) => void;
  tag?: TagType | null;
}

const colorOptions = [
  { value: 'red', label: 'Red' },
  { value: 'volcano', label: 'Volcano' },
  { value: 'orange', label: 'Orange' },
  { value: 'gold', label: 'Gold' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'lime', label: 'Lime' },
  { value: 'green', label: 'Green' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'blue', label: 'Blue' },
  { value: 'geekblue', label: 'Geek Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'magenta', label: 'Magenta' },
];

const priorityOptions = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const complianceTagOptions = [
  { value: 'SOC2', label: 'SOC2' },
  { value: 'ISO27001', label: 'ISO27001' },
  { value: 'GDPR', label: 'GDPR' },
  { value: 'HIPAA', label: 'HIPAA' },
  { value: 'PCI-DSS', label: 'PCI-DSS' },
];

const CreateTagModal: React.FC<CreateTagModalProps> = ({
  visible,
  onClose,
  onSuccess,
  tag,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [mode, setMode] = React.useState<'quick' | 'full'>('quick');

  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const loading = createTagMutation.isPending || updateTagMutation.isPending;

  React.useEffect(() => {
    if (visible && tag) {
      form.setFieldsValue({
        name: tag.name,
        description: tag.description,
        color: tag.color,
        icon: tag.icon,
        owner: tag.owner,
        manager: tag.manager,
        priority: tag.priority,
        status: tag.status,
        budget: tag.budget,
        complianceRequired: tag.complianceRequired,
        complianceTags: tag.complianceTags,
      });
    } else {
      form.resetFields();
    }
  }, [visible, tag, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      // Sanitize string fields to prevent XSS
      const sanitizedValues = {
        ...values,
        name: sanitizeInput(values.name as string),
        description: sanitizeInput(values.description as string || ''),
        icon: values.icon ? sanitizeInput(values.icon as string) : values.icon,
        owner: values.owner ? sanitizeInput(values.owner as string) : values.owner,
        manager: values.manager ? sanitizeInput(values.manager as string) : values.manager,
        budget: values.budget ? sanitizeInput(values.budget as string) : values.budget,
      };

      let newTag: TagType;
      if (tag) {
        newTag = await updateTagMutation.mutateAsync({ id: tag.id, data: sanitizedValues as Partial<TagType> });
        message.success('Tag updated successfully');
      } else {
        newTag = await createTagMutation.mutateAsync(sanitizedValues as Omit<TagType, 'id' | 'assetCount' | 'createdAt'>);
        message.success('Tag created successfully');
      }
      onSuccess(newTag);
      form.resetFields();
      onClose();
    } catch {
      message.error(tag ? 'Failed to update tag' : 'Failed to create tag');
    }
  };

  const quickModeFields = (
    <>
      <Form.Item
        name="name"
        label="Tag Name"
        rules={[
          { required: true, message: 'Tag name is required' },
          { max: 255, message: 'Tag name must be 255 characters or less' },
        ]}
      >
        <Input placeholder="e.g., Production, Development" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
        rules={[{ max: 500, message: 'Description must be 500 characters or less' }]}
      >
        <Input.TextArea placeholder="Brief description of this tag" rows={3} />
      </Form.Item>

      <Form.Item name="color" label="Color" initialValue="blue">
        <Select options={colorOptions} />
      </Form.Item>
    </>
  );

  const fullModeFields = (
    <>
      {/* Basic Info Section */}
      <Divider>Basic Information</Divider>
      <Form.Item
        name="name"
        label="Tag Name"
        rules={[
          { required: true, message: 'Tag name is required' },
          { max: 255, message: 'Tag name must be 255 characters or less' },
        ]}
      >
        <Input placeholder="e.g., Production, Development" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
        rules={[{ max: 500, message: 'Description must be 500 characters or less' }]}
      >
        <Input.TextArea placeholder="Detailed description of this tag" rows={3} />
      </Form.Item>

      <Form.Item name="color" label="Color" initialValue="blue">
        <Select options={colorOptions} />
      </Form.Item>

      <Form.Item name="icon" label="Icon" initialValue="">
        <Input placeholder="Icon name (e.g., fire, code, warning)" />
      </Form.Item>

      {/* Management Section */}
      <Divider>Management</Divider>
      <Form.Item name="owner" label="Owner">
        <Input placeholder="Owner name or team" />
      </Form.Item>

      <Form.Item name="manager" label="Manager">
        <Input placeholder="Manager name" />
      </Form.Item>

      <Form.Item name="priority" label="Priority" initialValue="Medium">
        <Select options={priorityOptions} />
      </Form.Item>

      <Form.Item name="status" label="Status" initialValue="Active">
        <Select options={statusOptions} />
      </Form.Item>

      {/* Compliance Section */}
      <Divider>Compliance</Divider>
      <Form.Item name="complianceRequired" label="Compliance Required" valuePropName="checked">
        <Checkbox>This tag requires compliance tracking</Checkbox>
      </Form.Item>

      <Form.Item name="complianceTags" label="Compliance Tags">
        <Select
          mode="multiple"
          options={complianceTagOptions}
          placeholder="Select applicable compliance standards"
        />
      </Form.Item>

      {/* Budget Section */}
      <Form.Item name="budget" label="Budget Allocation">
        <Input placeholder="e.g., $100,000" />
      </Form.Item>
    </>
  );

  return (
    <Modal
      title={tag ? 'Edit Tag' : 'Create New Tag'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      {!tag && (
        <div style={{ marginBottom: 16 }}>
          <Button.Group>
            <Button
              type={mode === 'quick' ? 'primary' : 'default'}
              onClick={() => setMode('quick')}
            >
              Quick Create
            </Button>
            <Button
              type={mode === 'full' ? 'primary' : 'default'}
              onClick={() => setMode('full')}
            >
              Advanced
            </Button>
          </Button.Group>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {mode === 'quick' ? quickModeFields : fullModeFields}

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {tag ? 'Update Tag' : 'Create Tag'}
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateTagModal;
