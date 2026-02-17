import { InboxOutlined } from '@ant-design/icons';
import { Modal, Button, Upload } from 'antd';

const { Dragger } = Upload;

interface UserImportModalProps {
  open: boolean;
  loading: boolean;
  importFile: File | null;
  onClose: () => void;
  onImportFile: (file: File) => false;
  onRemoveFile: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onDownloadSample: () => void;
}

export const UserImportModal = ({
  open,
  loading,
  importFile,
  onClose,
  onImportFile,
  onRemoveFile,
  onSubmit,
  onReset,
  onDownloadSample,
}: UserImportModalProps) => (
  <Modal
    title="Import Users"
    open={open}
    onCancel={onClose}
    width={600}
    footer={[
      <Button key="reset" onClick={onReset}>
        Reset
      </Button>,
      <Button key="cancel" onClick={onClose}>
        Cancel
      </Button>,
      <Button key="import" type="primary" loading={loading} onClick={onSubmit}>
        Import
      </Button>,
    ]}
  >
    <div style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontWeight: 500, fontSize: '14px' }}>Download Sample CSV</span>
      </div>
      <a onClick={onDownloadSample} style={{ color: '#1890ff' }}>
        sample_user.csv
      </a>
    </div>

    <div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontWeight: 500, fontSize: '14px' }}>Select CSV File</span>
      </div>
      <Dragger
        accept=".csv"
        maxCount={1}
        beforeUpload={onImportFile}
        fileList={importFile ? [{ uid: '-1', name: importFile.name, status: 'done' as const }] : []}
        onRemove={onRemoveFile}
      >
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>
          <InboxOutlined style={{ color: '#1890ff' }} />
        </p>
        <p style={{ fontSize: '14px', color: '#000' }}>
          Click or drag file to this area to upload
        </p>
        <p style={{ fontSize: '16px', color: '#8c8c8c', marginTop: '8px' }}>
          Please select CSV file containing user data
        </p>
        <p style={{ fontSize: '16px', color: '#8c8c8c' }}>
          Support for a single upload.
        </p>
      </Dragger>
    </div>
  </Modal>
);
