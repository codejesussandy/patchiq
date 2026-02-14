import { useState } from 'react';
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  MoreOutlined,
  DownOutlined,
  DownloadOutlined,
  UploadOutlined,
  CloudDownloadOutlined } from '@ant-design/icons';
import { formatEnum } from '@shared/types';
import type { MenuProps } from 'antd';
import {
  App,
  Input,
  Button,
  Tag,
  Space,
  Typography,
  Dropdown,
  Modal,
  Tooltip,
  Row,
  Col,
  Form,
  Select,
  Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnSettingsDrawer, useColumnConfig } from '../../components/ColumnSettingsDrawer';
import type { ColumnConfig } from '../../components/ColumnSettingsDrawer';
import { TableSettingsIcon } from '../../components/icons/TableSettingsIcon';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useAssetsList, useCategories, useSubCategories, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { useModal } from '../../hooks/useModal';
import { useTableParams } from '../../hooks/useTableParams';
import type { Asset } from '../../types/asset.types';
import { AddAssetModal } from './components/AddAssetModal';
import { DownloadAgentModal } from './components/allassets/DownloadAgentModal';

const { Title } = Typography;

const defaultColumnConfig: ColumnConfig[] = [
  { key: 'assetId', title: 'Asset ID', visible: true, pinned: false, width: 200, group: 'Basic' },
  { key: 'name', title: 'Asset Name', visible: false, pinned: false, width: 120, group: 'Basic' },
  { key: 'networkIdentity', title: 'Network Identity', visible: true, pinned: false, width: 180, group: 'Basic' },
  { key: 'category', title: 'Category', visible: true, pinned: false, width: 180, group: 'Organization' },
  { key: 'operationalStatus', title: 'Operational Status', visible: true, pinned: false, width: 150, group: 'Status' },
  { key: 'status', title: 'Status', visible: true, pinned: false, width: 150, group: 'Status' },
  { key: 'operationalStatusSince', title: 'Op. Status Since', visible: true, pinned: false, width: 140, group: 'Status' },
  { key: 'operationalStatusDuration', title: 'Op. Status Duration', visible: true, pinned: false, width: 160, group: 'Status' },
  { key: 'action', title: 'Actions', visible: true, pinned: false, required: true, width: 50, group: 'Actions' },
];

const STORAGE_KEY = 'assets_column_config_v3';

interface AssetFilters {
  status: string;
  operationalStatus: string;
  categoryId: string;
}

export function AllAssets() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Server-side pagination, search, sort, and filters
  const table = useTableParams<AssetFilters>({
    defaultPageSize: 20,
    defaultSort: { field: 'createdAt', order: 'desc' },
    defaultFilters: { status: '', operationalStatus: '', categoryId: '' },
  });

  // URL-driven category/subcategory from sidebar navigation
  const categoryId = searchParams.get('category') || undefined;
  const subCategoryId = searchParams.get('subcategory') || undefined;

  // Server-side paginated query
  const { data: paginatedResult, isLoading: loading } = useAssetsList({
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort?.field,
    order: table.sort?.order,
    search: table.search || undefined,
    status: table.filters.status || undefined,
    operationalStatus: table.filters.operationalStatus || undefined,
    categoryId: categoryId || table.filters.categoryId || undefined,
    subCategoryId: subCategoryId || undefined,
  });

  const assets = paginatedResult?.data ?? [];
  const totalAssets = paginatedResult?.total ?? 0;

  const { data: categoriesData } = useCategories();
  const { data: subCategoriesData } = useSubCategories();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const deleteModal = useModal<{ id: string; name?: string }>();
  const bulkDeleteModal = useModal();

  const categories = categoriesData || [];
  const subCategories = subCategoriesData || [];

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedAssetForCategory, setSelectedAssetForCategory] = useState<Asset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [columnConfig, setColumnConfig] = useColumnConfig(defaultColumnConfig, STORAGE_KEY);
  const [uploading, setUploading] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [downloadAgentModalVisible, setDownloadAgentModalVisible] = useState(false);

  const handleCategoryEdit = (asset: Asset) => {
    setSelectedAssetForCategory(asset);
    setSelectedCategory(asset.categoryId || null);
    setSelectedSubCategory(asset.subCategoryId || null);
    setCategoryModalVisible(true);
  };

  const handleCategorySave = async () => {
    if (!selectedAssetForCategory) return;
    try {
      await updateAssetMutation.mutateAsync({
        id: selectedAssetForCategory.id,
        data: { ...selectedAssetForCategory, categoryId: selectedCategory || undefined, subCategoryId: selectedSubCategory || undefined },
      });
      message.success('Asset category updated successfully');
      setCategoryModalVisible(false);
    } catch {
      message.error('Failed to update asset category');
    }
  };

  const handleDelete = (asset: Asset) => { deleteModal.onOpen({ id: asset.id, name: asset.name }); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      await deleteAssetMutation.mutateAsync(deleteModal.selectedItem.id);
      message.success('Asset deleted successfully');
      deleteModal.onClose();
    } catch {
      message.error('Failed to delete asset');
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      for (const key of selectedRowKeys) {
        await deleteAssetMutation.mutateAsync(key as string);
      }
      message.success('Assets deleted successfully');
      setSelectedRowKeys([]);
      bulkDeleteModal.onClose();
    } catch {
      message.error('Failed to delete some assets');
    }
  };

  const handleFileUpload = (file: File) => {
    const maxSize = 6 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error(`File size must be less than 6MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }
    const allowedFormats = ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    const allowedExtensions = ['.png', '.jpeg', '.jpg', '.pdf', '.xls', '.xlsx', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidFormat = allowedFormats.includes(file.type) || allowedExtensions.includes(fileExtension);
    if (!isValidFormat) {
      message.error('Invalid file format. Allowed formats: PNG, JPEG, PDF, Excel (XLS/XLSX), CSV');
      return false;
    }
    setUploading(true);
    setTimeout(() => { message.success(`File "${file.name}" uploaded successfully`); setUploading(false); }, 1000);
    return false;
  };

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    message.success('Filters applied');
  };

  const handleClearFilters = () => {
    table.setFilters({ status: '', operationalStatus: '', categoryId: '' });
    message.info('Filters cleared');
  };

  const visibleColumns = columnConfig.filter((col) => col.visible).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const columns: ColumnsType<Asset> = visibleColumns.map((col) => {
    if (col.key === 'networkIdentity') {
      return {
        title: col.title, key: col.key, width: col.width,
        render: (_, record: Asset) => {
          const identity = record.hostname || record.ipAddress || '-';
          return <Tooltip title={record.hostname && record.ipAddress ? `IP: ${record.ipAddress}` : undefined}><span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{identity}</span></Tooltip>;
        },
      };
    }
    if (col.key === 'operationalStatus') {
      return {
        title: col.title, dataIndex: col.key, key: col.key, width: col.width,
        render: (text: string) => <Tag color={text === 'CONNECTED' ? 'green' : 'red'}>{formatEnum(text)}</Tag>,
      };
    }
    if (col.key === 'status') {
      return {
        title: col.title, dataIndex: col.key, key: col.key, width: col.width,
        render: (text: string) => <Tag color={text === 'IN_USE' ? 'blue' : text === 'RETIRED' ? 'orange' : 'default'}>{formatEnum(text)}</Tag>,
      };
    }
    if (col.key === 'category') {
      return {
        title: col.title, key: 'category', width: col.width,
        render: (_, record: Asset) => {
          const category = categories.find((c) => c.id === record.categoryId);
          const subCategory = subCategories.find((s) => s.id === record.subCategoryId);
          return (
            <div onClick={(e) => { e.stopPropagation(); handleCategoryEdit(record); }}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              {category ? (
                <div>
                  <Tag color={category.color || 'blue'}>{category.name}</Tag>
                  {subCategory && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>{'\u2192'} {subCategory.name}</span>}
                </div>
              ) : <span style={{ color: '#999' }}>Unassigned</span>}
            </div>
          );
        },
      };
    }
    if (col.key === 'action') {
      return {
        title: '', key: 'action', width: col.width,
        render: (_, record) => {
          const actionMenuItems = [
            { key: 'edit', label: 'Edit', onClick: (info: { domEvent: React.MouseEvent }) => { info.domEvent.stopPropagation(); navigate(`/assets/${record.id}`); } },
            { key: 'delete', label: 'Delete', danger: true, onClick: (info: { domEvent: React.MouseEvent }) => { info.domEvent.stopPropagation(); handleDelete(record); } },
          ];
          return <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}><Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} /></Dropdown>;
        },
      };
    }
    return { title: col.title, dataIndex: col.key, key: col.key, width: col.width };
  });

  const bulkMenuItems: MenuProps['items'] = [{ key: 'delete', label: 'Delete Selected', danger: true, onClick: () => bulkDeleteModal.onOpen(null) }];

  return (
    <div style={{ background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', padding: '0' }}>
      <div style={{ padding: '8px 12px 4px 12px', flexShrink: 0 }}>
        <Title level={3} style={{ margin: 0 }}>Assets</Title>
      </div>

      <Row gutter={[12, 12]} style={{ padding: '4px 12px', flexShrink: 0, marginRight: 0 }} align="middle">
        <Col flex="auto">
          <Space>
            <Input
              placeholder="Search"
              prefix={<SearchOutlined />}
              style={{ width: 320 }}
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              allowClear
              onClear={() => table.setSearch('')}
            />
            <Button icon={<FilterOutlined />} onClick={() => setFilterModalVisible(true)}>Filter</Button>
            <Tooltip title="Column Settings"><Button icon={<TableSettingsIcon />} onClick={() => setColumnSettingsOpen(true)} /></Tooltip>
          </Space>
        </Col>
        {selectedRowKeys.length > 0 && (
          <Col>
            <Space>
              <span>{selectedRowKeys.length} Selected</span>
              <Dropdown menu={{ items: bulkMenuItems }} trigger={['click']}><Button icon={<MoreOutlined />}><DownOutlined /></Button></Dropdown>
              <Button icon={<DownloadOutlined />} onClick={() => message.info('Download functionality coming soon')} />
            </Space>
          </Col>
        )}
        {selectedRowKeys.length === 0 && (
          <Col>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>Add Assets</Button>
              <Button icon={<CloudDownloadOutlined />} onClick={() => setDownloadAgentModalVisible(true)}>Download Agent</Button>
              <Upload accept=".png,.jpeg,.jpg,.pdf,.xls,.xlsx,.csv" beforeUpload={handleFileUpload} showUploadList={false}>
                <Button icon={<UploadOutlined />} loading={uploading}>Upload File</Button>
              </Upload>
            </Space>
          </Col>
        )}
      </Row>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
        <DataTable
          style={{ width: '100%' }}
          rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
          columns={columns}
          data={assets as unknown as Record<string, unknown>[]}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: table.page,
            pageSize: table.pageSize,
            total: totalAssets,
            onChange: (page, pageSize) => {
              table.setPage(page);
              if (pageSize !== table.pageSize) table.setPageSize(pageSize);
            },
          }}
          onRow={(record) => ({ onClick: () => navigate(`/assets/${(record as unknown as Asset).id}`), style: { cursor: 'pointer' } })}
        />
      </div>

      <AddAssetModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onSuccess={() => setAddModalVisible(false)} />
      <ColumnSettingsDrawer open={columnSettingsOpen} onClose={() => setColumnSettingsOpen(false)} columns={columnConfig} onColumnsChange={setColumnConfig} defaultColumns={defaultColumnConfig} />

      <Modal title={`Assign Category - ${selectedAssetForCategory?.name || ''}`} open={categoryModalVisible} onOk={handleCategorySave} onCancel={() => setCategoryModalVisible(false)} width={500}>
        <Form layout="vertical">
          <Form.Item label="Category" required>
            <Select placeholder="Select a category" value={selectedCategory}
              onChange={(value) => { setSelectedCategory(value); setSelectedSubCategory(null); }}
              options={categories.map((cat) => ({ label: <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Tag color={cat.color || 'blue'} /><span>{cat.name}</span></div>, value: cat.id }))}
              allowClear />
          </Form.Item>
          {selectedCategory && (
            <Form.Item label="Sub-Category">
              <Select placeholder="Select a sub-category" value={selectedSubCategory} onChange={setSelectedSubCategory}
                options={subCategories.filter((sub) => sub.categoryId === selectedCategory).map((sub) => ({
                  label: <div><span>{sub.name}</span>{sub.criticality && <Tag style={{ marginLeft: '8px' }}>{sub.criticality}</Tag>}</div>, value: sub.id,
                }))} allowClear />
            </Form.Item>
          )}
          {selectedAssetForCategory && selectedCategory && (
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', marginTop: '12px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong>Asset:</strong> {selectedAssetForCategory.name}</div>
              {selectedCategory && <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong>Category:</strong> {categories.find((c) => c.id === selectedCategory)?.name}</div>}
              {selectedSubCategory && <div style={{ fontSize: '12px' }}><strong>Sub-Category:</strong> {subCategories.find((s) => s.id === selectedSubCategory)?.name}</div>}
            </div>
          )}
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal title="Filter Assets" open={filterModalVisible} onOk={handleApplyFilters}
        onCancel={() => setFilterModalVisible(false)} width={500} okText="Apply Filters" cancelText="Close">
        <Form layout="vertical">
          <Form.Item label="Filter by Category">
            <Select placeholder="Select a category" value={table.filters.categoryId || null}
              onChange={(value) => table.setFilters({ categoryId: value || '' })}
              options={categories.map((cat) => ({ label: cat.name, value: cat.id }))} allowClear />
          </Form.Item>
          <Form.Item label="Filter by Status">
            <Select placeholder="Select status" value={table.filters.status || null}
              onChange={(value) => table.setFilters({ status: value || '' })}
              options={[{ label: 'In Use', value: 'IN_USE' }, { label: 'Available', value: 'AVAILABLE' }, { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE' }, { label: 'Retired', value: 'RETIRED' }]}
              allowClear />
          </Form.Item>
          <Form.Item label="Filter by Operational Status">
            <Select placeholder="Select operational status" value={table.filters.operationalStatus || null}
              onChange={(value) => table.setFilters({ operationalStatus: value || '' })}
              options={[{ label: 'Connected', value: 'CONNECTED' }, { label: 'Disconnected', value: 'DISCONNECTED' }]}
              allowClear />
          </Form.Item>
          <Button type="dashed" onClick={handleClearFilters} style={{ width: '100%' }}>Clear All Filters</Button>
        </Form>
      </Modal>

      <ConfirmModal title="Delete Asset" description={`Are you sure you want to delete ${deleteModal.selectedItem?.name || 'this asset'}?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteAssetMutation.isPending} confirmText="Yes" danger />
      <ConfirmModal title="Delete Assets" description={`Are you sure you want to delete ${selectedRowKeys.length} assets?`}
        open={bulkDeleteModal.open} onConfirm={handleBulkDeleteConfirm} onCancel={bulkDeleteModal.onClose} loading={deleteAssetMutation.isPending} confirmText="Yes" danger />
      <DownloadAgentModal open={downloadAgentModalVisible} onClose={() => setDownloadAgentModalVisible(false)} />
    </div>
  );
}
