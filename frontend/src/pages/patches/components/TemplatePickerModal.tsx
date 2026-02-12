import { SearchOutlined, LoadingOutlined } from '@ant-design/icons';
import { Button, Modal, Input, Select, Row, Col, Spin, Tag, Typography } from 'antd';
import type { SoftwareTemplateItem } from '../../../services/patch-template.service';

const { Text } = Typography;

interface TemplatePickerModalProps {
  open: boolean;
  templates: SoftwareTemplateItem[];
  templatesLoading: boolean;
  templateFetching: boolean;
  selectedTemplate: SoftwareTemplateItem | null;
  templateSearch: string;
  templateOs: string;
  templateArch: string;
  onSearchChange: (value: string) => void;
  onOsChange: (value: string) => void;
  onArchChange: (value: string) => void;
  onSelectTemplate: (t: SoftwareTemplateItem) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TemplatePickerModal = ({
  open, templates, templatesLoading, templateFetching,
  selectedTemplate, templateSearch, templateOs, templateArch,
  onSearchChange, onOsChange, onArchChange, onSelectTemplate, onConfirm, onCancel,
}: TemplatePickerModalProps) => (
  <Modal
    title="Create Patch from Template"
    open={open}
    onCancel={onCancel}
    width={720}
    footer={[
      <Button key="cancel" onClick={onCancel}>Cancel</Button>,
      <Button key="fetch" type="primary" disabled={!selectedTemplate} loading={templateFetching} onClick={onConfirm}>
        {templateFetching ? 'Fetching latest version...' : 'Fetch & Create Patch'}
      </Button>,
    ]}
  >
    {templatesLoading ? (
      <div style={{ textAlign: 'center', padding: 40 }}><Spin indicator={<LoadingOutlined spin />} size="large" /></div>
    ) : (
      <>
        <Input placeholder="Search software..." prefix={<SearchOutlined />} style={{ marginBottom: 12 }} value={templateSearch} onChange={(e) => onSearchChange(e.target.value)} />
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={12}>
            <Select value={templateOs} onChange={onOsChange} style={{ width: '100%' }} options={[
              { value: 'Windows', label: 'Windows' }, { value: 'MacOS', label: 'macOS' },
              { value: 'Linux', label: 'Linux' }, { value: 'Ubuntu', label: 'Ubuntu' },
            ]} />
          </Col>
          <Col span={12}>
            <Select value={templateArch} onChange={onArchChange} style={{ width: '100%' }} options={[
              { value: 'x64', label: 'x64 (64-bit)' }, { value: 'arm64', label: 'ARM64' },
            ]} />
          </Col>
        </Row>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {templates
            .filter((t) => {
              const q = templateSearch.toLowerCase();
              return (!q || t.name.toLowerCase().includes(q) || t.vendor.toLowerCase().includes(q)) &&
                t.supportedOs.some((os) => os.toLowerCase() === templateOs.toLowerCase());
            })
            .map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                style={{
                  padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                  border: selectedTemplate?.id === t.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  background: selectedTemplate?.id === t.id ? '#e6f7ff' : '#fafafa',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <Text strong>{t.name}</Text><br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{t.vendor}</Text>
                </div>
                <Tag color={t.category === 'A' ? 'green' : t.category === 'B' ? 'blue' : 'orange'}>
                  {t.category === 'A' ? 'Auto' : t.category === 'B' ? 'Semi' : 'Manual'}
                </Tag>
              </div>
            ))}
        </div>
      </>
    )}
  </Modal>
);
