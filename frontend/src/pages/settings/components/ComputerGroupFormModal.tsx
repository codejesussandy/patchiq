import { Button, Form, Input, Modal, Select } from 'antd';
import type { FormInstance } from 'antd';

interface Endpoint {
  id: string;
  name: string;
  ipAddress?: string;
}

interface ComputerGroupFormModalProps {
  open: boolean;
  mode: 'view' | 'edit' | 'create';
  form: FormInstance;
  endpoints: Endpoint[];
  endpointsLoading: boolean;
  editingGroup: { createdBy: string; createdAt: string } | null;
  formatDate: (dateString: string) => string;
  onClose: () => void;
  onSubmit: () => void;
  onSwitchToEdit: () => void;
}

export const ComputerGroupFormModal = ({
  open, mode, form, endpoints, endpointsLoading,
  editingGroup, formatDate, onClose, onSubmit, onSwitchToEdit,
}: ComputerGroupFormModalProps) => (
  <Modal
    title={
      mode === 'create'
        ? 'Create Computer Group'
        : mode === 'edit'
        ? 'Edit Computer Group'
        : 'View Computer Group'
    }
    open={open}
    onCancel={onClose}
    width={600}
    footer={
      mode !== 'view'
        ? [
            <Button key="cancel" onClick={onClose}>Cancel</Button>,
            <Button key="submit" type="primary" onClick={onSubmit}>
              {mode === 'create' ? 'Create' : 'Update'}
            </Button>,
          ]
        : [
            <Button key="close" onClick={onClose}>Close</Button>,
            <Button key="edit" type="primary" onClick={onSwitchToEdit}>Edit</Button>,
          ]
    }
  >
    <Form form={form} layout="vertical" disabled={mode === 'view'}>
      <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please enter a name' }]}>
        <Input placeholder="Enter computer group name" />
      </Form.Item>
      <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please enter a description' }]}>
        <Input.TextArea placeholder="Enter computer group description" rows={3} />
      </Form.Item>
      <Form.Item label="Endpoints" name="endpoints" rules={[{ required: true, message: 'Please select at least one endpoint' }]}>
        <Select
          mode="multiple"
          placeholder="Select endpoints to add to this group"
          loading={endpointsLoading}
          optionLabelProp="label"
          options={endpoints.map((endpoint) => ({
            label: `${endpoint.name} (${endpoint.ipAddress || 'N/A'})`,
            value: endpoint.id,
          }))}
        />
      </Form.Item>
      {mode === 'view' && editingGroup && (
        <>
          <Form.Item label="Created By">
            <Input value={editingGroup.createdBy} disabled />
          </Form.Item>
          <Form.Item label="Created At">
            <Input value={formatDate(editingGroup.createdAt)} disabled />
          </Form.Item>
        </>
      )}
    </Form>
  </Modal>
);
