import { SearchOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Steps, Tag, Typography, DatePicker } from 'antd';
import type { Patch } from '../../../services/patch.service';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CreateDeploymentModalProps {
  open: boolean;
  form: ReturnType<typeof Form.useForm>[0];
  currentStep: number;
  patches: Patch[];
  selectedPatches: string[];
  groups: Array<{ id: string; name: string }>;
  onStepChange: (step: number) => void;
  onSelectedPatchesChange: (patches: string[]) => void;
  onNext: () => void;
  onCancel: () => void;
}

export const CreateDeploymentModal = ({
  open, form, currentStep, patches, selectedPatches, groups,
  onStepChange, onSelectedPatchesChange, onNext, onCancel,
}: CreateDeploymentModalProps) => (
  <Modal title="Create Deployment" open={open} onCancel={onCancel} width={800}
    footer={
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {currentStep > 0 && <Button onClick={() => onStepChange(0)}>Back</Button>}
        <div style={{ marginLeft: 'auto' }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={onNext} style={{ marginLeft: 8 }}>
            {currentStep === 0 ? 'Next' : 'Preview Deployment'}
          </Button>
        </div>
      </div>
    }
  >
    <Steps current={currentStep} style={{ marginBottom: 24 }}
      items={[{ title: 'Deployment Details' }, { title: 'Select Patches' }]} />
    {currentStep === 0 ? (
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter deployment name' }]}>
          <Input placeholder="Enter deployment name" />
        </Form.Item>
        <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter description' }]}>
          <TextArea rows={3} placeholder="Enter description" />
        </Form.Item>
        <Form.Item name="type" label="Deployment Type" rules={[{ required: true, message: 'Please select type' }]} initialValue="INSTALL">
          <Select><Option value="INSTALL">Install</Option><Option value="ROLLBACK">Rollback</Option></Select>
        </Form.Item>
        <Form.Item name="schedule" label="Schedule" rules={[{ required: true, message: 'Please select schedule' }]}>
          <DatePicker showTime style={{ width: '100%' }} placeholder="Select date and time" />
        </Form.Item>
        <Form.Item name="targetGroups" label="Target Groups" rules={[{ required: true, message: 'Please select target groups' }]}>
          <Select mode="multiple" placeholder="Select groups">
            {groups.map((g) => <Option key={g.id} value={g.id}>{g.name}</Option>)}
          </Select>
        </Form.Item>
      </Form>
    ) : (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Input placeholder="Search patches" prefix={<SearchOutlined />} style={{ width: '100%' }} />
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Checkbox.Group value={selectedPatches} onChange={(v) => onSelectedPatchesChange(v as string[])} style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {patches.map((patch) => (
                <Card key={patch.id} size="small" style={{ marginBottom: 8 }}>
                  <Checkbox value={patch.id}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{patch.software}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{patch.patchId} | {patch.os} | Severity: {patch.severity}</Text>
                    </div>
                  </Checkbox>
                </Card>
              ))}
            </Space>
          </Checkbox.Group>
        </div>
        <div style={{ marginTop: 16 }}><Text strong>{selectedPatches.length} patches selected</Text></div>
      </div>
    )}
  </Modal>
);

interface PreviewDeploymentModalProps {
  open: boolean;
  previewData: Record<string, unknown> | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PreviewDeploymentModal = ({ open, previewData, onConfirm, onCancel }: PreviewDeploymentModalProps) => (
  <Modal title="Preview Deployment" open={open} onCancel={onCancel} onOk={onConfirm} okText="Execute Deployment" width={700}>
    {previewData && (
      <div>
        <Card title="Deployment Details" bordered={false} style={{ marginBottom: 16 }}>
          <p><strong>Name:</strong> {previewData.name as string}</p>
          <p><strong>Description:</strong> {previewData.description as string}</p>
          <p><strong>Type:</strong> <Tag color={previewData.type === 'INSTALL' ? 'blue' : 'red'}>{previewData.type as string}</Tag></p>
          <p><strong>Schedule:</strong> {(previewData.schedule as { format: (s: string) => string })?.format('YYYY-MM-DD HH:mm')}</p>
          <p><strong>Target Groups:</strong> {(previewData.targetGroups as string[])?.join(', ')}</p>
        </Card>
        <Card title="Selected Patches" bordered={false}>
          <p><strong>Total Patches:</strong> {(previewData.selectedPatches as Patch[])?.length}</p>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {(previewData.selectedPatches as Patch[])?.map((patch) => (
              <div key={patch.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 500 }}>{patch.software}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>{patch.patchId} | {patch.os} | {patch.severity}</Text>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )}
  </Modal>
);
