import { useState, useEffect } from 'react';
import { Form, Button, Typography, message, Checkbox, Slider, Row, Col } from 'antd';
import { settingsService } from '../../services/settings.service';
import type { RiskScore, RiskScoreFormData } from '../../types/settings.types';

const { Title } = Typography;

interface RiskScoreFormValues {
  applyDefaultSettings: boolean;
  vulnerabilityScoreWeight: number;
  vulnerabilitySeverityWeight: number;
  threatsWeight: number;
  endpointVisitsWeight: number;
}

export const RiskScoreSettings = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<RiskScoreFormValues>();
  const [_currentRiskScore, setCurrentRiskScore] = useState<RiskScore | null>(null);
  const [originalFormValues, setOriginalFormValues] = useState<RiskScoreFormValues | null>(null);

  useEffect(() => {
    fetchRiskScore();
  }, []);

  const fetchRiskScore = async () => {
    setLoading(true);
    try {
      const riskScore = await settingsService.getRiskScore();
      setCurrentRiskScore(riskScore);

      const formData: RiskScoreFormValues = {
        applyDefaultSettings: riskScore.applyDefaultSettings,
        vulnerabilityScoreWeight: riskScore.vulnerabilityScoreWeight,
        vulnerabilitySeverityWeight: riskScore.vulnerabilitySeverityWeight,
        threatsWeight: riskScore.threatsWeight,
        endpointVisitsWeight: riskScore.endpointVisitsWeight,
      };

      form.setFieldsValue(formData);
      setOriginalFormValues(formData);
    } catch (error) {
      message.error('Failed to fetch risk score settings');
    } finally {
      setLoading(false);
    }
  };

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

      await settingsService.updateRiskScore(formData);
      setOriginalFormValues(values);
      message.success('Risk score settings updated successfully');
    } catch (error) {
      message.error('Failed to update risk score settings');
    }
  };

  const handleReset = () => {
    if (originalFormValues) {
      form.setFieldsValue(originalFormValues);
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
