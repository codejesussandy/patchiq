import { useEffect } from 'react';
import { App,
  Form, Button, Typography, Radio, Space } from 'antd';
import { useAgentApprovalSettings, useUpdateAgentApprovalSettings } from '../../hooks/useSettings';

const { Title, Text } = Typography;

interface AgentApprovalSettingsData {
  approvalType: 'auto' | 'manual';
  autoApprovalBasedOn: 'all' | 'criteria';
}

export const AgentApprovalSettings = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<AgentApprovalSettingsData>();
  const { data: settings } = useAgentApprovalSettings();
  const updateSettingsMutation = useUpdateAgentApprovalSettings();

  useEffect(() => {
    if (settings) {
      form.setFieldsValue(settings);
    }
  }, [settings, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateSettingsMutation.mutateAsync(values);
      message.success('Agent approval settings updated successfully');
    } catch {
      message.error('Failed to save agent approval settings');
    }
  };

  const handleReset = () => {
    if (settings) {
      form.setFieldsValue(settings);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Agent Approval Settings</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Configure agent registration approval workflow</Text>
      </div>

      <Form form={form} layout="vertical">
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
            <Space orientation="horizontal">
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
            <Space orientation="horizontal">
              <Radio value="all">All</Radio>
              <Radio value="criteria">Criteria</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      </Form>

      <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
        <Button onClick={handleSave} type="primary" loading={updateSettingsMutation.isPending}>
          Save
        </Button>
        <Button onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
};
