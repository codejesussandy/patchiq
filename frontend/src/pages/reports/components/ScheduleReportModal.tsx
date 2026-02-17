import { useEffect } from 'react';
import {
  App,
  Modal,
  Form,
  Select,
  Switch,
  TimePicker,
  Typography,
  Tag,
  Descriptions,
} from 'antd';
import dayjs from 'dayjs';
import { useCreateSchedule } from '../../../hooks/useReports';
import type { Report, ScheduleFrequency } from '../../../types/reports.types';
import { REPORT_TYPE_LABELS } from '../../../types/reports.types';
import { validateEmail } from '../../../utils/validation';
import { sanitizeInput } from '../../../utils/sanitize';

const { Text } = Typography;

interface ScheduleReportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  report: Report | null;
}

export const ScheduleReportModal = ({
  open,
  onClose,
  onSuccess,
  report,
}: ScheduleReportModalProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const createSchedule = useCreateSchedule();

  useEffect(() => {
    if (open && report) {
      form.setFieldsValue({
        enabled: report.schedule?.enabled || false,
        frequency: report.schedule?.frequency || 'DAILY',
        time: report.schedule?.time ? dayjs(report.schedule.time, 'HH:mm') : undefined,
        dayOfWeek: report.schedule?.dayOfWeek,
        dayOfMonth: report.schedule?.dayOfMonth,
        recipients: report.schedule?.recipients || [],
      });
    }
  }, [open, report, form]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      // Validate all email recipients
      if (values.recipients && values.recipients.length > 0) {
        const invalidEmails: string[] = [];
        values.recipients.forEach((email: string) => {
          const error = validateEmail(email.trim());
          if (error) {
            invalidEmails.push(email);
          }
        });

        if (invalidEmails.length > 0) {
          message.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
          return;
        }
      }

      if (report) {
        // Sanitize recipients (email addresses don't need HTML sanitization, but strip potential XSS)
        const sanitizedRecipients = (values.recipients || []).map((email: string) => sanitizeInput(email));

        await createSchedule.mutateAsync({
          reportId: report.id,
          enabled: values.enabled,
          frequency: values.frequency,
          time: values.time?.format('HH:mm'),
          dayOfWeek: values.dayOfWeek,
          dayOfMonth: values.dayOfMonth,
          recipients: sanitizedRecipients,
        });
        message.success('Schedule saved successfully');
        onSuccess();
      }
    } catch {
      message.error('Failed to save schedule');
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const calculateNextRun = (): string => {
    const frequency = form.getFieldValue('frequency') as ScheduleFrequency;
    const time = form.getFieldValue('time');
    const enabled = form.getFieldValue('enabled');

    if (!enabled || !frequency) return 'Not scheduled';

    const now = dayjs();
    let nextRun = now;

    if (frequency === 'DAILY') {
      if (time) {
        nextRun = now.hour(time.hour()).minute(time.minute()).second(0);
        if (nextRun.isBefore(now)) {
          nextRun = nextRun.add(1, 'day');
        }
      } else {
        nextRun = now.add(1, 'day').startOf('day');
      }
    } else if (frequency === 'WEEKLY') {
      const dayOfWeek = form.getFieldValue('dayOfWeek') || 1;
      nextRun = now.day(dayOfWeek);
      if (nextRun.isBefore(now) || nextRun.isSame(now, 'day')) {
        nextRun = nextRun.add(1, 'week');
      }
      if (time) {
        nextRun = nextRun.hour(time.hour()).minute(time.minute()).second(0);
      }
    } else if (frequency === 'MONTHLY') {
      const dayOfMonth = form.getFieldValue('dayOfMonth') || 1;
      nextRun = now.date(dayOfMonth);
      if (nextRun.isBefore(now)) {
        nextRun = nextRun.add(1, 'month');
      }
      if (time) {
        nextRun = nextRun.hour(time.hour()).minute(time.minute()).second(0);
      }
    }

    return nextRun.format('YYYY-MM-DD HH:mm');
  };

  const enabled = Form.useWatch('enabled', form);
  const frequency = Form.useWatch('frequency', form);

  return (
    <Modal
      title="Schedule Report"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={createSchedule.isPending}
      okText="Save"
      width={500}
      destroyOnClose
    >
      {report && (
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Report">{report.name}</Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag>{REPORT_TYPE_LABELS[report.type]}</Tag>
          </Descriptions.Item>
        </Descriptions>
      )}

      <Form form={form} layout="vertical">
        <Form.Item label="Enable Schedule" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>

        {enabled && (
          <>
            <Form.Item
              label="Frequency"
              name="frequency"
              rules={[{ required: true, message: 'Please select frequency' }]}
            >
              <Select placeholder="Select frequency">
                <Select.Option value="DAILY">Daily</Select.Option>
                <Select.Option value="WEEKLY">Weekly</Select.Option>
                <Select.Option value="MONTHLY">Monthly</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="Time" name="time">
              <TimePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>

            {frequency === 'WEEKLY' && (
              <Form.Item
                label="Day of Week"
                name="dayOfWeek"
                rules={[{ required: true, message: 'Please select day' }]}
              >
                <Select placeholder="Select day">
                  <Select.Option value={0}>Sunday</Select.Option>
                  <Select.Option value={1}>Monday</Select.Option>
                  <Select.Option value={2}>Tuesday</Select.Option>
                  <Select.Option value={3}>Wednesday</Select.Option>
                  <Select.Option value={4}>Thursday</Select.Option>
                  <Select.Option value={5}>Friday</Select.Option>
                  <Select.Option value={6}>Saturday</Select.Option>
                </Select>
              </Form.Item>
            )}

            {frequency === 'MONTHLY' && (
              <Form.Item
                label="Day of Month"
                name="dayOfMonth"
                rules={[{ required: true, message: 'Please select day' }]}
              >
                <Select placeholder="Select day">
                  {Array.from({ length: 31 }, (_, i) => (
                    <Select.Option key={i + 1} value={i + 1}>
                      {i + 1}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Form.Item
              label="Recipients"
              name="recipients"
              rules={[
                { required: true, message: 'Please add at least one recipient' },
                {
                  validator: (_, value) => {
                    if (!value || value.length === 0) {
                      return Promise.resolve();
                    }
                    const invalidEmails = value.filter((email: string) => {
                      const error = validateEmail(email.trim());
                      return error !== null;
                    });
                    if (invalidEmails.length > 0) {
                      return Promise.reject(new Error(`Invalid email(s): ${invalidEmails.join(', ')}`));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              help="Enter email addresses separated by commas. Max 255 characters per email."
            >
              <Select
                mode="tags"
                placeholder="user@example.com, admin@example.com"
                tokenSeparators={[',',' ']}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Text type="secondary">
              Next Run: <Tag color="blue">{calculateNextRun()}</Tag>
            </Text>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ScheduleReportModal;
