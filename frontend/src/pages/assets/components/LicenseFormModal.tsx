import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  DatePicker,
} from 'antd';
import type { FormInstance } from 'antd';

const { Option } = Select;

interface LicenseFormModalProps {
  title: string;
  open: boolean;
  form: FormInstance;
  licenseType: 'software' | 'os';
  onOk: () => void;
  onCancel: () => void;
}

const TypeSpecificFields = ({ licenseType }: { licenseType: 'software' | 'os' }) => {
  if (licenseType === 'software') {
    return (
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="License Name" name="licenseName" rules={[{ required: true }]}>
            <Input placeholder="Enter license name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Software Name" name="softwareName" rules={[{ required: true }]}>
            <Input placeholder="Enter software name" />
          </Form.Item>
        </Col>
      </Row>
    );
  }
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="License Name" name="licenseName" rules={[{ required: true }]}>
          <Input placeholder="Enter license name" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="OS Type" name="osType" rules={[{ required: true }]}>
          <Select placeholder="Select OS type">
            <Option value="Windows 11 Pro">Windows 11 Pro</Option>
            <Option value="Windows 10">Windows 10</Option>
            <Option value="MacOS">macOS</Option>
            <Option value="Linux">Linux</Option>
            <Option value="Android">Android</Option>
            <Option value="iOS">iOS</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
  );
};

const CommonFormFields = () => (
  <>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Publisher" name="publisher">
          <Input placeholder="Enter publisher" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="License Key" name="licenseKey">
          <Input placeholder="Enter license key" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Purchase Date" name="purchaseDate">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Expiry Date" name="expiryDate">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Number of Licenses" name="licenseCount" rules={[{ required: true }]}>
          <Input type="number" placeholder="Enter count" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Vendor Name" name="vendorName" rules={[{ required: true }]}>
          <Input placeholder="Enter vendor name" />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Cost" name="cost">
          <Input placeholder="Enter cost" addonBefore="$" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Status" name="status" rules={[{ required: true }]}>
          <Select placeholder="Select status">
            <Option value="ALLOCATED">Allocated</Option>
            <Option value="AVAILABLE">Available</Option>
            <Option value="EXPIRED">Expired</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Form.Item label="Notes/Comments" name="notes">
      <Input.TextArea rows={4} placeholder="Enter any additional notes" />
    </Form.Item>
  </>
);

export const LicenseFormModal = ({ title, open, form, licenseType, onOk, onCancel }: LicenseFormModalProps) => {
  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={onOk} width={800}>
      <Form form={form} layout="vertical">
        <TypeSpecificFields licenseType={licenseType} />
        <CommonFormFields />
      </Form>
    </Modal>
  );
};
