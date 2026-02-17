import { useState, useEffect } from 'react';
import { App, Modal, Steps, Form, Input, Select, Button, Row, Col, DatePicker, Switch, TimePicker, Transfer, Typography, Divider, Tag } from 'antd';
import type { TransferProps } from 'antd';
import dayjs from 'dayjs';
import { useCreateReportStep1, useCreateReportStep2, useCreateReportStep3, useUpdateReport } from '../../../hooks/useReports';
import type { Report, ReportType, ReportFormat, CreateReportStep1Data, CreateReportStep2Data, CreateReportStep3Data, ReportFilters } from '../../../types/reports.types';
import { REPORT_TYPE_LABELS, REPORT_COLUMNS, REPORT_FILTERS } from '../../../types/reports.types';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface RecordType { key: string; title: string; }

const calculateNextRun = (form: ReturnType<typeof Form.useForm>[0]): string => {
  const frequency = form.getFieldValue('frequency');
  const time = form.getFieldValue('time');
  if (!frequency) return 'Not scheduled';
  const now = dayjs();
  let nextRun = now;
  if (frequency === 'DAILY') {
    nextRun = time ? now.hour(time.hour()).minute(time.minute()).second(0) : now.add(1, 'day').startOf('day');
    if (nextRun.isBefore(now)) nextRun = nextRun.add(1, 'day');
  } else if (frequency === 'WEEKLY') {
    const dow = form.getFieldValue('dayOfWeek') || 1;
    nextRun = now.day(dow);
    if (nextRun.isBefore(now) || nextRun.isSame(now, 'day')) nextRun = nextRun.add(1, 'week');
    if (time) nextRun = nextRun.hour(time.hour()).minute(time.minute()).second(0);
  } else if (frequency === 'MONTHLY') {
    nextRun = now.date(form.getFieldValue('dayOfMonth') || 1);
    if (nextRun.isBefore(now)) nextRun = nextRun.add(1, 'month');
    if (time) nextRun = nextRun.hour(time.hour()).minute(time.minute()).second(0);
  }
  return nextRun.format('YYYY-MM-DD HH:mm');
};

export const CreateReportWizard = ({ open, onClose, onSuccess, mode = 'create', report }: {
  open: boolean; onClose: () => void; onSuccess: () => void; mode?: 'create' | 'edit'; report?: Report | null;
}) => {
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const step1Mutation = useCreateReportStep1();
  const step2Mutation = useCreateReportStep2();
  const step3Mutation = useCreateReportStep3();
  const updateReportMutation = useUpdateReport();
  const loading = step1Mutation.isPending || step2Mutation.isPending || step3Mutation.isPending || updateReportMutation.isPending;
  const enableSchedule = Form.useWatch('enableSchedule', form);
  const frequency = Form.useWatch('frequency', form);
  const [reportId, setReportId] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect -- sync modal open/edit state */
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && report) {
      setReportId(report.id);
      form.setFieldsValue({
        type: report.type, name: report.name, description: report.description,
        dateRange: report.filters?.dateRange ? [dayjs(report.filters.dateRange.start), dayjs(report.filters.dateRange.end)] : undefined,
        severity: report.filters?.severity, status: report.filters?.status, category: report.filters?.category,
        format: report.format, enableSchedule: report.schedule?.enabled || false, frequency: report.schedule?.frequency,
        time: report.schedule?.time ? dayjs(report.schedule.time, 'HH:mm') : undefined,
        dayOfWeek: report.schedule?.dayOfWeek, dayOfMonth: report.schedule?.dayOfMonth, recipients: report.schedule?.recipients || [],
      });
      setSelectedColumns(report.columns || []); setAvailableColumns(REPORT_COLUMNS[report.type] || []); setAvailableFilters(REPORT_FILTERS[report.type] || []);
    } else {
      form.resetFields(); setReportId(null); setSelectedColumns([]); setAvailableColumns([]); setAvailableFilters([]);
    }
    setCurrentStep(0);
  }, [open, mode, report, form]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleTypeChange = (type: ReportType) => { setAvailableColumns(REPORT_COLUMNS[type] || []); setAvailableFilters(REPORT_FILTERS[type] || []); setSelectedColumns(REPORT_COLUMNS[type]?.slice(0, 5) || []); };

  const handleClose = () => { form.resetFields(); setCurrentStep(0); setReportId(null); setSelectedColumns([]); setAvailableColumns([]); setAvailableFilters([]); onClose(); };

  const handleNext = async () => {
    try {
      await form.validateFields();
      if (currentStep === 0) {
        try {
          const step1Data: CreateReportStep1Data = { type: form.getFieldValue('type'), name: form.getFieldValue('name'), description: form.getFieldValue('description') };
          if (mode === 'create') {
            const response = await step1Mutation.mutateAsync(step1Data);
            setReportId(response.reportId); setAvailableColumns(response.availableColumns); setAvailableFilters(response.availableFilters); setSelectedColumns(response.availableColumns.slice(0, 5));
          }
          setCurrentStep(1);
        } catch { message.error('Failed to initialize report'); }
      } else if (currentStep === 1) {
        try {
          if (selectedColumns.length === 0) { message.error('Please select at least one column'); return; }
          const dateRange = form.getFieldValue('dateRange');
          const filters: ReportFilters = {
            dateRange: dateRange ? { start: dateRange[0].toISOString(), end: dateRange[1].toISOString() } : undefined,
            severity: form.getFieldValue('severity'), status: form.getFieldValue('status'), category: form.getFieldValue('category'),
          };
          const step2Data: CreateReportStep2Data = { filters, columns: selectedColumns };
          if (mode === 'create' && reportId) await step2Mutation.mutateAsync({ reportId, data: step2Data });
          setCurrentStep(2);
        } catch { message.error('Failed to configure report'); }
      }
    } catch { message.error('Please fill all required fields'); }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const enableSchedule = form.getFieldValue('enableSchedule');
      const step3Data: CreateReportStep3Data = {
        format: form.getFieldValue('format') as ReportFormat,
        schedule: enableSchedule ? { enabled: true, frequency: form.getFieldValue('frequency'), time: form.getFieldValue('time')?.format('HH:mm'),
          dayOfWeek: form.getFieldValue('dayOfWeek'), dayOfMonth: form.getFieldValue('dayOfMonth'), recipients: form.getFieldValue('recipients') || [] } : undefined,
      };
      if (mode === 'edit' && report) {
        const dateRange = form.getFieldValue('dateRange');
        await updateReportMutation.mutateAsync({ id: report.id, data: {
          name: form.getFieldValue('name'), description: form.getFieldValue('description'), format: step3Data.format, columns: selectedColumns,
          filters: { dateRange: dateRange ? { start: dateRange[0].toISOString(), end: dateRange[1].toISOString() } : undefined,
            severity: form.getFieldValue('severity'), status: form.getFieldValue('status'), category: form.getFieldValue('category') },
          schedule: step3Data.schedule,
        } });
        message.success('Report updated successfully');
      } else if (reportId) { await step3Mutation.mutateAsync({ reportId, data: step3Data }); message.success('Report created successfully. Generation started.'); }
      handleClose(); onSuccess();
    } catch { message.error(mode === 'edit' ? 'Failed to update report' : 'Failed to create report'); }
  };

  const transferData: RecordType[] = availableColumns.map((col) => ({ key: col, title: col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()) }));
  const handleTransferChange: TransferProps['onChange'] = (newTargetKeys) => { setSelectedColumns(newTargetKeys as string[]); };

  const renderStep1 = () => (
    <div>
      <Form.Item label="Report Type" name="type" rules={[{ required: true, message: 'Please select report type' }]}>
        <Select placeholder="Select report type" onChange={handleTypeChange} disabled={mode === 'edit'}>
          {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
        </Select>
      </Form.Item>
      <Form.Item label="Report Name" name="name" rules={[{ required: true, message: 'Please enter report name' }, { max: 255, message: 'Name must be less than 255 characters' }]}>
        <Input placeholder="Enter report name" />
      </Form.Item>
      <Form.Item label="Description" name="description"><Input.TextArea rows={3} placeholder="Enter description (optional)" /></Form.Item>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <Divider orientation={'left' as const}>Timeline</Divider>
      <Form.Item label="Date Range" name="dateRange" rules={[{ required: true, message: 'Please select date range' }]}><RangePicker style={{ width: '100%' }} /></Form.Item>
      {availableFilters.length > 0 && (<>
        <Divider orientation={'left' as const}>Filters</Divider>
        <Row gutter={16}>
          {availableFilters.includes('severity') && <Col span={12}><Form.Item label="Severity" name="severity">
            <Select mode="multiple" placeholder="Select severity" allowClear options={[{ value: 'CRITICAL', label: 'Critical' }, { value: 'HIGH', label: 'High' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'LOW', label: 'Low' }]} />
          </Form.Item></Col>}
          {availableFilters.includes('status') && <Col span={12}><Form.Item label="Status" name="status">
            <Select mode="multiple" placeholder="Select status" allowClear options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'pending', label: 'Pending' }]} />
          </Form.Item></Col>}
          {availableFilters.includes('category') && <Col span={12}><Form.Item label="Category" name="category">
            <Select mode="multiple" placeholder="Select category" allowClear options={[{ value: 'Security', label: 'Security' }, { value: 'Feature', label: 'Feature' }, { value: 'Bugfix', label: 'Bugfix' }]} />
          </Form.Item></Col>}
          {availableFilters.includes('os') && <Col span={12}><Form.Item label="Operating System" name="os">
            <Select mode="multiple" placeholder="Select OS" allowClear options={[{ value: 'Windows', label: 'Windows' }, { value: 'Linux', label: 'Linux' }, { value: 'macOS', label: 'macOS' }]} />
          </Form.Item></Col>}
        </Row>
      </>)}
      <Divider orientation={'left' as const}>Columns</Divider>
      <Form.Item label="Select Columns to Include">
        <Transfer dataSource={transferData} titles={['Available', 'Selected']} targetKeys={selectedColumns} onChange={handleTransferChange}
          render={(item) => item.title} listStyle={{ width: 250, height: 300 }} showSearch filterOption={(inputValue, option) => option.title.toLowerCase().includes(inputValue.toLowerCase())} />
      </Form.Item>
      <Text type="secondary">Selected: {selectedColumns.length} column(s)</Text>
    </div>
  );

  const renderStep3 = () => {
    return (
      <div>
        <Divider orientation={'left' as const}>Export Format</Divider>
        <Form.Item label="Format" name="format" rules={[{ required: true, message: 'Please select format' }]}>
          <Select placeholder="Select export format" options={[{ value: 'PDF', label: 'PDF' }, { value: 'CSV', label: 'CSV' }, { value: 'Excel', label: 'Excel' }]} />
        </Form.Item>
        <Divider orientation={'left' as const}>Schedule</Divider>
        <Form.Item label="Enable Schedule" name="enableSchedule" valuePropName="checked"><Switch /></Form.Item>
        {enableSchedule && (<>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Frequency" name="frequency" rules={[{ required: enableSchedule, message: 'Please select frequency' }]}>
              <Select placeholder="Select frequency" options={[{ value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} />
            </Form.Item></Col>
            <Col span={12}><Form.Item label="Time" name="time"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          {frequency === 'WEEKLY' && <Row gutter={16}><Col span={12}><Form.Item label="Day of Week" name="dayOfWeek" rules={[{ required: true, message: 'Please select day' }]}>
            <Select placeholder="Select day" options={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => ({ value: i, label: d }))} />
          </Form.Item></Col></Row>}
          {frequency === 'MONTHLY' && <Row gutter={16}><Col span={12}><Form.Item label="Day of Month" name="dayOfMonth" rules={[{ required: true, message: 'Please select day' }]}>
            <Select placeholder="Select day" options={Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} />
          </Form.Item></Col></Row>}
          <Form.Item label="Recipients" name="recipients" rules={[{ required: enableSchedule, message: 'Please add at least one recipient' }]}>
            <Select mode="tags" placeholder="Enter email addresses" tokenSeparators={[',']} style={{ width: '100%' }} />
          </Form.Item>
          <Text type="secondary">Next Run: <Tag color="blue">{calculateNextRun(form)}</Tag></Text>
        </>)}
      </div>
    );
  };

  const stepContent = [renderStep1(), renderStep2(), renderStep3()];

  return (
    <Modal title={mode === 'edit' ? 'Edit Report' : 'Create Report'} open={open} onCancel={handleClose} width={800} destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleClose}>Cancel</Button>,
        currentStep > 0 && <Button key="back" onClick={() => setCurrentStep(currentStep - 1)}>Back</Button>,
        currentStep < 2 ? <Button key="next" type="primary" onClick={handleNext} loading={loading}>Next</Button>
          : <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>{mode === 'edit' ? 'Save' : 'Create Report'}</Button>,
      ]}>
      <Steps current={currentStep} items={[{ title: 'Basic Information' }, { title: 'Configuration' }, { title: 'Format & Schedule' }]} style={{ marginBottom: 24 }} />
      <Form form={form} layout="vertical" preserve={false}>{stepContent[currentStep]}</Form>
    </Modal>
  );
};

export default CreateReportWizard;
