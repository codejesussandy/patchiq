import { PlusOutlined } from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Row,
  Col,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import { DataTable } from '../../../components/shared/DataTable';
import { sanitizeInput } from '../../../utils/sanitize';

interface Condition {
  id: string;
  attribute: string;
  condition: string;
  value: string;
}

interface Action {
  id: string;
  name: string;
}

interface Remediation {
  id: string;
  name: string;
}

interface PolicyFormModalProps {
  open: boolean;
  mode: 'create' | 'view' | 'edit';
  form: FormInstance;
  conditions: Condition[];
  actions: Action[];
  remediations: Remediation[];
  onConditionsChange: (conditions: Condition[]) => void;
  onActionsChange: (actions: Action[]) => void;
  onRemediationsChange: (remediations: Remediation[]) => void;
  onClose: () => void;
  onSubmit: () => void;
  onSwitchToEdit: () => void;
}

export const PolicyFormModal = ({
  open,
  mode,
  form,
  conditions,
  actions,
  remediations,
  onConditionsChange,
  onActionsChange,
  onRemediationsChange,
  onClose,
  onSubmit,
  onSwitchToEdit,
}: PolicyFormModalProps) => {
  const isView = mode === 'view';

  const emptyBlock = (
    <div
      style={{
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        padding: '40px',
        textAlign: 'center',
        marginBottom: '16px',
        color: '#8c8c8c',
      }}
    >
      No data
    </div>
  );

  return (
    <Modal
      title={
        mode === 'create'
          ? 'Create Alert Configuration'
          : mode === 'view'
          ? 'View Alert Configuration'
          : 'Edit Alert Configuration'
      }
      open={open}
      onCancel={onClose}
      width={750}
      styles={{ body: { maxHeight: 'calc(90vh - 110px)', overflowY: 'auto', paddingTop: '20px' } }}
      footer={
        isView
          ? [
              <Button key="close" onClick={onClose}>Close</Button>,
              <Button key="edit" type="primary" onClick={onSwitchToEdit}>Edit</Button>,
            ]
          : [
              <Button key="submit" type="primary" onClick={onSubmit}>
                {mode === 'create' ? 'Create' : 'Update'}
              </Button>,
              <Button key="reset" onClick={() => form.resetFields()}>Reset</Button>,
            ]
      }
    >
      <Form form={form} layout="vertical" disabled={isView}>
        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please enter a name' }]} style={{ marginBottom: '12px' }}>
          <Input placeholder="Name" size="large" />
        </Form.Item>

        <Form.Item label="Description" name="description" style={{ marginBottom: '20px' }}>
          <Input.TextArea placeholder="Enter description" rows={2} style={{ fontSize: '14px' }} />
        </Form.Item>

        <Row gutter={16} style={{ marginBottom: '20px' }}>
          <Col span={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%' }}>
              <Form.Item name="enabled" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox>Enable</Checkbox>
              </Form.Item>
            </div>
          </Col>
          <Col span={12}>
            <Form.Item label="Module" name="module" style={{ marginBottom: 0 }}>
              <Select
                placeholder="Endpoint"
                options={[
                  { label: 'Endpoint', value: 'Endpoint' },
                  { label: 'Patch', value: 'Patch' },
                  { label: 'Vulnerability', value: 'Vulnerability' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Severity" name="severity" style={{ marginBottom: '20px' }}>
          <Select
            placeholder="Severity"
            options={[
              { label: 'Critical', value: 'CRITICAL' },
              { label: 'High', value: 'HIGH' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Low', value: 'LOW' },
            ]}
          />
        </Form.Item>

        <Row gutter={16} style={{ marginBottom: '20px' }}>
          <Col span={12}>
            <Form.Item label="Scope" name="scope" style={{ marginBottom: 0 }}>
              <Select
                placeholder="Scope"
                options={[
                  { label: 'All Endpoints', value: 'All Endpoints' },
                  { label: 'Selected Groups', value: 'Selected Groups' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Endpoints" name="endpoints" style={{ marginBottom: 0 }}>
              <Input placeholder="Please Select" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Channel" name="channel" rules={[{ required: true, message: 'Please select a channel' }]} style={{ marginBottom: '12px' }}>
          <Select
            placeholder="Select channel"
            options={[
              { label: 'SMTP', value: 'SMTP' },
              { label: 'AWS SNS', value: 'AWS SNS' },
              { label: 'HTTP', value: 'HTTP' },
              { label: 'Custom', value: 'Custom' },
            ]}
          />
        </Form.Item>

        <Form.Item label="Recipients" name="recipients" rules={[{ required: true, message: 'Please enter recipients' }]} style={{ marginBottom: '20px' }}>
          <Input.TextArea placeholder="Enter recipient email addresses or endpoints" rows={2} />
        </Form.Item>

        {/* Conditions */}
        <div style={{ marginTop: '24px', marginBottom: '12px' }}>
          <Typography.Text strong style={{ fontSize: '14px', color: '#262626' }}>Conditions</Typography.Text>
        </div>
        {conditions.length > 0 ? (
          <div style={{ backgroundColor: '#f5f5f5', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
            <DataTable
              columns={[
                { title: 'Attribute', dataIndex: 'attribute', key: 'attribute', width: '30%',
                  render: (text: string, _: Condition, index: number) => isView ? <span>{text || '\u2014'}</span> : (
                    <Input value={text} onChange={(e) => { const u = [...conditions]; u[index].attribute = e.target.value; onConditionsChange(u); }} placeholder="Attribute" size="small" />
                  ),
                },
                { title: 'Condition', dataIndex: 'condition', key: 'condition', width: '30%',
                  render: (text: string, _: Condition, index: number) => isView ? <span>{text || '\u2014'}</span> : (
                    <Input value={text} onChange={(e) => { const u = [...conditions]; u[index].condition = e.target.value; onConditionsChange(u); }} placeholder="Condition" size="small" />
                  ),
                },
                { title: 'Value', dataIndex: 'value', key: 'value', width: '30%',
                  render: (text: string, _: Condition, index: number) => isView ? <span>{text || '\u2014'}</span> : (
                    <Input value={text} onChange={(e) => { const u = [...conditions]; u[index].value = e.target.value; onConditionsChange(u); }} placeholder="Value" size="small" />
                  ),
                },
                { title: '', key: 'action', width: '10%',
                  render: (_: unknown, __: Condition, index: number) => !isView && (
                    <Button type="text" danger size="small" onClick={() => onConditionsChange(conditions.filter((_, i) => i !== index))} style={{ padding: '0 4px' }}>Delete</Button>
                  ),
                },
              ]}
              data={conditions}
              rowKey="id"
              pagination={false}
              size="small"
              style={{ marginBottom: '12px' }}
            />
          </div>
        ) : emptyBlock}
        {!isView && (
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => onConditionsChange([...conditions, { id: Date.now().toString(), attribute: '', condition: '', value: '' }])} style={{ marginBottom: '24px' }}>
            Add Condition
          </Button>
        )}

        {/* Actions */}
        <div style={{ marginTop: '20px', marginBottom: '12px' }}>
          <Typography.Text strong style={{ fontSize: '14px', color: '#262626' }}>Add Actions</Typography.Text>
        </div>
        {actions.length > 0 ? (
          <div style={{ backgroundColor: '#f5f5f5', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
            {actions.map((action, index) => (
              <div key={action.id} style={{ display: 'flex', gap: '8px', marginBottom: index === actions.length - 1 ? 0 : '8px', alignItems: 'center' }}>
                <Input value={action.name} onChange={(e) => { const u = [...actions]; u[index].name = e.target.value; onActionsChange(u); }} placeholder="Action" size="small" disabled={isView} />
                {!isView && <Button type="text" danger size="small" onClick={() => onActionsChange(actions.filter((_, i) => i !== index))} style={{ padding: '0 4px' }}>Delete</Button>}
              </div>
            ))}
          </div>
        ) : emptyBlock}
        {!isView && (
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => onActionsChange([...actions, { id: Date.now().toString(), name: '' }])} style={{ marginBottom: '24px' }}>
            Add Action
          </Button>
        )}

        {/* Remediations */}
        <div style={{ marginTop: '20px', marginBottom: '12px' }}>
          <Typography.Text strong style={{ fontSize: '14px', color: '#262626' }}>Add Remediations</Typography.Text>
        </div>
        {remediations.length > 0 ? (
          <div style={{ backgroundColor: '#f5f5f5', borderRadius: '4px', padding: '12px', marginBottom: '16px' }}>
            {remediations.map((remediation, index) => (
              <div key={remediation.id} style={{ display: 'flex', gap: '8px', marginBottom: index === remediations.length - 1 ? 0 : '8px', alignItems: 'center' }}>
                <Input value={remediation.name} onChange={(e) => { const u = [...remediations]; u[index].name = e.target.value; onRemediationsChange(u); }} placeholder="Remediation" size="small" disabled={isView} />
                {!isView && <Button type="text" danger size="small" onClick={() => onRemediationsChange(remediations.filter((_, i) => i !== index))} style={{ padding: '0 4px' }}>Delete</Button>}
              </div>
            ))}
          </div>
        ) : emptyBlock}
        {!isView && (
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => onRemediationsChange([...remediations, { id: Date.now().toString(), name: '' }])}>
            Add Remediation
          </Button>
        )}
      </Form>
    </Modal>
  );
};
