import { useState, useEffect } from 'react';
import { App,
  Form, Button, Typography, Row, Col, TimePicker, Checkbox, Radio, Space, Select } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { settingsService } from '../../services/settings.service';
import type { PatchPreference, PatchPreferenceFormData } from '../../types/settings.types';
import type { Dayjs } from 'dayjs';

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
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<PatchPreference | null>(null);
  const [originalFormValues, setOriginalFormValues] = useState<PatchPreferenceFormData | null>(null);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>('Daily');
  const [zeroTouchFrequency, setZeroTouchFrequency] = useState<string>('Daily');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getPatchPreference();
      setData(response);
      const formData: PatchPreferenceFormData = {
        enablePatching: response.enablePatching,
        corridorOnlyApprovedPatch: response.corridorOnlyApprovedPatch,
        patchSyncForOS: response.patchSyncForOS,
        patchApprovalPolicy: response.patchApprovalPolicy,
        enableThirdPartyPatching: response.enableThirdPartyPatching,
        patchApprovalScheduleTime: response.patchApprovalScheduleTime,
        scheduleTime: response.scheduleTime,
        zeroTouchDeploymentScheduleTime: response.zeroTouchDeploymentScheduleTime,
      };
      form.setFieldsValue({
        enablePatching: formData.enablePatching,
        corridorOnlyApprovedPatch: formData.corridorOnlyApprovedPatch,
        patchSyncForOS: formData.patchSyncForOS,
        patchApprovalPolicy: formData.patchApprovalPolicy,
        enableThirdPartyPatching: formData.enableThirdPartyPatching,
        patchApprovalScheduleTime: dayjs(formData.patchApprovalScheduleTime, 'HH:mm:ss'),
        scheduleTime: dayjs(formData.scheduleTime, 'HH:mm:ss'),
        zeroTouchDeploymentScheduleTime: dayjs(formData.zeroTouchDeploymentScheduleTime, 'HH:mm:ss'),
      });
      setOriginalFormValues(formData);
    } catch (error) {
      message.error('Failed to fetch patch preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (originalFormValues) {
      form.setFieldsValue({
        enablePatching: originalFormValues.enablePatching,
        corridorOnlyApprovedPatch: originalFormValues.corridorOnlyApprovedPatch,
        patchSyncForOS: originalFormValues.patchSyncForOS,
        patchApprovalPolicy: originalFormValues.patchApprovalPolicy,
        enableThirdPartyPatching: originalFormValues.enableThirdPartyPatching,
        patchApprovalScheduleTime: dayjs(originalFormValues.patchApprovalScheduleTime, 'HH:mm:ss'),
        scheduleTime: dayjs(originalFormValues.scheduleTime, 'HH:mm:ss'),
        zeroTouchDeploymentScheduleTime: dayjs(originalFormValues.zeroTouchDeploymentScheduleTime, 'HH:mm:ss'),
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
      await settingsService.updatePatchPreference(submitData);
      setOriginalFormValues(submitData);
      message.success('Patch preferences updated successfully');
      await fetchData();
    } catch (error) {
      message.error('Failed to update patch preferences');
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await settingsService.syncPatchNow();
      message.success('Patch sync initiated successfully');
      await fetchData();
    } catch (error) {
      message.error('Failed to sync patches');
    } finally {
      setSyncing(false);
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
        <Title level={3}>Patch Preferences</Title>
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
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Last Synced At {formatLastSyncTime(data.lastSyncedAt)}
                </Text>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={handleSyncNow} loading={syncing}>
                Sync Now
              </Button>
              <Button onClick={handleReset} loading={loading}>
                Undo
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
