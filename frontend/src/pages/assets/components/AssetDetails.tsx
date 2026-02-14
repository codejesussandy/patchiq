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
  Space,
  Typography,
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

const { Title } = Typography;

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

  const tabItems = [
    {
      key: 'details',
      label: 'Details',
      children: (
        <DetailsTab
          asset={asset}
          editingTags={editingTags}
          selectedTags={selectedTags}
          onEditTagsToggle={setEditingTags}
          onSelectedTagsChange={setSelectedTags}
          onSaveTags={handleSaveTags}
        />
      ),
    },
    {
      key: 'lifecycle',
      label: 'Asset Life cycle',
      children: <LifecycleTab assetId={assetId} onEditFinancialData={() => setEditModalVisible(true)} />,
    },
    {
      key: 'hardware',
      label: 'Hardware',
      children: <HardwareTab assetId={assetId} osType={asset.osType} manufacturer={asset.manufacturer} model={asset.model} />,
    },
    {
      key: 'software',
      label: 'Software',
      children: <SoftwareTab assetId={assetId} asset={asset} />,
    },
    {
      key: 'audit',
      label: 'Audit Log',
      children: <AuditLogTab assetId={assetId} />,
    },
    {
      key: 'vulnerabilities',
      label: 'Vulnerabilities',
      children: <VulnerabilitiesTab assetId={assetId} />,
    },
    {
      key: 'patches',
      label: 'Patches',
      children: <UnifiedPatchesTab assetId={asset.id} agentId={asset?.agent?.id} />,
    },
    {
      key: 'alerts',
      label: 'Alerts',
      children: <AlertsTab assetId={assetId} />,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets')}>Back</Button>
          <Title level={3} style={{ margin: 0 }}>Asset Details</Title>
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setEditModalVisible(true)}>Edit Asset</Button>
          <ActionMenu items={moreMenuItems} />
        </Space>
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
