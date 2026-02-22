import { useState, useEffect } from 'react';
import {
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import {
  App,
  Tabs,
  Button,
  Modal,
  Spin,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ActionMenu } from '../../../components/shared/ActionMenu';
import { useAsset, useDeleteAsset, useAssignTagsToAsset } from '../../../hooks/useAssets';
import { AddAssetModal } from './AddAssetModal';
import {
  DetailsTab,
  LifecycleTab,
  HardwareTab,
  SoftwareTab,
  AuditLogTab,
  VulnerabilitiesTab,
  AlertsTab,
  UnifiedPatchesTab,
} from './tabs';

export const AssetDetails = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = id || '';

  const { data: asset, isLoading: loading, error: assetError } = useAsset(assetId);
  const deleteAssetMutation = useDeleteAsset();
  const assignTagsMutation = useAssignTagsToAsset();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (assetError) {
      message.error('Failed to fetch asset details');
      navigate('/assets');
    }
  }, [assetError, message, navigate]);

  /* eslint-disable react-hooks/set-state-in-effect -- sync external data to local state */
  useEffect(() => {
    if (asset) {
      setSelectedTags(asset.tagIds || []);
    }
  }, [asset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDeleteAsset = () => {
    if (!asset) return;
    Modal.confirm({
      title: 'Delete Asset',
      content: `Are you sure you want to delete ${asset.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteAssetMutation.mutateAsync(asset.id);
          message.success('Asset deleted successfully');
          navigate('/assets');
        } catch {
          message.error('Failed to delete asset');
        }
      },
    });
  };

  const handleSaveTags = async () => {
    if (!asset) return;
    try {
      await assignTagsMutation.mutateAsync({ assetId: asset.id, tagIds: selectedTags });
      message.success('Tags updated successfully');
      setEditingTags(false);
    } catch {
      message.error('Failed to update tags');
    }
  };

  const moreMenuItems = [
    {
      key: 'duplicate',
      label: 'Duplicate Asset',
      icon: <CopyOutlined />,
      onClick: () => { message.info('Duplicate asset functionality will be implemented'); },
    },
    {
      key: 'delete',
      label: 'Delete Asset',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => { handleDeleteAsset(); },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!asset) {
    return <div>Asset not found</div>;
  }

  const tabContentStyle = {
    background: '#f8f9fb',
    borderRadius: 8,
    padding: '20px',
    marginTop: 4,
  };

  const tabItems = [
    {
      key: 'details',
      label: 'Details',
      children: (
        <div style={tabContentStyle}>
          <DetailsTab
            asset={asset}
            editingTags={editingTags}
            selectedTags={selectedTags}
            onEditTagsToggle={setEditingTags}
            onSelectedTagsChange={setSelectedTags}
            onSaveTags={handleSaveTags}
          />
        </div>
      ),
    },
    {
      key: 'lifecycle',
      label: 'Asset Life cycle',
      children: <div style={tabContentStyle}><LifecycleTab assetId={assetId} onEditFinancialData={() => setEditModalVisible(true)} /></div>,
    },
    {
      key: 'hardware',
      label: 'Hardware',
      children: <div style={tabContentStyle}><HardwareTab assetId={assetId} osType={asset.osType} manufacturer={asset.manufacturer} model={asset.model} /></div>,
    },
    {
      key: 'software',
      label: 'Software',
      children: <div style={tabContentStyle}><SoftwareTab assetId={assetId} asset={asset} /></div>,
    },
    {
      key: 'audit',
      label: 'Audit Log',
      children: <div style={tabContentStyle}><AuditLogTab assetId={assetId} /></div>,
    },
    {
      key: 'vulnerabilities',
      label: 'Vulnerabilities',
      children: <div style={tabContentStyle}><VulnerabilitiesTab assetId={assetId} /></div>,
    },
    {
      key: 'patches',
      label: 'Patches',
      children: <div style={tabContentStyle}><UnifiedPatchesTab assetId={asset.id} agentId={asset?.agent?.id} /></div>,
    },
    {
      key: 'alerts',
      label: 'Alerts',
      children: <div style={tabContentStyle}><AlertsTab assetId={assetId} /></div>,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/assets')}
            style={{ color: '#6b7280', padding: '4px 8px' }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
              Asset Details
            </h2>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{asset.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditModalVisible(true)}
            style={{
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              color: '#374151',
              fontWeight: 500,
              fontSize: 13,
              height: 34,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            }}
          >
            Edit Asset
          </Button>
          <ActionMenu items={moreMenuItems} />
        </div>
      </div>

      <Tabs defaultActiveKey="details" items={tabItems} />

      <AddAssetModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSuccess={() => setEditModalVisible(false)}
        mode="edit"
        asset={asset}
      />
    </div>
  );
};
