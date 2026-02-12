import { useEffect } from 'react';
import { App,
  Form, Button, Typography, Checkbox, Slider, Row, Col } from 'antd';
import { useRiskScore, useUpdateRiskScore } from '../../hooks/useSettings';
import type { RiskScoreFormData } from '../../types/settings.types';

const { Title } = Typography;

interface RiskScoreFormValues {
  applyDefaultSettings: boolean;
  vulnerabilityScoreWeight: number;
  vulnerabilitySeverityWeight: number;
  threatsWeight: number;
  endpointVisitsWeight: number;
}

export const RiskScoreSettings = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<RiskScoreFormValues>();
  const { data: riskScore, isLoading: loading } = useRiskScore();
  const updateRiskScoreMutation = useUpdateRiskScore();

  useEffect(() => {
    if (riskScore) {
      form.setFieldsValue({
        applyDefaultSettings: riskScore.applyDefaultSettings,
        vulnerabilityScoreWeight: riskScore.vulnerabilityScoreWeight,
        vulnerabilitySeverityWeight: riskScore.vulnerabilitySeverityWeight,
        threatsWeight: riskScore.threatsWeight,
        endpointVisitsWeight: riskScore.endpointVisitsWeight,
      });
    }
  }, [riskScore, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const formData: RiskScoreFormData = {
        applyDefaultSettings: values.applyDefaultSettings,
        vulnerabilityScoreWeight: values.vulnerabilityScoreWeight,
        vulnerabilitySeverityWeight: values.vulnerabilitySeverityWeight,
        threatsWeight: values.threatsWeight,
        endpointVisitsWeight: values.endpointVisitsWeight,
      };

      await updateRiskScoreMutation.mutateAsync(formData);
      message.success('Risk score settings updated successfully');
    } catch {
      message.error('Failed to update risk score settings');
    }
  };

  const handleReset = () => {
    if (riskScore) {
      form.setFieldsValue({
        applyDefaultSettings: riskScore.applyDefaultSettings,
        vulnerabilityScoreWeight: riskScore.vulnerabilityScoreWeight,
        vulnerabilitySeverityWeight: riskScore.vulnerabilitySeverityWeight,
        threatsWeight: riskScore.threatsWeight,
        endpointVisitsWeight: riskScore.endpointVisitsWeight,
      });
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={3} style={{ margin: 0 }}>
          Risk Score Settings
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: '1000px' }}
      >
        {/* Apply Default Settings Checkbox */}
        <Form.Item
          style={{ marginBottom: '32px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Form.Item name="applyDefaultSettings" valuePropName="checked" style={{ margin: 0 }}>
              <Checkbox />
            </Form.Item>
            <span>Apply Default settings to calculate Risk Score</span>
          </div>
        </Form.Item>

        {/* Weight Sliders - 2 Column Grid */}
        <Row gutter={[32, 32]} style={{ marginBottom: '32px' }}>
          <Col span={12}>
            <Form.Item
              label="Vulnerability Score Weight"
              name="vulnerabilityScoreWeight"
              rules={[
                { required: true, message: 'Please set vulnerability score weight' },
              ]}
            >
              <Slider min={0} max={1} step={0.1} marks={{ 0: '0', 1: '1' }} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Vulnerability Severity Weight"
              name="vulnerabilitySeverityWeight"
              rules={[
                { required: true, message: 'Please set vulnerability severity weight' },
              ]}
            >
              <Slider min={0} max={1} step={0.1} marks={{ 0: '0', 1: '1' }} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Threats Weight"
              name="threatsWeight"
              rules={[
                { required: true, message: 'Please set threats weight' },
              ]}
            >
              <Slider min={0} max={1} step={0.1} marks={{ 0: '0', 1: '1' }} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Endpoint Visits Weight"
              name="endpointVisitsWeight"
              rules={[
                { required: true, message: 'Please set endpoint visits weight' },
              ]}
            >
              <Slider min={0} max={1} step={0.1} marks={{ 0: '0', 1: '1' }} />
            </Form.Item>
          </Col>
        </Row>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={handleReset} loading={loading}>
            Reset
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Save
          </Button>
        </div>
      </Form>
    </div>
  );
};
