import { useEffect } from 'react';
import { App,
  Form, Input, Button, Space, Typography, Divider, Card, Row, Col } from 'antd';
import { useAgentConfiguration, useUpdateAgentConfiguration } from '../../hooks/useSettings';
import type { AgentConfigurationFormData } from '../../types/settings.types';

const { Title } = Typography;

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

  const renderFieldPair = (
    label1: string,
    name1: string,
    _value1: string | number | undefined,
    label2: string,
    name2: string,
    _value2: string | number | undefined,
    suffix: string = 'Seconds'
  ) => (
    <Row gutter={[32, 24]} style={{ marginBottom: '16px' }}>
      <Col xs={24} sm={12}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
            * {label1}
          </label>
          <Form.Item
            name={name1}
            label={false}
            rules={[
              { required: true, message: 'This field is required' },
              { pattern: /^\d+$/, message: 'Must be a number' },
            ]}
            noStyle
          >
            <Input
              type="number"
              placeholder="0"
              suffix={suffix}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>
      </Col>
      <Col xs={24} sm={12}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
            * {label2}
          </label>
          <Form.Item
            name={name2}
            label={false}
            rules={[
              { required: true, message: 'This field is required' },
              { pattern: /^\d+$/, message: 'Must be a number' },
            ]}
            noStyle
          >
            <Input
              type="number"
              placeholder="0"
              suffix={suffix}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Agent Configuration</Title>
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        {/* Allowed Bandwidth */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={12}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
                  * Allowed Bandwidth to download Files
                </label>
                <Form.Item
                  name="allowedBandwidth"
                  label={false}
                  rules={[
                    { required: true, message: 'This field is required' },
                    { pattern: /^\d+$/, message: 'Must be a number' },
                  ]}
                  noStyle
                >
                  <Input
                    type="number"
                    placeholder="0"
                    suffix="Mbps"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Col>
            <Col xs={24} sm={12}></Col>
          </Row>
        </Card>

        {/* Agent Refresh Cycle and System Action Refresh Cycle */}
        <Card style={{ marginBottom: '24px' }}>
          {renderFieldPair(
            'Agent Refresh Cycle',
            'agentRefreshCycle',
            configuration?.agentRefreshCycle,
            'System Action Refresh Cycle',
            'systemActionRefreshCycle',
            configuration?.systemActionRefreshCycle
          )}
        </Card>

        {/* Endpoint Vlan Refresh Cycle and Patch Scanning Refresh Cycle */}
        <Card style={{ marginBottom: '24px' }}>
          {renderFieldPair(
            'Endpoint Vlan Refresh Cycle',
            'endpointVlanRefreshCycle',
            configuration?.endpointVlanRefreshCycle,
            'Patch Scanning Refresh Cycle',
            'patchScanningRefreshCycle',
            configuration?.patchScanningRefreshCycle
          )}
        </Card>

        {/* SSDM Refresh Cycle and Process Refresh Cycle */}
        <Card style={{ marginBottom: '24px' }}>
          {renderFieldPair(
            'SSDM Refresh Cycle',
            'ssdmRefreshCycle',
            configuration?.ssdmRefreshCycle,
            'Process Refresh Cycle',
            'processRefreshCycle',
            configuration?.processRefreshCycle
          )}
        </Card>

        {/* Network Refresh Cycle and Certificate Refresh Cycle */}
        <Card style={{ marginBottom: '24px' }}>
          {renderFieldPair(
            'Network Refresh Cycle',
            'networkRefreshCycle',
            configuration?.networkRefreshCycle,
            'Certificate Refresh Cycle',
            'certificateRefreshCycle',
            configuration?.certificateRefreshCycle
          )}
        </Card>

        {/* Start-up Items Refresh Cycle and Users Refresh Cycle */}
        <Card style={{ marginBottom: '24px' }}>
          {renderFieldPair(
            'Start-up Items Refresh Cycle',
            'startupItemsRefreshCycle',
            configuration?.startupItemsRefreshCycle,
            'Users Refresh Cycle',
            'usersRefreshCycle',
            configuration?.usersRefreshCycle
          )}
        </Card>

        {/* System Resources Refresh Cycle and System Services Refresh Cycle */}
        <Card style={{ marginBottom: '24px' }}>
          {renderFieldPair(
            'System Resources Refresh Cycle',
            'systemResourcesRefreshCycle',
            configuration?.systemResourcesRefreshCycle,
            'System Services Refresh Cycle',
            'systemServicesRefreshCycle',
            configuration?.systemServicesRefreshCycle
          )}
        </Card>

        {/* FIM Events Refresh Cycle and Software Meter Refresh Cycle */}
        <Card style={{ marginBottom: '24px' }}>
          {renderFieldPair(
            'FIM Events Refresh Cycle',
            'fimEventsRefreshCycle',
            configuration?.fimEventsRefreshCycle,
            'Software Meter Refresh Cycle',
            'softwareMeterRefreshCycle',
            configuration?.softwareMeterRefreshCycle
          )}
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
