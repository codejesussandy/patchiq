import { Button, Modal, Form, Select, DatePicker } from 'antd';

const { Option } = Select;

interface PatchFilterModalProps {
  open: boolean;
  filterForm: ReturnType<typeof Form.useForm>[0];
  onSubmit: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const PatchFilterModal = ({ open, filterForm, onSubmit, onReset, onClose }: PatchFilterModalProps) => (
  <Modal
    title="Filter Patches"
    open={open}
    onCancel={onClose}
    width={600}
    footer={[
      <Button key="reset" onClick={onReset}>Reset</Button>,
      <Button key="cancel" onClick={onClose}>Cancel</Button>,
      <Button key="apply" type="primary" onClick={onSubmit}>Apply Filters</Button>,
    ]}
  >
    <Form form={filterForm} layout="vertical">
      <Form.Item name="severity" label="Severity">
        <Select mode="multiple" placeholder="Select severity levels" allowClear>
          <Option value="CRITICAL">Critical</Option>
          <Option value="HIGH">High</Option>
          <Option value="MEDIUM">Medium</Option>
          <Option value="LOW">Low</Option>
          <Option value="UNSPECIFIED">Unspecified</Option>
        </Select>
      </Form.Item>
      <Form.Item name="os" label="Operating System">
        <Select mode="multiple" placeholder="Select operating systems" allowClear>
          <Option value="WINDOWS">Windows</Option>
          <Option value="MACOS">MacOS</Option>
          <Option value="UBUNTU">Ubuntu</Option>
          <Option value="LINUX">Linux</Option>
        </Select>
      </Form.Item>
      <Form.Item name="category" label="Category">
        <Select mode="multiple" placeholder="Select categories" allowClear>
          <Option value="Security Updates">Security Updates</Option>
          <Option value="Application Updates">Application Updates</Option>
          <Option value="Critical Updates">Critical Updates</Option>
        </Select>
      </Form.Item>
      <Form.Item name="dateRange" label="Release Date Range">
        <DatePicker.RangePicker style={{ width: '100%' }} showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" />
      </Form.Item>
    </Form>
  </Modal>
);
