import { App,
  Form, Input, Select, Checkbox, Button, Space, Typography, Divider } from 'antd';
import { useState, useEffect } from 'react';
import { settingsService } from '../../services/settings.service';
import type { MailServerConfig } from '../../types/settings.types';

const { Title } = Typography;

export const MailServerConfiguration = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [config, setConfig] = useState<MailServerConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await settingsService.getMailServerConfig();
        setConfig(data);
        form.setFieldsValue(data);
      } catch (error) {
        console.error('Failed to fetch mail server config:', error);
      }
    };
    fetchConfig();
  }, [form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await settingsService.updateMailServerConfig(values);
      message.success('Mail server configuration updated successfully');
      setConfig(values);
    } catch (error) {
      message.error('Failed to update mail server configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    const values = form.getFieldsValue();
    if (!values.testEmail) {
      message.warning('Please enter a test email address');
      return;
    }
    setTestLoading(true);
    try {
      await settingsService.testMailServerConfig(values);
      message.success('Test email sent successfully! Please check your inbox.');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Mail server connection test failed';
      message.error(errorMessage);
    } finally {
      setTestLoading(false);
    }
  };

  const handleReset = () => {
    if (config) {
      form.setFieldsValue(config);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Mail Server Configurations</Title>
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="smtpHost"
          label="SMTP Host"
          rules={[{ required: true, message: 'Please enter SMTP host' }]}
        >
          <Input placeholder="SMTP Host" />
        </Form.Item>

        <Form.Item
          name="smtpPort"
          label="SMTP Port"
          rules={[
            { required: true, message: 'Please enter SMTP port' },
            { pattern: /^\d+$/, message: 'Port must be a number' },
          ]}
        >
          <Input type="number" placeholder="0" />
        </Form.Item>

        <Form.Item
          name="protocol"
          label="Protocol"
          rules={[{ required: true, message: 'Please select a protocol' }]}
          initialValue="NONE"
        >
          <Select
            options={[
              { value: 'NONE', label: 'NONE' },
              { value: 'SSL', label: 'SSL' },
              { value: 'TLS', label: 'TLS' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="Email" />
        </Form.Item>

        <Form.Item
          name="enableAuthentication"
          valuePropName="checked"
          initialValue={false}
        >
          <Checkbox>Enable Authentication</Checkbox>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.enableAuthentication !== currentValues.enableAuthentication}>
          {({ getFieldValue }) =>
            getFieldValue('enableAuthentication') ? (
              <>
                <Form.Item
                  name="username"
                  label="Username"
                  rules={[{ required: true, message: 'Please enter username' }]}
                >
                  <Input placeholder="Username" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Please enter password' }]}
                >
                  <Input.Password placeholder="Password" />
                </Form.Item>
              </>
            ) : null
          }
        </Form.Item>

        <Form.Item
          name="testEmail"
          label="Test Email Address"
          rules={[
            { type: 'email', message: 'Please enter a valid email' },
          ]}
          tooltip="Enter an email address to receive the test email when clicking Test"
        >
          <Input placeholder="recipient@example.com" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save
            </Button>
            <Button loading={testLoading} onClick={handleTest}>
              Test
            </Button>
            <Button onClick={handleReset}>
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};
