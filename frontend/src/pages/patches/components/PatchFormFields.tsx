import { Form, Input, Select, Row, Col, DatePicker, Switch, Divider, Typography } from 'antd';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Divider orientation={'left' as const} orientationMargin={0} style={{ marginTop: 4, marginBottom: 16 }}>
    <Text strong style={{ fontSize: 13 }}>{children}</Text>
  </Divider>
);

interface PatchFormProps {
  form: ReturnType<typeof Form.useForm>[0];
  tags: Array<{ id: string; name: string }>;
  cveSuggestions: Array<{ cveId: string; severity: string; description: string }>;
  onCveFocus: (software?: string, vendor?: string) => void;
}

export const PatchFormFields = ({ form, tags, cveSuggestions, onCveFocus }: PatchFormProps) => (
  <Form form={form} layout="vertical">
    <SectionTitle>Identity</SectionTitle>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="software" label="Software Name" rules={[{ required: true, message: 'Please enter software name' }]}>
          <Input placeholder="e.g., 7-Zip 24.01" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="platform" label="Platform" rules={[{ required: true, message: 'Please select platform' }]}>
          <Select placeholder="Select platform">
            <Option value="WINDOWS">Windows</Option>
            <Option value="MACOS">MacOS</Option>
            <Option value="LINUX">Linux</Option>
            <Option value="UBUNTU">Ubuntu</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="vendor" label="Vendor"><Input placeholder="e.g., Microsoft, Igor Pavlov" /></Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="product" label="Product"><Input placeholder="e.g., 7-Zip, Visual Studio Code" /></Form.Item>
      </Col>
    </Row>
    <Form.Item name="description" label="Description">
      <TextArea rows={2} placeholder="Brief description of the patch" />
    </Form.Item>

    <SectionTitle>Classification</SectionTitle>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="severity" label="Severity" rules={[{ required: true, message: 'Please select severity' }]}>
          <Select placeholder="Select severity">
            <Option value="CRITICAL">Critical</Option>
            <Option value="HIGH">High</Option>
            <Option value="MEDIUM">Medium</Option>
            <Option value="LOW">Low</Option>
            <Option value="UNSPECIFIED">Unspecified</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
          <Select placeholder="Select category">
            <Option value="Security Updates">Security Updates</Option>
            <Option value="Application Updates">Application Updates</Option>
            <Option value="Critical Updates">Critical Updates</Option>
            <Option value="Feature Packs">Feature Packs</Option>
            <Option value="Driver Updates">Driver Updates</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="tags" label="Tags">
          <Select mode="tags" placeholder="Add tags">
            {tags.map((t) => <Option key={t.id} value={t.name}>{t.name}</Option>)}
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="cveNumbers" label="CVE Numbers">
          <Select
            mode="tags"
            placeholder="e.g., CVE-2024-12345"
            tokenSeparators={[',', ' ']}
            onFocus={() => {
              const software = form.getFieldValue('software');
              const vendor = form.getFieldValue('vendor');
              if (software) onCveFocus(software, vendor);
            }}
          >
            {cveSuggestions.map((s) => (
              <Option key={s.cveId} value={s.cveId}>
                {s.cveId} ({s.severity}) — {s.description.slice(0, 80)}...
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
    </Row>

    <SectionTitle>Technical Details</SectionTitle>
    <Row gutter={16}>
      <Col span={8}><Form.Item name="bulletinId" label="Bulletin ID"><Input placeholder="e.g., MS24-001" /></Form.Item></Col>
      <Col span={8}><Form.Item name="kbNumber" label="KB Number"><Input placeholder="e.g., KB5034441" /></Form.Item></Col>
      <Col span={8}><Form.Item name="publishedAt" label="Release Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
    </Row>
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item name="architecture" label="Architecture">
          <Select placeholder="Select" allowClear>
            <Option value="64 BIT">64-bit</Option>
            <Option value="32 BIT">32-bit</Option>
            <Option value="Universal">Universal</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={8}><Form.Item name="rebootRequired" label="Reboot Required" valuePropName="checked" initialValue={false}><Switch /></Form.Item></Col>
      <Col span={8}><Form.Item name="supportUninstallation" label="Supports Uninstall" valuePropName="checked" initialValue={false}><Switch /></Form.Item></Col>
    </Row>

    <SectionTitle>References</SectionTitle>
    <Row gutter={16}>
      <Col span={12}><Form.Item name="referenceUrl" label="Reference URL"><Input placeholder="https://..." /></Form.Item></Col>
      <Col span={12}>
        <Form.Item name="languagesSupported" label="Languages Supported">
          <Select mode="multiple" placeholder="Select languages" allowClear>
            <Option value="English">English</Option>
            <Option value="Spanish">Spanish</Option>
            <Option value="French">French</Option>
            <Option value="German">German</Option>
            <Option value="Chinese">Chinese</Option>
            <Option value="Japanese">Japanese</Option>
            <Option value="Korean">Korean</Option>
            <Option value="Portuguese">Portuguese</Option>
          </Select>
        </Form.Item>
      </Col>
    </Row>
  </Form>
);
