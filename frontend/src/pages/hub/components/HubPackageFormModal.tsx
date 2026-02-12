import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Row,
  Col,
  Space,
  Button,
  Divider,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import type { SoftwarePackage, CreatePackageInput } from '../../../types/hub.types';
import {
  PLATFORM_OPTIONS,
  INSTALL_SOURCE_OPTIONS,
  CATEGORY_OPTIONS,
  ARCHITECTURE_OPTIONS,
} from '../../../types/hub.types';

const { TextArea } = Input;
const { Text } = Typography;

interface HubPackageFormModalProps {
  open: boolean;
  editingPackage: SoftwarePackage | null;
  form: FormInstance;
  onClose: () => void;
  onCreatePackage: (values: CreatePackageInput) => void;
  onUpdatePackage: (values: CreatePackageInput) => void;
}

export const HubPackageFormModal = ({
  open,
  editingPackage,
  form,
  onClose,
  onCreatePackage,
  onUpdatePackage,
}: HubPackageFormModalProps) => (
  <Modal
    title={editingPackage ? 'Edit Package' : 'Add Package'}
    open={open}
    onCancel={onClose}
    footer={null}
    width={800}
  >
    <Form
      form={form}
      layout="vertical"
      onFinish={editingPackage ? onUpdatePackage : onCreatePackage}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="name" label="Package Name" rules={[{ required: true, message: 'Package name is required' }]}>
            <Input placeholder="e.g., google-chrome" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="displayName" label="Display Name" rules={[{ required: true, message: 'Display name is required' }]}>
            <Input placeholder="e.g., Google Chrome" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="version" label="Version" rules={[{ required: true, message: 'Version is required' }]}>
            <Input placeholder="e.g., 120.0.0" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="platform" label="Platform" rules={[{ required: true, message: 'Platform is required' }]}>
            <Select options={PLATFORM_OPTIONS} placeholder="Select platform" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="installSource" label="Install Source" rules={[{ required: true, message: 'Install source is required' }]}>
            <Select options={INSTALL_SOURCE_OPTIONS} placeholder="Select source" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="vendor" label="Vendor">
            <Input placeholder="e.g., Google" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="category" label="Category">
            <Select options={CATEGORY_OPTIONS} placeholder="Select category" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="architecture" label="Architecture">
            <Select options={ARCHITECTURE_OPTIONS} placeholder="Select architecture" allowClear />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Description">
        <TextArea rows={3} placeholder="Package description" />
      </Form.Item>

      <Form.Item name="tags" label="Tags">
        <Select mode="tags" placeholder="Add tags" />
      </Form.Item>

      <Divider orientationMargin={0}>
        <Text strong>Installation Options</Text>
      </Divider>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="silentInstall" label="Silent Install" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="requiresReboot" label="Requires Reboot" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="supportsRollback" label="Supports Rollback" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="downloadUrl" label="Download URL (optional)">
        <Input placeholder="https://example.com/package.deb" />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {editingPackage ? 'Update' : 'Create'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  </Modal>
);
