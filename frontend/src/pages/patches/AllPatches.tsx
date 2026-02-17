import { useState, useEffect } from 'react';
import {
  SearchOutlined, FilterOutlined, MoreOutlined, DownloadOutlined, PlusOutlined,
  DeleteOutlined, RocketOutlined, ScanOutlined, AppstoreOutlined, WarningOutlined,
} from '@ant-design/icons';
import { App, Input, Button, Dropdown, Space, Typography, Modal, Form, Tag, Tooltip, theme } from 'antd';
import type { UploadFile } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SeverityBadge, OSIcon } from '../../components/patches';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useAgents } from '../../hooks/useAgents';
import { useModal } from '../../hooks/useModal';
import { usePatches, useDiscoverPatches, useDeletePatch, useCreatePatch, useCreateDeployment } from '../../hooks/usePatches';
import { usePatchTemplates, usePatchTemplateLatestVersion } from '../../hooks/usePatchTemplates';
import { type SoftwareTemplateItem } from '../../services/patch-template.service';
import { type Patch } from '../../services/patch.service';
import { getErrorMessage } from '../../utils/error';
import { BulkAddModal } from './components/BulkAddModal';
import { DeployModal } from './components/DeployModal';
import { PatchCreateEditModal } from './components/PatchCreateEditModal';
import { PatchFilterModal } from './components/PatchFilterModal';
import { TemplatePickerModal } from './components/TemplatePickerModal';

const { Title, Text } = Typography;

export const AllPatches = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: patchesData, isLoading: loading } = usePatches();
  const patches = patchesData?.data || [];
  const discoverPatchesMutation = useDiscoverPatches();
  const deletePatchMutation = useDeletePatch();
  const createPatchMutation = useCreatePatch();
  const createDeploymentMutation = useCreateDeployment();
  const bulkDeleteModal = useModal();
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const osFilter = searchParams.get('os');

  // Create/Edit modal
  const [patchModalVisible, setPatchModalVisible] = useState(false);
  const [editingPatch, setEditingPatch] = useState<Patch | null>(null);
  const [templateInitialValues, setTemplateInitialValues] = useState<Record<string, unknown> | undefined>();

  // Bulk Add
  const [bulkAddModalVisible, setBulkAddModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Filter
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterForm] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<{
    severity?: string[]; os?: string[]; category?: string[];
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  }>({});

  // Deploy
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployForm] = Form.useForm();
  const [deployLoading, setDeployLoading] = useState(false);
  const { data: agents = [] } = useAgents();

  // Template picker
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SoftwareTemplateItem | null>(null);
  const [templateOs, setTemplateOs] = useState('Windows');
  const [templateArch, setTemplateArch] = useState('x64');
  const { data: templates = [], isLoading: templatesLoading } = usePatchTemplates();
  const { data: templateVersionData, isFetching: templateFetching } = usePatchTemplateLatestVersion(
    selectedTemplate?.id || '', templateOs, templateArch,
  );

  // Auto-open create form from URL params
  useEffect(() => {
    if (searchParams.get('createPatch') === 'true') setPatchModalVisible(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openPatchModal = (patch: Patch | null) => { setEditingPatch(patch); setTemplateInitialValues(undefined); setPatchModalVisible(true); };

  const handleTemplateSelect = () => {
    if (!selectedTemplate || !templateVersionData) return;
    const result = templateVersionData;
    setTemplateModalVisible(false);
    setTemplateInitialValues({
      software: result.software, platform: result.os, vendor: result.vendor,
      product: result.product, severity: result.severity, category: result.category,
      architecture: result.architecture, referenceUrl: result.referenceUrl,
      downloadUrl: result.downloadUrl,
      description: `${result.software} update. ${result.vendorData.releaseNotes || ''}`.trim(),
    });
    setEditingPatch(null);
    setPatchModalVisible(true);
    if (result.vendorData.version !== 'latest') {
      message.success(`Fetched ${selectedTemplate.name} v${result.vendorData.version} — review and save`);
    } else {
      message.info(`Template loaded for ${selectedTemplate.name} — fill in version details and save`);
    }
  };

  // Bulk Add
  const handleBulkAddSubmit = async () => {
    if (fileList.length === 0) { message.error('Please upload a file'); return; }
    const file = fileList[0];
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) { message.error('CSV file must have a header row and at least one data row'); return; }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      let successCount = 0; let failCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        try {
          await createPatchMutation.mutateAsync({
            software: row['software'] || row['name'] || '', platform: row['platform'] || row['os'] || 'Windows',
            description: row['description'] || '', category: row['category'] || 'Security Updates',
            severity: row['severity'] || 'Medium', bulletinId: row['bulletinid'] || row['bulletin_id'] || '',
            kbNumber: row['kbnumber'] || row['kb_number'] || row['kb'] || '',
            publishedAt: row['releasedate'] || row['release_date'] || '', architecture: row['architecture'] || '64 BIT',
          });
          successCount++;
        } catch { failCount++; }
      }
      if (successCount > 0) message.success(`Successfully imported ${successCount} patch(es)`);
      if (failCount > 0) message.warning(`Failed to import ${failCount} row(s)`);
      setBulkAddModalVisible(false); setFileList([]);
    } catch { message.error('Failed to process bulk import'); }
  };

  const handleFilterSubmit = () => {
    const values = filterForm.getFieldsValue();
    setActiveFilters({
      severity: values.severity?.length ? values.severity : undefined, os: values.os?.length ? values.os : undefined,
      category: values.category?.length ? values.category : undefined, dateRange: values.dateRange || undefined,
    });
    setFilterModalVisible(false);
  };

  const handleBulkDeleteConfirm = async () => {
    let successCount = 0; let failCount = 0;
    for (const patchId of selectedRowKeys) {
      try { await deletePatchMutation.mutateAsync(patchId as string); successCount++; } catch { failCount++; }
    }
    if (successCount > 0) message.success(`Deleted ${successCount} patch(es)`);
    if (failCount > 0) message.warning(`Failed to delete ${failCount} patch(es)`);
    setSelectedRowKeys([]); bulkDeleteModal.onClose();
  };

  const handleClearFilters = () => { filterForm.resetFields(); setActiveFilters({}); };
  const activeFilterCount = [activeFilters.severity, activeFilters.os, activeFilters.category, activeFilters.dateRange].filter(Boolean).length;

  const getSelectedPatches = (): Patch[] => patches.filter((patch) => selectedRowKeys.includes(patch.id));

  const handleDeploySubmit = async () => {
    try {
      const values = await deployForm.validateFields();
      setDeployLoading(true);
      const selectedPatches = getSelectedPatches();
      const targetAgentIds = values.targetAgentIds as string[];
      if (!targetAgentIds || targetAgentIds.length === 0) { message.error('Please select at least one agent'); setDeployLoading(false); return; }
      await createDeploymentMutation.mutateAsync({
        name: values.deploymentName || `Patch Deployment - ${selectedPatches.length} patches`,
        description: values.description, targetAgentIds,
        patches: selectedPatches.map(p => ({ id: p.id, patchId: p.patchId, kbNumber: p.kbNumber })),
        retryCount: values.retryCount || 1,
      });
      message.success(`Deployment created for ${selectedPatches.length} patch(es) to ${targetAgentIds.length} agent(s)`);
      setDeployModalVisible(false); deployForm.resetFields(); setSelectedRowKeys([]);
      Modal.confirm({ title: 'Deployment Created', content: 'Would you like to view the deployment status?',
        okText: 'View Deployments', cancelText: 'Stay Here', onOk: () => navigate('/patches/deployed') });
    } catch (error: unknown) { message.error(getErrorMessage(error, 'Failed to create deployment')); }
    finally { setDeployLoading(false); }
  };

  const { token } = theme.useToken();

  const columns: ColumnsType<Patch> = [
    { title: 'Software', dataIndex: 'software', key: 'software', width: 350, sorter: (a, b) => (a.software || '').localeCompare(b.software || ''),
      render: (software: string, record: Patch) => (
        <Space size="small">
          <Link
            to={`/patches/${record.id}`}
            style={{ color: token.colorPrimary, fontWeight: 500 }}
          >
            {software}
          </Link>
          {record.supersededBy && record.supersededBy.length > 0 && (
            <Tooltip title={`Superseded by: ${record.supersededBy.join(', ')}`}>
              <Tag color="warning" icon={<WarningOutlined />} style={{ fontSize: 11 }}>Superseded</Tag>
            </Tooltip>
          )}
        </Space>
      ) },
    { title: 'ID', dataIndex: 'patchId', key: 'patchId', width: 150,
      render: (patchId: string, record: Patch) => (
        <Link to={`/patches/${record.id}`} style={{ fontFamily: 'monospace', color: token.colorPrimary }}>
          {patchId}
        </Link>
      ) },
    { title: 'Endpoints', dataIndex: 'endpoints', key: 'endpoints', width: 120, align: 'center', sorter: (a, b) => a.endpoints - b.endpoints },
    { title: 'OS', dataIndex: 'os', key: 'os', width: 150, render: (os: string) => <OSIcon os={os} />,
      filters: [{ text: 'Windows', value: 'WINDOWS' }, { text: 'MacOS', value: 'MACOS' }, { text: 'Ubuntu', value: 'UBUNTU' }, { text: 'Linux', value: 'LINUX' }],
      onFilter: (value, record) => record.os === value },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', width: 140, render: (severity: string) => <SeverityBadge severity={severity} />,
      filters: [{ text: 'Critical', value: 'CRITICAL' }, { text: 'High', value: 'HIGH' }, { text: 'Medium', value: 'MEDIUM' }, { text: 'Low', value: 'LOW' }, { text: 'Unspecified', value: 'UNSPECIFIED' }],
      onFilter: (value, record) => record.severity === value },
    { title: 'Op. Status Since', dataIndex: 'operationalStatusSince', key: 'operationalStatusSince', width: 200 },
  ];

  const filteredPatches = patches.filter((patch) => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = (patch.software || '').toLowerCase().includes(searchLower) || (patch.patchId || '').toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;
    if (osFilter) { if (osFilter === 'LINUX') { if (patch.os !== 'LINUX' && patch.os !== 'UBUNTU') return false; } else if (patch.os !== osFilter) return false; }
    if (activeFilters.severity && !activeFilters.severity.includes(patch.severity)) return false;
    if (activeFilters.os && !activeFilters.os.includes(patch.os)) return false;
    if (activeFilters.category && !activeFilters.category.includes(patch.category)) return false;
    if (activeFilters.dateRange) {
      const [start, end] = activeFilters.dateRange;
      const publishedAt = patch.publishedAt ? dayjs(patch.publishedAt) : null;
      if (!publishedAt || publishedAt.isBefore(start, 'day') || publishedAt.isAfter(end, 'day')) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>{osFilter ? `${osFilter} Patches` : 'All Patches'}</Title>
        <Space>
          <Button icon={<ScanOutlined />} loading={discoverPatchesMutation.isPending} onClick={() => {
            discoverPatchesMutation.mutate(undefined, {
              onSuccess: (result) => { message.success(result.message); },
              onError: (err: unknown) => { message.error(getErrorMessage(err, 'Discovery failed')); },
            });
          }}>Discover Patches</Button>
          <Button onClick={() => setBulkAddModalVisible(true)}>Bulk Add</Button>
          <Button icon={<AppstoreOutlined />} onClick={() => { setTemplateModalVisible(true); setSelectedTemplate(null); setTemplateSearch(''); }}>From Template</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openPatchModal(null)}>Create Patch</Button>
        </Space>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Input placeholder="Search" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Button icon={<FilterOutlined />} onClick={() => setFilterModalVisible(true)}>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Button>
          {activeFilterCount > 0 && <Button type="link" size="small" onClick={handleClearFilters}>Clear filters</Button>}
        </Space>
        {selectedRowKeys.length > 0 && (
          <Space>
            <Text strong>{selectedRowKeys.length} Selected</Text>
            <Button type="primary" icon={<RocketOutlined />} onClick={() => { if (selectedRowKeys.length === 0) { message.warning('Please select at least one patch to deploy'); return; } setDeployModalVisible(true); }}>Deploy</Button>
            <Dropdown menu={{ items: [
              { key: 'download', label: 'Download CSV', icon: <DownloadOutlined />, onClick: () => {
                const selected = getSelectedPatches(); if (selected.length === 0) return;
                const headers = ['Software', 'Patch ID', 'OS', 'Severity', 'Category', 'KB Number', 'Release Date'];
                const csvContent = [headers.join(','), ...selected.map((p) =>
                  [p.software, p.patchId, p.os, p.severity, p.category, p.kbNumber, p.publishedAt || '']
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
                link.download = `patches_${new Date().toISOString().split('T')[0]}.csv`; link.click();
                message.success(`Exported ${selected.length} patch(es)`);
              }},
              { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => { bulkDeleteModal.onOpen(null); }},
            ]}}>
              <Button icon={<MoreOutlined />} aria-label="More actions" />
            </Dropdown>
          </Space>
        )}
      </div>

      <DataTable
        size="middle"
        rowSelection={{ selectedRowKeys, onChange: (keys: React.Key[]) => setSelectedRowKeys(keys) }}
        columns={columns} data={filteredPatches} rowKey="id" loading={loading}
        onRow={(record) => ({ onClick: () => navigate(`/patches/${record.id}`), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Total ${total} patches found` }}
        scroll={{ x: 1200 }} style={{ marginBottom: '16px' }}
      />

      <PatchCreateEditModal open={patchModalVisible} editingPatch={editingPatch} initialValues={templateInitialValues}
        onClose={() => { setPatchModalVisible(false); setEditingPatch(null); setTemplateInitialValues(undefined); }} />

      <BulkAddModal open={bulkAddModalVisible} fileList={fileList} onFileChange={setFileList}
        onSubmit={handleBulkAddSubmit} onCancel={() => { setBulkAddModalVisible(false); setFileList([]); }} />

      <PatchFilterModal open={filterModalVisible} filterForm={filterForm}
        onSubmit={handleFilterSubmit} onReset={() => { filterForm.resetFields(); setActiveFilters({}); setFilterModalVisible(false); }}
        onClose={() => setFilterModalVisible(false)} />

      <DeployModal open={deployModalVisible} deployForm={deployForm} selectedPatches={getSelectedPatches()}
        agents={agents} loading={deployLoading} onSubmit={handleDeploySubmit}
        onCancel={() => { setDeployModalVisible(false); deployForm.resetFields(); }} />

      <ConfirmModal title="Delete Patches" description={`Are you sure you want to delete ${selectedRowKeys.length} selected patch(es)?`}
        open={bulkDeleteModal.open} onConfirm={handleBulkDeleteConfirm} onCancel={bulkDeleteModal.onClose}
        loading={deletePatchMutation.isPending} confirmText="Delete" danger />

      <TemplatePickerModal open={templateModalVisible} templates={templates} templatesLoading={templatesLoading}
        templateFetching={templateFetching} selectedTemplate={selectedTemplate} templateSearch={templateSearch}
        templateOs={templateOs} templateArch={templateArch} onSearchChange={setTemplateSearch} onOsChange={setTemplateOs}
        onArchChange={setTemplateArch} onSelectTemplate={setSelectedTemplate} onConfirm={handleTemplateSelect}
        onCancel={() => setTemplateModalVisible(false)} />
    </div>
  );
};
