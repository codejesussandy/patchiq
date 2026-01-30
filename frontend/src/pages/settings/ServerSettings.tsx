import { useState, useEffect } from 'react';
import { App,
  Form, Input, Select, Switch, Button, Space, Typography, Divider, Card, Row, Col } from 'antd';
import { settingsService } from '../../services/settings.service';
import type { ServerSettings as ServerSettingsType, ServerSettingsFormData } from '../../types/settings.types';

const { Title } = Typography;

export const ServerSettings = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ServerSettingsType | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.getServerSettings();
        setSettings(data);
        form.setFieldsValue({
          sessionTimeout: data.sessionTimeout,
          sessionTimeoutMinutes: data.sessionTimeoutMinutes,
          sessionIdleTimeoutMinutes: data.sessionIdleTimeoutMinutes,
          endpointOnlineStatusTimeoutHours: data.endpointOnlineStatusTimeoutHours,
          endpointScanJobTimeoutHours: data.endpointScanJobTimeoutHours,
          logLevel: data.logLevel,
        });
      } catch (error) {
        console.error('Failed to fetch server settings:', error);
        message.error('Failed to fetch server settings');
      }
    };
    fetchSettings();
  }, [form]);

  const onFinish = async (values: ServerSettingsFormData) => {
    setLoading(true);
    try {
      await settingsService.updateServerSettings(values);
      message.success('Server settings updated successfully');
      const updatedSettings = await settingsService.getServerSettings();
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating server settings:', error);
      message.error('Failed to update server settings');
    } finally {
      setLoading(false);
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
      <Title level={2}>Server Settings</Title>
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
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
                  * Session Timeout
                </label>
                <Form.Item
                  name="sessionTimeoutMinutes"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter session timeout' },
                    { pattern: /^\d+$/, message: 'Must be a number' },
                  ]}
                  noStyle
                >
                  <Input
                    type="number"
                    placeholder="60"
                    suffix="Minute"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
                  * Session Idle Timeout
                </label>
                <Form.Item
                  name="sessionIdleTimeoutMinutes"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter session idle timeout' },
                    { pattern: /^\d+$/, message: 'Must be a number' },
                  ]}
                  noStyle
                >
                  <Input
                    type="number"
                    placeholder="0"
                    suffix="Minute"
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
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
                  * Endpoint Online Status Timeout
                </label>
                <Form.Item
                  name="endpointOnlineStatusTimeoutHours"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter endpoint online status timeout' },
                    { pattern: /^\d+$/, message: 'Must be a number' },
                  ]}
                  noStyle
                >
                  <Input
                    type="number"
                    placeholder="1"
                    suffix="Hour"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
                  * EDCA, Scan Job Time
                </label>
                <Form.Item
                  name="endpointScanJobTimeoutHours"
                  label={false}
                  rules={[
                    { required: true, message: 'Please enter scan job timeout' },
                    { pattern: /^\d+$/, message: 'Must be a number' },
                  ]}
                  noStyle
                >
                  <Input
                    type="number"
                    placeholder="1"
                    suffix="Hour"
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
            <Button type="primary" htmlType="submit" loading={loading}>
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
