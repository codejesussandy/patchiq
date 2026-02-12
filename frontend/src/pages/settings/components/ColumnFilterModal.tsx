import { Modal, Form, Checkbox, Button } from 'antd';
import type { FormInstance } from 'antd';

interface ColumnConfig {
  key: string;
  label: string;
}

interface ColumnFilterModalProps {
  open: boolean;
  form: FormInstance;
  columns: ColumnConfig[];
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const ColumnFilterModal = ({
  open,
  form,
  columns,
  onApply,
  onReset,
  onClose,
}: ColumnFilterModalProps) => (
  <Modal
    title="Show/Hide Columns"
    open={open}
    onCancel={onClose}
    footer={[
      <Button key="reset" onClick={onReset}>
        Show All
      </Button>,
      <Button key="cancel" onClick={onClose}>
        Cancel
      </Button>,
      <Button key="apply" type="primary" onClick={onApply}>
        Apply
      </Button>,
    ]}
    width={400}
  >
    <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
      {columns.map((col) => (
        <Form.Item key={col.key} name={col.key} valuePropName="checked" style={{ marginBottom: '16px' }}>
          <Checkbox>{col.label}</Checkbox>
        </Form.Item>
      ))}
    </Form>
  </Modal>
);
