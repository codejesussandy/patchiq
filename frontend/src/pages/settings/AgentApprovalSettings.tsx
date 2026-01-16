import { useState, useEffect } from 'react';
import { Form, Button, Typography, message, Radio, Space } from 'antd';
import { settingsService } from '../../services/settings.service';

const { Title } = Typography;

interface AgentApprovalSettingsData {
  approvalType: 'auto' | 'manual';
  autoApprovalBasedOn: 'all' | 'criteria';
}

export const AgentApprovalSettings = () => {
  const [form] = Form.useForm<AgentApprovalSettingsData>();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<AgentApprovalSettingsData>({
    approvalType: 'auto',
    autoApprovalBasedOn: 'all',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getAgentApprovalSettings();
      setInitialValues(data);
      form.setFieldsValue(data);
    } catch (error) {
      console.error('Error fetching agent approval settings:', error);
      message.error('Failed to fetch agent approval settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await settingsService.updateAgentApprovalSettings(values);
      message.success('Agent approval settings updated successfully');
      setInitialValues(values);
    } catch (error) {
      console.error('Error saving agent approval settings:', error);
      message.error('Failed to save agent approval settings');
    }
  };

  const handleReset = () => {
    form.setFieldsValue(initialValues);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Agent Approval Settings</Title>
      </div>

      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item
          label={
            <span>
              * Approval Type
            </span>
          }
          name="approvalType"
          rules={[
            { required: true, message: 'Please select an approval type' },
          ]}
        >
          <Radio.Group>
            <Space direction="horizontal">
              <Radio value="auto">Auto</Radio>
              <Radio value="manual">Manual</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label={
            <span>
              * Auto Approval Based on
            </span>
          }
          name="autoApprovalBasedOn"
          rules={[
            { required: true, message: 'Please select an option' },
          ]}
        >
          <Radio.Group>
            <Space direction="horizontal">
              <Radio value="all">All</Radio>
              <Radio value="criteria">Criteria</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      </Form>

      <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
        <Button onClick={handleSave} type="primary" loading={loading}>
          Save
        </Button>
        <Button onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
};
