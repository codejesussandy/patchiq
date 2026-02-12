import { useEffect, useRef } from 'react';
import { Modal, Form, Button } from 'antd';
import type { FormInstance } from 'antd';

export interface FormModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  loading?: boolean;
  initialValues?: Record<string, unknown>;
  width?: number;
  children: React.ReactNode;
  okText?: string;
  form?: FormInstance;
}

export function FormModal({
  title,
  open,
  onClose,
  onSubmit,
  loading = false,
  initialValues,
  width = 600,
  children,
  okText = 'Submit',
  form: externalForm,
}: FormModalProps) {
  const [internalForm] = Form.useForm();
  const form = externalForm ?? internalForm;
  const firstInputRef = useRef<boolean>(false);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      form.resetFields();
      firstInputRef.current = false;
    }
  }, [open, form]);

  // Set initial values when modal opens
  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [open, initialValues, form]);

  // Focus first field on open
  useEffect(() => {
    if (open && !firstInputRef.current) {
      firstInputRef.current = true;
      // Delay to allow modal animation to complete
      const timer = setTimeout(() => {
        const firstInput = document.querySelector<HTMLElement>(
          '.ant-modal:not(.ant-modal-hidden) .ant-form-item-control-input input, .ant-modal:not(.ant-modal-hidden) .ant-form-item-control-input textarea'
        );
        firstInput?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch {
      // Form validation error — Ant Design shows field-level errors automatically
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      width={width}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          {okText}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        style={{ marginTop: '16px' }}
      >
        {children}
      </Form>
    </Modal>
  );
}
