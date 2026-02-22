import { useEffect } from 'react';
import { App,
  Form, InputNumber, Select, Switch, Button, Space, Typography, Divider, Card, Row, Col } from 'antd';
import { useServerSettings, useUpdateServerSettings } from '../../hooks/useSettings';
import type { ServerSettingsFormData } from '../../types/settings.types';

const { Title, Text } = Typography;

export const ServerSettings = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { data: settings } = useServerSettings();
  const updateSettingsMutation = useUpdateServerSettings();

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        sessionTimeout: settings.sessionTimeout,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        sessionIdleTimeoutMinutes: settings.sessionIdleTimeoutMinutes,
        endpointOnlineStatusTimeoutHours: settings.endpointOnlineStatusTimeoutHours,
        endpointScanJobTimeoutHours: settings.endpointScanJobTimeoutHours,
        logLevel: settings.logLevel,
      });
    }
  }, [settings, form]);

  const onFinish = async (values: ServerSettingsFormData) => {
    try {
      await updateSettingsMutation.mutateAsync(values);
      message.success('Server settings updated successfully');
    } catch {
      message.error('Failed to update server settings');
    }
  };

  const handleReset = () => {
    if (settings) {
      form.setFieldsValue({
        sessionTimeout: settings.sessionTimeout,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        sessionIdleTimeoutMinutes: settings.sessionIdleTimeoutMinutes,
        endpointOnlineStatusTimeoutHours: settings.endpointOnlineStatusTimeoutHours,
        endpointScanJobTimeoutHours: settings.endpointScanJobTimeoutHours,
        logLevel: settings.logLevel,
      });
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3} style={{ margin: 0 }}>Server Settings</Title>
      <Text type="secondary" style={{ fontSize: 14 }}>Configure server connection settings</Text>
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        style={{ maxWidth: 800 }}
      >
        {/* Session Timeout Toggle */}
        <Card style={{ marginBottom: '24px' }}>
          <Form.Item
            name="sessionTimeout"
            valuePropName="checked"
            initialValue={false}
            label="Session Timeout"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* Session Timeout Settings */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px', fontWeight: 500 }}>
                  * Session Timeout
                </label>
                <Form.Item
                  name="sessionTimeoutMinutes"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter session timeout' },
                  ]}
                  noStyle
                >
                  <InputNumber
                    min={1}
                    max={1440}
                    placeholder="60"
                    addonAfter="Minute"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px', fontWeight: 500 }}>
                  * Session Idle Timeout
                </label>
                <Form.Item
                  name="sessionIdleTimeoutMinutes"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter session idle timeout' },
                  ]}
                  noStyle
                >
                  <InputNumber
                    min={1}
                    max={1440}
                    placeholder="15"
                    addonAfter="Minute"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Endpoint Status Timeout Settings */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px', fontWeight: 500 }}>
                  * Endpoint Online Status Timeout
                </label>
                <Form.Item
                  name="endpointOnlineStatusTimeoutHours"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter endpoint online status timeout' },
                  ]}
                  noStyle
                >
                  <InputNumber
                    min={1}
                    max={168}
                    placeholder="1"
                    addonAfter="Hour"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px', fontWeight: 500 }}>
                  * EDCA, Scan Job Time
                </label>
                <Form.Item
                  name="endpointScanJobTimeoutHours"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter scan job timeout' },
                  ]}
                  noStyle
                >
                  <InputNumber
                    min={1}
                    max={168}
                    placeholder="1"
                    addonAfter="Hour"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Log Level Setting */}
        <Card style={{ marginBottom: '24px' }}>
          <Form.Item
            name="logLevel"
            label="* Log Level"
            rules={[{ required: true, message: 'Please select log level' }]}
            initialValue="Debug"
          >
            <Select
              placeholder="Select log level"
              options={[
                { value: 'Debug', label: 'Debug' },
                { value: 'Info', label: 'Info' },
                { value: 'Warning', label: 'Warning' },
                { value: 'Error', label: 'Error' },
              ]}
            />
          </Form.Item>
        </Card>

        {/* Action Buttons */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={updateSettingsMutation.isPending}>
              Save
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
