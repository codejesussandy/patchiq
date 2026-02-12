import { Button, Card, Col, Divider, Modal, Row, Tag, Typography } from 'antd';
import type { ZeroTouchConfig } from '../../../services/patch.service';

const { Text } = Typography;

interface ViewConfigModalProps {
  open: boolean;
  config: ZeroTouchConfig | null;
  onClose: () => void;
}

export const ViewConfigModal = ({ open, config, onClose }: ViewConfigModalProps) => (
  <Modal title="Configuration Details" open={open} onCancel={onClose}
    footer={[<Button key="close" onClick={onClose}>Close</Button>]} width={700}
  >
    {config && (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text type="secondary">Name</Text>
            <div><strong>{config.name}</strong></div>
          </Col>
          <Col span={12}>
            <Text type="secondary">Status</Text>
            <div><Tag color={config.status === 'ACTIVE' ? 'green' : config.status === 'PAUSED' ? 'orange' : 'default'}>{config.status}</Tag></div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Text type="secondary">Description</Text>
            <div><strong>{config.description || 'N/A'}</strong></div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Text type="secondary">Application Type</Text>
            <div><Tag color="blue">{config.applicationType}</Tag></div>
          </Col>
          <Col span={12}>
            <Text type="secondary">Scope</Text>
            <div><Tag color="green">{config.scope?.replace(/_/g, ' ')}</Tag></div>
          </Col>
        </Row>
        <Divider />
        <Card title="Auto-Deployment Rules" bordered={false} style={{ backgroundColor: '#fafafa' }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text type="secondary">Severity Levels</Text>
              <div style={{ marginTop: 4 }}>
                {config.autoDeploymentRules?.severity?.map((s) => (
                  <Tag key={s} color="red" style={{ marginBottom: 4 }}>{s}</Tag>
                )) || 'None'}
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Schedule</Text>
              <div><strong>{config.autoDeploymentRules?.schedule || 'N/A'}</strong></div>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Text type="secondary">Approval Required</Text>
              <div><strong>{config.autoDeploymentRules?.approvalRequired ? 'Yes' : 'No'}</strong></div>
            </Col>
          </Row>
        </Card>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Text type="secondary">Created By</Text>
            <div><strong>{config.createdBy || 'N/A'}</strong></div>
          </Col>
          <Col span={12}>
            <Text type="secondary">Created On</Text>
            <div><strong>{config.createdOn || 'N/A'}</strong></div>
          </Col>
        </Row>
      </div>
    )}
  </Modal>
);
