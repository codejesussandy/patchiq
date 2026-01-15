import { useState, useEffect } from 'react';
import { Form, Button, Typography, message, InputNumber, Switch, Row, Col } from 'antd';
import { settingsService } from '../../services/settings.service';
import type { Policy, PolicyConfiguration } from '../../types/settings.types';

const { Title, Text } = Typography;

interface PasswordPolicyFormData {
  minCharacterCount: number;
  minNumbers: boolean;
  minLowerCaseCharacters: boolean;
  minUpperCaseCharacters: boolean;
  minSpecialCharacters: boolean;
}

export const PasswordPolicies = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<PasswordPolicyFormData>();
  const [currentPolicy, setCurrentPolicy] = useState<Policy | null>(null);
  const [originalFormValues, setOriginalFormValues] = useState<PasswordPolicyFormData | null>(null);

  useEffect(() => {
    fetchPasswordPolicy();
  }, []);

  const fetchPasswordPolicy = async () => {
    setLoading(true);
    try {
      const policies = await settingsService.getPolicies();
      const passwordPolicy = policies.find((p) => p.type === 'Password') || policies[0];

      if (passwordPolicy) {
        setCurrentPolicy(passwordPolicy);
        const formData = policyToFormData(passwordPolicy.configuration);
        form.setFieldsValue(formData);
        setOriginalFormValues(formData);
      }
    } catch (error) {
      message.error('Failed to fetch password policy');
    } finally {
      setLoading(false);
    }
  };

  const policyToFormData = (config: PolicyConfiguration): PasswordPolicyFormData => {
    return {
      minCharacterCount: config.minCharacterCount || 8,
      minNumbers: (config.minNumbers || 0) > 0,
      minLowerCaseCharacters: true, // Default to true as it's a common requirement
      minUpperCaseCharacters: (config.minUpperCaseCharacters || 0) > 0,
      minSpecialCharacters: (config.minSpecialCharacters || 0) > 0,
    };
  };

  const formDataToPolicy = (formData: PasswordPolicyFormData): PolicyConfiguration => {
    return {
      minCharacterCount: formData.minCharacterCount,
      minNumbers: formData.minNumbers ? 1 : 0,
      minLowerCaseCharacters: formData.minLowerCaseCharacters ? 1 : 0,
      minUpperCaseCharacters: formData.minUpperCaseCharacters ? 1 : 0,
      minSpecialCharacters: formData.minSpecialCharacters ? 1 : 0,
      maxCharacterCount: 128, // Keep default max length
      changeEveryDays: 90, // Keep existing default
      lastNPasswordHistory: 5, // Keep existing default
      resetDuration: 'Days', // Keep existing default
    };
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!currentPolicy) {
        message.error('Password policy not found');
        return;
      }

      const updatedPolicy: Policy = {
        ...currentPolicy,
        configuration: formDataToPolicy(values),
      };

      await settingsService.updatePolicy(currentPolicy.id, {
        name: updatedPolicy.name,
        type: updatedPolicy.type,
        branch: updatedPolicy.orgUnit,
        roles: updatedPolicy.affectedRoles,
        description: updatedPolicy.description,
        configuration: updatedPolicy.configuration,
      });

      setCurrentPolicy(updatedPolicy);
      setOriginalFormValues(values);
      message.success('Password policy updated successfully');
    } catch (error) {
      message.error('Failed to update password policy');
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
          Password Policy
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: '800px' }}
      >
        {/* Minimum Password Length - Full Width */}
        <Form.Item
          label="Minimum Password Length"
          name="minCharacterCount"
          rules={[
            { required: true, message: 'Please enter minimum length' },
          ]}
          style={{ marginBottom: '32px' }}
        >
          <InputNumber min={1} max={128} style={{ width: '200px' }} />
        </Form.Item>

        {/* Character Requirements - 2 Column Grid */}
        <Row gutter={[32, 24]} style={{ marginBottom: '32px' }}>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Numeric Character Required</Text>
              <Form.Item name="minNumbers" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>
          </Col>

          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Lower Case Character Required</Text>
              <Form.Item name="minLowerCaseCharacters" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>
          </Col>

          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Upper Case Character Required</Text>
              <Form.Item name="minUpperCaseCharacters" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>
          </Col>

          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Special Character Required</Text>
              <Form.Item name="minSpecialCharacters" valuePropName="checked" style={{ margin: 0 }}>
                <Switch />
              </Form.Item>
            </div>
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
