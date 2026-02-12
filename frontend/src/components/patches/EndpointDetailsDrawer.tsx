import { useState, useEffect } from 'react';
import {
  DesktopOutlined,
  ApiOutlined,
  HddOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  LinkOutlined } from '@ant-design/icons';
import {
  App,
  Drawer,
  Typography,
  Tag,
  Tabs,
  Row,
  Col,
  Card,
  Statistic,
  Space,
  Spin,
  Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { patchService, type EndpointDetails, type AssetRelatedPatch, type EndpointRelatedPatch } from '../../services/patch.service';
import { DataTable } from '../shared/DataTable';
import { SeverityBadge } from './SeverityBadge';

const { Title, Text } = Typography;

type EndpointDetailsDrawerProps = {
  open: boolean;
  endpointId: string | null;
  onClose: () => void;
};

export const EndpointDetailsDrawer = ({
  open,
  endpointId,
  onClose }: EndpointDetailsDrawerProps) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [endpoint, setEndpoint] = useState<EndpointDetails | null>(null);

  const fetchEndpointDetails = async (id: string) => {
    setLoading(true);
    try {
      const data = await patchService.getEndpointDetails(id);
      setEndpoint(data);
    } catch {
      message.error('Failed to fetch endpoint details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && endpointId) {
      fetchEndpointDetails(endpointId);
    }
  }, [open, endpointId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
      case 'CONNECTED':
      case 'SUCCESS':
      case 'INSTALLED':
        return 'success';
      case 'OFFLINE':
      case 'DISCONNECTED':
      case 'FAILED':
        return 'error';
      case 'PENDING':
      case 'MISSING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
      case 'CONNECTED':
      case 'SUCCESS':
      case 'INSTALLED':
        return <CheckCircleOutlined />;
      case 'OFFLINE':
      case 'DISCONNECTED':
      case 'FAILED':
        return <CloseCircleOutlined />;
      case 'PENDING':
        return <SyncOutlined spin />;
      case 'MISSING':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  const handlePatchClick = (patchId: string) => {
    onClose();
    navigate(`/patches/${patchId}`);
  };

  const handleAssetClick = () => {
    if (endpoint?.assetId) {
      onClose();
      navigate(`/assets/${endpoint.assetId}`);
    }
  };

  const handleAgentClick = () => {
    if (endpoint?.agentId) {
      onClose();
      navigate(`/agents`);
    }
  };

  const renderOverviewTab = () => {
    if (!endpoint) return null;

    return (
      <div>
        {/* Patch Summary Stats */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
            Patch Status Summary
          </Title>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Total Patches"
                value={endpoint.patchSummary.total}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Installed"
                value={endpoint.patchSummary.installed}
                styles={{ content: { color: '#52c41a' } }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Missing"
                value={endpoint.patchSummary.missing}
                styles={{ content: { color: '#faad14' } }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Statistic
                title="Pending"
                value={endpoint.patchSummary.pending}
                styles={{ content: { color: '#1890ff' } }}
                prefix={<SyncOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Failed"
                value={endpoint.patchSummary.failed}
                styles={{ content: { color: '#ff4d4f' } }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Last Scan</Text>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {endpoint.patchSummary.lastScanDate}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* System Info */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
            System Information
          </Title>
          <Row gutter={[16, 12]}>
            <Col span={12}>
              <Space>
                <DesktopOutlined style={{ color: '#8c8c8c' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>OS</Text>
                  <div>{endpoint.os} {endpoint.osVersion}</div>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <Space>
                <HddOutlined style={{ color: '#8c8c8c' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Model</Text>
                  <div>{endpoint.manufacturer} {endpoint.model || 'N/A'}</div>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <Space>
                <ApiOutlined style={{ color: '#8c8c8c' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>IP Address</Text>
                  <div>{endpoint.ipAddress || 'N/A'}</div>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <Space>
                <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Location</Text>
                  <div>{endpoint.location || 'N/A'}</div>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <Space>
                <UserOutlined style={{ color: '#8c8c8c' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Owner</Text>
                  <div>{endpoint.owner || 'N/A'}</div>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <Space>
                <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Last Seen</Text>
                  <div>{endpoint.lastSeen}</div>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
    );
  };

  const renderLinkedItemsTab = () => {
    if (!endpoint) return null;

    return (
      <div>
        {/* Agent Link */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={
            <Space>
              <ApiOutlined />
              <span>Agent</span>
            </Space>
          }
          extra={
            endpoint.agentId && (
              <Button type="link" size="small" onClick={handleAgentClick}>
                <LinkOutlined /> View
              </Button>
            )
          }
        >
          {endpoint.agentId ? (
            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary">Name</Text>
                <div><strong>{endpoint.agentName}</strong></div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Version</Text>
                <div>{endpoint.agentVersion}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Status</Text>
                <div>
                  <Tag
                    color={getStatusColor(endpoint.agentStatus || 'Disconnected')}
                    icon={getStatusIcon(endpoint.agentStatus || 'Disconnected')}
                  >
                    {endpoint.agentStatus || 'Disconnected'}
                  </Tag>
                </div>
              </Col>
            </Row>
          ) : (
            <Text type="secondary">No agent linked to this endpoint</Text>
          )}
        </Card>

        {/* Asset Link */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={
            <Space>
              <DesktopOutlined />
              <span>Asset</span>
            </Space>
          }
          extra={
            endpoint.assetId && (
              <Button type="link" size="small" onClick={handleAssetClick}>
                <LinkOutlined /> View
              </Button>
            )
          }
        >
          {endpoint.assetId ? (
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Asset Name</Text>
                <div><strong>{endpoint.assetName}</strong></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Serial Number</Text>
                <div>{endpoint.serialNumber || 'N/A'}</div>
              </Col>
            </Row>
          ) : (
            <Text type="secondary">No asset linked to this endpoint</Text>
          )}
        </Card>

        {/* Groups */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={
            <Space>
              <HddOutlined />
              <span>Endpoint Groups</span>
            </Space>
          }
        >
          {endpoint.groups && endpoint.groups.length > 0 ? (
            <Space wrap>
              {endpoint.groups.map((group) => (
                <Tag key={group.id} color="blue">
                  {group.name}
                </Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">Not assigned to any groups</Text>
          )}
        </Card>
      </div>
    );
  };

  const renderPatchesTab = () => {
    if (!endpoint) return null;

    const columns = [
      {
        title: 'Patch',
        dataIndex: 'name',
        key: 'name',
        render: (name: string, record: EndpointRelatedPatch) => (
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => handlePatchClick(record.id)}
          >
            {name}
          </Button>
        ) },
      {
        title: 'KB',
        dataIndex: 'kbNumber',
        key: 'kbNumber',
        width: 100 },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        width: 100,
        render: (severity: AssetRelatedPatch['severity']) => (
          <SeverityBadge severity={severity} />
        ) },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status}
          </Tag>
        ) },
    ];

    return (
      <DataTable
        data={endpoint.relatedPatches}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 5, size: 'small' }}
      />
    );
  };

  const renderHistoryTab = () => {
    if (!endpoint) return null;

    const columns = [
      {
        title: 'Patch',
        dataIndex: 'patchName',
        key: 'patchName',
        render: (name: string, record: { patchId: string }) => (
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => handlePatchClick(record.patchId)}
          >
            {name}
          </Button>
        ) },
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        width: 120 },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status}
          </Tag>
        ) },
    ];

    return (
      <DataTable
        data={endpoint.recentDeployments}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 5, size: 'small' }}
      />
    );
  };

  return (
    <Drawer
      title={
        <Space>
          <DesktopOutlined />
          <span>{endpoint?.name || 'Endpoint Details'}</span>
          {endpoint && (
            <Tag
              color={getStatusColor(endpoint.status)}
              icon={getStatusIcon(endpoint.status)}
            >
              {endpoint.status}
            </Tag>
          )}
        </Space>
      }
      placement="right"
      styles={{ wrapper: { width: 600 } }}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : endpoint ? (
        <Tabs
          defaultActiveKey="overview"
          size="small"
          tabBarStyle={{ marginBottom: 16 }}
          moreIcon={null}
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: renderOverviewTab() },
            {
              key: 'linked',
              label: 'Linked',
              children: renderLinkedItemsTab() },
            {
              key: 'patches',
              label: `Patches (${endpoint.relatedPatches.length})`,
              children: renderPatchesTab() },
            {
              key: 'history',
              label: 'History',
              children: renderHistoryTab() },
          ]}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Text type="secondary">No endpoint data available</Text>
        </div>
      )}
    </Drawer>
  );
};
