import { useEffect } from 'react';
import { App,
  Form, InputNumber, Button, Space, Typography, Divider, Card, Row, Col } from 'antd';
import { useAgentConfiguration, useUpdateAgentConfiguration } from '../../hooks/useSettings';
import type { AgentConfigurationFormData } from '../../types/settings.types';

const { Title, Text } = Typography;

export const AgentConfiguration = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { data: configuration } = useAgentConfiguration();
  const updateConfigMutation = useUpdateAgentConfiguration();

  useEffect(() => {
    if (configuration) {
      form.setFieldsValue(configuration);
    }
  }, [configuration, form]);

  const onFinish = async (values: AgentConfigurationFormData) => {
    try {
      await updateConfigMutation.mutateAsync(values);
      message.success('Agent configuration updated successfully');
    } catch {
      message.error('Failed to update agent configuration');
    }
  };

  const handleReset = () => {
    if (configuration) {
      form.setFieldsValue(configuration);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3} style={{ margin: 0 }}>Agent Configuration</Title>
      <Text type="secondary" style={{ fontSize: 14 }}>Configure agent refresh cycles and communication settings</Text>
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        {/* Communication */}
        <Card title="Communication" style={{ marginBottom: '24px' }}>
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="agentRefreshCycle"
                label="Agent Heartbeat Interval"
                tooltip="How often agents check in with the server"
              >
                <InputNumber min={10} max={86400} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="allowedBandwidth"
                label="Allowed Bandwidth"
                tooltip="Max bandwidth for agent file downloads"
              >
                <InputNumber min={1} max={10000} addonAfter="Mbps" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Inventory Refresh Cycles */}
        <Card title="Inventory Refresh Cycles" style={{ marginBottom: '24px' }}>
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="softwareRefreshCycle"
                label="Software Inventory"
              >
                <InputNumber min={300} max={604800} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="hardwareRefreshCycle"
                label="Hardware Inventory"
              >
                <InputNumber min={300} max={604800} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="networkRefreshCycle"
                label="Network Inventory"
              >
                <InputNumber min={60} max={86400} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Security & Scanning */}
        <Card title="Security & Scanning" style={{ marginBottom: '24px' }}>
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="patchScanningRefreshCycle"
                label="Patch Scanning"
              >
                <InputNumber min={300} max={604800} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="riskDetectionRefreshCycle"
                label="Risk Detection"
              >
                <InputNumber min={300} max={604800} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* System Monitoring */}
        <Card title="System Monitoring" style={{ marginBottom: '24px' }}>
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="systemProcessRefreshCycle"
                label="Process Monitoring"
              >
                <InputNumber min={60} max={86400} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="systemServiceRefreshCycle"
                label="Service Monitoring"
              >
                <InputNumber min={60} max={86400} addonAfter="sec" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="systemActionRefreshCycle"
                label="System Actions"
              >
                <InputNumber min={60} max={86400} addonAfter="sec" style={{ width: '100%' }} />
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
