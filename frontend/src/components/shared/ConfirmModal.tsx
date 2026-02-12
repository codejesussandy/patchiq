import { Modal, Button } from 'antd';

export interface ConfirmModalProps {
  title: string;
  description: string | React.ReactNode;
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export function ConfirmModal({
  title,
  description,
  open,
  onConfirm,
  onCancel,
  loading = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {cancelText}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger={danger}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>,
      ]}
    >
      <div style={{ padding: '8px 0' }}>
        {typeof description === 'string' ? <p>{description}</p> : description}
      </div>
    </Modal>
  );
}
