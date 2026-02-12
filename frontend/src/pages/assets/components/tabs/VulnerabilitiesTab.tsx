import {
  App,
  Row,
  Col,
  Card,
  Tag,
  Typography,
  Space,
  Spin,
  Modal,
  Button,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetVulnerabilities } from '../../../../hooks/useAssets';

const { Text } = Typography;

interface VulnerabilitiesTabProps {
  assetId: string;
}

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    CRITICAL: '#ff4d4f',
    HIGH: '#fa8c16',
    MEDIUM: '#faad14',
    LOW: '#52c41a',
  };
  return colors[severity?.toUpperCase()] || '#d9d9d9';
};

type VulnRecord = {
  id: string;
  cveId: string;
  title: string;
  severity: string;
  cvssScore: number;
  status: string;
  exploitable: boolean;
  description?: string;
  affectedSoftware?: string;
  affectedVersions?: string;
  dateDiscovered?: string;
  datePublished?: string;
  patchVersion?: string;
  exploitAvailable?: boolean;
};

export const VulnerabilitiesTab = ({ assetId }: VulnerabilitiesTabProps) => {
  const { message } = App.useApp();
  const { data: vulnResult, isLoading: loadingVulnerabilities } = useAssetVulnerabilities(assetId);
  const vulnerabilities: VulnRecord[] = (vulnResult?.data || []) as VulnRecord[];

  if (loadingVulnerabilities) return <Spin />;

  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const columns: ColumnsType<VulnRecord> = [
    {
      title: 'CVE ID', dataIndex: 'cveId', key: 'cveId', width: 120,
      sorter: (a, b) => (a.cveId || '').localeCompare(b.cveId || ''),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Title', dataIndex: 'title', key: 'title',
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
      render: (text: string) => <div style={{ fontSize: '14px' }}>{text}</div>,
    },
    {
      title: 'Severity', dataIndex: 'severity', key: 'severity', width: 110,
      sorter: (a, b) => (severityOrder[a.severity?.toUpperCase()] ?? 4) - (severityOrder[b.severity?.toUpperCase()] ?? 4),
      render: (severity: string) => <Tag color={getSeverityColor(severity)} style={{ color: '#000', fontWeight: 600 }}>{severity}</Tag>,
    },
    {
      title: 'CVSS Score', dataIndex: 'cvssScore', key: 'cvssScore', width: 100,
      sorter: (a, b) => (a.cvssScore || 0) - (b.cvssScore || 0),
      render: (score: number) => <div style={{ fontWeight: 600, color: getSeverityColor(score > 8 ? 'CRITICAL' : score > 5 ? 'HIGH' : 'LOW') }}>{score?.toFixed(1) || '0.0'}</div>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      render: (status: string) => {
        let color = 'default';
        if (status === 'Patched') color = 'green';
        else if (status === 'Patch Available') color = 'orange';
        else if (status === 'Unpatched') color = 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Exploit', dataIndex: 'exploitable', key: 'exploitable', width: 80,
      sorter: (a, b) => (a.exploitable === b.exploitable ? 0 : a.exploitable ? -1 : 1),
      render: (exploitable: boolean) => (
        <span style={{ color: exploitable ? '#ff4d4f' : '#52c41a' }}>{exploitable ? '\u25CF In Wild' : '\u25CF Safe'}</span>
      ),
    },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: 'Critical', color: '#ff4d4f', count: vulnerabilities.filter((v) => v.severity?.toUpperCase() === 'CRITICAL').length },
          { label: 'High', color: '#fa8c16', count: vulnerabilities.filter((v) => v.severity?.toUpperCase() === 'HIGH').length },
          { label: 'Medium', color: '#faad14', count: vulnerabilities.filter((v) => v.severity?.toUpperCase() === 'MEDIUM').length },
          { label: 'Patched', color: '#52c41a', count: vulnerabilities.filter((v) => v.status === 'Patched').length },
        ].map(({ label, color, count }) => (
          <Col span={6} key={label}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{count}</div>
                <Text type="secondary" style={{ fontSize: '12px' }}>{label}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Vulnerabilities Table */}
      <Card title="Security Vulnerabilities" size="small" style={{ marginBottom: 24 }}>
        <DataTable
          columns={columns}
          data={vulnerabilities}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} vulnerabilities found` }}
          size="small"
          rowClassName={(record) => record.severity?.toUpperCase() === 'CRITICAL' ? 'vuln-critical-row' : ''}
          onRow={(record) => ({
            onClick: () => {
              Modal.info({
                title: record.title,
                content: (
                  <div>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}><Text type="secondary">CVE ID</Text><div><Text strong>{record.cveId}</Text></div></Col>
                      <Col span={12}><Text type="secondary">Severity</Text><div><Tag color={getSeverityColor(record.severity)}>{record.severity}</Tag></div></Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}><Text type="secondary">CVSS Score</Text><div>{record.cvssScore.toFixed(1)}</div></Col>
                      <Col span={12}><Text type="secondary">Status</Text><div><Tag color={record.status === 'Patched' ? 'green' : record.status === 'Patch Available' ? 'orange' : 'red'}>{record.status}</Tag></div></Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={24}><Text type="secondary">Description</Text><div>{record.description}</div></Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}><Text type="secondary">Affected Software</Text><div>{record.affectedSoftware}</div></Col>
                      <Col span={12}><Text type="secondary">Affected Versions</Text><div>{record.affectedVersions}</div></Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}><Text type="secondary">Date Discovered</Text><div>{record.dateDiscovered}</div></Col>
                      <Col span={12}><Text type="secondary">Date Published</Text><div>{record.datePublished}</div></Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={12}><Text type="secondary">Patch Available</Text><div>{record.patchVersion}</div></Col>
                      <Col span={12}><Text type="secondary">Exploit Available</Text><div><span style={{ color: record.exploitAvailable ? '#ff4d4f' : '#52c41a' }}>{record.exploitAvailable ? '\u25CF Yes' : '\u25CF No'}</span></div></Col>
                    </Row>
                    {record.status !== 'Patched' && (
                      <Row gutter={16} style={{ marginTop: 24 }}>
                        <Col span={24}>
                          <Space>
                            <Button type="primary" onClick={() => message.success('Patch deployment initiated')}>Deploy Patch</Button>
                            <Button onClick={() => message.info('Marked as mitigated')}>Mark as Mitigated</Button>
                          </Space>
                        </Col>
                      </Row>
                    )}
                  </div>
                ),
                okText: 'Close',
                width: 700,
              });
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
};
