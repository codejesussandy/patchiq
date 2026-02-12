import { useState } from 'react';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ExportOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Row,
  Col,
  Dropdown,
  Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/shared/DataTable';
import { useHubPackages, useDeletePackage } from '../../hooks/useHub';
import type { SoftwarePackage } from '../../types/hub.types';
import { exportToCsv } from './components';
import { SoftwareCatalogCard, type SoftwareItem } from './components/SoftwareCatalogCard';
import { getSoftwareCatalogColumns } from './components/softwareCatalogColumns';

const platformToOs = (platform: string): ('Windows' | 'Mac' | 'Linux')[] => {
  switch (platform) {
    case 'windows': return ['Windows'];
    case 'macos': return ['Mac'];
    case 'linux': return ['Linux'];
    case 'cross-platform': return ['Windows', 'Mac', 'Linux'];
    default: return ['Linux'];
  }
};

const installSourceToType = (source: string): 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP' | 'BUNDLE' => {
  switch (source) {
    case 'msi': return 'MSI';
    case 'exe': return 'EXE';
    case 'zip': return 'ZIP';
    case 'bundle': return 'BUNDLE';
    default: return 'APPLICATION';
  }
};

export const SoftwareJobsCatalog = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const navigate = useNavigate();

  const { data: rawPackages, isLoading: loading, refetch } = useHubPackages({ limit: 100 });
  const deletePackageMutation = useDeletePackage();

  const softwareItems: SoftwareItem[] = ((rawPackages?.data || []) as SoftwarePackage[]).map((pkg: SoftwarePackage) => ({
    id: pkg.id, packageId: pkg.packageId, deploymentId: pkg.packageId,
    name: pkg.name, displayName: pkg.displayName, description: pkg.description || '',
    version: pkg.version, type: installSourceToType(pkg.installSource),
    os: platformToOs(pkg.platform), tags: pkg.tags || [],
    createdBy: pkg.vendor || 'System', hasBundle: pkg.hasBundle || pkg.scriptsIncluded,
    installSource: pkg.installSource,
  }));

  const handleDelete = (id: string) => {
    const item = softwareItems.find(i => i.id === id);
    if (!item) return;
    deletePackageMutation.mutate(item.packageId, {
      onSuccess: () => message.success('Software package deleted successfully'),
      onError: () => message.error('Failed to delete software package'),
    });
  };

  const handleEdit = (id: string) => {
    const item = softwareItems.find(i => i.id === id);
    if (item) {
      message.info('Redirecting to Hub for package editing...');
      navigate('/assets/hub');
    }
  };

  const handleDeploy = (item: SoftwareItem) => {
    navigate('/hub', {
      state: {
        createDeployment: true,
        selectedPackage: {
          id: item.id, packageId: item.packageId, name: item.name,
          displayName: item.displayName, version: item.version,
          installSource: item.installSource, hasBundle: item.hasBundle,
        },
      },
    });
  };

  const handleRefresh = async () => {
    await refetch();
    message.success('Data refreshed successfully');
  };

  const filteredItems = softwareItems.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description.toLowerCase().includes(searchText.toLowerCase()) ||
    item.deploymentId.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleExport = () => {
    exportToCsv(
      filteredItems.length > 0 ? filteredItems : softwareItems,
      [
        { header: 'ID', accessor: (i) => i.deploymentId },
        { header: 'Name', accessor: (i) => i.name },
        { header: 'Description', accessor: (i) => i.description },
        { header: 'OS', accessor: (i) => i.os.join(', ') },
        { header: 'Version', accessor: (i) => i.version },
        { header: 'Type', accessor: (i) => i.type },
        { header: 'Tags', accessor: (i) => i.tags?.join(', ') || '' },
        { header: 'Created By', accessor: (i) => i.createdBy },
      ],
      'software_catalog', message,
    );
  };

  const endpointsMenuItems: MenuProps['items'] = [
    { key: '1', label: 'All Endpoints' },
    { key: '2', label: 'Windows Endpoints' },
    { key: '3', label: 'Mac Endpoints' },
    { key: '4', label: 'Linux Endpoints' },
  ];

  const columns = getSoftwareCatalogColumns({ onDeploy: handleDeploy, onEdit: handleEdit, onDelete: handleDelete });

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Dropdown menu={{ items: endpointsMenuItems }} trigger={['click']}>
            <Button>Endpoints <span style={{ marginLeft: 4 }}>&#9660;</span></Button>
          </Dropdown>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>Refresh</Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>Export</Button>
          <Tooltip title="Add new packages via Hub">
            <Button type="primary" htmlType="button" icon={<PlusOutlined />}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/assets/hub'); }}>
              Add Package
            </Button>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type={viewMode === 'list' ? 'primary' : 'default'} icon={<UnorderedListOutlined />} onClick={() => setViewMode('list')} />
          <Button type={viewMode === 'grid' ? 'primary' : 'default'} icon={<AppstoreOutlined />} onClick={() => setViewMode('grid')} />
        </div>
      </div>

      {viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredItems.map((item) => (
            <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={6}>
              <SoftwareCatalogCard item={item} onDeploy={handleDeploy} onDelete={handleDelete} />
            </Col>
          ))}
        </Row>
      ) : (
        <DataTable
          rowSelection={{ selectedRowKeys, onChange: (selectedKeys: React.Key[]) => setSelectedRowKeys(selectedKeys) }}
          columns={columns} data={filteredItems} rowKey="id" loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  );
};
