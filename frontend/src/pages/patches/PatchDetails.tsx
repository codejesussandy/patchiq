import { useState } from 'react';
import { ArrowLeftOutlined, EditOutlined, EyeOutlined, RocketOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { formatEnum } from '@shared/types';
import {
  App, Typography, Button, Tabs, Row, Col, Tag, Badge, Divider, Space,
  Breadcrumb, Spin, Modal, Form, Steps, Descriptions, Alert,
} from 'antd';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import { SeverityBadge, EndpointDetailsDrawer, OSIcon } from '../../components/patches';
import { PatchSearchSelect } from '../../components/PatchSearchSelect';
import { ActionMenu } from '../../components/shared/ActionMenu';
import { DataTable } from '../../components/shared/DataTable';
import { RiskScoreDisplay } from '../../components/shared/RiskScoreDisplay';
import { useAgents } from '../../hooks/useAgents';
import { useTags } from '../../hooks/useAssets';
import {
  usePatch, useAffectedSoftwares, usePatchVulnerabilities, usePatchEndpoints,
  useUpdatePatch, useCreateDeployment,
} from '../../hooks/usePatches';
import { usePatchRecommendationsForPatch } from '../../hooks/usePatchRecommendations';
import { useCveSuggestions } from '../../hooks/useVulnerabilities';
import { patchService, type AffectedSoftware, type Endpoint, type Patch } from '../../services/patch.service';
import type { PatchRecommendation } from '../../types/patch-recommendation.types';
import { getErrorMessage } from '../../utils/error';
import { AffectedProductsStep } from './components/AffectedProductsStep';
import { DeployModal } from './components/DeployModal';
import { PatchFormFields } from './components/PatchFormFields';

const { Title, Text } = Typography;

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  const d = dayjs(date);
  return d.isValid() ? d.format('MMM D, YYYY') : '-';
};

export const PatchDetails = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: patch = null, isLoading: loading, refetch } = usePatch(id || '');
  const { data: affectedSoftwares = [] } = useAffectedSoftwares(id || '');
  const { data: vulnerabilities = [] } = usePatchVulnerabilities(id || '');
  const { data: endpoints = [] } = usePatchEndpoints(id || '');
  const { data: recommendationsData } = usePatchRecommendationsForPatch(id || '');
  const recommendations: PatchRecommendation[] = recommendationsData?.data || [];
  const updatePatchMutation = useUpdatePatch();
  const createDeploymentMutation = useCreateDeployment();

  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [endpointDrawerOpen, setEndpointDrawerOpen] = useState(false);

  // Supersedence state
  const [addSupersedenceModalOpen, setAddSupersedenceModalOpen] = useState(false);
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editStep, setEditStep] = useState(0);
  const [form] = Form.useForm();
  const [savingPatch, setSavingPatch] = useState(false);
  const [editAffectedProducts, setEditAffectedProducts] = useState<AffectedSoftware[]>([]);

  // Deploy Modal
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployForm] = Form.useForm();
  const [deployLoading, setDeployLoading] = useState(false);

  const { data: tagOptions = [] } = useTags();
  const { data: agents = [] } = useAgents();
  const [cveSoftwareQuery, setCveSoftwareQuery] = useState('');
  const [cveVendorQuery, setCveVendorQuery] = useState('');
  const { data: cveSuggestions = [] } = useCveSuggestions(cveSoftwareQuery, cveVendorQuery);

  const fetchCveSuggestions = (software?: string, vendor?: string) => {
    setCveSoftwareQuery(software || '');
    setCveVendorQuery(vendor || '');
  };

  // Edit
  const openEditModal = () => {
    if (!patch) return;
    setEditStep(0);
    form.resetFields();
    form.setFieldsValue({
      software: patch.software, platform: patch.platform || patch.os, vendor: patch.vendor,
      product: patch.product, description: patch.description, severity: patch.severity,
      category: patch.category, bulletinId: patch.bulletinId, kbNumber: patch.kbNumber,
      publishedAt: patch.publishedAt ? dayjs(patch.publishedAt) : undefined,
      rebootRequired: patch.rebootRequired ?? false, supportUninstallation: patch.supportUninstallation ?? false,
      architecture: patch.architecture, referenceUrl: patch.referenceUrl,
      languagesSupported: patch.languagesSupported || [], tags: patch.tags || [], cveNumbers: patch.cveNumbers || [],
    });
    setEditModalVisible(true);
  };

  const closeEditModal = () => { setEditModalVisible(false); setEditStep(0); form.resetFields(); setEditAffectedProducts([]); };

  const handleEditNext = async () => {
    if (editStep === 0) {
      try {
        await form.validateFields();
        setSavingPatch(true);
        const values = form.getFieldsValue();
        const payload = {
          software: values.software, platform: values.platform, os: values.platform,
          vendor: values.vendor || undefined, product: values.product || undefined,
          description: values.description || undefined, severity: values.severity, category: values.category,
          bulletinId: values.bulletinId || undefined, kbNumber: values.kbNumber || undefined,
          publishedAt: values.publishedAt?.format('YYYY-MM-DD') || undefined,
          rebootRequired: values.rebootRequired ?? false, supportUninstallation: values.supportUninstallation ?? false,
          architecture: values.architecture || undefined, referenceUrl: values.referenceUrl || undefined,
          languagesSupported: values.languagesSupported || [], tags: values.tags || [], cveNumbers: values.cveNumbers || [],
        };
        await updatePatchMutation.mutateAsync({ id: patch!.id, data: payload });
        const products = await patchService.getAffectedSoftwares(patch!.id);
        setEditAffectedProducts(products);
        setEditStep(1);
      } catch (error) {
        if ((error as { errorFields?: unknown }).errorFields) return;
        message.error('Failed to save patch');
      } finally { setSavingPatch(false); }
    } else {
      message.success('Patch updated successfully');
      closeEditModal();
    }
  };

  // Actions
  const handleStatusChange = async (newStatus: string, actionText: string) => {
    if (!patch) return;
    try {
      await updatePatchMutation.mutateAsync({ id: patch.id, patch: { approvalStatus: newStatus } });
      message.success(`Patch ${actionText} successfully`);
    } catch { message.error(`Failed to ${actionText} patch`); }
  };

  // Deploy
  const handleDeploySubmit = async () => {
    if (!patch) return;
    try {
      const values = await deployForm.validateFields();
      setDeployLoading(true);
      const targetAgentIds = values.targetAgentIds as string[];
      await createDeploymentMutation.mutateAsync({
        name: values.deploymentName || `Deploy ${patch.software}`,
        description: values.description, targetAgentIds,
        patches: [{ id: patch.id, patchId: patch.patchId, name: patch.software }],
        retryCount: values.retryCount || 1,
      });
      message.success(`Deployment created for ${patch.software} to ${targetAgentIds.length} agent(s)`);
      setDeployModalVisible(false);
      deployForm.resetFields();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to create deployment'));
    } finally { setDeployLoading(false); }
  };

  const getActionMenuItems = () => {
    if (!patch) return [];
    const isApproved = patch.approvalStatus === 'APPROVED';
    return [
      { key: 'approve', label: isApproved ? 'Revoke Approval' : 'Approve',
        onClick: () => handleStatusChange(isApproved ? 'PENDING' : 'APPROVED', isApproved ? 'approval revoked' : 'approved') },
      { key: 'decline', label: 'Decline', danger: true,
        onClick: () => handleStatusChange('REJECTED', 'declined') },
    ];
  };

  // Supersedence handlers
  const handleAddSupersedence = async () => {
    if (!selectedPatchId || !patch) return;

    try {
      await patchService.addSupersedence(patch.id, selectedPatchId);
      message.success('Supersedence relationship added successfully');
      setAddSupersedenceModalOpen(false);
      setSelectedPatchId(null);
      setSelectedPatch(null);
      refetch(); // Refresh patch details
    } catch (error: unknown) {
      const errorMsg = (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to add supersedence relationship';
      message.error(errorMsg);
      // eslint-disable-next-line no-console
      console.error('Add supersedence error:', error);
    }
  };

  const handleRemoveSupersedence = (targetPatchId: string) => {
    if (!patch) return;
    Modal.confirm({
      title: 'Remove Supersedence Relationship',
      content: `Are you sure you want to remove the supersedence relationship with patch ${targetPatchId}?`,
      okText: 'Remove',
      okType: 'danger',
      onOk: async () => {
        try {
          await patchService.removeSupersedence(patch.id, targetPatchId);
          message.success('Supersedence relationship removed successfully');
          refetch();
        } catch (error: unknown) {
          const errorMsg = (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to remove supersedence relationship';
          message.error(errorMsg);
          // eslint-disable-next-line no-console
          console.error('Remove supersedence error:', error);
        }
      },
    });
  };

  // Details Tab
  const renderDetailsTab = () => {
    if (!patch) return null;
    const approvalColor = (() => { const s = patch.approvalStatus || ''; if (s === 'APPROVED') return 'success'; if (s === 'REJECTED') return 'error'; return 'default'; })();
    const testColor = (() => { const s = patch.testStatus || ''; if (s === 'TESTED') return 'success'; if (s === 'TEST_FAILED') return 'error'; return 'default'; })();
    return (
      <div>
        <div style={{ background: '#fafafa', borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 4 }}>{patch.software}</Title>
          {patch.description && <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{patch.description}</Text>}
          <Row gutter={[24, 12]}>
            <Col><Text type="secondary">Severity</Text><div><SeverityBadge severity={patch.severity} /></div></Col>
            <Col><Text type="secondary">Category</Text><div><Text strong>{patch.category}</Text></div></Col>
            <Col><Text type="secondary">Platform</Text><div><OSIcon os={patch.os} /></div></Col>
            <Col><Text type="secondary">Approval</Text><div><Tag color={approvalColor}>{formatEnum(patch.approvalStatus || 'PENDING')}</Tag></div></Col>
            <Col><Text type="secondary">Test Status</Text><div><Tag color={testColor}>{formatEnum(patch.testStatus || 'NOT_TESTED')}</Tag></div></Col>
            <Col><Text type="secondary">Endpoints</Text><div><Text strong>{patch.endpoints}</Text></div></Col>
          </Row>
        </div>
        <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Patch ID">{patch.patchId}</Descriptions.Item>
          <Descriptions.Item label="KB Number">{patch.kbNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Bulletin ID">{patch.bulletinId || '-'}</Descriptions.Item>
          <Descriptions.Item label="Architecture">{patch.architecture || '-'}</Descriptions.Item>
          <Descriptions.Item label="Vendor">{patch.vendor || '-'}</Descriptions.Item>
          <Descriptions.Item label="Product">{patch.product || '-'}</Descriptions.Item>
          <Descriptions.Item label="Release Date">{formatDate(patch.publishedAt)}</Descriptions.Item>
          <Descriptions.Item label="Created">{formatDate(patch.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Reboot Required">{patch.rebootRequired ? 'Yes' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Supports Uninstall">{patch.supportUninstallation ? 'Yes' : 'No'}</Descriptions.Item>
          <Descriptions.Item label="Reference URL">
            {patch.referenceUrl ? <a href={patch.referenceUrl} target="_blank" rel="noopener noreferrer">{patch.referenceUrl}</a> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Source">{patch.source || '-'}</Descriptions.Item>
        </Descriptions>
        {(patch.tags?.length > 0 || (patch.cveNumbers && patch.cveNumbers.length > 0)) && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={24}>
              {patch.tags?.length > 0 && (
                <Col span={12}><Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Tags</Text>
                  <Space wrap>{patch.tags.map((tag) => <Tag key={tag} color="blue">{tag}</Tag>)}</Space></Col>
              )}
              {patch.cveNumbers && patch.cveNumbers.length > 0 && (
                <Col span={12}><Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>CVE Numbers</Text>
                  <Space wrap>{patch.cveNumbers.map((cve) => <Tag key={cve} color="orange">{cve}</Tag>)}</Space></Col>
              )}
            </Row>
          </>
        )}
        {/* Supersedence Section - Always show for adding relationships */}
        <>
            <Divider style={{ margin: '16px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              Supersedence
            </Text>

            {/* Superseded By Section */}
            {patch.supersededBy && patch.supersededBy.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  Replaced By (Newer Versions)
                </Text>
                <Space wrap>
                  {patch.supersededBy.map((patchId) => (
                    <Tag
                      key={patchId}
                      color="red"
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleRemoveSupersedence(patchId);
                      }}
                    >
                      {patchId}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* Supersedes Section */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text type="secondary">Replaces (Older Versions)</Text>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setAddSupersedenceModalOpen(true)}
                >
                  Add
                </Button>
              </div>
              {patch.supersedes && patch.supersedes.length > 0 ? (
                <Space wrap>
                  {patch.supersedes.map((patchId) => (
                    <Tag
                      key={patchId}
                      color="green"
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleRemoveSupersedence(patchId);
                      }}
                    >
                      {patchId}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary" italic style={{ fontSize: '13px' }}>
                  No older patches superseded
                </Text>
              )}
            </div>
        </>
      </div>
    );
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}><Spin size="large" /></div>;
  if (!patch) return <div style={{ textAlign: 'center', padding: '50px' }}><Title level={4}>Patch not found</Title><Button type="primary" onClick={() => navigate('/patches')}>Back to All Patches</Button></div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb items={[{ title: <a onClick={() => navigate('/patches')}>All Patches</a> }, { title: patch.software }]} />
      </div>
      {/* Superseded warning banner */}
      {patch.supersededBy && patch.supersededBy.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
          message="This patch has been superseded"
          description={`A newer version is available. This patch has been replaced by: ${patch.supersededBy.join(', ')}. Consider deploying the newer patch instead.`}
        />
      )}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patches')}>Back</Button>
          <Title level={3} style={{ margin: 0 }}>{patch.software}</Title>
          <SeverityBadge severity={patch.severity} />
          {patch.supersededBy && patch.supersededBy.length > 0 && (
            <Tag color="warning" icon={<WarningOutlined />}>Superseded</Tag>
          )}
        </Space>
        <Space>
          <Button icon={<RocketOutlined />} type="primary" onClick={() => {
            if (patch.supersededBy && patch.supersededBy.length > 0) {
              Modal.confirm({
                title: 'Deploy Superseded Patch?',
                icon: <WarningOutlined style={{ color: '#faad14' }} />,
                content: `This patch has been superseded by newer versions (${patch.supersededBy.join(', ')}). Deploying an older patch may leave systems vulnerable. Are you sure you want to proceed?`,
                okText: 'Deploy Anyway',
                okType: 'danger',
                cancelText: 'Cancel',
                onOk: () => setDeployModalVisible(true),
              });
            } else {
              setDeployModalVisible(true);
            }
          }}>Deploy</Button>
          <Button icon={<EditOutlined />} onClick={openEditModal}>Edit</Button>
          <ActionMenu items={getActionMenuItems()} />
        </Space>
      </div>

      <Tabs defaultActiveKey="details" items={[
        { key: 'details', label: 'Details', children: renderDetailsTab() },
        { key: 'endpoints', label: `Endpoints (${endpoints.length})`, children: (
          <DataTable data={endpoints} rowKey="id" columns={[
            { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string, record: Endpoint) => (
              <Button type="link" style={{ padding: 0 }} onClick={() => { setSelectedEndpointId(record.id); setEndpointDrawerOpen(true); }}>{name}</Button>) },
            { title: 'OS', dataIndex: 'os', key: 'os' },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'Online' ? 'success' : 'error'}>{status}</Tag> },
            { title: 'Last Seen', dataIndex: 'lastSeen', key: 'lastSeen' },
            { title: '', key: 'actions', width: 60, render: (_: unknown, record: Endpoint) => (
              <Button type="text" icon={<EyeOutlined />} aria-label="View endpoint details" onClick={() => { setSelectedEndpointId(record.id); setEndpointDrawerOpen(true); }} />) },
          ]} />) },
        { key: 'recommendations', label: `Recommendations (${recommendations.length})`, children: (
          <DataTable data={recommendations} rowKey="id" columns={[
            { title: 'Asset', dataIndex: ['asset', 'name'], key: 'assetName', render: (name: string, record: PatchRecommendation) => (
              <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/assets/${record.asset.id}`)}>{name}</Button>) },
            { title: 'OS', dataIndex: ['asset', 'os'], key: 'os' },
            { title: 'CVE', dataIndex: ['vulnerability', 'cveId'], key: 'cveId', render: (cveId: string, record: PatchRecommendation) => (
              <Button type="link" style={{ padding: 0 }} onClick={() => record.vulnerability?.id ? navigate(`/vulnerability/${record.vulnerability.id}`) : undefined}>
                {cveId}
              </Button>) },
            { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (severity: string) => {
              const colorMap: Record<string, string> = { CRITICAL: '#ff4d4f', HIGH: '#fa8c16', MEDIUM: '#faad14', LOW: '#52c41a' };
              return <Tag color={colorMap[severity] || '#d9d9d9'}>{severity}</Tag>; }},
            { title: 'Risk Score', dataIndex: 'riskScore', key: 'riskScore', render: (score: number | null) => <RiskScoreDisplay score={score} />,
              sorter: (a: PatchRecommendation, b: PatchRecommendation) => (a.riskScore || 0) - (b.riskScore || 0), defaultSortOrder: 'descend' as const },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
              const statusMap: Record<string, 'success' | 'processing' | 'error' | 'warning' | 'default'> = {
                VERIFIED: 'success', DEPLOYED: 'processing', ACCEPTED: 'processing', FAILED: 'error', REJECTED: 'error', RECOMMENDED: 'warning' };
              return <Badge status={statusMap[status] || 'default'} text={status.charAt(0).toUpperCase() + status.slice(1)} />; }},
            { title: 'Affected Software', dataIndex: 'affectedSoftware', key: 'affectedSoftware', render: (text: string) => <Text type="secondary">{text || '-'}</Text> },
          ]} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} recommendations` }} />) },
        { key: 'affected-softwares', label: `Affected Software (${affectedSoftwares.length})`, children: (
          <DataTable data={affectedSoftwares} rowKey="id" columns={[
            { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName', width: 300 },
            { title: 'Version', dataIndex: 'version', key: 'version', width: 180 },
            { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', width: 200 },
            { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 120 },
            { title: 'Installed On', dataIndex: 'installedOn', key: 'installedOn', width: 150, align: 'center' as const },
          ]} pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} affected software` }} />) },
        { key: 'vulnerabilities', label: `Vulnerabilities (${vulnerabilities.length})`, children: (
          <div>
            {vulnerabilities.length > 0 && (() => {
              const sevCounts = vulnerabilities.reduce<Record<string, number>>((acc, v) => {
                const s = (v.severity || '').toUpperCase();
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              }, {});
              return (
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Text strong>This patch addresses {vulnerabilities.length} vulnerabilit{vulnerabilities.length === 1 ? 'y' : 'ies'}</Text>
                  <Space size="small" style={{ marginLeft: 8 }}>
                    {sevCounts.CRITICAL ? <Tag color="red">Critical: {sevCounts.CRITICAL}</Tag> : null}
                    {sevCounts.HIGH ? <Tag color="orange">High: {sevCounts.HIGH}</Tag> : null}
                    {sevCounts.MEDIUM ? <Tag color="gold">Medium: {sevCounts.MEDIUM}</Tag> : null}
                    {sevCounts.LOW ? <Tag color="green">Low: {sevCounts.LOW}</Tag> : null}
                  </Space>
                </div>
              );
            })()}
            <DataTable data={vulnerabilities} rowKey="id" columns={[
              { title: 'CVE Number', dataIndex: 'cveNumber', key: 'cveNumber',
                render: (cveNumber: string, record: { id?: string }) => (
                  <Button type="link" style={{ padding: 0 }} onClick={() => record.id ? navigate(`/vulnerability/${record.id}`) : undefined}>
                    {cveNumber}
                  </Button>
                ) },
              { title: 'Severity', dataIndex: 'severity', key: 'severity', width: 120,
                sorter: (a: { severity?: string }, b: { severity?: string }) => {
                  const order: Record<string, number> = { CRITICAL: 4, Critical: 4, HIGH: 3, High: 3, MEDIUM: 2, Medium: 2, LOW: 1, Low: 1 };
                  return (order[(a.severity || '')] || 0) - (order[(b.severity || '')] || 0);
                },
                defaultSortOrder: 'descend' as const,
                render: (severity: string) => {
                  const colorMap: Record<string, string> = { Critical: 'red', CRITICAL: 'red', High: 'orange', HIGH: 'orange', Medium: 'gold', MEDIUM: 'gold', Low: 'green', LOW: 'green' };
                  return <Tag color={colorMap[severity] || 'default'}>{severity}</Tag>; }},
              { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, width: 400 },
              { title: 'Published Date', dataIndex: 'publishedDate', key: 'publishedDate', width: 140, render: (d: string) => formatDate(d) },
            ]} pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} vulnerabilities` }} />
          </div>) },
      ]} />

      <EndpointDetailsDrawer open={endpointDrawerOpen} endpointId={selectedEndpointId}
        onClose={() => { setEndpointDrawerOpen(false); setSelectedEndpointId(null); }} />

      {/* Edit Patch Modal */}
      <Modal title="Edit Patch" open={editModalVisible} onCancel={closeEditModal} width={800}
        footer={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {editStep > 0 ? <Button onClick={() => setEditStep(0)}>Back</Button> : <div />}
          <Space><Button onClick={closeEditModal}>Cancel</Button>
            <Button type="primary" loading={savingPatch} onClick={handleEditNext}>{editStep === 0 ? 'Next' : 'Done'}</Button></Space>
        </div>}
      >
        <Steps current={editStep} style={{ marginBottom: 24 }} items={[{ title: 'Define Patch' }, { title: 'Affected Products' }]} />
        {editStep === 0 ? (
          <PatchFormFields form={form} tags={tagOptions} cveSuggestions={cveSuggestions} onCveFocus={fetchCveSuggestions} />
        ) : (
          <AffectedProductsStep patchId={patch.id} affectedProducts={editAffectedProducts} setAffectedProducts={setEditAffectedProducts} />
        )}
      </Modal>

      <DeployModal open={deployModalVisible} deployForm={deployForm} selectedPatches={patch ? [patch] : []}
        agents={agents} loading={deployLoading} onSubmit={handleDeploySubmit}
        onCancel={() => { setDeployModalVisible(false); deployForm.resetFields(); }} />

      {/* Add Supersedence Modal */}
      <Modal
        title="Add Supersedence Relationship"
        open={addSupersedenceModalOpen}
        onCancel={() => {
          setAddSupersedenceModalOpen(false);
          setSelectedPatchId(null);
          setSelectedPatch(null);
        }}
        onOk={handleAddSupersedence}
        okText="Add Relationship"
        okButtonProps={{ disabled: !selectedPatchId }}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            Mark <strong>{patch?.title || patch?.software}</strong> as superseding (replacing) an older patch:
          </Text>
        </div>
        <PatchSearchSelect
          value={selectedPatchId || undefined}
          onChange={(patchId, patchObj) => {
            setSelectedPatchId(patchId);
            setSelectedPatch(patchObj || null);
          }}
          excludeIds={[patch?.id || '', ...(patch?.supersedes || [])]}
          placeholder="Search by patch title, ID, or KB number..."
        />
        {selectedPatch && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 4,
            }}
          >
            <Text strong>Selected Patch:</Text>
            <div style={{ marginTop: 8 }}>
              <div>{selectedPatch.title || selectedPatch.software}</div>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                {selectedPatch.patchId}
                {selectedPatch.kbNumber && ` • ${selectedPatch.kbNumber}`}
                {' • '}
                {selectedPatch.severity}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
