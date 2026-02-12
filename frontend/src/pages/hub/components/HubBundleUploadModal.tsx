import { CodeOutlined, InboxOutlined } from '@ant-design/icons';
import {
  Modal,
  Upload,
  Space,
  Card,
  Divider,
  Typography,
} from 'antd';

const { Text, Title } = Typography;

interface HubBundleUploadModalProps {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onBundleUpload: (file: File) => false | void;
}

export const HubBundleUploadModal = ({
  open,
  uploading,
  onClose,
  onBundleUpload,
}: HubBundleUploadModalProps) => (
  <Modal
    title={
      <Space>
        <CodeOutlined style={{ color: '#52c41a' }} />
        <span>Upload Script Bundle</span>
      </Space>
    }
    open={open}
    onCancel={onClose}
    footer={null}
    width={600}
  >
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Upload.Dragger
        accept=".tar.gz,.tgz"
        showUploadList={false}
        beforeUpload={onBundleUpload}
        disabled={uploading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ fontSize: 48, color: uploading ? '#999' : '#52c41a' }} />
        </p>
        <p className="ant-upload-text">
          {uploading ? 'Uploading...' : 'Click or drag bundle file to upload'}
        </p>
        <p className="ant-upload-hint">
          Upload a .tar.gz bundle containing manifest.json and installation scripts
        </p>
      </Upload.Dragger>

      <Divider />

      <Card size="small" style={{ textAlign: 'left', background: '#f9f9f9' }}>
        <Title level={5}>Bundle Structure</Title>
        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`package-bundle/
  manifest.json       # Required: Package metadata
  scripts/
    install.sh        # Required: Installation script
    update.sh         # Optional: Update script
    rollback.sh       # Optional: Rollback script
    uninstall.sh      # Optional: Uninstall script
  files/
    package.deb       # Optional: Package files`}
          </pre>
        </Text>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Text type="secondary">
          Script bundles provide full control over installation behavior.
          The agent will execute the appropriate script based on the operation type.
        </Text>
      </div>
    </div>
  </Modal>
);
