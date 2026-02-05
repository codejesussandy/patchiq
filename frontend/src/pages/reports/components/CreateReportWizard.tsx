import { useState, useEffect } from 'react';
import {
  App,
  Modal,
  Steps,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  DatePicker,
  Switch,
  TimePicker,
  Transfer,
  Typography,
  Divider,
  Tag,
} from 'antd';
import type { TransferProps } from 'antd';
import dayjs from 'dayjs';
import { reportsService } from '../../../services/reports.service';
import type {
  Report,
  ReportType,
  ReportFormat,
  CreateReportStep1Data,
  CreateReportStep2Data,
  CreateReportStep3Data,
  ReportFilters,
} from '../../../types/reports.types';
import {
  REPORT_TYPE_LABELS,
  REPORT_COLUMNS,
  REPORT_FILTERS,
} from '../../../types/reports.types';

const { TextArea } = Input;
const { Text } = Typography;
const { RangePicker } = DatePicker;

interface CreateReportWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  report?: Report | null;
}

interface RecordType {
  key: string;
  title: string;
}

export const CreateReportWizard = ({
  open,
  onClose,
  onSuccess,
  mode = 'create',
  report,
}: CreateReportWizardProps) => {
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Wizard state
  const [reportId, setReportId] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && report) {
        // Pre-populate form for edit mode
        setReportId(report.id);
        form.setFieldsValue({
          type: report.type,
          name: report.name,
          description: report.description,
          dateRange: report.filters?.dateRange
            ? [dayjs(report.filters.dateRange.start), dayjs(report.filters.dateRange.end)]
            : undefined,
          severity: report.filters?.severity,
          status: report.filters?.status,
          category: report.filters?.category,
          format: report.format,
          enableSchedule: report.schedule?.enabled || false,
          frequency: report.schedule?.frequency,
          time: report.schedule?.time ? dayjs(report.schedule.time, 'HH:mm') : undefined,
          dayOfWeek: report.schedule?.dayOfWeek,
          dayOfMonth: report.schedule?.dayOfMonth,
          recipients: report.schedule?.recipients || [],
        });
        setSelectedColumns(report.columns || []);
        setAvailableColumns(REPORT_COLUMNS[report.type] || []);
        setAvailableFilters(REPORT_FILTERS[report.type] || []);
      } else {
        // Reset for create mode
        form.resetFields();
        setReportId(null);
        setSelectedColumns([]);
        setAvailableColumns([]);
        setAvailableFilters([]);
      }
      setCurrentStep(0);
    }
  }, [open, mode, report, form]);

  // Update available columns/filters when type changes
  const handleTypeChange = (type: ReportType) => {
    setAvailableColumns(REPORT_COLUMNS[type] || []);
    setAvailableFilters(REPORT_FILTERS[type] || []);
    setSelectedColumns(REPORT_COLUMNS[type]?.slice(0, 5) || []); // Default first 5 columns
  };

  const handleNext = async () => {
    try {
      await form.validateFields();

      if (currentStep === 0) {
        // Step 1: Create draft report
        setLoading(true);
        try {
          const step1Data: CreateReportStep1Data = {
            type: form.getFieldValue('type'),
            name: form.getFieldValue('name'),
            description: form.getFieldValue('description'),
          };

          if (mode === 'create') {
            const response = await reportsService.createReportStep1(step1Data);
            setReportId(response.reportId);
            setAvailableColumns(response.availableColumns);
            setAvailableFilters(response.availableFilters);
            setSelectedColumns(response.availableColumns.slice(0, 5)); // Default first 5 columns
          }
          setCurrentStep(1);
        } catch (error) {
          console.error('Step 1 error:', error);
          message.error('Failed to initialize report');
        } finally {
          setLoading(false);
        }
      } else if (currentStep === 1) {
        // Step 2: Configure filters and columns
        setLoading(true);
        try {
          if (selectedColumns.length === 0) {
            message.error('Please select at least one column');
            setLoading(false);
            return;
          }

          const dateRange = form.getFieldValue('dateRange');
          const filters: ReportFilters = {
            dateRange: dateRange
              ? { start: dateRange[0].toISOString(), end: dateRange[1].toISOString() }
              : undefined,
            severity: form.getFieldValue('severity'),
            status: form.getFieldValue('status'),
            category: form.getFieldValue('category'),
          };

          const step2Data: CreateReportStep2Data = {
            filters,
            columns: selectedColumns,
          };

          if (mode === 'create' && reportId) {
            await reportsService.createReportStep2(reportId, step2Data);
          }
          setCurrentStep(2);
        } catch (error) {
          console.error('Step 2 error:', error);
          message.error('Failed to configure report');
        } finally {
          setLoading(false);
        }
      }
    } catch {
      message.error('Please fill all required fields');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setLoading(true);

      const enableSchedule = form.getFieldValue('enableSchedule');
      const step3Data: CreateReportStep3Data = {
        format: form.getFieldValue('format') as ReportFormat,
        schedule: enableSchedule
          ? {
              enabled: true,
              frequency: form.getFieldValue('frequency'),
              time: form.getFieldValue('time')?.format('HH:mm'),
              dayOfWeek: form.getFieldValue('dayOfWeek'),
              dayOfMonth: form.getFieldValue('dayOfMonth'),
              recipients: form.getFieldValue('recipients') || [],
            }
          : undefined,
      };

      if (mode === 'edit' && report) {
        // Update existing report
        const dateRange = form.getFieldValue('dateRange');
        await reportsService.updateReport(report.id, {
          name: form.getFieldValue('name'),
          description: form.getFieldValue('description'),
          format: step3Data.format,
          columns: selectedColumns,
          filters: {
            dateRange: dateRange
              ? { start: dateRange[0].toISOString(), end: dateRange[1].toISOString() }
              : undefined,
            severity: form.getFieldValue('severity'),
            status: form.getFieldValue('status'),
            category: form.getFieldValue('category'),
          },
          schedule: step3Data.schedule,
        });
        message.success('Report updated successfully');
      } else if (reportId) {
        // Create new report (step 3)
        await reportsService.createReportStep3(reportId, step3Data);
        message.success('Report created successfully. Generation started.');
      }

      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Submit error:', error);
      message.error(mode === 'edit' ? 'Failed to update report' : 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setCurrentStep(0);
    setReportId(null);
    setSelectedColumns([]);
    setAvailableColumns([]);
    setAvailableFilters([]);
    onClose();
  };

  // Transfer data for column selection
  const transferData: RecordType[] = availableColumns.map((col) => ({
    key: col,
    title: col.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
  }));

  const handleTransferChange: TransferProps['onChange'] = (newTargetKeys) => {
    setSelectedColumns(newTargetKeys as string[]);
  };

  // Calculate next run date for display
  const calculateNextRun = (): string => {
    const frequency = form.getFieldValue('frequency');
    const time = form.getFieldValue('time');
    if (!frequency) return 'Not scheduled';

    const now = dayjs();
    let nextRun = now;

    if (frequency === 'daily') {
      if (time) {
        nextRun = now.hour(time.hour()).minute(time.minute()).second(0);
        if (nextRun.isBefore(now)) {
          nextRun = nextRun.add(1, 'day');
        }
      } else {
        nextRun = now.add(1, 'day').startOf('day');
      }
    } else if (frequency === 'weekly') {
      const dayOfWeek = form.getFieldValue('dayOfWeek') || 1;
      nextRun = now.day(dayOfWeek);
      if (nextRun.isBefore(now) || nextRun.isSame(now, 'day')) {
        nextRun = nextRun.add(1, 'week');
      }
      if (time) {
        nextRun = nextRun.hour(time.hour()).minute(time.minute()).second(0);
      }
    } else if (frequency === 'monthly') {
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

  // Render Step 1: Basic Info
  const renderStep1 = () => (
    <div>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="Report Type"
            name="type"
            rules={[{ required: true, message: 'Please select report type' }]}
          >
            <Select
              placeholder="Select report type"
              onChange={handleTypeChange}
              disabled={mode === 'edit'}
            >
              {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label="Report Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter report name' },
              { max: 255, message: 'Name must be less than 255 characters' },
            ]}
          >
            <Input placeholder="Enter report name" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Enter description (optional)" />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  // Render Step 2: Configuration
  const renderStep2 = () => {
    // reportType available for future use
    void (form.getFieldValue('type') as ReportType);

    return (
      <div>
        <Divider titlePlacement="left">Timeline</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Date Range"
              name="dateRange"
              rules={[{ required: true, message: 'Please select date range' }]}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {availableFilters.length > 0 && (
          <>
            <Divider titlePlacement="left">Filters</Divider>
            <Row gutter={16}>
              {availableFilters.includes('severity') && (
                <Col span={12}>
                  <Form.Item label="Severity" name="severity">
                    <Select mode="multiple" placeholder="Select severity" allowClear>
                      <Select.Option value="CRITICAL">Critical</Select.Option>
                      <Select.Option value="HIGH">High</Select.Option>
                      <Select.Option value="MEDIUM">Medium</Select.Option>
                      <Select.Option value="LOW">Low</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
              {availableFilters.includes('status') && (
                <Col span={12}>
                  <Form.Item label="Status" name="status">
                    <Select mode="multiple" placeholder="Select status" allowClear>
                      <Select.Option value="active">Active</Select.Option>
                      <Select.Option value="inactive">Inactive</Select.Option>
                      <Select.Option value="pending">Pending</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
              {availableFilters.includes('category') && (
                <Col span={12}>
                  <Form.Item label="Category" name="category">
                    <Select mode="multiple" placeholder="Select category" allowClear>
                      <Select.Option value="Security">Security</Select.Option>
                      <Select.Option value="Feature">Feature</Select.Option>
                      <Select.Option value="Bugfix">Bugfix</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
              {availableFilters.includes('os') && (
                <Col span={12}>
                  <Form.Item label="Operating System" name="os">
                    <Select mode="multiple" placeholder="Select OS" allowClear>
                      <Select.Option value="Windows">Windows</Select.Option>
                      <Select.Option value="Linux">Linux</Select.Option>
                      <Select.Option value="macOS">macOS</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Row>
          </>
        )}

        <Divider titlePlacement="left">Columns</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Select Columns to Include">
              <Transfer
                dataSource={transferData}
                titles={['Available', 'Selected']}
                targetKeys={selectedColumns}
                onChange={handleTransferChange}
                render={(item) => item.title}
                listStyle={{ width: 250, height: 300 }}
                showSearch
                filterOption={(inputValue, option) =>
                  option.title.toLowerCase().includes(inputValue.toLowerCase())
                }
              />
            </Form.Item>
            <Text type="secondary">
              Selected: {selectedColumns.length} column(s)
            </Text>
          </Col>
        </Row>
      </div>
    );
  };

  // Render Step 3: Format & Schedule
  const renderStep3 = () => {
    const enableSchedule = Form.useWatch('enableSchedule', form);
    const frequency = Form.useWatch('frequency', form);

    return (
      <div>
        <Divider titlePlacement="left">Export Format</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Format"
              name="format"
              rules={[{ required: true, message: 'Please select format' }]}
            >
              <Select placeholder="Select export format">
                <Select.Option value="PDF">PDF</Select.Option>
                <Select.Option value="CSV">CSV</Select.Option>
                <Select.Option value="Excel">Excel</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="left">Schedule</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Enable Schedule" name="enableSchedule" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        {enableSchedule && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Frequency"
                  name="frequency"
                  rules={[{ required: enableSchedule, message: 'Please select frequency' }]}
                >
                  <Select placeholder="Select frequency">
                    <Select.Option value="daily">Daily</Select.Option>
                    <Select.Option value="weekly">Weekly</Select.Option>
                    <Select.Option value="monthly">Monthly</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Time" name="time">
                  <TimePicker format="HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            {frequency === 'weekly' && (
              <Row gutter={16}>
                <Col span={12}>
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
                </Col>
              </Row>
            )}

            {frequency === 'monthly' && (
              <Row gutter={16}>
                <Col span={12}>
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
                </Col>
              </Row>
            )}

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Recipients"
                  name="recipients"
                  rules={[
                    { required: enableSchedule, message: 'Please add at least one recipient' },
                  ]}
                >
                  <Select
                    mode="tags"
                    placeholder="Enter email addresses"
                    tokenSeparators={[',']}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Text type="secondary">
                  Next Run: <Tag color="blue">{calculateNextRun()}</Tag>
                </Text>
              </Col>
            </Row>
          </>
        )}
      </div>
    );
  };

  const stepItems = [
    { title: 'Basic Information' },
    { title: 'Configuration' },
    { title: 'Format & Schedule' },
  ];

  const stepContent = [renderStep1(), renderStep2(), renderStep3()];

  return (
    <Modal
      title={mode === 'edit' ? 'Edit Report' : 'Create Report'}
      open={open}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        currentStep > 0 && (
          <Button key="back" onClick={handlePrevious}>
            Back
          </Button>
        ),
        currentStep < 2 ? (
          <Button key="next" type="primary" onClick={handleNext} loading={loading}>
            Next
          </Button>
        ) : (
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            {mode === 'edit' ? 'Save' : 'Create Report'}
          </Button>
        ),
      ]}
      destroyOnClose
    >
      <Steps current={currentStep} items={stepItems} style={{ marginBottom: 24 }} />
      <Form form={form} layout="vertical" preserve={false}>
        {stepContent[currentStep]}
      </Form>
    </Modal>
  );
};

export default CreateReportWizard;
