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
      data-testid="confirm-modal"
      footer={[
        <Button key="cancel" onClick={onCancel} data-testid="confirm-modal-cancel">
          {cancelText}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger={danger}
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
          data-testid="confirm-modal-confirm"
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
