import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table,
  Input,
  Button,
  Tag,
  Space,
  Typography,
  Dropdown,
  message,
  Modal,
  Tooltip,
  Row,
  Col,
  Form,
  Select,
  Upload,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  MoreOutlined,
  DownOutlined,
  DownloadOutlined,
  UploadOutlined,
  AppleOutlined,
  WindowsOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { assetService } from '../../services/asset.service';
import { categoryService } from '../../services/category.service';
import type { Asset, Category, SubCategory } from '../../types/asset.types';
import { AddAssetModal } from './components/AddAssetModal';
import { ColumnSettingsDrawer, useColumnConfig } from '../../components/ColumnSettingsDrawer';
import type { ColumnConfig } from '../../components/ColumnSettingsDrawer';
import { TableSettingsIcon } from '../../components/icons/TableSettingsIcon';

const { Title } = Typography;

// Default column configuration
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

export function AllAssets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
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
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterOperationalStatus, setFilterOperationalStatus] = useState<string | null>(null);
  const [downloadAgentModalVisible, setDownloadAgentModalVisible] = useState(false);

  const categoryId = searchParams.get('category');
  const subCategoryId = searchParams.get('subcategory');

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    // Initialize selected category from URL params
    if (categoryId) {
      setSelectedCategory(categoryId);
      if (subCategoryId) {
        setSelectedSubCategory(subCategoryId);
      }
    }
  }, [categoryId, subCategoryId]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await assetService.getAssets();
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getSubCategories(),
      ]);
      setCategories(cats);
      setSubCategories(subs);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  const handleCategoryEdit = (asset: Asset) => {
    setSelectedAssetForCategory(asset);
    setSelectedCategory(asset.categoryId || null);
    setSelectedSubCategory(asset.subCategoryId || null);
    setCategoryModalVisible(true);
  };

  const handleCategorySave = async () => {
    if (!selectedAssetForCategory) return;

    try {
      const updatedAsset = {
        ...selectedAssetForCategory,
        categoryId: selectedCategory || undefined,
        subCategoryId: selectedSubCategory || undefined,
      };
      await assetService.updateAsset(selectedAssetForCategory.id, updatedAsset);
      message.success('Asset category updated successfully');
      setCategoryModalVisible(false);
      fetchAssets();
    } catch (error) {
      message.error('Failed to update asset category');
    }
  };

  const handleRowClick = (record: Asset) => {
    navigate(`/assets/${record.id}`);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Asset',
      content: 'Are you sure you want to delete this asset?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          await assetService.deleteAsset(id);
          message.success('Asset deleted successfully');
          fetchAssets();
        } catch (error) {
          message.error('Failed to delete asset');
        }
      },
    });
  };

  const handleBulkDelete = async () => {
    Modal.confirm({
      title: 'Delete Assets',
      content: `Are you sure you want to delete ${selectedRowKeys.length} assets?`,
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          for (const key of selectedRowKeys) {
            await assetService.deleteAsset(key as string);
          }
          message.success('Assets deleted successfully');
          setSelectedRowKeys([]);
          fetchAssets();
        } catch (error) {
          message.error('Failed to delete some assets');
        }
      },
    });
  };

  const handleFilter = () => {
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    message.success('Filters applied');
  };

  const handleClearFilters = () => {
    setFilterCategoryId(null);
    setFilterStatus(null);
    setFilterOperationalStatus(null);
    message.info('Filters cleared');
  };

  const handleDownload = () => {
    message.info('Download functionality coming soon');
  };

  // Download agent using backend API
  const handleAgentDownload = async (platform: 'windows' | 'macos' | 'linux') => {
    const platformMap: Record<string, string> = {
      windows: 'Windows',
      macos: 'Mac',
      linux: 'Linux',
    };
    const filenameMap: Record<string, string> = {
      windows: 'patchify-agent.exe',
      macos: 'patchify-agent-macos',
      linux: 'patchify-agent',
    };

    try {
      message.loading({ content: `Downloading ${platform} agent...`, key: 'agent-download' });

      // Get auth token from localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // First fetch agent versions to find the right one
      const versionsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agent-versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!versionsResponse.ok) {
        throw new Error(`Failed to fetch agent versions: ${versionsResponse.statusText}`);
      }

      const versions = await versionsResponse.json();
      const targetPlatform = platformMap[platform];

      // Find the first version matching the platform (prefer amd64 architecture)
      const version = versions.find((v: { platform: string; architecture: string }) =>
        v.platform === targetPlatform && v.architecture === 'amd64'
      ) || versions.find((v: { platform: string }) => v.platform === targetPlatform);

      if (!version) {
        throw new Error(`No agent version found for ${platform}`);
      }

      // Download the agent binary
      const downloadResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agent-versions/${version.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!downloadResponse.ok) {
        throw new Error(`Failed to download: ${downloadResponse.statusText}`);
      }

      const blob = await downloadResponse.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filenameMap[platform];
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      message.success({ content: `${platform} agent downloaded successfully!`, key: 'agent-download' });
    } catch (error) {
      console.error('Agent download error:', error);
      message.error({ content: `Failed to download ${platform} agent`, key: 'agent-download' });
    }
  };

  const handleFileUpload = (file: File) => {
    // File size validation (6MB = 6 * 1024 * 1024 bytes)
    const maxSize = 6 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error(`File size must be less than 6MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }

    // Allowed file formats
    const allowedFormats = ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    const allowedExtensions = ['.png', '.jpeg', '.jpg', '.pdf', '.xls', '.xlsx', '.csv'];

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidFormat = allowedFormats.includes(file.type) || allowedExtensions.includes(fileExtension);

    if (!isValidFormat) {
      message.error('Invalid file format. Allowed formats: PNG, JPEG, PDF, Excel (XLS/XLSX), CSV');
      return false;
    }

    setUploading(true);
    // Simulate file upload
    setTimeout(() => {
      message.success(`File "${file.name}" uploaded successfully`);
      setUploading(false);
      // Refresh assets list
      fetchAssets();
    }, 1000);

    return false; // Prevent auto upload
  };

  const filteredAssets = (assets || []).filter((asset) => {
    // Text search filter
    const matchesSearch = asset.name.toLowerCase().includes(searchText.toLowerCase()) ||
      asset.assetId.toLowerCase().includes(searchText.toLowerCase());

    // Category filter from URL
    if (categoryId && asset.categoryId !== categoryId) {
      return false;
    }

    // Sub-category filter from URL
    if (subCategoryId && asset.subCategoryId !== subCategoryId) {
      return false;
    }

    // Filter from modal
    if (filterCategoryId && asset.categoryId !== filterCategoryId) {
      return false;
    }

    if (filterStatus && asset.status !== filterStatus) {
      return false;
    }

    if (filterOperationalStatus && asset.operationalStatus !== filterOperationalStatus) {
      return false;
    }

    return matchesSearch;
  });

  const visibleColumns = columnConfig
    .filter((col) => col.visible)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  const columns: ColumnsType<Asset> = visibleColumns.map((col) => {
    if (col.key === 'networkIdentity') {
      return {
        title: col.title,
        key: col.key,
        width: col.width,
        render: (_, record: Asset) => {
          const identity = record.hostname || record.ipAddress || '-';
          return (
            <Tooltip title={record.hostname && record.ipAddress ? `IP: ${record.ipAddress}` : undefined}>
              <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{identity}</span>
            </Tooltip>
          );
        },
      };
    }

    if (col.key === 'operationalStatus') {
      return {
        title: col.title,
        dataIndex: col.key,
        key: col.key,
        width: col.width,
        render: (text: string) => {
          const color = text === 'Connected' ? 'green' : 'red';
          return <Tag color={color}>{text}</Tag>;
        },
      };
    }

    if (col.key === 'status') {
      return {
        title: col.title,
        dataIndex: col.key,
        key: col.key,
        width: col.width,
        render: (text: string) => {
          const color = text === 'In Use' ? 'blue' : text === 'Inactive' ? 'orange' : 'default';
          return <Tag color={color}>{text}</Tag>;
        },
      };
    }

    if (col.key === 'category') {
      return {
        title: col.title,
        key: 'category',
        width: col.width,
        render: (_, record: Asset) => {
          const category = categories.find((c) => c.id === record.categoryId);
          const subCategory = subCategories.find((s) => s.id === record.subCategoryId);

          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleCategoryEdit(record);
              }}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {category ? (
                <div>
                  <Tag color={category.color || 'blue'}>{category.name}</Tag>
                  {subCategory && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>→ {subCategory.name}</span>}
                </div>
              ) : (
                <span style={{ color: '#999' }}>Unassigned</span>
              )}
            </div>
          );
        },
      };
    }

    if (col.key === 'action') {
      return {
        title: '',
        key: 'action',
        width: col.width,
         render: (_, record) => {
           const actionMenuItems = [
             {
               key: 'edit',
               label: 'Edit',
               onClick: (e: any) => {
                 e.domEvent.stopPropagation();
                 navigate(`/assets/${record.id}`);
               },
             },
             {
               key: 'delete',
               label: 'Delete',
               danger: true,
               onClick: (e: any) => {
                 e.domEvent.stopPropagation();
                 handleDelete(record.id);
               },
             },
           ];

           return (
             <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
               <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
               }} />
             </Dropdown>
           );
         },
      };
    }

    return {
      title: col.title,
      dataIndex: col.key,
      key: col.key,
      width: col.width,
    };
  });

  const bulkMenuItems: MenuProps['items'] = [
    {
      key: 'delete',
      label: 'Delete Selected',
      danger: true,
      onClick: handleBulkDelete,
    },
  ];

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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button icon={<FilterOutlined />} onClick={handleFilter}>
              Filter
            </Button>
            <Tooltip title="Column Settings">
              <Button
                icon={<TableSettingsIcon />}
                onClick={() => setColumnSettingsOpen(true)}
              />
            </Tooltip>
          </Space>
        </Col>
        {selectedRowKeys.length > 0 && (
          <Col>
            <Space>
              <span>{selectedRowKeys.length} Selected</span>
              <Dropdown menu={{ items: bulkMenuItems }} trigger={['click']}>
                <Button icon={<MoreOutlined />}>
                  <DownOutlined />
                </Button>
              </Dropdown>
              <Button icon={<DownloadOutlined />} onClick={handleDownload} />
            </Space>
          </Col>
        )}
        {selectedRowKeys.length === 0 && (
          <Col>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
                Add Assets
              </Button>
              <Button icon={<CloudDownloadOutlined />} onClick={() => setDownloadAgentModalVisible(true)}>
                Download Agent
              </Button>
              <Upload
                accept=".png,.jpeg,.jpg,.pdf,.xls,.xlsx,.csv"
                beforeUpload={handleFileUpload}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  Upload File
                </Button>
              </Upload>
            </Space>
          </Col>
        )}
      </Row>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
        <Table
          style={{ width: '100%' }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={filteredAssets}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} assets found`,
          }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <AddAssetModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {
          fetchAssets();
          setAddModalVisible(false);
        }}
      />

      <ColumnSettingsDrawer
        open={columnSettingsOpen}
        onClose={() => setColumnSettingsOpen(false)}
        columns={columnConfig}
        onColumnsChange={setColumnConfig}
        defaultColumns={defaultColumnConfig}
      />

      <Modal
        title={`Assign Category - ${selectedAssetForCategory?.name || ''}`}
        open={categoryModalVisible}
        onOk={handleCategorySave}
        onCancel={() => setCategoryModalVisible(false)}
        width={500}
      >
        <Form layout="vertical">
          <Form.Item
            label="Category"
            required
          >
            <Select
              placeholder="Select a category"
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                setSelectedSubCategory(null);
              }}
              options={categories.map((cat) => ({
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag color={cat.color || 'blue'} />
                    <span>{cat.name}</span>
                  </div>
                ),
                value: cat.id,
              }))}
              allowClear
            />
          </Form.Item>

          {selectedCategory && (
            <Form.Item label="Sub-Category">
              <Select
                placeholder="Select a sub-category"
                value={selectedSubCategory}
                onChange={setSelectedSubCategory}
                options={subCategories
                  .filter((sub) => sub.categoryId === selectedCategory)
                  .map((sub) => ({
                    label: (
                      <div>
                        <span>{sub.name}</span>
                        {sub.criticality && <Tag style={{ marginLeft: '8px' }}>{sub.criticality}</Tag>}
                      </div>
                    ),
                    value: sub.id,
                  }))}
                allowClear
              />
            </Form.Item>
          )}

          {selectedAssetForCategory && selectedCategory && (
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', marginTop: '12px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <strong>Asset:</strong> {selectedAssetForCategory.name}
              </div>
              {selectedCategory && (
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  <strong>Category:</strong> {categories.find((c) => c.id === selectedCategory)?.name}
                </div>
              )}
              {selectedSubCategory && (
                <div style={{ fontSize: '12px' }}>
                  <strong>Sub-Category:</strong> {subCategories.find((s) => s.id === selectedSubCategory)?.name}
                </div>
              )}
            </div>
          )}
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Filter Assets"
        open={filterModalVisible}
        onOk={handleApplyFilters}
        onCancel={() => setFilterModalVisible(false)}
        width={500}
        okText="Apply Filters"
        cancelText="Close"
      >
        <Form layout="vertical">
          <Form.Item label="Filter by Category">
            <Select
              placeholder="Select a category"
              value={filterCategoryId}
              onChange={setFilterCategoryId}
              options={categories.map((cat) => ({
                label: cat.name,
                value: cat.id,
              }))}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Filter by Status">
            <Select
              placeholder="Select status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: 'In Use', value: 'In Use' },
                { label: 'Available', value: 'Available' },
                { label: 'Under Maintenance', value: 'Under Maintenance' },
                { label: 'Retired', value: 'Retired' },
              ]}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Filter by Operational Status">
            <Select
              placeholder="Select operational status"
              value={filterOperationalStatus}
              onChange={setFilterOperationalStatus}
              options={[
                { label: 'Connected', value: 'Connected' },
                { label: 'Disconnected', value: 'Disconnected' },
              ]}
              allowClear
            />
          </Form.Item>

          <Button type="dashed" onClick={handleClearFilters} style={{ width: '100%' }}>
            Clear All Filters
          </Button>

          {(filterCategoryId || filterStatus || filterOperationalStatus) && (
            <div style={{ padding: '12px', background: '#e6f7ff', borderRadius: '4px', marginTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Active Filters:</div>
              {filterCategoryId && (
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  📁 Category: <strong>{categories.find((c) => c.id === filterCategoryId)?.name}</strong>
                </div>
              )}
              {filterStatus && (
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  🔖 Status: <strong>{filterStatus}</strong>
                </div>
              )}
              {filterOperationalStatus && (
                <div style={{ fontSize: '12px' }}>
                  ⚡ Operational Status: <strong>{filterOperationalStatus}</strong>
                </div>
              )}
            </div>
          )}
        </Form>
      </Modal>

      {/* Download Agent Modal */}
      <Modal
        title="Download PatchIQ Agent"
        open={downloadAgentModalVisible}
        onCancel={() => setDownloadAgentModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: '24px', color: '#666' }}>
            Download and install the PatchIQ agent on your endpoints to enable asset discovery,
            vulnerability scanning, and patch deployment.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f5f5f5', borderRadius: '8px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <WindowsOutlined style={{ fontSize: '32px', color: '#0078d4' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Windows Agent</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Windows 10/11, Server 2016+</div>
                </div>
              </div>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleAgentDownload('windows')}>
                Download
              </Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f5f5f5', borderRadius: '8px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AppleOutlined style={{ fontSize: '32px', color: '#555' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>macOS Agent</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>macOS 12 (Monterey) and later</div>
                </div>
              </div>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleAgentDownload('macos')}>
                Download
              </Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f5f5f5', borderRadius: '8px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>🐧</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Linux Agent</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Ubuntu 20.04+, RHEL 8+, Debian 11+</div>
                </div>
              </div>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleAgentDownload('linux')}>
                Download
              </Button>
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '12px', background: '#e6f7ff', borderRadius: '4px', fontSize: '13px' }}>
            <strong>Installation:</strong> After downloading, run the agent with administrator/root privileges.
            The agent will automatically register with the PatchIQ server and appear in the Assets list.
          </div>
        </div>
      </Modal>
    </div>
  );
}
