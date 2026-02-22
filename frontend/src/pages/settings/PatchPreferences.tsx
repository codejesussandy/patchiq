import { useState, useEffect } from 'react';
import { App,
  Form, Button, Typography, Row, Col, TimePicker, Checkbox, Radio, Space, Select } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { usePatchPreference, useUpdatePatchPreference, useSyncPatchNow } from '../../hooks/useSettings';
import type { PatchPreferenceFormData } from '../../types/settings.types';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;

// Form values type with Dayjs for TimePicker fields
type FormValues = Omit<PatchPreferenceFormData, 'patchApprovalScheduleTime' | 'scheduleTime' | 'zeroTouchDeploymentScheduleTime'> & {
  patchApprovalScheduleTime: Dayjs;
  scheduleTime: Dayjs;
  zeroTouchDeploymentScheduleTime: Dayjs;
};

export const PatchPreferences = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const { data, isLoading: loading } = usePatchPreference();
  const updatePrefMutation = useUpdatePatchPreference();
  const syncNowMutation = useSyncPatchNow();
  const [scheduleFrequency, setScheduleFrequency] = useState<string>('Daily');
  const [zeroTouchFrequency, setZeroTouchFrequency] = useState<string>('Daily');

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        enablePatching: data.enablePatching,
        corridorOnlyApprovedPatch: data.corridorOnlyApprovedPatch,
        patchSyncForOS: data.patchSyncForOS,
        patchApprovalPolicy: data.patchApprovalPolicy,
        enableThirdPartyPatching: data.enableThirdPartyPatching,
        patchApprovalScheduleTime: dayjs(data.patchApprovalScheduleTime, 'HH:mm:ss'),
        scheduleTime: dayjs(data.scheduleTime, 'HH:mm:ss'),
        zeroTouchDeploymentScheduleTime: dayjs(data.zeroTouchDeploymentScheduleTime, 'HH:mm:ss'),
      });
    }
  }, [data, form]);

  const handleReset = () => {
    if (data) {
      form.setFieldsValue({
        enablePatching: data.enablePatching,
        corridorOnlyApprovedPatch: data.corridorOnlyApprovedPatch,
        patchSyncForOS: data.patchSyncForOS,
        patchApprovalPolicy: data.patchApprovalPolicy,
        enableThirdPartyPatching: data.enableThirdPartyPatching,
        patchApprovalScheduleTime: dayjs(data.patchApprovalScheduleTime, 'HH:mm:ss'),
        scheduleTime: dayjs(data.scheduleTime, 'HH:mm:ss'),
        zeroTouchDeploymentScheduleTime: dayjs(data.zeroTouchDeploymentScheduleTime, 'HH:mm:ss'),
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData: PatchPreferenceFormData = {
        enablePatching: values.enablePatching,
        corridorOnlyApprovedPatch: values.corridorOnlyApprovedPatch,
        patchSyncForOS: values.patchSyncForOS,
        patchApprovalPolicy: values.patchApprovalPolicy,
        enableThirdPartyPatching: values.enableThirdPartyPatching,
        patchApprovalScheduleTime: values.patchApprovalScheduleTime.format('HH:mm:ss'),
        scheduleTime: values.scheduleTime.format('HH:mm:ss'),
        zeroTouchDeploymentScheduleTime: values.zeroTouchDeploymentScheduleTime.format('HH:mm:ss'),
      };
      await updatePrefMutation.mutateAsync(submitData);
      message.success('Patch preferences updated successfully');
    } catch {
      message.error('Failed to update patch preferences');
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncNowMutation.mutateAsync();
      message.success('Patch sync initiated successfully');
    } catch {
      message.error('Failed to sync patches');
    }
  };

  const formatLastSyncTime = (timestamp: string) => {
    try {
      return timestamp;
    } catch {
      return 'N/A';
    }
  };

  const osOptions = ['Windows', 'Ubuntu'];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={3} style={{ margin: 0 }}>Patch Preferences</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Configure default patch management behavior</Text>
      </div>

      <Form
        form={form}
        layout="vertical"
      >
        <Row gutter={64}>
          {/* Left Column */}
          <Col flex="auto" style={{ maxWidth: '500px' }}>
            {/* Enable Patching */}
            <Form.Item
              name="enablePatching"
              valuePropName="checked"
              style={{ marginBottom: '24px' }}
            >
              <Checkbox style={{ fontSize: '14px' }}>Enable Patching</Checkbox>
            </Form.Item>

            {/* Corridor Only Approved Patch */}
            <Form.Item
              name="corridorOnlyApprovedPatch"
              valuePropName="checked"
              style={{ marginBottom: '24px' }}
            >
              <Checkbox style={{ fontSize: '14px' }}>Corridor Only Approved Patch</Checkbox>
            </Form.Item>

            {/* Patch Sync for OS */}
            <Form.Item
              label="Patch Sync for OS"
              name="patchSyncForOS"
              style={{ marginBottom: '24px' }}
            >
              <Checkbox.Group options={osOptions} style={{ display: 'flex', gap: '24px' }} />
            </Form.Item>

            {/* Patch Approval Schedule Time */}
            <Form.Item
              label="Patch Approval Schedule Time"
              name="patchApprovalScheduleTime"
              style={{ marginBottom: '24px' }}
            >
              <TimePicker
                format="HH:mm:ss"
                style={{ width: '100%' }}
              />
            </Form.Item>

            {/* Last Synced At */}
            {data && (
              <div style={{ marginBottom: '24px' }}>
                <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                  Last Synced At {formatLastSyncTime(data.lastSyncedAt)}
                </Text>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={handleSyncNow} loading={syncNowMutation.isPending}>
                Sync Now
              </Button>
              <Button onClick={handleReset} loading={loading}>
                Reset
              </Button>
            </div>
          </Col>

          {/* Right Column */}
          <Col flex="auto" style={{ maxWidth: '500px' }}>
            {/* Patch Approval Policy */}
            <Form.Item
              label={<span style={{ fontWeight: '500' }}>Patch Approval Policy</span>}
              name="patchApprovalPolicy"
              style={{ marginBottom: '32px' }}
            >
              <Radio.Group>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Radio value="PreApproved">Pre Approved</Radio>
                  <Radio value="ManuallyApproves">Manually Approves</Radio>
                  <Radio value="TestAndApprove">Test and Approve</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            {/* Enable Third Party Patching */}
            <Form.Item
              name="enableThirdPartyPatching"
              valuePropName="checked"
              style={{ marginBottom: '24px' }}
            >
              <Checkbox style={{ fontSize: '14px' }}>Enable Third Party Patching</Checkbox>
            </Form.Item>

            {/* Schedule Time */}
            <Form.Item
              label={<span style={{ fontWeight: '500' }}>Schedule Time</span>}
              style={{ marginBottom: '24px' }}
            >
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Form.Item
                    name="scheduleTime"
                    noStyle
                  >
                    <TimePicker
                      format="HH:mm:ss"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col style={{ minWidth: '120px' }}>
                  <Select
                    value={scheduleFrequency}
                    onChange={(value) => setScheduleFrequency(value)}
                    options={[
                      { label: 'Hourly', value: 'Hourly' },
                      { label: 'Daily', value: 'Daily' },
                    ]}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </Form.Item>

            {/* Zero Touch Deployment Schedule Time */}
            <Form.Item
              label={<span style={{ fontWeight: '500' }}>Zero Touch Deployment Schedule Time</span>}
              style={{ marginBottom: '24px' }}
            >
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Form.Item
                    name="zeroTouchDeploymentScheduleTime"
                    noStyle
                  >
                    <TimePicker
                      format="HH:mm:ss"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col style={{ minWidth: '120px' }}>
                  <Select
                    value={zeroTouchFrequency}
                    onChange={(value) => setZeroTouchFrequency(value)}
                    options={[
                      { label: 'Hourly', value: 'Hourly' },
                      { label: 'Daily', value: 'Daily' },
                    ]}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </Form.Item>

            {/* Save Button - Right aligned */}
            <Form.Item style={{ marginTop: '32px' }}>
              <Button type="primary" onClick={handleSubmit} loading={loading}>
                Save
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
