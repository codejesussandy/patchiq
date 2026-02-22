import { useEffect } from 'react';
import { App,
  Form, Button, Typography, Radio, Space } from 'antd';
import { useAgentApprovalSettings, useUpdateAgentApprovalSettings } from '../../hooks/useSettings';

const { Title } = Typography;

interface AgentApprovalSettingsData {
  approvalType: 'AUTO' | 'MANUAL';
  autoApprovalBasedOn: 'ALL' | 'CRITERIA';
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
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Agent Approval Settings</Title>
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
              <Radio value="AUTO">Auto</Radio>
              <Radio value="MANUAL">Manual</Radio>
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
              <Radio value="ALL">All</Radio>
              <Radio value="CRITERIA">Criteria</Radio>
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
