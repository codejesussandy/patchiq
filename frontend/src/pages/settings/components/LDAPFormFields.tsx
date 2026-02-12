import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Checkbox,
  Row,
  Col,
} from 'antd';

const { TextArea } = Input;

interface LDAPFormFieldsProps {
  disabled?: boolean;
}

export const LDAPFormFields = ({ disabled = false }: LDAPFormFieldsProps) => (
  <>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Please enter configuration name' }]}
        >
          <Input placeholder="Name" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Host"
          name="host"
          rules={[{ required: true, message: 'Please enter LDAP server host' }]}
        >
          <Input placeholder="Host" disabled={disabled} />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label="Port"
          name="port"
          rules={[{ required: true, message: 'Please enter port' }]}
        >
          <InputNumber min={1} max={65535} placeholder="Port" disabled={disabled} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="FQDN"
          name="fqdn"
          rules={[{ required: true, message: 'Please enter FQDN' }]}
        >
          <Input placeholder="FQDN" disabled={disabled} />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: 'Please enter username' }]}
        >
          <Input placeholder="Username" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: 'Please enter password' }]}
        >
          <Input.Password placeholder="Password" disabled={disabled} />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label="Base DN"
          name="baseDN"
          rules={[{ required: true, message: 'Please enter base DN' }]}
        >
          <Input placeholder="Base DN" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Group Base" name="groupBase">
          <Input placeholder="Group Base" disabled={disabled} />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Enable Auto Sync" name="enableAutoSync" valuePropName="checked">
          <Switch disabled={disabled} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Auto Sync Interval" name="autoSyncInterval">
          <Select placeholder="Select Interval" disabled={disabled}>
            <Select.Option value="hourly">Hourly</Select.Option>
            <Select.Option value="daily">Daily</Select.Option>
            <Select.Option value="weekly">Weekly</Select.Option>
            <Select.Option value="monthly">Monthly</Select.Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Protocol" name="protocol">
          <Select placeholder="Select protocol" disabled={disabled}>
            <Select.Option value="LDAP">LDAP</Select.Option>
            <Select.Option value="LDAPS">LDAPS</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Timeout (seconds)" name="timeout">
          <InputNumber min={1} placeholder="e.g., 30" disabled={disabled} style={{ width: '100%' }} />
        </Form.Item>
      </Col>
    </Row>

    <Form.Item label="Description" name="description">
      <TextArea rows={3} placeholder="Enter description (optional)" disabled={disabled} />
    </Form.Item>

    <Form.Item label="Enabled" name="enabled" valuePropName="checked">
      <Checkbox disabled={disabled}>Enable this configuration</Checkbox>
    </Form.Item>
  </>
);
