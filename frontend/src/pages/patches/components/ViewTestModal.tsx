import { Button, Col, Modal, Row, Tag, Typography } from 'antd';
import type { PatchTest } from '../../../services/patch.service';

const { Text } = Typography;

interface ViewTestModalProps {
  open: boolean;
  test: PatchTest | null;
  onClose: () => void;
}

export const ViewTestModal = ({ open, test, onClose }: ViewTestModalProps) => (
  <Modal title="Test Details" open={open} onCancel={onClose}
    footer={[<Button key="close" onClick={onClose}>Close</Button>]} width={600}
  >
    {test && (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text type="secondary">Name</Text>
            <div><strong>{test.name}</strong></div>
          </Col>
          <Col span={12}>
            <Text type="secondary">Status</Text>
            <div><Tag color={
              test.status === 'APPROVED' ? 'green' :
              test.status === 'REJECTED' ? 'red' :
              test.status === 'IN_PROGRESS' ? 'blue' : 'orange'
            }>{test.status}</Tag></div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Text type="secondary">Description</Text>
            <div><strong>{test.description || 'N/A'}</strong></div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Text type="secondary">Application Type</Text>
            <div><Tag color="blue">{test.applicationType}</Tag></div>
          </Col>
          <Col span={12}>
            <Text type="secondary">Scope</Text>
            <div><Tag color="green">{test.scope?.replace(/_/g, ' ')}</Tag></div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Text type="secondary">Created By</Text>
            <div><strong>{test.createdBy || 'N/A'}</strong></div>
          </Col>
          <Col span={12}>
            <Text type="secondary">Created On</Text>
            <div><strong>{test.createdOn || 'N/A'}</strong></div>
          </Col>
        </Row>
      </div>
    )}
  </Modal>
);
