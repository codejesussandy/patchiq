import { useState } from 'react';
import { ArrowLeftOutlined, PlusOutlined, DownOutlined } from '@ant-design/icons';
import {
  App,
  Form,
  Input,
  Button,
  DatePicker,
  Switch,
  Dropdown,
  Space,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useCreateReport } from '../../hooks/useReports';
import { isFormValidationError } from '../../utils/error';

const { Title } = Typography;
const { TextArea } = Input;

const widgetOptions: MenuProps['items'] = [
  { key: 'chart', label: 'Chart Widget' },
  { key: 'table', label: 'Table Widget' },
  { key: 'summary', label: 'Summary Widget' },
  { key: 'metric', label: 'Metric Widget' },
];

export const CreateReport = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const createReportMutation = useCreateReport();
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [widgets, setWidgets] = useState<string[]>([]);

  const handleBack = () => {
    navigate('/reports');
  };

  const handleAddWidget: MenuProps['onClick'] = ({ key }) => {
    if (key && !widgets.includes(String(key))) {
      setWidgets([...widgets, String(key)]);
      message.success(`Added ${key} widget`);
    } else if (key) {
      message.info('Widget already added');
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();

      await createReportMutation.mutateAsync({
        name: values.name,
        description: values.description || '',
        type: 'VULNERABILITY',
        downloadFormats: ['pdf'],
        createdBy: 'Admin',
      });

      message.success('Report created successfully');
      navigate('/reports');
    } catch (error: unknown) {
      if (isFormValidationError(error)) {
        // Form validation error
        return;
      }
      message.error('Failed to create report');
    }
  };

  const handleReset = () => {
    form.resetFields();
    setEnableSchedule(false);
    setWidgets([]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Space align="center" size={12}>
          <ArrowLeftOutlined
            style={{ fontSize: 16, color: '#1890ff', cursor: 'pointer' }}
            onClick={handleBack}
          />
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            Create Report
          </Title>
        </Space>
      </div>

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          timeline: dayjs(),
        }}
      >
        {/* Name */}
        <Form.Item
          name="name"
          label={<span><span style={{ color: '#ff4d4f' }}>*</span> Name</span>}
          rules={[{ required: true, message: 'Please enter report name' }]}
        >
          <Input placeholder="Report Name" size="large" />
        </Form.Item>

        {/* Description */}
        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea
            placeholder="Description"
            rows={4}
            style={{ resize: 'vertical' }}
          />
        </Form.Item>

        {/* Timeline */}
        <Form.Item
          name="timeline"
          label={<span><span style={{ color: '#ff4d4f' }}>*</span> Timeline</span>}
          rules={[{ required: true, message: 'Please select timeline' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            size="large"
            format="YYYY-MM-DD"
            placeholder="Today"
          />
        </Form.Item>

        {/* Add New Widget */}
        <Form.Item>
          <Dropdown
            menu={{ items: widgetOptions, onClick: handleAddWidget }}
            trigger={['click']}
          >
            <Button icon={<PlusOutlined />}>
              Add New Widget <DownOutlined />
            </Button>
          </Dropdown>
          {widgets.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#8c8c8c' }}>
                Added widgets: {widgets.join(', ')}
              </span>
            </div>
          )}
        </Form.Item>

        {/* Enable Report Schedule */}
        <Form.Item label="Enable Report Schedule">
          <Switch
            checked={enableSchedule}
            onChange={setEnableSchedule}
          />
        </Form.Item>

        {/* Schedule options (shown when enabled) */}
        {enableSchedule && (
          <div style={{
            padding: 16,
            backgroundColor: '#fafafa',
            borderRadius: 8,
            marginBottom: 24
          }}>
            <Form.Item
              name="scheduleFrequency"
              label="Schedule Frequency"
              rules={[{ required: enableSchedule, message: 'Please select frequency' }]}
            >
              <Input placeholder="e.g., Daily, Weekly, Monthly" />
            </Form.Item>
            <Form.Item
              name="scheduleTime"
              label="Schedule Time"
            >
              <Input placeholder="e.g., 09:00 AM" />
            </Form.Item>
          </div>
        )}
      </Form>

      {/* Footer Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 48,
        paddingTop: 24,
        borderTop: '1px solid #f0f0f0'
      }}>
        <Button size="large" onClick={handleCreate} loading={createReportMutation.isPending}>
          Create
        </Button>
        <Button size="large" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
};
