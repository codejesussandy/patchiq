import { UploadOutlined } from '@ant-design/icons';
import { Modal, Upload, Typography } from 'antd';
import type { UploadFile } from 'antd';

const { Text } = Typography;

interface BulkAddModalProps {
  open: boolean;
  fileList: UploadFile[];
  onFileChange: (files: UploadFile[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const BulkAddModal = ({ open, fileList, onFileChange, onSubmit, onCancel }: BulkAddModalProps) => (
  <Modal
    title="Bulk Add Patches"
    open={open}
    onCancel={onCancel}
    onOk={onSubmit}
    okText="Upload and Import"
    width={600}
  >
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary">Upload a CSV file with patch data</Text>
    </div>
    <Upload.Dragger
      fileList={fileList}
      beforeUpload={(file) => { onFileChange([file]); return false; }}
      onRemove={() => onFileChange([])}
      accept=".csv,.xlsx,.xls"
    >
      <p className="ant-upload-drag-icon">
        <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
      </p>
      <p className="ant-upload-text">Click or drag file to this area to upload</p>
      <p className="ant-upload-hint">Support for CSV, XLSX, or XLS files. File should contain patch information.</p>
    </Upload.Dragger>
  </Modal>
);
