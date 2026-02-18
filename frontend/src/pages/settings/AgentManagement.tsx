import { useEffect } from 'react';
import {
  App,
  Form,
  InputNumber,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Switch,
  Select,
  Spin,
} from 'antd';
import { useAgentConfiguration, useUpdateAgentConfiguration } from '../../hooks/useSettings';
import type { AgentConfigurationFormData } from '../../types/settings.types';

const { Title, Text } = Typography;

export const AgentManagement = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { data: configuration, isLoading } = useAgentConfiguration();
  const updateConfigMutation = useUpdateAgentConfiguration();

  useEffect(() => {
    if (configuration) {
      form.setFieldsValue(configuration);
    }
  }, [configuration, form]);

  const onFinish = async (values: AgentConfigurationFormData) => {
    try {
      await updateConfigMutation.mutateAsync(values);
      message.success('Agent management settings updated successfully');
    } catch {
      message.error('Failed to update agent management settings');
    }
  };

  const handleReset = () => {
    if (configuration) {
      form.setFieldsValue(configuration);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', minHeight: 400 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Agent Management</Title>
      <Text type="secondary">
        Configure agent communication intervals and behavior settings.
      </Text>
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        style={{ maxWidth: 900 }}
      >
        {/* Communication Intervals */}
        <Card title="Communication Intervals" style={{ marginBottom: 24 }}>
          <Row gutter={[32, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="agentRefreshCycle"
                label="Heartbeat Interval"
                rules={[{ required: true, message: 'Required' }]}
                extra="How often agents send heartbeat signals (seconds)"
              >
                <InputNumber min={10} max={3600} addonAfter="seconds" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="systemResourcesRefreshCycle"
                label="Telemetry Interval"
                rules={[{ required: true, message: 'Required' }]}
                extra="How often agents report telemetry data (seconds)"
              >
                <InputNumber min={10} max={3600} addonAfter="seconds" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[32, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="endpointVlanRefreshCycle"
                label="Inventory Schedule"
                rules={[{ required: true, message: 'Required' }]}
                extra="How often agents collect full inventory (seconds)"
              >
                <InputNumber min={60} max={86400} addonAfter="seconds" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="patchScanningRefreshCycle"
                label="Patch Scan Schedule"
                rules={[{ required: true, message: 'Required' }]}
                extra="How often agents scan for available patches (seconds)"
              >
                <InputNumber min={60} max={86400} addonAfter="seconds" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Agent Behavior */}
        <Card title="Agent Behavior" style={{ marginBottom: 24 }}>
          <Row gutter={[32, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="softwareMeterRefreshCycle"
                label="Telemetry Collection"
                valuePropName="checked"
                extra="Enable or disable telemetry data collection"
                getValueFromEvent={(checked: boolean) => checked ? 60 : 0}
                getValueProps={(value: number) => ({ checked: value > 0 })}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="networkRefreshCycle"
                label="Log Level"
                extra="Agent logging verbosity level"
                getValueFromEvent={(value: string) => {
                  const levels: Record<string, number> = { debug: 10, info: 30, warn: 60, error: 120 };
                  return levels[value] || 30;
                }}
                getValueProps={(value: number) => {
                  if (value <= 10) return { value: 'debug' };
                  if (value <= 30) return { value: 'info' };
                  if (value <= 60) return { value: 'warn' };
                  return { value: 'error' };
                }}
              >
                <Select
                  options={[
                    { label: 'Debug', value: 'debug' },
                    { label: 'Info', value: 'info' },
                    { label: 'Warning', value: 'warn' },
                    { label: 'Error', value: 'error' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[32, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="allowedBandwidth"
                label="Allowed Bandwidth"
                rules={[{ required: true, message: 'Required' }]}
                extra="Maximum bandwidth for agent downloads (Mbps)"
              >
                <InputNumber min={1} max={1000} addonAfter="Mbps" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Action Buttons */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={updateConfigMutation.isPending}>
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
