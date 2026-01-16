import { Form, Input, Select, Checkbox, Button, Space, message, Typography, Divider, Switch } from 'antd';
import { useState, useEffect } from 'react';
import { settingsService } from '../../services/settings.service';
import type { ProxyServerConfig } from '../../types/settings.types';

const { Title } = Typography;

export const ProxyServerConfiguration = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [config, setConfig] = useState<ProxyServerConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await settingsService.getProxyServerConfig();
        setConfig(data);
        form.setFieldsValue(data);
      } catch (error) {
        console.error('Failed to fetch proxy server config:', error);
      }
    };
    fetchConfig();
  }, [form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await settingsService.updateProxyServerConfig(values);
      message.success('Proxy server configuration updated successfully');
      setConfig(values);
    } catch (error) {
      message.error('Failed to update proxy server configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const values = form.getFieldsValue();
      await settingsService.testProxyServerConfig(values);
      message.success('Proxy server connection test successful');
    } catch (error) {
      message.error('Proxy server connection test failed');
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
      <Title level={2}>Proxy Server Configurations</Title>
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="enabled"
          label="Enable Proxy Server"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.enabled !== currentValues.enabled}>
          {({ getFieldValue }) =>
            getFieldValue('enabled') ? (
              <>
                <Form.Item
                  name="host"
                  label="Proxy Host"
                  rules={[{ required: true, message: 'Please enter proxy host' }]}
                >
                  <Input placeholder="Proxy Host" />
                </Form.Item>

                <Form.Item
                  name="port"
                  label="Proxy Port"
                  rules={[
                    { required: true, message: 'Please enter proxy port' },
                    { pattern: /^\d+$/, message: 'Port must be a number' },
                  ]}
                >
                  <Input type="number" placeholder="8080" />
                </Form.Item>

                <Form.Item
                  name="protocol"
                  label="Protocol"
                  rules={[{ required: true, message: 'Please select a protocol' }]}
                  initialValue="HTTP"
                >
                  <Select
                    options={[
                      { value: 'HTTP', label: 'HTTP' },
                      { value: 'HTTPS', label: 'HTTPS' },
                      { value: 'SOCKS5', label: 'SOCKS5' },
                    ]}
                  />
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
              </>
            ) : null
          }
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
