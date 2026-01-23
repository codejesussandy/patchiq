import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
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
  message,
  Modal,
  Spin,
  Divider,
  Switch,
  Tooltip,
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
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;

// Telemetry polling interval in milliseconds (30 seconds)
const TELEMETRY_POLL_INTERVAL = 30000;

export const AssetDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [lifecycle, setLifecycle] = useState<AssetLifeCycle | null>(null);
  const [hardware, setHardware] = useState<Hardware | null>(null);
  const [software, setSoftware] = useState<Software | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [loadingLifecycle, setLoadingLifecycle] = useState(false);
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

  // Patches tab state
  const [patchesTab, setPatchesTab] = useState<'missing' | 'installed' | 'exception'>('missing');
  const [patchesSearchText, setPatchesSearchText] = useState('');
  const [patchesLoading] = useState(false);
  const [selectedPatchIds, setSelectedPatchIds] = useState<React.Key[]>([]);
  const [lastScanTime] = useState<string>('2026/01/16 02:37:39 PM');

  // Alerts tab state
  const [alertsSearchText, setAlertsSearchText] = useState('');
  const [alertsLoading] = useState(false);
  const [alertsViewMode, setAlertsViewMode] = useState<'list' | 'grid'>('list');

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
      fetchTelemetryData();
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

  const fetchLifecycleData = async () => {
    if (!asset) return;
    setLoadingLifecycle(true);
    try {
      const data = await assetService.getAssetLifeCycle(asset.id);
      setLifecycle(data);
    } catch (error) {
      console.error('Failed to fetch lifecycle data:', error);
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
    } catch (error) {
      console.error('Failed to fetch hardware data:', error);
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
    } catch (error) {
      console.error('Failed to fetch software data:', error);
    } finally {
      setLoadingSoftware(false);
    }
  };

  const fetchVulnerabilitiesData = async () => {
    if (!asset) return;
    setLoadingVulnerabilities(true);
    try {
      // TODO: Implement asset vulnerabilities API endpoint
      // For now, show empty state - vulnerabilities will be populated when
      // the backend /assets/:id/vulnerabilities endpoint is implemented
      setVulnerabilities([]);
    } catch (error) {
      console.error('Failed to fetch vulnerabilities data:', error);
      setVulnerabilities([]);
    } finally {
      setLoadingVulnerabilities(false);
    }
  };

  const fetchTelemetryData = async () => {
    if (!asset) return;
    setLoadingTelemetry(true);
    try {
      const data = await assetService.getAssetTelemetry(asset.id);
      setTelemetry(data);
      setTelemetryLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch telemetry data:', error);
      // Fall back to static asset performance data if telemetry fails
      setTelemetry(null);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const handleEditAsset = () => {
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    fetchAssetDetails();
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

  const handleFileUpload = ({ file, onSuccess }: any) => {
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
    } catch (error) {
      console.error('Failed to update tags:', error);
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
          console.error('Geolocation error:', error);
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
    } catch (error) {
      console.error('Error detecting location:', error);
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
    } catch (error: any) {
      console.error('Failed to refresh inventory:', error);
      message.error(error?.response?.data?.error || 'Failed to refresh inventory');
      setRefreshingInventory(false);
    }
  };

  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'duplicate',
      label: 'Duplicate Asset',
      icon: <CopyOutlined />,
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
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
      onClick: (e: any) => {
        e.domEvent.stopPropagation();
        handleDeleteAsset();
      },
    },
  ];

  // Render Life Cycle Tab
  const renderLifecycleTab = () => {
    if (loadingLifecycle) return <div>Loading lifecycle data...</div>;
    if (!lifecycle) return <div>No lifecycle data available</div>;

    const maxValue = Math.max(...lifecycle.depreciationTimeline.map((p) => p.value));

    return (
      <div>
        <Card title="Depreciation Timeline" style={{ marginBottom: 24 }}>
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
                    <Tag color="blue">₹{lifecycle.purchaseValue.toLocaleString()}</Tag>
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
                    <Tag color="blue">₹{lifecycle.currentValue.toLocaleString()}</Tag>
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
                    <Tag color="red">₹{lifecycle.endOfLifeValue.toLocaleString()}</Tag>
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
                justifyContent: 'flex-end',
                paddingTop: '12px',
                paddingRight: '0px',
                marginLeft: '76px',
              }}
            >
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
      { title: 'Vendor', dataIndex: 'vendor', key: 'vendor' },
      { title: 'Version', dataIndex: 'version', key: 'version' },
      {
        title: 'Patch Status',
        dataIndex: 'patchStatus',
        key: 'patchStatus',
        render: (status: string) => (
          <Space>
            <span>{status === 'Available' ? '●' : '○'}</span>
            <span>{status}</span>
          </Space>
        ),
      },
      { title: 'Last Patched', dataIndex: 'lastPatched', key: 'lastPatched' },
      { title: 'App Installed On', dataIndex: 'appInstalledOn', key: 'appInstalledOn' },
    ];

    const serviceColumns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      {
        title: 'State',
        dataIndex: 'state',
        key: 'state',
        render: (state: string) => (
          <Space>
            <span style={{ color: state === 'Running' ? '#faad14' : '#ff4d4f' }}>●</span>
            <span>{state}</span>
          </Space>
        ),
      },
      { title: 'Type', dataIndex: 'type', key: 'type' },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Space>
            <span style={{ color: '#52c41a' }}>●</span>
            <span>{status}</span>
          </Space>
        ),
      },
    ];

    const environmentColumns = [
      { title: 'Key', dataIndex: 'key', key: 'key' },
      { title: 'Value', dataIndex: 'value', key: 'value' },
    ];

    const softwareSubTabs = [
      {
        key: 'applications',
        label: `Applications (${software.applications.length})`,
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Input.Search placeholder="Search" style={{ width: 300 }} />
                <Button icon={<FilterOutlined />}>Filter</Button>
              </Space>
              <Button icon={<DownloadOutlined />} />
            </div>
            <Table
              columns={applicationColumns}
              dataSource={software.applications}
              rowKey="id"
              pagination={{
                pageSize: 25,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} Application found`,
              }}
              size="small"
            />
          </div>
        ),
      },
      {
        key: 'environment',
        label: `System Environment (${Object.keys(software?.systemEnvironment ?? {}).length})`,
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Input.Search placeholder="Search" style={{ width: 300 }} />
                <Button icon={<FilterOutlined />}>Filter</Button>
              </Space>
              <Button icon={<DownloadOutlined />} />
            </div>
            <Table
              columns={environmentColumns}
              dataSource={Object.entries(software?.systemEnvironment ?? {}).map(([key, value]) => ({
                key,
                value: value ?? 'N/A',
              }))}
              rowKey="key"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `Total ${total} System Environment found`,
              }}
              size="small"
            />
          </div>
        ),
      },
      {
        key: 'services',
        label: `Services (${software.services.length})`,
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Input.Search placeholder="Search" style={{ width: 300 }} />
                <Button icon={<FilterOutlined />}>Filter</Button>
              </Space>
              <Button icon={<DownloadOutlined />} />
            </div>
            <Table
              columns={serviceColumns}
              dataSource={software.services}
              rowKey="id"
              pagination={{ pageSize: 25, showTotal: (total) => `Total ${total} service found` }}
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
          <Panel header={<Text strong>System Information</Text>} key="system">
            <Text type="secondary">Detailed system information from agent inventory</Text>
          </Panel>
        </Collapse>

        {/* Sub Tabs */}
        <Tabs items={softwareSubTabs} />
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      Critical: '#ff4d4f',
      High: '#fa8c16',
      Medium: '#faad14',
      Low: '#52c41a',
    };
    return colors[severity] || '#d9d9d9';
  };


  // Render Patches Tab
  const renderPatchesTab = () => {
    type PatchItem = {
      id: string;
      patchId: string;
      title: string;
      severity: 'LOW' | 'MODERATE' | 'IMPORTANT' | 'CRITICAL';
      platform: 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';
      releaseDate: string;
      rollback: 'SUPPORTED' | 'NOT SUPPORTED';
      category: string;
      kbId?: string;
    };

    // TODO: Implement asset patches API endpoint
    // For now, show empty state - patches will be populated when
    // the backend /assets/:id/patches endpoint is implemented
    const mockPatches: PatchItem[] = [];

    const getPatchSeverityColor = (severity: string) => {
      switch (severity) {
        case 'LOW':
          return 'green';
        case 'MODERATE':
          return 'orange';
        case 'IMPORTANT':
          return 'red';
        case 'CRITICAL':
          return 'red';
        default:
          return 'default';
      }
    };

    const getFilteredPatches = () => {
      let filtered = mockPatches;
      
      if (patchesTab === 'missing') {
        filtered = mockPatches; // All missing patches
      } else if (patchesTab === 'installed') {
        filtered = []; // Empty for now
      } else if (patchesTab === 'exception') {
        filtered = []; // Empty for now
      }

      if (patchesSearchText) {
        filtered = filtered.filter(p =>
          p.patchId.toLowerCase().includes(patchesSearchText.toLowerCase()) ||
          p.title.toLowerCase().includes(patchesSearchText.toLowerCase()) ||
          p.category.toLowerCase().includes(patchesSearchText.toLowerCase())
        );
      }

      return filtered;
    };

    const patchesColumns: ColumnsType<PatchItem> = [
      {
        title: 'ID',
        dataIndex: 'patchId',
        key: 'patchId',
        sorter: (a, b) => a.patchId.localeCompare(b.patchId),
      },
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        sorter: (a, b) => a.title.localeCompare(b.title),
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        sorter: (a, b) => a.severity.localeCompare(b.severity),
        render: (severity: string) => (
          <Tag color={getPatchSeverityColor(severity)}>{severity}</Tag>
        ),
      },
      {
        title: 'Platform',
        dataIndex: 'platform',
        key: 'platform',
        sorter: (a, b) => a.platform.localeCompare(b.platform),
        render: (platform: string) => <OSIcon os={platform as any} />,
      },
      {
        title: 'Release Date',
        dataIndex: 'releaseDate',
        key: 'releaseDate',
        sorter: (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
      },
      {
        title: 'Rollback',
        dataIndex: 'rollback',
        key: 'rollback',
        sorter: (a, b) => a.rollback.localeCompare(b.rollback),
        render: (rollback: string) => (
          <Tag color={rollback === 'SUPPORTED' ? 'green' : 'red'}>{rollback}</Tag>
        ),
      },
      {
        title: 'Category',
        dataIndex: 'category',
        key: 'category',
        sorter: (a, b) => a.category.localeCompare(b.category),
      },
      {
        title: 'KBID',
        dataIndex: 'kbId',
        key: 'kbId',
        sorter: (a, b) => (a.kbId || '').localeCompare(b.kbId || ''),
        render: (kbId?: string) => kbId || '-',
      },
      {
        title: '',
        key: 'action',
        width: 150,
        render: () => (
          <Button type="link" size="small">
            Add Exceptions
          </Button>
        ),
      },
    ];

    const filteredPatches = getFilteredPatches();

    return (
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: patchesTab === 'missing' ? '#e6f7ff' : 'transparent',
              borderRadius: 4,
              marginBottom: 4,
              border: patchesTab === 'missing' ? '1px solid #1890ff' : '1px solid transparent',
            }}
            onClick={() => setPatchesTab('missing')}
          >
            <Text strong={patchesTab === 'missing'}>Missing ({filteredPatches.length})</Text>
          </div>
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: patchesTab === 'installed' ? '#e6f7ff' : 'transparent',
              borderRadius: 4,
              marginBottom: 4,
              border: patchesTab === 'installed' ? '1px solid #1890ff' : '1px solid transparent',
            }}
            onClick={() => setPatchesTab('installed')}
          >
            <Text strong={patchesTab === 'installed'}>Installed</Text>
          </div>
          <div
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: patchesTab === 'exception' ? '#e6f7ff' : 'transparent',
              borderRadius: 4,
              marginBottom: 4,
              border: patchesTab === 'exception' ? '1px solid #1890ff' : '1px solid transparent',
            }}
            onClick={() => setPatchesTab('exception')}
          >
            <Text strong={patchesTab === 'exception'}>Exception</Text>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Top Controls */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Input
                placeholder="Search..."
                prefix={<SearchOutlined />}
                value={patchesSearchText}
                onChange={(e) => setPatchesSearchText(e.target.value)}
                style={{ width: 300 }}
              />
              <Text type="secondary">Last scan at : {lastScanTime}</Text>
            </Space>
            <Space>
              <Button>Scan History</Button>
              <Button type="primary">Scan Now</Button>
              <Button icon={<ReloadOutlined />} onClick={() => message.info('Refreshing...')}>
                Refresh
              </Button>
              <Button icon={<ExportOutlined />} onClick={() => message.info('Exporting...')}>
                Export
              </Button>
              <Button icon={<FilterOutlined />} />
            </Space>
          </div>

          {/* Patches Table */}
          <Table
            rowSelection={{
              selectedRowKeys: selectedPatchIds,
              onChange: setSelectedPatchIds,
            }}
            columns={patchesColumns}
            dataSource={filteredPatches}
            rowKey="id"
            loading={patchesLoading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) =>
                `showing ${range[0]}-${range[1]} of ${total} items`,
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </div>
    );
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

    // TODO: Implement asset alerts API endpoint
    // For now, show empty state - alerts will be populated when
    // the backend /assets/:id/alerts endpoint is implemented
    const mockAlerts: AlertItem[] = [];

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

    const filteredAlerts = mockAlerts.filter(alert =>
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
            <Button icon={<ReloadOutlined />} onClick={() => message.info('Refreshing...')}>
              Refresh
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => message.info('Exporting...')}>
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

    const columns = [
      {
        title: 'CVE ID',
        dataIndex: 'cveId',
        key: 'cveId',
        width: 120,
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        render: (text: string) => <div style={{ fontSize: '14px' }}>{text}</div>,
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        width: 110,
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
        render: (score: number) => (
          <div style={{ fontWeight: 600, color: getSeverityColor(score > 8 ? 'Critical' : score > 5 ? 'High' : 'Low') }}>
            {score.toFixed(1)}
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 130,
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
        dataIndex: 'exploitAvailable',
        key: 'exploitAvailable',
        width: 80,
        render: (available: boolean) => (
          <span style={{ color: available ? '#ff4d4f' : '#52c41a' }}>
            {available ? '● In Wild' : '● Safe'}
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
                  {vulnerabilities.filter((v) => v.severity === 'Critical').length}
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
                  {vulnerabilities.filter((v) => v.severity === 'High').length}
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
                  {vulnerabilities.filter((v) => v.severity === 'Medium').length}
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
              if (record.severity === 'Critical') return 'vuln-critical-row';
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
            <Table
              columns={[
                { title: 'Date', dataIndex: 'date', key: 'date' },
                { title: 'User', dataIndex: 'user', key: 'user' },
                { title: 'Action', dataIndex: 'action', key: 'action' },
                { title: 'Changes', dataIndex: 'changes', key: 'changes' },
              ]}
              dataSource={[
                {
                  key: '1',
                  date: 'May 05, 2025 3:45pm',
                  user: 'Admin',
                  action: 'Updated',
                  changes: 'Status changed from Available to In Use',
                },
                {
                  key: '2',
                  date: 'Feb 14, 2022 10:00am',
                  user: 'System',
                  action: 'Created',
                  changes: 'Asset created',
                },
              ]}
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
      children: renderPatchesTab(),
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
