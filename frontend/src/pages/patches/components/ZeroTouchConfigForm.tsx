import { Card, Checkbox, Form, Input, Radio, Select, Space, Switch } from 'antd';
import type { FormInstance } from 'antd';

const { Option } = Select;

interface ZeroTouchConfigFormProps {
  form: FormInstance;
  applications: Array<{ id: string; name?: string; softwareName?: string }>;
  computers: Array<{ id: string; hostname?: string; name?: string }>;
  groups: Array<{ id: string; name: string }>;
}

export const ZeroTouchConfigForm = ({ form, applications, computers, groups }: ZeroTouchConfigFormProps) => (
  <Form form={form} layout="vertical">
    <Form.Item name="name" label="Configuration Name" rules={[{ required: true, message: 'Please enter configuration name' }]}>
      <Input placeholder="Enter configuration name" />
    </Form.Item>
    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter description' }]}>
      <Input.TextArea rows={3} placeholder="Enter description" />
    </Form.Item>
    <Form.Item name="applicationType" label="Application Type" rules={[{ required: true, message: 'Please select application type' }]} initialValue="ALL">
      <Radio.Group>
        <Space direction="vertical">
          <Radio value="ALL">All Applications</Radio>
          <Radio value="INCLUDE">Include Specific Applications</Radio>
          <Radio value="EXCLUDE">Exclude Specific Applications</Radio>
        </Space>
      </Radio.Group>
    </Form.Item>
    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.applicationType !== cur.applicationType}>
      {({ getFieldValue }) =>
        getFieldValue('applicationType') !== 'ALL' && (
          <Form.Item name="applications" label="Select Applications" rules={[{ required: true, message: 'Please select applications' }]}>
            <Select mode="multiple" placeholder="Select applications">
              {applications.map((app) => <Option key={app.id} value={app.name || app.softwareName}>{app.name || app.softwareName}</Option>)}
            </Select>
          </Form.Item>
        )
      }
    </Form.Item>
    <Form.Item name="scope" label="Scope" rules={[{ required: true, message: 'Please select scope' }]} initialValue="ALL_COMPUTERS">
      <Radio.Group>
        <Space direction="vertical">
          <Radio value="ALL_COMPUTERS">All Computers</Radio>
          <Radio value="SCOPE">Scope</Radio>
          <Radio value="SPECIFIC_GROUPS">Specific Groups</Radio>
        </Space>
      </Radio.Group>
    </Form.Item>
    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope !== cur.scope}>
      {({ getFieldValue }) =>
        getFieldValue('scope') === 'SCOPE' && (
          <Form.Item name="computers" label="Select Computers" rules={[{ required: true, message: 'Please select computers' }]}>
            <Select mode="multiple" placeholder="Search and select computers" showSearch
              filterOption={(input, option) => String(option?.label ?? option?.value ?? '').toLowerCase().includes(input.toLowerCase())}>
              {computers.map((c) => <Option key={c.id} value={c.id}>{c.hostname || c.name || c.id}</Option>)}
            </Select>
          </Form.Item>
        )
      }
    </Form.Item>
    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.scope !== cur.scope}>
      {({ getFieldValue }) =>
        getFieldValue('scope') === 'SPECIFIC_GROUPS' && (
          <Form.Item name="groups" label="Select Groups" rules={[{ required: true, message: 'Please select at least one group' }]}>
            <Select mode="multiple" placeholder="Select groups">
              <Option value="windows_workstations">Windows Workstations</Option>
              <Option value="macos_devices">macOS Devices</Option>
              <Option value="linux_servers">Linux Servers</Option>
            </Select>
          </Form.Item>
        )
      }
    </Form.Item>
    <Card title="Auto-Deployment Rules" bordered={false} style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
      <Form.Item name={['autoDeploymentRules', 'severity']} label="Auto-Deploy for Severity Levels"
        rules={[{ required: true, message: 'Please select at least one severity level' }]}>
        <Checkbox.Group>
          <Space direction="vertical">
            <Checkbox value="CRITICAL">Critical</Checkbox>
            <Checkbox value="HIGH">High</Checkbox>
            <Checkbox value="MEDIUM">Medium</Checkbox>
            <Checkbox value="LOW">Low</Checkbox>
          </Space>
        </Checkbox.Group>
      </Form.Item>
      <Form.Item name={['autoDeploymentRules', 'approvalRequired']} label="Require Approval Before Deployment"
        valuePropName="checked" initialValue={false}>
        <Switch />
      </Form.Item>
      <Form.Item name={['autoDeploymentRules', 'schedule']} label="Deployment Schedule"
        rules={[{ required: true, message: 'Please select schedule' }]} initialValue="IMMEDIATE">
        <Select>
          <Option value="IMMEDIATE">Deploy Immediately</Option>
          <Option value="DAILY">Daily</Option>
          <Option value="WEEKLY">Weekly</Option>
          <Option value="MONTHLY">Monthly</Option>
        </Select>
      </Form.Item>
    </Card>
  </Form>
);
