import { useState, useEffect } from 'react';
import {
  Form,
  Button,
  Typography,
  message,
  Card,
  Switch,
  InputNumber,
  Divider,
} from 'antd';
import {
  LockOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface PasswordPolicy {
  id?: string;
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expiryDays: number;
  historyCount: number;
  lockoutAttempts: number;
  lockoutDuration: number;
  passwordChangeOnLogin: boolean;
}

export const PasswordPolicies = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [policies, setPolicies] = useState<PasswordPolicy | null>(null);

  useEffect(() => {
    fetchPasswordPolicies();
  }, []);

  const fetchPasswordPolicies = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call
      const defaultPolicy: PasswordPolicy = {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expiryDays: 90,
        historyCount: 5,
        lockoutAttempts: 5,
        lockoutDuration: 30,
        passwordChangeOnLogin: false,
      };
      setPolicies(defaultPolicy);
      form.setFieldsValue(defaultPolicy);
    } catch (error) {
      message.error('Failed to fetch password policies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // TODO: Implement actual API call
      message.success('Password policies updated successfully');
      setPolicies(values);
    } catch (error) {
      message.error('Failed to update password policies');
    }
  };

  const handleReset = () => {
    if (policies) {
      form.setFieldsValue(policies);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={4}>Password Policies</Title>
        <Text type="secondary">Configure password requirements and security settings</Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: '800px' }}
      >
        {/* Password Complexity Requirements */}
        <Card style={{ marginBottom: '24px' }}>
          <Title level={5} style={{ marginBottom: '16px' }}>
            <LockOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Password Complexity Requirements
          </Title>

          <Form.Item
            label="Minimum Password Length"
            name="minLength"
            rules={[
              { required: true, message: 'Please enter minimum length' },
              { type: 'number', min: 1, message: 'Must be at least 1' },
            ]}
          >
            <InputNumber min={1} max={128} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Maximum Password Length"
            name="maxLength"
            rules={[
              { required: true, message: 'Please enter maximum length' },
              { type: 'number', min: 1, message: 'Must be at least 1' },
            ]}
          >
            <InputNumber min={1} max={256} style={{ width: '100%' }} />
          </Form.Item>

          <Divider />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', fontWeight: 600 }}>
              <Text strong>Required Character Types</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Uppercase Letters (A-Z)</Text>
              <Form.Item name="requireUppercase" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Lowercase Letters (a-z)</Text>
              <Form.Item name="requireLowercase" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Numbers (0-9)</Text>
              <Form.Item name="requireNumbers" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Special Characters (!@#$%^&*)</Text>
              <Form.Item name="requireSpecialChars" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Card>

        {/* Password Expiration and History */}
        <Card style={{ marginBottom: '24px' }}>
          <Title level={5} style={{ marginBottom: '16px' }}>
            Password Expiration & History
          </Title>

          <Form.Item
            label="Password Expiry (Days)"
            name="expiryDays"
            rules={[
              { required: true, message: 'Please enter expiry days' },
              { type: 'number', min: 0, message: 'Must be 0 or greater' },
            ]}
            tooltip="0 means passwords never expire"
          >
            <InputNumber min={0} max={365} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Password History (Number of Previous Passwords to Remember)"
            name="historyCount"
            rules={[
              { required: true, message: 'Please enter history count' },
              { type: 'number', min: 0, message: 'Must be 0 or greater' },
            ]}
            tooltip="Users cannot reuse previous passwords"
          >
            <InputNumber min={0} max={24} style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <Text>Force Password Change on Next Login</Text>
            <Form.Item name="passwordChangeOnLogin" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>
        </Card>

        {/* Account Lockout */}
        <Card style={{ marginBottom: '24px' }}>
          <Title level={5} style={{ marginBottom: '16px' }}>
            Account Lockout Policy
          </Title>

          <Form.Item
            label="Failed Login Attempts Before Lockout"
            name="lockoutAttempts"
            rules={[
              { required: true, message: 'Please enter lockout attempts' },
              { type: 'number', min: 1, message: 'Must be at least 1' },
            ]}
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Account Lockout Duration (Minutes)"
            name="lockoutDuration"
            rules={[
              { required: true, message: 'Please enter lockout duration' },
              { type: 'number', min: 1, message: 'Must be at least 1' },
            ]}
          >
            <InputNumber min={1} max={1440} style={{ width: '100%' }} />
          </Form.Item>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button onClick={handleReset} loading={loading}>
            Reset
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading}>
            Save Policies
          </Button>
        </div>

        {/* Info Message */}
        <div style={{ marginTop: '24px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <Paragraph>
              <strong>Note:</strong> These policies will apply to all users in the system.
              Changes will take effect immediately and will apply to password resets and new passwords.
            </Paragraph>
          </Text>
        </div>
      </Form>
    </div>
  );
};
