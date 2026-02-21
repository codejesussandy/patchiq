import { useEffect } from 'react';
import { App,
  Form, Input, Select, Checkbox, Button, Space, Typography, Divider, Switch } from 'antd';
import { useProxyServerConfig, useUpdateProxyServerConfig, useTestProxyServerConfig } from '../../hooks/useSettings';
import type { ProxyServerConfig } from '../../types/settings.types';
import { getErrorMessage } from '../../utils/error';

const { Title, Text } = Typography;

export const ProxyServerConfiguration = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { data: config } = useProxyServerConfig();
  const updateConfigMutation = useUpdateProxyServerConfig();
  const testConfigMutation = useTestProxyServerConfig();

  useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    }
  }, [config, form]);

  const onFinish = async (values: ProxyServerConfig) => {
    try {
      await updateConfigMutation.mutateAsync(values);
      message.success('Proxy server configuration updated successfully');
    } catch {
      message.error('Failed to update proxy server configuration');
    }
  };

  const handleTest = async () => {
    const values = form.getFieldsValue();
    if (!values.host || !values.port) {
      message.warning('Please enter proxy host and port first');
      return;
    }
    try {
      await testConfigMutation.mutateAsync(values);
      message.success('Proxy server connection test successful!');
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Proxy server connection test failed'));
    }
  };

  const handleReset = () => {
    if (config) {
      form.setFieldsValue(config);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3} style={{ margin: 0 }}>Proxy Server Configurations</Title>
      <Text type="secondary" style={{ fontSize: 14 }}>Configure proxy server connections</Text>
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
            <Button type="primary" htmlType="submit" loading={updateConfigMutation.isPending}>
              Save
            </Button>
            <Button loading={testConfigMutation.isPending} onClick={handleTest}>
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
