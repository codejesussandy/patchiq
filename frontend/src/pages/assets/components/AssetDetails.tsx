import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  App,
  Tabs,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Progress,
  Table,
  Collapse,
  Input,
  Dropdown,
  Upload,
  Modal,
  Spin,
  Divider,
  Switch,
  Tooltip,
  Select,
} from 'antd';
import {
  WindowsOutlined,
  AppleOutlined,
  EditOutlined,
  MoreOutlined,
  FilterOutlined,
  DownloadOutlined,
  DeleteOutlined,
  CopyOutlined,
  UploadOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { OSIcon } from '../../../components/patches';
import type { ColumnsType } from 'antd/es/table';
import type { Asset, AssetLifeCycle, Hardware, Software } from '../../../types/asset.types';
import type { TelemetryPayload } from '../../../types/telemetry.types';
import { assetService } from '../../../services/asset.service';
import { tagService } from '../../../services/tag.service';
import { AddAssetModal } from './AddAssetModal';
import TagSelector from './TagSelector';
import TagDisplay from './TagDisplay';
import { PatchesTab } from './tabs/PatchesTab';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;

// Telemetry polling interval in milliseconds (30 seconds)
const TELEMETRY_POLL_INTERVAL = 30000;

export const AssetDetails = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [lifecycle, setLifecycle] = useState<AssetLifeCycle | null>(null);
  const [hardware, setHardware] = useState<Hardware | null>(null);
  const [software, setSoftware] = useState<Software | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [loadingLifecycle, setLoadingLifecycle] = useState(false);
  const [selectedDepreciationMethod, setSelectedDepreciationMethod] = useState<string>('straight-line');
  const [loadingHardware, setLoadingHardware] = useState(false);
  const [loadingSoftware, setLoadingSoftware] = useState(false);
  const [loadingVulnerabilities, setLoadingVulnerabilities] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [telemetryLastUpdated, setTelemetryLastUpdated] = useState<Date | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [editingTags, setEditingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [locatingAsset, setLocatingAsset] = useState(false);
  const [refreshingInventory, setRefreshingInventory] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const telemetryPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Alerts tab state
  const [alertsSearchText, setAlertsSearchText] = useState('');
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsViewMode, setAlertsViewMode] = useState<'list' | 'grid'>('list');
  const [alertsData, setAlertsData] = useState<Array<{
    id: string;
    alert: string;
    severity: 'CRITICAL' | 'CLEAR' | 'WARNING' | 'INFO';
    module: string;
    attribute: string;
    value: string;
    message: string;
    status: string;
    createdOn: string;
  }>>([]);

  // Audit log state
  const [auditLog, setAuditLog] = useState<Array<{ key: string; date: string; user: string; action: string; changes: string }>>([]);
  const [auditLogSearch, setAuditLogSearch] = useState('');

  // Software tab filter state
  const [appVendorFilters, setAppVendorFilters] = useState<string[]>([]);
  const [appPatchStatusFilters, setAppPatchStatusFilters] = useState<string[]>([]);
  const [loadingAuditLog, setLoadingAuditLog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAssetDetails();
    }
  }, [id]);

  useEffect(() => {
    if (asset) {
      fetchLifecycleData();
      fetchHardwareData();
      fetchSoftwareData();
      fetchVulnerabilitiesData();
      fetchAlertsData();
      fetchTelemetryData();
      fetchAuditLogData();
      setSelectedTags(asset.tagIds || []);
    }
  }, [asset]);

  // Auto-poll telemetry data when auto-refresh is enabled
  useEffect(() => {
    // Clear any existing interval
    if (telemetryPollRef.current) {
      clearInterval(telemetryPollRef.current);
      telemetryPollRef.current = null;
    }

    // Set up polling if auto-refresh is enabled and we have an asset
    if (autoRefreshEnabled && asset) {
      telemetryPollRef.current = setInterval(() => {
        // Only fetch if not already loading
        if (!loadingTelemetry) {
          fetchTelemetryData();
        }
      }, TELEMETRY_POLL_INTERVAL);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (telemetryPollRef.current) {
        clearInterval(telemetryPollRef.current);
        telemetryPollRef.current = null;
      }
    };
  }, [autoRefreshEnabled, asset, loadingTelemetry]);

  const fetchAssetDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await assetService.getAsset(id);
      setAsset(data);
    } catch (error) {
      message.error('Failed to fetch asset details');
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchLifecycleData = async (method?: string) => {
    if (!asset) return;
    setLoadingLifecycle(true);
    try {
      const data = await assetService.getAssetLifeCycle(asset.id, method);
      setLifecycle(data);
    } catch {
      // Lifecycle data unavailable
    } finally {
      setLoadingLifecycle(false);
    }
  };

  const fetchHardwareData = async () => {
    if (!asset) return;
    setLoadingHardware(true);
    try {
      const data = await assetService.getAssetHardware(asset.id);
      setHardware(data);
    } catch {
      // Hardware data unavailable
    } finally {
      setLoadingHardware(false);
    }
  };

  const fetchSoftwareData = async () => {
    if (!asset) return;
    setLoadingSoftware(true);
    try {
      const data = await assetService.getAssetSoftware(asset.id);
      setSoftware(data);
    } catch {
      // Software data unavailable
    } finally {
      setLoadingSoftware(false);
    }
  };

  const fetchVulnerabilitiesData = async () => {
    if (!asset) return;
    setLoadingVulnerabilities(true);
    try {
      const result = await assetService.getAssetVulnerabilities(asset.id);
      setVulnerabilities(result.data || []);
    } catch {
      setVulnerabilities([]);
    } finally {
      setLoadingVulnerabilities(false);
    }
  };

  const fetchAlertsData = async () => {
    if (!asset) return;
    setAlertsLoading(true);
    try {
      const result = await assetService.getAssetAlerts(asset.id);
      setAlertsData(result.data || []);
    } catch {
      setAlertsData([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchTelemetryData = async () => {
    if (!asset) return;
    setLoadingTelemetry(true);
    try {
      const data = await assetService.getAssetTelemetry(asset.id);
      setTelemetry(data);
      setTelemetryLastUpdated(new Date());
    } catch {
      // Fall back to static asset performance data if telemetry fails
      setTelemetry(null);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // Helper function to format audit log details into human-readable text
  const formatAuditDetails = (details: string | object | null): string => {
    if (!details) return '-';

    try {
      const data = typeof details === 'string' ? JSON.parse(details) : details;

      // Handle update with changes array - each change on new line
      if (data.changes && Array.isArray(data.changes)) {
        if (data.changes.length === 0) return 'No changes';
        return data.changes.map((c: { field: string; from: unknown; to: unknown }) => {
          const fromVal = c.from === null || c.from === undefined || c.from === '' ? '(empty)' : String(c.from);
          const toVal = c.to === null || c.to === undefined || c.to === '' ? '(empty)' : String(c.to);
          return `• ${c.field}: "${fromVal}" → "${toVal}"`;
        }).join('\n');
      }

      // Handle delete with deletedAsset info - structured
      if (data.deletedAsset) {
        const asset = data.deletedAsset;
        const lines = ['Deleted Asset:'];
        if (asset.name) lines.push(`  • Name: ${asset.name}`);
        if (asset.assetTag) lines.push(`  • Tag: ${asset.assetTag}`);
        if (asset.type) lines.push(`  • Type: ${asset.type}`);
        if (asset.os) lines.push(`  • OS: ${asset.os}`);
        if (asset.ipAddress) lines.push(`  • IP: ${asset.ipAddress}`);
        return lines.join('\n');
      }

      // Handle bulk delete
      if (data.bulkDelete) {
        const count = data.count || data.deletedAssets?.length || 0;
        const lines = [`Bulk Delete: ${count} asset(s)`];
        if (data.deletedAssets) {
          data.deletedAssets.slice(0, 5).forEach((a: { name: string; assetTag?: string }) => {
            lines.push(`  • ${a.name}${a.assetTag ? ` (${a.assetTag})` : ''}`);
          });
          if (count > 5) lines.push(`  • ... and ${count - 5} more`);
        }
        return lines.join('\n');
      }

      // Handle add tags
      if (data.action === 'add_tags' && data.tagsAdded) {
        const lines = ['Tags Added:'];
        data.tagsAdded.forEach((t: { name: string }) => {
          lines.push(`  • ${t.name}`);
        });
        return lines.join('\n');
      }

      // Handle remove tag
      if (data.action === 'remove_tag' && data.tagRemoved) {
        return `Tag Removed:\n  • ${data.tagRemoved.name || data.tagRemoved.id}`;
      }

      // Handle create - show key fields structured
      if (data.assetName || data.assetTag) {
        const lines = ['Asset Created:'];
        if (data.assetName) lines.push(`  • Name: ${data.assetName}`);
        if (data.assetTag) lines.push(`  • Tag: ${data.assetTag}`);
        if (data.type) lines.push(`  • Type: ${data.type}`);
        if (data.os) lines.push(`  • OS: ${data.os}`);
        if (data.osVersion) lines.push(`  • Version: ${data.osVersion}`);
        if (data.ipAddress) lines.push(`  • IP: ${data.ipAddress}`);
        if (data.status) lines.push(`  • Status: ${data.status}`);
        return lines.join('\n');
      }

      // Fallback: show as key-value pairs
      const entries = Object.entries(data).filter(([k]) => !['changeCount'].includes(k)).slice(0, 6);
      if (entries.length > 0) {
        return entries.map(([k, v]) => `• ${k}: ${v}`).join('\n');
      }

      return typeof details === 'string' ? details : JSON.stringify(data);
    } catch {
      return typeof details === 'string' ? details : String(details);
    }
  };

  const fetchAuditLogData = async () => {
    if (!asset) return;
    setLoadingAuditLog(true);
    try {
      const data = await assetService.getAssetAuditLog(asset.id);
      setAuditLog(data.map((log, idx) => ({
        key: log.id || String(idx),
        date: log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) : '',
        user: log.user || 'System',
        action: log.action || '',
        changes: formatAuditDetails(log.details),
      })));
    } catch {
      setAuditLog([]);
    } finally {
      setLoadingAuditLog(false);
    }
  };

  const handleEditAsset = () => {
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    fetchAssetDetails();
    // Refresh audit log to show the new changes
    setTimeout(() => fetchAuditLogData(), 500);
  };

  const handleDuplicateAsset = () => {
    message.info('Duplicate asset functionality will be implemented');
  };

  const handleDeleteAsset = () => {
    if (!asset) return;

    Modal.confirm({
      title: 'Delete Asset',
      content: `Are you sure you want to delete ${asset.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await assetService.deleteAsset(asset.id);
          message.success('Asset deleted successfully');
          navigate('/assets');
        } catch (error) {
          message.error('Failed to delete asset');
        }
      },
    });
  };

  const handleFileUpload = ({ file, onSuccess }: { file: { name: string }; onSuccess: (status: string) => void }) => {
    setTimeout(() => {
      message.success(`${file.name} uploaded successfully`);
      onSuccess('ok');
    }, 1000);
  };

  const handleSaveTags = async () => {
    if (!asset) return;
    try {
      await tagService.assignTagsToAsset(asset.id, selectedTags);
      message.success('Tags updated successfully');
      setEditingTags(false);
      fetchAssetDetails();
    } catch {
      message.error('Failed to update tags');
    }
  };

  const handleBack = () => {
    navigate('/assets');
  };

  const handleAutoDetectLocation = async () => {
    setLocatingAsset(true);
    try {
      if (!navigator.geolocation) {
        message.error('Geolocation is not supported by your browser');
        setLocatingAsset(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Mock address based on coordinates
          const mockAddress = `Location @ ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          // Update asset location with detected coordinates
          setAsset((prevAsset) => {
            if (!prevAsset) return prevAsset;
            return {
              ...prevAsset,
              location: {
                ...prevAsset.location,
                installed: {
                  ...prevAsset.location.installed,
                  address: mockAddress,
                  latitude: parseFloat(latitude.toFixed(4)),
                  longitude: parseFloat(longitude.toFixed(4)),
                },
              },
            };
          });

          message.success('Location detected successfully!');
          setLocatingAsset(false);
        },
        (error) => {
          let errorMsg = 'Unable to detect location';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Permission denied. Please enable location access.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is unavailable.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Location request timed out.';
          }
          message.error(errorMsg);
          setLocatingAsset(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } catch {
      message.error('Failed to detect location');
      setLocatingAsset(false);
    }
  };

  const handleRefreshInventory = async () => {
    if (!asset) return;
    setRefreshingInventory(true);
    try {
      const result = await assetService.refreshAssetInventory(asset.id);
      message.success(`${result.message}. The data will update shortly.`);

      // Wait for agent to respond and then refetch data
      setTimeout(async () => {
        await fetchAssetDetails();
        await fetchHardwareData();
        await fetchSoftwareData();
        await fetchTelemetryData();
        setRefreshingInventory(false);
        message.info('Asset data refreshed');
      }, 5000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      message.error(err?.response?.data?.error || 'Failed to refresh inventory');
      setRefreshingInventory(false);
    }
  };

  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'duplicate',
      label: 'Duplicate Asset',
      icon: <CopyOutlined />,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        handleDuplicateAsset();
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete Asset',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        handleDeleteAsset();
      },
    },
  ];

  // Handle depreciation method change
  const handleDepreciationMethodChange = (method: string) => {
    setSelectedDepreciationMethod(method);
    fetchLifecycleData(method);
  };

  // Render Life Cycle Tab
  const renderLifecycleTab = () => {
    if (loadingLifecycle) return <div>Loading lifecycle data...</div>;
    if (!lifecycle) return <div>No lifecycle data available</div>;

    // Check if asset has financial data
    if (!lifecycle.hasFinancialData) {
      return (
        <div>
          <Card title="Depreciation Timeline" style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                  color: '#d9d9d9',
                }}
              >
                📊
              </div>
              <Title level={4} style={{ marginBottom: '8px', color: '#595959' }}>
                No Financial Data Available
              </Title>
              <Text type="secondary" style={{ marginBottom: '24px', maxWidth: '400px' }}>
                Add purchase cost, salvage value, and end of life date to see depreciation analysis using different calculation methods.
              </Text>
              <Button type="primary" icon={<EditOutlined />} onClick={() => setEditModalVisible(true)}>
                Add Financial Data
              </Button>
            </div>
          </Card>

          {/* Still show basic lifecycle dates if available */}
          {(lifecycle.purchaseDate || lifecycle.amcExpiryDate || lifecycle.warrantyExpiryDate || lifecycle.endOfLife) && (
            <Card title="Lifecycle Dates" style={{ marginBottom: 24 }}>
              <Row gutter={[24, 16]}>
                {lifecycle.purchaseDate && (
                  <Col span={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Purchase Date</Text>
                    <Text strong>{lifecycle.purchaseDate}</Text>
                  </Col>
                )}
                {lifecycle.amcExpiryDate && (
                  <Col span={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>AMC Expiry Date</Text>
                    <Text strong>{lifecycle.amcExpiryDate}</Text>
                  </Col>
                )}
                {lifecycle.warrantyExpiryDate && (
                  <Col span={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Warranty Expiry Date</Text>
                    <Text strong>{lifecycle.warrantyExpiryDate}</Text>
                  </Col>
                )}
                {lifecycle.endOfLife && (
                  <Col span={6}>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>End of Life</Text>
                    <Text strong>{lifecycle.endOfLife}</Text>
                  </Col>
                )}
              </Row>
            </Card>
          )}
        </div>
      );
    }

    const maxValue = Math.max(...lifecycle.depreciationTimeline.map((p) => p.value));

    const depreciationMethodSelector = (
      <Select
        value={selectedDepreciationMethod}
        onChange={handleDepreciationMethodChange}
        style={{ width: 220 }}
        options={[
          { value: 'straight-line', label: 'Straight Line (SLM)' },
          { value: 'double-declining', label: 'Double Declining Balance (DDB)' },
          { value: 'sum-of-years', label: 'Sum of Years Digits (SYD)' },
        ]}
      />
    );

    return (
      <div>
        <Card title="Depreciation Timeline" extra={depreciationMethodSelector} style={{ marginBottom: 24 }}>
          {/* Timeline */}
          <div style={{ position: 'relative', marginBottom: 40 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Line connecting dots */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: 0,
                  right: 0,
                  height: '4px',
                  background:
                    'linear-gradient(to right, #1890ff 0%, #1890ff 33%, #d9d9d9 33%, #d9d9d9 100%)',
                  zIndex: 0,
                }}
              />

              {/* Purchase Date */}
              <div style={{ zIndex: 1, flex: 1, textAlign: 'left' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#1890ff',
                    margin: '0 auto',
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                    Purchased on
                  </Text>
                  <Text strong>{lifecycle.purchaseDate}</Text>
                  <div>
                    <Tag color="blue">₹{lifecycle.purchaseValue?.toLocaleString()}</Tag>
                  </div>
                </div>
              </div>

              {/* Today */}
              <div style={{ zIndex: 1, flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#1890ff',
                    margin: '0 auto',
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                    Today
                  </Text>
                  <Text strong>{lifecycle.currentDate}</Text>
                  <div>
                    <Tag color="blue">₹{lifecycle.currentValue?.toLocaleString()}</Tag>
                  </div>
                </div>
              </div>

              {/* AMC Expiry Date */}
              <div style={{ zIndex: 1, flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#d9d9d9',
                    margin: '0 auto',
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                    AMC Expiry Date
                  </Text>
                  <Text strong>{lifecycle.amcExpiryDate}</Text>
                  <div>
                    <Tag color="purple">Warranty Expiry Date: {lifecycle.warrantyExpiryDate}</Tag>
                  </div>
                </div>
              </div>

              {/* End Of Life */}
              <div style={{ zIndex: 1, flex: 1, textAlign: 'right' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#d9d9d9',
                    margin: '0 auto',
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                    End Of Life
                  </Text>
                  <Text strong>{lifecycle.endOfLife}</Text>
                  <div>
                    <Tag color="red">₹{lifecycle.endOfLifeValue?.toLocaleString()}</Tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Depreciation Chart */}
          <div style={{ marginTop: 40 }}>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                height: '350px',
                position: 'relative',
              }}
            >
              {/* Y-Axis Labels */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: '60px',
                  paddingRight: '16px',
                  borderRight: '1px solid #d9d9d9',
                  textAlign: 'right',
                }}
              >
                {[40000, 30000, 20000, 10000, 0].map((value) => (
                  <div key={value} style={{ fontSize: '12px', color: '#666', height: '20px' }}>
                    ₹{(value / 1000).toFixed(0)}k
                  </div>
                ))}
              </div>

              {/* Chart Container */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '20px',
                  paddingBottom: '40px',
                  position: 'relative',
                  borderBottom: '1px solid #d9d9d9',
                }}
              >
                {lifecycle.depreciationTimeline.map((point, index) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        marginBottom: '8px',
                        color: '#666',
                        fontWeight: 500,
                      }}
                    >
                      ₹{point.value.toLocaleString()}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '50px',
                        height: `${(point.value / maxValue) * 100}%`,
                        background: index === 0 ? '#5b8ff9' : '#ff6b72',
                        borderRadius: '8px 8px 0 0',
                        transition: 'all 0.3s ease',
                        minHeight: '30px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    />
                    <div
                      style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: '#666',
                        fontWeight: 500,
                        textAlign: 'center',
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                paddingRight: '0px',
                marginLeft: '76px',
              }}
            >
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>Method:</strong> {lifecycle.depreciationMethod}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>Annual Depreciation:</strong> ₹{lifecycle.annualDepreciation?.toLocaleString() || 'N/A'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>Total Depreciation:</strong> ₹{lifecycle.totalDepreciation?.toLocaleString() || 'N/A'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>Years Elapsed:</strong> {lifecycle.yearsElapsed?.toFixed(1) || 'N/A'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>Years Remaining:</strong> {lifecycle.yearsRemaining?.toFixed(1) || 'N/A'}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Year(s)
              </Text>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // Render Hardware Tab
  const renderHardwareTab = () => {
    if (loadingHardware) return <div>Loading hardware data...</div>;
    if (!hardware) return <div>No hardware data available</div>;

    const networkColumns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'IP ADDRESS V4', dataIndex: 'ipAddressV4', key: 'ipAddressV4' },
      { title: 'IP ADDRESS V6', dataIndex: 'ipAddressV6', key: 'ipAddressV6' },
      { title: 'MAC ADDRESS', dataIndex: 'macAddress', key: 'macAddress' },
      { title: 'DHCP SERV', dataIndex: 'dhcpServer', key: 'dhcpServer' },
    ];

    return (
      <div>
        {/* Device Header - Dynamic based on OS */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '24px',
              background: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: 24,
            }}
          >
            {/* Large Logo/Icon - Dynamic based on OS */}
            <div
              style={{
                fontSize: '80px',
                color: asset?.osType?.toLowerCase().includes('mac') || asset?.osType?.toLowerCase().includes('darwin') ? '#000' : '#0078d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '120px',
              }}
            >
              {asset?.osType?.toLowerCase().includes('mac') || asset?.osType?.toLowerCase().includes('darwin') ? (
                <AppleOutlined />
              ) : asset?.osType?.toLowerCase().includes('linux') ? (
                <DesktopOutlined style={{ color: '#E95420' }} />
              ) : (
                <WindowsOutlined />
              )}
            </div>

            {/* Device Info - Use asset data */}
            <div>
              <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
                {asset?.model || hardware.bios?.name || 'Unknown Device'}
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {asset?.manufacturer || hardware.bios?.manufacturer || 'Unknown Manufacturer'}
              </Text>
            </div>
          </div>
        </div>

        {/* BIOS Details Card */}
        <Card
          title="BIOS Information"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">Install Date</Text>
              <div>{hardware.bios?.installDate ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">BIOS Version</Text>
              <div>{hardware.bios?.biosVersion ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Manufacturer</Text>
              <div>{hardware.bios?.manufacturer ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Description</Text>
              <div>{hardware.bios?.description ?? 'N/A'}</div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Text type="secondary">Secure Boot State</Text>
              <div>{hardware.bios?.secureBootState ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Serial Number</Text>
              <div>{hardware.bios?.serialNumber ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Serial Number</Text>
              <div>{hardware.bios?.serialNumber ?? 'N/A'}</div>
            </Col>
          </Row>
        </Card>

        {/* Processor */}
        <Card
          title={
            <div>
              <div style={{ fontWeight: 600 }}>{hardware.processor?.name ?? 'Unknown Processor'}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                PROCESSOR DETAILS
              </Text>
            </div>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">Logical Processors</Text>
              <div>{hardware.processor?.logicalProcessors ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Manufacturer</Text>
              <div>{hardware.processor?.manufacturer ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Number of Core</Text>
              <div>{hardware.processor?.numberOfCores ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Processor Speed</Text>
              <div>{hardware.processor?.processorSpeed ?? 'N/A'}</div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Text type="secondary">Secure Boot State</Text>
              <div style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                {hardware.processor?.secureBootState ?? 'N/A'}
              </div>
            </Col>
          </Row>
        </Card>

        {/* Baseboard */}
        <Card
          title={
            <div>
              <div style={{ fontWeight: 600 }}>{hardware.baseBoard?.name ?? 'Unknown Baseboard'}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                BASEBOARD DETAILS
              </Text>
            </div>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">Part Number</Text>
              <div>{hardware.baseBoard?.partNumber ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Product ID</Text>
              <div>{hardware.baseBoard?.productId ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Serial Number</Text>
              <div>{hardware.baseBoard?.serialNumber ?? 'N/A'}</div>
            </Col>
            <Col span={6}>
              <Text type="secondary">Tag</Text>
              <div>{hardware.baseBoard?.tag ?? 'N/A'}</div>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Text type="secondary">Version</Text>
              <div>{hardware.baseBoard?.version ?? 'N/A'}</div>
            </Col>
          </Row>
        </Card>

        {/* Storage */}
        <Card
          title={
            <div>
              <div style={{ fontWeight: 600 }}>
                {(hardware.storage || []).length} Partition -{' '}
                {(() => {
                  const storage = hardware.storage || [];
                  // Find the main drive (root or Data volume)
                  const mainDrive = storage.find(d =>
                    d.mountPoint === '/' ||
                    d.mountPoint === '/System/Volumes/Data' ||
                    d.name?.toLowerCase().includes('macintosh')
                  ) || storage[0];
                  const capacity = parseFloat(mainDrive?.capacity || '0');
                  return capacity >= 1000 ? `${(capacity / 1024).toFixed(1)} TB` : `${Math.round(capacity)} GB`;
                })()}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                STORAGE
              </Text>
            </div>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            {(hardware.storage || []).map((drive, idx) => {
              // Parse used and capacity to calculate percentage
              const usedGB = parseFloat(drive.used?.replace(/[^0-9.]/g, '') || '0');
              const capacityGB = parseFloat(drive.capacity?.replace(/[^0-9.]/g, '') || '1');
              const usedPercent = capacityGB > 0 ? Math.round((usedGB / capacityGB) * 100) : 0;
              const progressColor = usedPercent > 90 ? '#ff4d4f' : usedPercent > 70 ? '#faad14' : '#52c41a';

              return (
                <Col span={12} key={idx}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Text type="secondary">Drive</Text>
                        <div style={{ fontWeight: 600 }}>{drive.drive}</div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary">Capacity</Text>
                        <div>
                          <span style={{ color: progressColor }}>{drive.used}</span> / {drive.capacity}
                        </div>
                      </Col>
                    </Row>
                    <Row style={{ marginTop: 8 }}>
                      <Col span={24}>
                        <Progress
                          percent={usedPercent}
                          strokeColor={progressColor}
                          size="small"
                          format={() => `${usedPercent}% used`}
                        />
                      </Col>
                    </Row>
                    <Row gutter={8} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <Text type="secondary">Format</Text>
                        <div>{drive.format}</div>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">Type</Text>
                        <div>{drive.type}</div>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">Serial number</Text>
                        <div style={{ fontSize: '11px' }}>{drive.serialNumber}</div>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              );
            })}
          </Row>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button type="link" size="small">
              Show Less ˄
            </Button>
          </div>
        </Card>

        {/* Memory */}
        <Card
          title={
            <div>
              <div style={{ fontWeight: 600 }}>
                {(hardware.memory || []).length} Slots -{' '}
                {(hardware.memory || []).reduce((acc, m) => acc + parseFloat(m.capacity || '0'), 0)} GB
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                MEMORY
              </Text>
            </div>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            {(hardware.memory || []).map((mem, idx) => (
              <Col span={12} key={idx}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Text type="secondary">{mem.slot}</Text>
                      <div style={{ fontWeight: 600 }}>{mem.name}</div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Capacity</Text>
                      <div>{mem.capacity}</div>
                    </Col>
                  </Row>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={8}>
                      <Text type="secondary">Bank Label</Text>
                      <div>{mem.bankLabel}</div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Locator</Text>
                      <div>{mem.locator}</div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary">Memory Type</Text>
                      <div>{mem.memoryType}</div>
                    </Col>
                  </Row>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <Text type="secondary">Serial Number</Text>
                      <div>{mem.serialNumber}</div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Part Number</Text>
                      <div style={{ fontSize: '11px' }}>{mem.partNumber}</div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Network Adapters */}
        <Card
          title={
            <div>
              <div style={{ fontWeight: 600 }}>
                {(hardware.networkAdapters || []).length} Network Adapters
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                NETWORK ADAPTERS
              </Text>
            </div>
          }
          size="small"
        >
          <Table
            columns={networkColumns}
            dataSource={hardware.networkAdapters}
            rowKey="id"
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} Application found`,
            }}
            size="small"
          />
        </Card>
      </div>
    );
  };

  // Render Software Tab
  const renderSoftwareTab = () => {
    if (loadingSoftware) return <div>Loading software data...</div>;
    if (!software) return <div>No software data available</div>;

    const { Panel } = Collapse;

    // Get unique vendors for filter options
    const uniqueVendors = [...new Set(software.applications.map((app) => app.vendor).filter(Boolean))];

    const applicationColumns = [
      {
        title: 'Application Name',
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => (
          <Space>
            <div
              style={{
                width: 32,
                height: 32,
                background: '#ff0000',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              A
            </div>
            <div>
              <div>{text}</div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                xxx xxx xxx
              </Text>
            </div>
          </Space>
        ),
      },
      {
        title: 'Vendor',
        dataIndex: 'vendor',
        key: 'vendor',
        filters: uniqueVendors.map((vendor) => ({ text: vendor, value: vendor })),
        filteredValue: appVendorFilters.length > 0 ? appVendorFilters : null,
        onFilter: (value: unknown, record: { vendor?: string }) => record.vendor === value,
      },
      { title: 'Version', dataIndex: 'version', key: 'version' },
      {
        title: 'Patch Status',
        dataIndex: 'patchStatus',
        key: 'patchStatus',
        filters: [
          { text: 'Available', value: 'Available' },
          { text: 'Not Available', value: 'Not Available' },
        ],
        filteredValue: appPatchStatusFilters.length > 0 ? appPatchStatusFilters : null,
        onFilter: (value: unknown, record: { patchStatus?: string }) => record.patchStatus === value,
        render: (status: string) => (
          <Space>
            <span style={{ color: status === 'Available' ? '#52c41a' : '#d9d9d9' }}>●</span>
            <span>{status || 'Unknown'}</span>
          </Space>
        ),
      },
      { title: 'Last Patched', dataIndex: 'lastPatched', key: 'lastPatched' },
      { title: 'App Installed On', dataIndex: 'appInstalledOn', key: 'appInstalledOn' },
    ];

    const serviceColumns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Display Name', dataIndex: 'displayName', key: 'displayName', ellipsis: true },
      {
        title: 'State',
        dataIndex: 'state',
        key: 'state',
        render: (state: string) => (
          <Space>
            <span style={{ color: state === 'Running' ? '#52c41a' : '#d9d9d9' }}>●</span>
            <span>{state || 'Unknown'}</span>
          </Space>
        ),
      },
      {
        title: 'Startup Type',
        dataIndex: 'startupType',
        key: 'startupType',
        render: (type: string) => type || '-',
      },
    ];

    // Convert startup programs to service-like format and merge with services
    const startupProgramsAsServices = (software.startupPrograms || []).map((prog: { id: string; name: string; command?: string; enabled?: boolean }) => ({
      id: `startup-${prog.id}`,
      name: prog.name,
      displayName: prog.command || prog.name,
      state: prog.enabled ? 'Enabled' : 'Disabled',
      startupType: 'Startup Program',
      isStartupProgram: true,
    }));

    const allServices = [...software.services, ...startupProgramsAsServices];

    // Handle table filter changes for applications
    const handleAppTableChange = (
      _pagination: unknown,
      filters: Record<string, (string | number | boolean)[] | null>
    ) => {
      setAppVendorFilters((filters.vendor as string[]) || []);
      setAppPatchStatusFilters((filters.patchStatus as string[]) || []);
    };

    // Clear all application filters
    const clearAppFilters = () => {
      setAppVendorFilters([]);
      setAppPatchStatusFilters([]);
    };

    const hasActiveFilters = appVendorFilters.length > 0 || appPatchStatusFilters.length > 0;

    // CSV export utility
    const exportToCSV = (
      data: Record<string, unknown>[],
      columns: { key: string; title: string }[],
      filename: string
    ) => {
      if (data.length === 0) {
        message.warning('No data to export');
        return;
      }

      const headers = columns.map((col) => col.title);
      const keys = columns.map((col) => col.key);

      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          keys
            .map((key) => {
              const value = row[key];
              // Handle null/undefined, escape quotes, wrap in quotes if contains comma
              const stringValue = value == null ? '' : String(value);
              const escaped = stringValue.replace(/"/g, '""');
              return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
                ? `"${escaped}"`
                : escaped;
            })
            .join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(`Exported ${data.length} rows to ${filename}`);
    };

    // Export handlers for each tab
    // Split applications into user apps and system apps
    const userApps = software.applications.filter((app) => !app.isSystemApp);
    const systemApps = software.applications.filter((app) => app.isSystemApp);

    const exportApplications = () => {
      const columns = [
        { key: 'name', title: 'Application Name' },
        { key: 'vendor', title: 'Vendor' },
        { key: 'version', title: 'Version' },
        { key: 'patchStatus', title: 'Patch Status' },
        { key: 'lastPatched', title: 'Last Patched' },
        { key: 'appInstalledOn', title: 'Installed On' },
      ];
      const hostname = asset?.name || 'asset';
      exportToCSV(userApps, columns, `${hostname}-applications.csv`);
    };

    const exportSystemApps = () => {
      const columns = [
        { key: 'name', title: 'Application Name' },
        { key: 'vendor', title: 'Vendor' },
        { key: 'version', title: 'Version' },
        { key: 'patchStatus', title: 'Patch Status' },
        { key: 'lastPatched', title: 'Last Patched' },
        { key: 'appInstalledOn', title: 'Installed On' },
      ];
      const hostname = asset?.name || 'asset';
      exportToCSV(systemApps, columns, `${hostname}-system-apps.csv`);
    };

    const exportServices = () => {
      const columns = [
        { key: 'name', title: 'Service Name' },
        { key: 'displayName', title: 'Display Name' },
        { key: 'state', title: 'State' },
        { key: 'startupType', title: 'Startup Type' },
      ];
      const hostname = asset?.name || 'asset';
      exportToCSV(allServices, columns, `${hostname}-services.csv`);
    };

    const softwareSubTabs = [
      {
        key: 'applications',
        label: `Applications (${userApps.length})`,
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Input.Search placeholder="Search" style={{ width: 300 }} />
                {hasActiveFilters && (
                  <Button size="small" onClick={clearAppFilters}>
                    Clear Filters
                  </Button>
                )}
              </Space>
              <Tooltip title="Export to CSV">
                <Button icon={<DownloadOutlined />} onClick={exportApplications} />
              </Tooltip>
            </div>
            <Table
              columns={applicationColumns}
              dataSource={userApps}
              rowKey="id"
              onChange={handleAppTableChange}
              pagination={{
                pageSize: 25,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} applications found`,
              }}
              size="small"
            />
          </div>
        ),
      },
      {
        key: 'system-apps',
        label: `System Apps (${systemApps.length})`,
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Input.Search placeholder="Search" style={{ width: 300 }} />
              <Tooltip title="Export to CSV">
                <Button icon={<DownloadOutlined />} onClick={exportSystemApps} />
              </Tooltip>
            </div>
            <Table
              columns={applicationColumns}
              dataSource={systemApps}
              rowKey="id"
              pagination={{
                pageSize: 25,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} system apps found`,
              }}
              size="small"
            />
          </div>
        ),
      },
      {
        key: 'services',
        label: `Services (${allServices.length})`,
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Input.Search placeholder="Search" style={{ width: 300 }} />
              <Tooltip title="Export to CSV">
                <Button icon={<DownloadOutlined />} onClick={exportServices} />
              </Tooltip>
            </div>
            <Table
              columns={serviceColumns}
              dataSource={allServices}
              rowKey="id"
              pagination={{ pageSize: 25, showTotal: (total) => `Total ${total} services found` }}
              size="small"
            />
          </div>
        ),
      },
    ];

    // Helper to get OS icon
    const getOSIcon = () => {
      const osName = software?.os?.name?.toLowerCase() || asset?.osType?.toLowerCase() || '';
      if (osName.includes('mac') || osName.includes('darwin')) {
        return <AppleOutlined style={{ color: '#000', fontSize: '16px' }} />;
      } else if (osName.includes('windows')) {
        return <WindowsOutlined style={{ color: '#0078d4', fontSize: '16px' }} />;
      } else if (osName.includes('linux') || osName.includes('ubuntu')) {
        return <DesktopOutlined style={{ color: '#E95420', fontSize: '16px' }} />;
      }
      return <DesktopOutlined style={{ fontSize: '16px' }} />;
    };

    // Get OS display name
    const getOSDisplayName = () => {
      if (software?.os?.name && software?.os?.version) {
        return `${software.os.name} ${software.os.version}`;
      }
      if (asset?.osType && asset?.osVersion) {
        return `${asset.osType} ${asset.osVersion}`;
      }
      return 'Operating System';
    };

    return (
      <div>
        {/* Operating System Details */}
        <Collapse defaultActiveKey={['os']} style={{ marginBottom: 16 }}>
          <Panel
            header={
              <Space>
                {getOSIcon()}
                <Text strong>{getOSDisplayName()}</Text>
              </Space>
            }
            key="os"
          >
            <Row gutter={[16, 8]}>
              <Col span={6}>
                <Text type="secondary">Operating System</Text>
                <div>{software?.os?.name || asset?.osType || '-'}</div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Version</Text>
                <div>{software?.os?.version || asset?.osVersion || '-'}</div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Hostname</Text>
                <div>{asset?.name || '-'}</div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Manufacturer</Text>
                <div>{asset?.manufacturer || '-'}</div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Model</Text>
                <div>{asset?.model || '-'}</div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Serial Number</Text>
                <div>{asset?.serialNumber || '-'}</div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Status</Text>
                <div>
                  <Tag color={asset?.operationalStatus === 'Connected' ? 'green' : 'orange'}>
                    {asset?.operationalStatus || '-'}
                  </Tag>
                </div>
              </Col>
              <Col span={6}>
                <Text type="secondary">Last Updated</Text>
                <div>{asset?.updatedAt ? new Date(asset.updatedAt).toLocaleString() : '-'}</div>
              </Col>
            </Row>
          </Panel>
        </Collapse>

        <Collapse defaultActiveKey={[]} style={{ marginBottom: 16 }}>
          <Panel
            header={
              <Space>
                <Text strong>Software Licenses</Text>
                {software.os?.licenseStatus && (
                  <Tag color="blue">OS: {software.os.licenseStatus}</Tag>
                )}
              </Space>
            }
            key="licenses"
          >
            {/* OS License Section */}
            {software.os?.licenseStatus && (
              <Card
                size="small"
                title={
                  <Space>
                    <DesktopOutlined />
                    <Text strong>Operating System License</Text>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={6}>
                    <Text type="secondary">OS Name</Text>
                    <div>
                      <Text strong>{software.os.name}</Text>
                    </div>
                  </Col>
                  <Col span={4}>
                    <Text type="secondary">Version</Text>
                    <div>{software.os.version || '-'}</div>
                  </Col>
                  <Col span={4}>
                    <Text type="secondary">Build</Text>
                    <div>{software.os.buildNumber || '-'}</div>
                  </Col>
                  <Col span={4}>
                    <Text type="secondary">Architecture</Text>
                    <div>{software.os.architecture || '-'}</div>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">License Status</Text>
                    <div>
                      <Tag
                        color={
                          software.os.licenseStatus?.toLowerCase() === 'licensed'
                            ? 'green'
                            : software.os.licenseStatus?.toLowerCase() === 'trial'
                              ? 'orange'
                              : 'red'
                        }
                      >
                        {software.os.licenseStatus}
                      </Tag>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Application Licenses Section */}
            {(() => {
              // Only include apps with meaningful license data (status, type, or key must exist)
              const licensedApps = software.applications.filter(
                (app) =>
                  app.license &&
                  (app.license.status || app.license.type || app.license.key)
              );

              const getLicenseStatusColor = (status?: string) => {
                switch (status?.toLowerCase()) {
                  case 'licensed':
                    return 'green';
                  case 'trial':
                    return 'blue';
                  case 'graceperiod':
                    return 'orange';
                  case 'expired':
                  case 'unlicensed':
                    return 'red';
                  default:
                    return 'default';
                }
              };

              const getLicenseTypeColor = (type?: string) => {
                switch (type?.toLowerCase()) {
                  case 'perpetual':
                    return 'green';
                  case 'subscription':
                    return 'blue';
                  case 'trial':
                    return 'orange';
                  case 'freeware':
                  case 'opensource':
                    return 'cyan';
                  case 'oem':
                  case 'volume':
                    return 'purple';
                  default:
                    return 'default';
                }
              };

              if (licensedApps.length === 0 && !software.os?.licenseStatus) {
                return (
                  <Text type="secondary">
                    No license information collected. License data is detected for commercial
                    software like Microsoft Office, Adobe products, and other licensed
                    applications.
                  </Text>
                );
              }

              if (licensedApps.length === 0) {
                return null; // OS license shown above, no app licenses
              }

              const licenseColumns = [
                {
                  title: 'Application',
                  dataIndex: 'name',
                  key: 'name',
                  width: 200,
                  render: (name: string, record: (typeof licensedApps)[0]) => (
                    <Space orientation="vertical" size={0}>
                      <Text strong>{name}</Text>
                      {record.vendor && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {record.vendor}
                        </Text>
                      )}
                    </Space>
                  ),
                },
                {
                  title: 'License Type',
                  dataIndex: ['license', 'type'],
                  key: 'type',
                  width: 120,
                  render: (type?: string) =>
                    type ? <Tag color={getLicenseTypeColor(type)}>{type}</Tag> : '-',
                },
                {
                  title: 'Status',
                  dataIndex: ['license', 'status'],
                  key: 'status',
                  width: 100,
                  render: (status?: string) =>
                    status ? <Tag color={getLicenseStatusColor(status)}>{status}</Tag> : '-',
                },
                {
                  title: 'License Key',
                  dataIndex: ['license', 'key'],
                  key: 'key',
                  width: 220,
                  render: (key?: string) =>
                    key ? (
                      <Text code style={{ fontSize: 11 }}>
                        {key}
                      </Text>
                    ) : (
                      '-'
                    ),
                },
                {
                  title: 'Expiration',
                  dataIndex: ['license', 'expirationDate'],
                  key: 'expiration',
                  width: 140,
                  render: (date: string | undefined, record: (typeof licensedApps)[0]) => {
                    if (!date) return '-';
                    const days = record.license?.daysRemaining;
                    return (
                      <Space orientation="vertical" size={0}>
                        <Text>{new Date(date).toLocaleDateString()}</Text>
                        {days !== undefined && (
                          <Text
                            type={days <= 30 ? 'danger' : 'secondary'}
                            style={{ fontSize: 11 }}
                          >
                            {days} days remaining
                          </Text>
                        )}
                      </Space>
                    );
                  },
                },
                {
                  title: 'Licensed To',
                  dataIndex: ['license', 'licensedTo'],
                  key: 'licensedTo',
                  width: 150,
                  render: (value?: string) => value || '-',
                },
                {
                  title: 'Channel',
                  dataIndex: ['license', 'channel'],
                  key: 'channel',
                  width: 100,
                  render: (channel?: string) => (channel ? <Tag>{channel}</Tag> : '-'),
                },
              ];

              return (
                <>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Application Licenses ({licensedApps.length})
                  </Text>
                  <Table
                    columns={licenseColumns}
                    dataSource={licensedApps}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1000 }}
                  />
                </>
              );
            })()}
          </Panel>
        </Collapse>

        {/* Sub Tabs */}
        <Tabs items={softwareSubTabs} />
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: '#ff4d4f',
      HIGH: '#fa8c16',
      MEDIUM: '#faad14',
      LOW: '#52c41a',
    };
    return colors[severity?.toUpperCase()] || '#d9d9d9';
  };


  // Render Alerts Tab
  const renderAlertsTab = () => {
    type AlertItem = {
      id: string;
      alert: string;
      severity: 'CRITICAL' | 'CLEAR' | 'WARNING' | 'INFO';
      module: string;
      attribute: string;
      value: string;
      message: string;
      createdOn: string;
    };

    const getAlertSeverityColor = (severity: string) => {
      switch (severity) {
        case 'CRITICAL':
          return 'red';
        case 'CLEAR':
          return 'green';
        case 'WARNING':
          return 'orange';
        case 'INFO':
          return 'blue';
        default:
          return 'default';
      }
    };

    const filteredAlerts = (alertsData as AlertItem[]).filter(alert =>
      alert.alert.toLowerCase().includes(alertsSearchText.toLowerCase()) ||
      alert.module.toLowerCase().includes(alertsSearchText.toLowerCase()) ||
      alert.attribute.toLowerCase().includes(alertsSearchText.toLowerCase()) ||
      alert.message.toLowerCase().includes(alertsSearchText.toLowerCase())
    );

    const alertsColumns: ColumnsType<AlertItem> = [
      {
        title: 'Alert',
        dataIndex: 'alert',
        key: 'alert',
        sorter: (a, b) => a.alert.localeCompare(b.alert),
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        sorter: (a, b) => a.severity.localeCompare(b.severity),
        render: (severity: string) => (
          <Tag color={getAlertSeverityColor(severity)}>{severity}</Tag>
        ),
      },
      {
        title: 'Module',
        dataIndex: 'module',
        key: 'module',
        sorter: (a, b) => a.module.localeCompare(b.module),
      },
      {
        title: 'Attribute',
        dataIndex: 'attribute',
        key: 'attribute',
        sorter: (a, b) => a.attribute.localeCompare(b.attribute),
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        sorter: (a, b) => parseFloat(a.value) - parseFloat(b.value),
      },
      {
        title: 'Message',
        dataIndex: 'message',
        key: 'message',
        sorter: (a, b) => a.message.localeCompare(b.message),
        render: (text: string) => (
          <Text ellipsis style={{ maxWidth: 200 }}>
            {text}
          </Text>
        ),
      },
      {
        title: 'Created On',
        dataIndex: 'createdOn',
        key: 'createdOn',
        sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
      },
    ];

    return (
      <div>
        {/* Top Controls */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={alertsSearchText}
            onChange={(e) => setAlertsSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Space>
            <Button icon={<CalendarOutlined />}>Timeline</Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchAlertsData()} loading={alertsLoading}>
              Refresh
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => {
              const csvContent = [
                ['Alert', 'Severity', 'Module', 'Attribute', 'Value', 'Message', 'Created On'].join(','),
                ...filteredAlerts.map(a => [a.alert, a.severity, a.module, a.attribute, a.value, `"${a.message}"`, a.createdOn].join(','))
              ].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `asset-alerts-${id}.csv`;
              link.click();
              URL.revokeObjectURL(url);
              message.success('Alerts exported');
            }}>
              Export
            </Button>
            <Button>Configure Alert</Button>
            <Space>
              <Button
                type={alertsViewMode === 'list' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setAlertsViewMode('list')}
              />
              <Button
                type={alertsViewMode === 'grid' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setAlertsViewMode('grid')}
              />
              <Button icon={<SettingOutlined />} />
            </Space>
          </Space>
        </div>

        {/* Alerts Table */}
        <Table
          columns={alertsColumns}
          dataSource={filteredAlerts}
          rowKey="id"
          loading={alertsLoading}
          pagination={{
            pageSize: 30,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50', '100'],
            showTotal: (total, range) =>
              `showing ${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </div>
    );
  };

  const renderVulnerabilitiesTab = () => {
    if (loadingVulnerabilities) return <Spin />;

    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    type VulnRecord = { cveId: string; title: string; severity: string; cvssScore: number; status: string; exploitable: boolean };

    const columns = [
      {
        title: 'CVE ID',
        dataIndex: 'cveId',
        key: 'cveId',
        width: 120,
        sorter: (a: VulnRecord, b: VulnRecord) => (a.cveId || '').localeCompare(b.cveId || ''),
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        sorter: (a: VulnRecord, b: VulnRecord) => (a.title || '').localeCompare(b.title || ''),
        render: (text: string) => <div style={{ fontSize: '14px' }}>{text}</div>,
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        width: 110,
        sorter: (a: VulnRecord, b: VulnRecord) => {
          const aOrder = severityOrder[a.severity?.toUpperCase()] ?? 4;
          const bOrder = severityOrder[b.severity?.toUpperCase()] ?? 4;
          return aOrder - bOrder;
        },
        render: (severity: string) => (
          <Tag
            color={getSeverityColor(severity)}
            style={{ color: '#000', fontWeight: 600 }}
          >
            {severity}
          </Tag>
        ),
      },
      {
        title: 'CVSS Score',
        dataIndex: 'cvssScore',
        key: 'cvssScore',
        width: 100,
        sorter: (a: VulnRecord, b: VulnRecord) => (a.cvssScore || 0) - (b.cvssScore || 0),
        render: (score: number) => (
          <div style={{ fontWeight: 600, color: getSeverityColor(score > 8 ? 'CRITICAL' : score > 5 ? 'HIGH' : 'LOW') }}>
            {score?.toFixed(1) || '0.0'}
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        sorter: (a: VulnRecord, b: VulnRecord) => (a.status || '').localeCompare(b.status || ''),
        render: (status: string) => {
          let color = 'default';
          if (status === 'Patched') color = 'green';
          else if (status === 'Patch Available') color = 'orange';
          else if (status === 'Unpatched') color = 'red';
          return <Tag color={color}>{status}</Tag>;
        },
      },
      {
        title: 'Exploit',
        dataIndex: 'exploitable',
        key: 'exploitable',
        width: 80,
        sorter: (a: VulnRecord, b: VulnRecord) => (a.exploitable === b.exploitable ? 0 : a.exploitable ? -1 : 1),
        render: (exploitable: boolean) => (
          <span style={{ color: exploitable ? '#ff4d4f' : '#52c41a' }}>
            {exploitable ? '● In Wild' : '● Safe'}
          </span>
        ),
      },
    ];

    return (
      <div>
        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {vulnerabilities.filter((v) => v.severity?.toUpperCase() === 'CRITICAL').length}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Critical
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                  {vulnerabilities.filter((v) => v.severity?.toUpperCase() === 'HIGH').length}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  High
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                  {vulnerabilities.filter((v) => v.severity?.toUpperCase() === 'MEDIUM').length}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Medium
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                  {vulnerabilities.filter((v) => v.status === 'Patched').length}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Patched
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Vulnerabilities Table */}
        <Card title="Security Vulnerabilities" size="small" style={{ marginBottom: 24 }}>
          <Table
            columns={columns}
            dataSource={vulnerabilities}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} vulnerabilities found`,
            }}
            size="small"
            rowClassName={(record) => {
              if (record.severity?.toUpperCase() === 'CRITICAL') return 'vuln-critical-row';
              return '';
            }}
            onRow={(record) => ({
              onClick: () => {
                // Expand row details
                Modal.info({
                  title: record.title,
                  content: (
                    <div>
                      <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={12}>
                          <Text type="secondary">CVE ID</Text>
                          <div>
                            <Text strong>{record.cveId}</Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Severity</Text>
                          <div>
                            <Tag color={getSeverityColor(record.severity)}>
                              {record.severity}
                            </Tag>
                          </div>
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={12}>
                          <Text type="secondary">CVSS Score</Text>
                          <div>{record.cvssScore.toFixed(1)}</div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Status</Text>
                          <div>
                            <Tag
                              color={
                                record.status === 'Patched'
                                  ? 'green'
                                  : record.status === 'Patch Available'
                                    ? 'orange'
                                    : 'red'
                              }
                            >
                              {record.status}
                            </Tag>
                          </div>
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={24}>
                          <Text type="secondary">Description</Text>
                          <div>{record.description}</div>
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={12}>
                          <Text type="secondary">Affected Software</Text>
                          <div>{record.affectedSoftware}</div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Affected Versions</Text>
                          <div>{record.affectedVersions}</div>
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={12}>
                          <Text type="secondary">Date Discovered</Text>
                          <div>{record.dateDiscovered}</div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Date Published</Text>
                          <div>{record.datePublished}</div>
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={12}>
                          <Text type="secondary">Patch Available</Text>
                          <div>{record.patchVersion}</div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Exploit Available</Text>
                          <div>
                            <span style={{ color: record.exploitAvailable ? '#ff4d4f' : '#52c41a' }}>
                              {record.exploitAvailable ? '● Yes' : '● No'}
                            </span>
                          </div>
                        </Col>
                      </Row>
                      {record.status !== 'Patched' && (
                        <Row gutter={16} style={{ marginTop: 24 }}>
                          <Col span={24}>
                            <Space>
                              <Button type="primary" onClick={() => message.success('Patch deployment initiated')}>
                                Deploy Patch
                              </Button>
                              <Button onClick={() => message.info('Marked as mitigated')}>
                                Mark as Mitigated
                              </Button>
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
        <div>
          {/* Asset Header */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <WindowsOutlined style={{ fontSize: 48, color: '#0078d4' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {asset.name}
              </Title>
              <Space>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor:
                      asset.operationalStatus === 'Connected' ? '#52c41a' : '#ff4d4f',
                    display: 'inline-block',
                  }}
                />
                <Text type="secondary">{asset.operationalStatus}</Text>
              </Space>
            </div>
          </div>

          {/* Asset Info Grid */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Text type="secondary">Asset ID</Text>
              <div>
                <Text strong>{asset.assetId || asset.id || 'N/A'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Asset type</Text>
              <div>
                <Text strong>{asset.assetType || 'Endpoint'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">Host Name</Text>
              <div>
                <Text strong style={{ fontFamily: 'monospace' }}>
                  {asset.hostname || asset.name || 'N/A'}
                </Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">OS</Text>
              <div>
                <Text strong>{asset.osType || 'N/A'}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">IP Address</Text>
              <div>
                <Text strong style={{ fontFamily: 'monospace' }}>
                  {asset.ipAddress || 'N/A'}
                </Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary">MAC Address</Text>
              <div>
                <Text strong style={{ fontFamily: 'monospace' }}>
                  {asset.macAddress ||
                   (hardware?.networkAdapters && hardware.networkAdapters.length > 0
                     ? hardware.networkAdapters[0].macAddress
                     : 'N/A')}
                </Text>
              </div>
            </Col>
          </Row>

          {/* Status */}
          <div style={{ marginBottom: 24 }}>
            <Text type="secondary">Status</Text>
            <div>
              <Tag color="blue">{asset.status}</Tag>
              <Button size="small" type="text">
                Manage
              </Button>
            </div>
          </div>

          {/* Agent Status */}
          {asset.agent && (
            <Card
              title={
                <Space>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: asset.agent.status === 'Connected' ? '#52c41a' : '#ff4d4f',
                      display: 'inline-block',
                    }}
                  />
                  <span>Agent Status</span>
                  <Tag color={asset.agent.status === 'Connected' ? 'green' : 'red'}>
                    {asset.agent.status}
                  </Tag>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<ReloadOutlined spin={refreshingInventory} />}
                  onClick={handleRefreshInventory}
                  loading={refreshingInventory}
                  size="small"
                >
                  Refresh Inventory
                </Button>
              }
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Text type="secondary">Agent Version</Text>
                  <div>
                    <Text strong>{asset.agent.version || 'Unknown'}</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Last Heartbeat</Text>
                  <div>
                    <Text strong>{asset.agent.lastHeartbeatRelative || 'Never'}</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Heartbeat Interval</Text>
                  <div>
                    <Text strong>{asset.agent.heartbeatInterval || 60} seconds</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Agent ID</Text>
                  <div>
                    <Text strong style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {asset.agent.id?.substring(0, 8) || 'N/A'}...
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          {/* Performance - Real-time telemetry from agent heartbeat */}
          <Card
            title={
              <Space>
                <span>Performance</span>
                {telemetryLastUpdated && (
                  <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'normal' }}>
                    Last updated: {telemetryLastUpdated.toLocaleTimeString()}
                  </Text>
                )}
                {loadingTelemetry && telemetry && (
                  <Spin size="small" />
                )}
              </Space>
            }
            extra={
              <Space>
                <Tooltip title={`Auto-refresh every ${TELEMETRY_POLL_INTERVAL / 1000}s`}>
                  <Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Auto-refresh</Text>
                    <Switch
                      size="small"
                      checked={autoRefreshEnabled}
                      onChange={setAutoRefreshEnabled}
                    />
                  </Space>
                </Tooltip>
                <Tooltip title="Refresh now">
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined spin={loadingTelemetry} />}
                    onClick={fetchTelemetryData}
                    disabled={loadingTelemetry}
                  />
                </Tooltip>
              </Space>
            }
            size="small"
            style={{ marginBottom: 24 }}
          >
            {loadingTelemetry && !telemetry ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="small" />
                <Text type="secondary" style={{ marginLeft: 8 }}>Fetching telemetry...</Text>
              </div>
            ) : (
              <Row gutter={16}>
                <Col span={6}>
                  <Text type="secondary">System Uptime</Text>
                  <div>
                    <Text strong>
                      {telemetry?.systemUptime?.uptimeHuman
                        ? telemetry.systemUptime.uptimeHuman
                        : telemetry?.systemUptime?.uptimeSeconds
                        ? (() => {
                            const seconds = telemetry.systemUptime.uptimeSeconds;
                            const days = Math.floor(seconds / 86400);
                            const hours = Math.floor((seconds % 86400) / 3600);
                            const mins = Math.floor((seconds % 3600) / 60);
                            const secs = seconds % 60;
                            return `${days} day${days !== 1 ? 's' : ''}, ${hours} hr${hours !== 1 ? 's' : ''}, ${mins} min, ${secs} sec`;
                          })()
                        : asset.performance?.systemUptime ?? 'N/A'}
                    </Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div>
                    <Text type="secondary">Memory Utilization</Text>
                    <div>
                      <Text strong>
                        {telemetry?.memory?.usagePercent?.toFixed(1) ?? asset.performance?.memoryUtilization ?? 0}%
                      </Text>
                    </div>
                    <Progress
                      percent={telemetry?.memory?.usagePercent ?? asset.performance?.memoryUtilization ?? 0}
                      showInfo={false}
                      size="small"
                      status={
                        (telemetry?.memory?.usagePercent ?? 0) > 90 ? 'exception' :
                        (telemetry?.memory?.usagePercent ?? 0) > 70 ? 'active' : 'normal'
                      }
                    />
                  </div>
                </Col>
                <Col span={6}>
                  <div>
                    <Text type="secondary">CPU Utilization</Text>
                    <div>
                      <Text strong>
                        {telemetry?.cpu?.usagePercent?.toFixed(1) ?? asset.performance?.cpuUtilization ?? 0}%
                      </Text>
                    </div>
                    <Progress
                      percent={telemetry?.cpu?.usagePercent ?? asset.performance?.cpuUtilization ?? 0}
                      showInfo={false}
                      size="small"
                      status={
                        (telemetry?.cpu?.usagePercent ?? 0) > 90 ? 'exception' :
                        (telemetry?.cpu?.usagePercent ?? 0) > 70 ? 'active' : 'normal'
                      }
                    />
                  </div>
                </Col>
                <Col span={6}>
                  <div>
                    <Text type="secondary">Disk Utilization</Text>
                    <div>
                      <Text strong>
                        {telemetry?.disk?.drives?.[0]?.usagePercent?.toFixed(1) ?? asset.performance?.diskUtilization ?? 0}%
                      </Text>
                    </div>
                    <Progress
                      percent={telemetry?.disk?.drives?.[0]?.usagePercent ?? asset.performance?.diskUtilization ?? 0}
                      showInfo={false}
                      size="small"
                      status={
                        (telemetry?.disk?.drives?.[0]?.usagePercent ?? 0) > 90 ? 'exception' :
                        (telemetry?.disk?.drives?.[0]?.usagePercent ?? 0) > 70 ? 'active' : 'normal'
                      }
                    />
                  </div>
                </Col>
              </Row>
            )}
          </Card>

          {/* Allotment */}
          <Card title="Allotment" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Owner</Text>
                <div>
                  <Text strong>{asset.owner?.name ?? 'Not Assigned'}</Text>
                </div>
                <div>
                  <Text type="secondary">{asset.owner?.email ?? '-'}</Text>
                </div>
                <div>
                  <Text type="secondary">{asset.owner?.phone ?? '-'}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">User</Text>
                <div>
                  <Text>Not Assigned</Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Battery Information - Only show for laptops/mobile devices */}
          {hardware && hardware.battery && asset && (asset.assetType === 'Laptop' || asset.assetType === 'Mobile' || asset.assetType === 'Tablet') && (
            <Card title="Battery" size="small" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Text type="secondary">Battery Health</Text>
                  <div>
                    <Text strong>{hardware.battery.health}</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Cycle Count</Text>
                  <div>
                    <Text strong>{hardware.battery.cycleCount}</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div>
                    <Text type="secondary">Charge Level</Text>
                    <div>
                      <Text strong>{hardware.battery.chargeLevel}%</Text>
                    </div>
                    <Progress
                      percent={hardware.battery.chargeLevel}
                      showInfo={false}
                      size="small"
                      status={hardware.battery.chargeLevel < 20 ? 'exception' : undefined}
                    />
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary">Charging Status</Text>
                  <div>
                    <Tag
                      color={
                        hardware.battery.chargingStatus === 'Charging'
                          ? 'green'
                          : hardware.battery.chargingStatus === 'Discharging'
                            ? 'orange'
                            : 'default'
                      }
                    >
                      {hardware.battery.chargingStatus}
                    </Tag>
                  </div>
                </Col>
              </Row>
              {(hardware.battery.batteryCapacity || hardware.battery.estimatedRuntime || hardware.battery.temperature) && (
                <>
                  <Divider />
                  <Row gutter={16}>
                    {hardware.battery.batteryCapacity && (
                      <Col span={8}>
                        <Text type="secondary">Battery Capacity</Text>
                        <div>
                          <Text strong>{hardware.battery.batteryCapacity}</Text>
                        </div>
                      </Col>
                    )}
                    {hardware.battery.estimatedRuntime && (
                      <Col span={8}>
                        <Text type="secondary">Estimated Runtime</Text>
                        <div>
                          <Text strong>{hardware.battery.estimatedRuntime}</Text>
                        </div>
                      </Col>
                    )}
                    {hardware.battery.temperature && (
                      <Col span={8}>
                        <Text type="secondary">Temperature</Text>
                        <div>
                          <Text strong>{hardware.battery.temperature}</Text>
                        </div>
                      </Col>
                    )}
                  </Row>
                </>
              )}
            </Card>
          )}

          {/* Location */}
          <Card
            title="Location"
            size="small"
            style={{ marginBottom: 24 }}
            extra={
              <Button
                size="small"
                onClick={handleAutoDetectLocation}
                loading={locatingAsset}
              >
                Auto Detect
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">Base Location</Text>
                <div>
                  <Text strong>{asset.location?.base?.address ?? 'N/A'}</Text>
                </div>
                <div>
                  <Text type="secondary">
                    Latitude: {asset.location?.base?.latitude ?? '-'} Longitude:{' '}
                    {asset.location?.base?.longitude ?? '-'}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Installed Location</Text>
                <div>
                  <Text strong>{asset.location?.installed?.address ?? 'N/A'}</Text>
                </div>
                <div>
                  <Text type="secondary">
                    Latitude: {asset.location?.installed?.latitude ?? '-'} Longitude:{' '}
                    {asset.location?.installed?.longitude ?? '-'}
                  </Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Asset Details */}
          <Card title="Asset Details" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text type="secondary">Alias</Text>
                <div>{asset.alias || asset.hostname || 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Disk Size</Text>
                <div>
                  {asset.diskSize ||
                   asset.storage?.size ||
                   (hardware?.storage && hardware.storage.length > 0
                     ? (() => {
                         // Find the main drive (root or Data volume)
                         const mainDrive = hardware.storage.find(d =>
                           d.mountPoint === '/' ||
                           d.mountPoint === '/System/Volumes/Data' ||
                           d.name?.toLowerCase().includes('macintosh')
                         ) || hardware.storage[0];
                         const capacity = parseFloat(mainDrive?.capacity || '0');
                         return capacity >= 1000 ? `${(capacity / 1024).toFixed(1)}TB` : `${Math.round(capacity)}GB`;
                       })()
                     : 'N/A')}
                </div>
              </Col>
              <Col span={8}>
                <Text type="secondary">IP Version</Text>
                <div>
                  {asset.ipVersion ||
                   (asset.ipAddress
                     ? (asset.ipAddress.includes(':') ? 'IPv6' : 'IPv4')
                     : 'N/A')}
                </div>
              </Col>
              <Col span={8}>
                <Text type="secondary">MAC</Text>
                <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {asset.mac || asset.macAddress ||
                   (hardware?.networkAdapters && hardware.networkAdapters.length > 0
                     ? hardware.networkAdapters[0].macAddress
                     : 'N/A')}
                </div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Memory Size</Text>
                <div>
                  {asset.memorySize ||
                   asset.ram?.size ||
                   (hardware?.memory && hardware.memory.length > 0
                     ? `${hardware.memory.reduce((acc, m) => acc + parseFloat(m.capacity || '0'), 0).toFixed(0)} GB`
                     : (telemetry?.memory?.totalBytes
                       ? `${(telemetry.memory.totalBytes / (1024 * 1024 * 1024)).toFixed(0)} GB`
                       : 'N/A'))}
                </div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Model</Text>
                <div>{asset.model || 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">OS Version</Text>
                <div>{asset.osVersion || 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Serial Number</Text>
                <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {asset.serialNumber || hardware?.bios?.serialNumber || 'N/A'}
                </div>
              </Col>
              <Col span={8}>
                <Text type="secondary">System SKU</Text>
                <div>{asset.systemSKU || hardware?.baseBoard?.productId || 'N/A'}</div>
              </Col>
            </Row>
          </Card>

          {/* Procurement Properties */}
          <Card title="Procurement Properties" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text type="secondary">AMC Cost</Text>
                <div>{asset.procurement?.amcCost ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">AMC Expiry Date</Text>
                <div>{asset.procurement?.amcExpiryDate ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">AMC Vendor</Text>
                <div>{asset.procurement?.amcVendor ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">End Of Life</Text>
                <div>{asset.procurement?.endOfLife ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Expiry Date</Text>
                <div>{asset.procurement?.expiryDate ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Warranty Expiry</Text>
                <div>{asset.procurement?.warrantyExpiryDate ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Warranty Year & Month</Text>
                <div>{asset.procurement?.warrantyYearAndMonth ?? 'N/A'}</div>
              </Col>
            </Row>
          </Card>

          {/* Cost Properties */}
          <Card title="Cost Properties" size="small" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text type="secondary">Asset Age</Text>
                <div>{asset.cost?.age ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Cost</Text>
                <div>{asset.cost?.cost ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Currency</Text>
                <div>{asset.cost?.currency ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Current Cost</Text>
                <div>{asset.cost?.currentCost ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Depreciation Type</Text>
                <div>{asset.cost?.depreciationType ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Invoice No.</Text>
                <div>{asset.cost?.invoiceNumber ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Purchase Date</Text>
                <div>{asset.cost?.purchaseDate ?? 'N/A'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary">Salvage Value</Text>
                <div>{asset.cost?.salvageValue ?? 'N/A'}</div>
              </Col>
            </Row>
          </Card>

          {/* Attachment */}
          <Card title="Attachment" size="small" style={{ marginBottom: 24 }}>
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              customRequest={handleFileUpload}
              multiple
            >
              <Button type="primary" icon={<UploadOutlined />}>
                Add
              </Button>
            </Upload>
          </Card>

          {/* Tags */}
          <Card
            title="Tags"
            size="small"
            extra={
              editingTags ? (
                <Space size="small">
                  <Button size="small" type="primary" onClick={handleSaveTags}>
                    Save
                  </Button>
                  <Button size="small" onClick={() => {
                    setEditingTags(false);
                    setSelectedTags(asset.tagIds || []);
                  }}>
                    Cancel
                  </Button>
                </Space>
              ) : (
                <Button size="small" type="text" onClick={() => setEditingTags(true)}>
                  Edit
                </Button>
              )
            }
          >
            {editingTags ? (
              <TagSelector
                value={selectedTags}
                onChange={setSelectedTags}
                placeholder="Select or create tags"
                showCreateButton
              />
            ) : (
              <div>
                {selectedTags.length > 0 ? (
                  <TagDisplay tagIds={selectedTags} maxVisible={10} />
                ) : (
                  <Text type="secondary">No tags assigned</Text>
                )}
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'lifecycle',
      label: 'Asset Life cycle',
      children: renderLifecycleTab(),
    },
    {
      key: 'hardware',
      label: 'Hardware',
      children: renderHardwareTab(),
    },
    {
      key: 'software',
      label: 'Software',
      children: renderSoftwareTab(),
    },
    {
      key: 'audit',
      label: 'Audit Log',
      children: (
        <div>
          <Card title="Audit Log">
            <div style={{ marginBottom: 16 }}>
              <Input.Search
                placeholder="Search by user, action, or details..."
                allowClear
                value={auditLogSearch}
                onChange={(e) => setAuditLogSearch(e.target.value)}
                style={{ width: 300 }}
              />
            </div>
            <Table
              columns={[
                { title: 'Date', dataIndex: 'date', key: 'date', width: 180 },
                { title: 'User', dataIndex: 'user', key: 'user', width: 150 },
                {
                  title: 'Action',
                  dataIndex: 'action',
                  key: 'action',
                  width: 100,
                  render: (action: string) => (
                    <Tag color={
                      action === 'create' ? 'green' :
                      action === 'update' ? 'blue' :
                      action === 'delete' ? 'red' : 'default'
                    }>
                      {action.toUpperCase()}
                    </Tag>
                  ),
                },
                {
                  title: 'Details',
                  dataIndex: 'changes',
                  key: 'changes',
                  render: (text: string) => (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6' }}>
                      {text}
                    </div>
                  ),
                },
              ]}
              dataSource={auditLog.filter((log) => {
                if (!auditLogSearch) return true;
                const search = auditLogSearch.toLowerCase();
                return (
                  log.user.toLowerCase().includes(search) ||
                  log.action.toLowerCase().includes(search) ||
                  log.changes.toLowerCase().includes(search) ||
                  log.date.toLowerCase().includes(search)
                );
              })}
              loading={loadingAuditLog}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'vulnerabilities',
      label: 'Vulnerabilities',
      children: renderVulnerabilitiesTab(),
    },
    {
      key: 'patches',
      label: 'Patches',
      children: asset ? <PatchesTab assetId={asset.id} /> : <Spin />,
    },
    {
      key: 'alerts',
      label: 'Alerts',
      children: renderAlertsTab(),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Asset Details
          </Title>
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleEditAsset}>
            Edit Asset
          </Button>
           <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
             <Button icon={<MoreOutlined />} onClick={(e) => {
               e.stopPropagation();
               e.preventDefault();
             }} />
           </Dropdown>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs defaultActiveKey="details" items={tabItems} />

      {/* Edit Modal */}
      <AddAssetModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
        mode="edit"
        asset={asset}
      />
    </div>
  );
};
