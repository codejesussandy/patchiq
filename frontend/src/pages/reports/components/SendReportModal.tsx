import { useEffect } from 'react';
import {
  App,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Descriptions,
} from 'antd';
import { useSendReport } from '../../../hooks/useReports';
import type { Report } from '../../../types/reports.types';
import { REPORT_TYPE_LABELS, REPORT_FORMAT_LABELS } from '../../../types/reports.types';

const { TextArea } = Input;

interface SendReportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  report: Report | null;
}

export const SendReportModal = ({
  open,
  onClose,
  onSuccess,
  report,
}: SendReportModalProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const sendReport = useSendReport();

  useEffect(() => {
    if (open && report) {
      form.setFieldsValue({
        recipients: [],
        subject: `Report: ${report.name}`,
        message: `Please find attached the ${report.name} report.`,
        format: report.format,
      });
    }
  }, [open, report, form]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      if (report) {
        await sendReport.mutateAsync({
          id: report.id,
          data: {
            recipients: values.recipients,
            subject: values.subject,
            message: values.message,
            format: values.format,
          },
        });
        message.success(`Report sent successfully to ${values.recipients.length} recipient(s)`);
        onSuccess();
      }
    } catch {
      message.error('Failed to send report');
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Send Report"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={sendReport.isPending}
      okText="Send"
      width={500}
      destroyOnClose
    >
      {report && (
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Report">{report.name}</Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag>{REPORT_TYPE_LABELS[report.type]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Format">
            <Tag color={report.format === 'PDF' ? 'red' : 'green'}>
              {REPORT_FORMAT_LABELS[report.format]}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          label="Recipients"
          name="recipients"
          rules={[{ required: true, message: 'Please add at least one recipient' }]}
        >
          <Select
            mode="tags"
            placeholder="Enter email addresses"
            tokenSeparators={[',']}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item label="Subject" name="subject">
          <Input placeholder="Email subject" />
        </Form.Item>

        <Form.Item label="Message" name="message">
          <TextArea rows={3} placeholder="Email message (optional)" />
        </Form.Item>

        <Form.Item label="Attachment Format" name="format">
          <Select placeholder="Select format">
            <Select.Option value="PDF">PDF</Select.Option>
            <Select.Option value="CSV">CSV</Select.Option>
            <Select.Option value="Excel">Excel</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SendReportModal;
