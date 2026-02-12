import { Modal, Form, Input, Row, Col, Switch, Divider, Select, Button } from 'antd';
import type { FormInstance } from 'antd';

interface IntegrationFormModalProps {
  open: boolean;
  mode: 'view' | 'edit' | 'create';
  form: FormInstance;
  onSubmit: () => void;
  onClose: () => void;
  onSwitchToEdit: () => void;
}

export const IntegrationFormModal = ({
  open, mode, form, onSubmit, onClose, onSwitchToEdit,
}: IntegrationFormModalProps) => (
  <Modal
    title={mode === 'create' ? 'Create Integration' : mode === 'edit' ? 'Edit Integration' : 'View Integration'}
    open={open}
    onCancel={onClose}
    width={700}
    footer={
      mode !== 'view' ? [
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={onSubmit}>{mode === 'create' ? 'Create' : 'Update'} Integration</Button>,
      ] : [
        <Button key="close" onClick={onClose}>Close</Button>,
        <Button key="edit" type="primary" onClick={onSwitchToEdit}>Edit</Button>,
      ]
    }
  >
    <Form form={form} layout="vertical" autoComplete="off">
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="Integration Name" name="name" rules={[{ required: true, message: 'Please enter integration name' }]}>
            <Input placeholder="Enter integration name" disabled={mode === 'view'} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please enter description' }]}>
            <Input.TextArea placeholder="Enter description" disabled={mode === 'view'} rows={3} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Integration Type" name="type" rules={[{ required: true, message: 'Please select integration type' }]}>
            <Input placeholder="Enter type" disabled={mode === 'view'} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>Status</div>
            <Form.Item name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch disabled={mode === 'view'} />
            </Form.Item>
          </div>
        </Col>
      </Row>

      <Divider>Email Settings</Divider>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="Recipients" name="recipients">
            <Select
              mode="multiple"
              placeholder="Select Contacts"
              disabled={mode === 'view'}
              options={[
                { label: 'Admin', value: 'admin@infraon.com' },
                { label: 'Support', value: 'support@infraon.com' },
                { label: 'Team Lead', value: 'teamlead@infraon.com' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Modal>
);
