import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Table,
  Typography,
  Space,
  Spin,
  Empty,
  Progress,
  Badge,
  Tooltip,
  Divider,
} from 'antd';
import {
  LockOutlined,
  SafetyOutlined,
  UserOutlined,
  SecurityScanOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { SecurityCompliance, LocalUser, MissingPatch, DriveEncryption, FirewallProfile, AntivirusProduct } from '../../../../types/security.types';
import { assetService } from '../../../../services/asset.service';

const { Text } = Typography;

interface SecurityTabProps {
  assetId: string;
}

const getEncryptionStatusColor = (status: string) => {
  switch (status) {
    case 'FullyEncrypted':
      return 'success';
    case 'PartiallyEncrypted':
    case 'EncryptionInProgress':
      return 'warning';
    case 'NotEncrypted':
    case 'DecryptionInProgress':
      return 'error';
    default:
      return 'default';
  }
};

const getEncryptionStatusText = (status: string) => {
  switch (status) {
    case 'FullyEncrypted':
      return 'Fully Encrypted';
    case 'PartiallyEncrypted':
      return 'Partially Encrypted';
    case 'EncryptionInProgress':
      return 'Encryption In Progress';
    case 'DecryptionInProgress':
      return 'Decryption In Progress';
    case 'NotEncrypted':
      return 'Not Encrypted';
    case 'Suspended':
      return 'Suspended';
    default:
      return status;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical':
      return 'red';
    case 'Important':
      return 'orange';
    case 'Moderate':
      return 'gold';
    case 'Low':
      return 'green';
    default:
      return 'default';
  }
};

export const SecurityTab = ({ assetId }: SecurityTabProps) => {
  const [security, setSecurity] = useState<SecurityCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSecurityData();
  }, [assetId]);

  const fetchSecurityData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assetService.getAssetSecurity(assetId);
      setSecurity(data);
    } catch (err) {
      console.error('Failed to fetch security data:', err);
      setError('Failed to load security information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !security) {
    return <Empty description={error || 'No security data available'} />;
  }

  const driveColumns: ColumnsType<DriveEncryption> = [
    {
      title: 'Mount Point',
      dataIndex: 'mountPoint',
      key: 'mountPoint',
      width: 100,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={getEncryptionStatusColor(status)}>
          {getEncryptionStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Encryption Method',
      dataIndex: 'encryptionMethod',
      key: 'encryptionMethod',
      render: (method?: string) => method || '—',
    },
    {
      title: 'Progress',
      dataIndex: 'encryptionPercentage',
      key: 'encryptionPercentage',
      width: 150,
      render: (percent?: number) =>
        percent !== undefined ? (
          <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} />
        ) : (
          '—'
        ),
    },
    {
      title: 'Protection',
      dataIndex: 'protectionStatus',
      key: 'protectionStatus',
      width: 100,
      render: (status?: string) => (
        <Badge
          status={status === 'On' ? 'success' : status === 'Off' ? 'error' : 'default'}
          text={status || 'Unknown'}
        />
      ),
    },
    {
      title: 'Recovery Key',
      dataIndex: 'recoveryKeyBackedUp',
      key: 'recoveryKeyBackedUp',
      width: 120,
      render: (backed?: boolean) =>
        backed !== undefined ? (
          backed ? (
            <Tag color="success">Backed Up</Tag>
          ) : (
            <Tag color="warning">Not Backed Up</Tag>
          )
        ) : (
          '—'
        ),
    },
  ];

  const firewallProfileColumns: ColumnsType<FirewallProfile> = [
    {
      title: 'Profile',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Badge status={enabled ? 'success' : 'error'} text={enabled ? 'Enabled' : 'Disabled'} />
      ),
    },
    {
      title: 'Inbound',
      dataIndex: 'defaultInboundAction',
      key: 'defaultInboundAction',
      render: (action?: string) => (
        <Tag color={action === 'Block' ? 'red' : action === 'Allow' ? 'green' : 'default'}>
          {action || 'Not Configured'}
        </Tag>
      ),
    },
    {
      title: 'Outbound',
      dataIndex: 'defaultOutboundAction',
      key: 'defaultOutboundAction',
      render: (action?: string) => (
        <Tag color={action === 'Block' ? 'red' : action === 'Allow' ? 'green' : 'default'}>
          {action || 'Not Configured'}
        </Tag>
      ),
    },
  ];

  const antivirusColumns: ColumnsType<AntivirusProduct> = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.vendor && <Text type="secondary" style={{ fontSize: '12px' }}>{record.vendor}</Text>}
        </Space>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (version?: string) => version || '—',
    },
    {
      title: 'Real-Time',
      dataIndex: 'realTimeProtection',
      key: 'realTimeProtection',
      width: 100,
      render: (enabled?: boolean) =>
        enabled !== undefined ? (
          enabled ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )
        ) : (
          '—'
        ),
    },
    {
      title: 'Definition Date',
      dataIndex: 'definitionDate',
      key: 'definitionDate',
      width: 120,
      render: (date?: string, record?: AntivirusProduct) => (
        <Space orientation="vertical" size={0}>
          <Text>{date ? new Date(date).toLocaleDateString() : '—'}</Text>
          {record?.definitionAge && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.definitionAge}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Last Scan',
      dataIndex: 'lastScanDate',
      key: 'lastScanDate',
      width: 120,
      render: (date?: string, record?: AntivirusProduct) => (
        <Space orientation="vertical" size={0}>
          <Text>{date ? new Date(date).toLocaleDateString() : '—'}</Text>
          {record?.lastScanType && (
            <Tag style={{ marginTop: 4 }}>{record.lastScanType}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Threats',
      dataIndex: 'threatsDetected',
      key: 'threatsDetected',
      width: 80,
      render: (threats?: number) => (
        <Text type={threats && threats > 0 ? 'danger' : 'success'}>
          {threats ?? 0}
        </Text>
      ),
    },
  ];

  const userColumns: ColumnsType<LocalUser> = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record) => (
        <Space>
          <UserOutlined />
          <Text strong>{username}</Text>
          {record.isAdmin && <Tag color="red">Admin</Tag>}
          {record.isBuiltIn && <Tag>Built-in</Tag>}
        </Space>
      ),
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name?: string) => name || '—',
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Badge
            status={record.isEnabled ? 'success' : 'default'}
            text={record.isEnabled ? 'Enabled' : 'Disabled'}
          />
          {record.isLocked && <Tag color="error">Locked</Tag>}
        </Space>
      ),
    },
    {
      title: 'Password',
      key: 'password',
      width: 150,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          {record.passwordRequired !== undefined && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Required: {record.passwordRequired ? 'Yes' : 'No'}
            </Text>
          )}
          {record.passwordAge && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Age: {record.passwordAge}
            </Text>
          )}
          {record.passwordNeverExpires && (
            <Tag color="warning" style={{ marginTop: 4 }}>Never Expires</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Last Logon',
      dataIndex: 'lastLogon',
      key: 'lastLogon',
      width: 120,
      render: (date?: string) => (date ? new Date(date).toLocaleDateString() : '—'),
    },
    {
      title: 'Groups',
      dataIndex: 'groups',
      key: 'groups',
      render: (groups?: string[]) =>
        groups && groups.length > 0 ? (
          <Tooltip title={groups.join(', ')}>
            <Space>
              {groups.slice(0, 2).map((g) => (
                <Tag key={g}>{g}</Tag>
              ))}
              {groups.length > 2 && <Tag>+{groups.length - 2}</Tag>}
            </Space>
          </Tooltip>
        ) : (
          '—'
        ),
    },
  ];

  const missingPatchColumns: ColumnsType<MissingPatch> = [
    {
      title: 'KB',
      dataIndex: 'kbNumber',
      key: 'kbNumber',
      width: 100,
      render: (kb?: string) => <Text strong>{kb || '—'}</Text>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => (
        <Tooltip title={title}>
          <Text ellipsis style={{ maxWidth: 300 }}>
            {title}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => <Tag color={getSeverityColor(severity)}>{severity}</Tag>,
    },
    {
      title: 'Release Date',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 120,
      render: (date?: string) => (date ? new Date(date).toLocaleDateString() : '—'),
    },
    {
      title: 'Reboot',
      dataIndex: 'rebootRequired',
      key: 'rebootRequired',
      width: 80,
      render: (required?: boolean) =>
        required ? <Tag color="warning">Required</Tag> : <Tag color="success">No</Tag>,
    },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Space align="center">
              <LockOutlined style={{ fontSize: 24, color: security.encryption?.driveEncryptionEnabled ? '#52c41a' : '#ff4d4f' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Encryption</Text>
                <div>
                  <Text strong>
                    {security.encryption?.driveEncryptionEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </div>
                {security.encryption?.encryptionType && (
                  <Tag>{security.encryption.encryptionType}</Tag>
                )}
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Space align="center">
              <SafetyOutlined style={{ fontSize: 24, color: security.firewall?.enabled ? '#52c41a' : '#ff4d4f' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Firewall</Text>
                <div>
                  <Text strong>
                    {security.firewall?.enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </div>
                {security.firewall?.productName && (
                  <Text type="secondary" style={{ fontSize: 11 }}>{security.firewall.productName}</Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Space align="center">
              <SecurityScanOutlined style={{ fontSize: 24, color: security.antivirus?.installed ? '#52c41a' : '#ff4d4f' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Antivirus</Text>
                <div>
                  <Text strong>
                    {security.antivirus?.installed ? 'Installed' : 'Not Installed'}
                  </Text>
                </div>
                {security.antivirus?.xdrInstalled && (
                  <Tag color="blue">XDR</Tag>
                )}
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Space align="center">
              <DesktopOutlined style={{ fontSize: 24, color: security.secureBootEnabled ? '#52c41a' : '#faad14' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Secure Boot</Text>
                <div>
                  <Text strong>
                    {security.secureBootEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </div>
                {security.uacEnabled !== undefined && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    UAC: {security.uacEnabled ? 'On' : 'Off'}
                  </Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Encryption Section */}
      {security.encryption && (
        <Card
          title={
            <Space>
              <LockOutlined />
              <span>Drive Encryption</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            security.encryption.tpmEnabled !== undefined && (
              <Space>
                <Text type="secondary">TPM:</Text>
                <Badge
                  status={security.encryption.tpmEnabled ? 'success' : 'error'}
                  text={security.encryption.tpmEnabled ? `Enabled (${security.encryption.tpmVersion || 'Unknown'})` : 'Disabled'}
                />
              </Space>
            )
          }
        >
          {security.encryption.drives && security.encryption.drives.length > 0 ? (
            <Table
              columns={driveColumns}
              dataSource={security.encryption.drives}
              rowKey="mountPoint"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty description="No drive encryption data" />
          )}
        </Card>
      )}

      {/* Firewall Section */}
      {security.firewall && (
        <Card
          title={
            <Space>
              <SafetyOutlined />
              <span>Firewall Status</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Space>
              {security.firewall.stealthModeEnabled && <Tag color="blue">Stealth Mode</Tag>}
              {security.firewall.blockAllIncoming && <Tag color="red">Block All Incoming</Tag>}
              {security.firewall.loggingEnabled && <Tag>Logging</Tag>}
            </Space>
          }
        >
          {security.firewall.profiles && security.firewall.profiles.length > 0 ? (
            <Table
              columns={firewallProfileColumns}
              dataSource={security.firewall.profiles}
              rowKey="name"
              pagination={false}
              size="small"
            />
          ) : (
            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary">Status</Text>
                <div>
                  <Badge
                    status={security.firewall.enabled ? 'success' : 'error'}
                    text={security.firewall.enabled ? 'Enabled' : 'Disabled'}
                  />
                </div>
              </Col>
              {security.firewall.activeProfile && (
                <Col span={8}>
                  <Text type="secondary">Active Profile</Text>
                  <div><Text strong>{security.firewall.activeProfile}</Text></div>
                </Col>
              )}
            </Row>
          )}
        </Card>
      )}

      {/* Antivirus Section */}
      {security.antivirus && (
        <Card
          title={
            <Space>
              <SecurityScanOutlined />
              <span>Antivirus & XDR</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            security.antivirus.xdrInstalled && (
              <Tag color="blue">{security.antivirus.xdrProductName || 'XDR Installed'}</Tag>
            )
          }
        >
          {security.antivirus.products && security.antivirus.products.length > 0 ? (
            <Table
              columns={antivirusColumns}
              dataSource={security.antivirus.products}
              rowKey="name"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty description="No antivirus products detected" />
          )}
        </Card>
      )}

      {/* User Accounts Section */}
      {security.userAccounts && (
        <Card
          title={
            <Space>
              <UserOutlined />
              <span>Local User Accounts</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Space>
              {security.userAccounts.localAdminCount !== undefined && (
                <Tag color={security.userAccounts.localAdminCount > 2 ? 'warning' : 'default'}>
                  {security.userAccounts.localAdminCount} Admin(s)
                </Tag>
              )}
              {security.userAccounts.guestAccountEnabled && (
                <Tag color="error">Guest Enabled</Tag>
              )}
              {security.userAccounts.autoLoginEnabled && (
                <Tag color="warning">Auto-Login: {security.userAccounts.autoLoginUser}</Tag>
              )}
            </Space>
          }
        >
          {security.userAccounts.localUsers && security.userAccounts.localUsers.length > 0 ? (
            <Table
              columns={userColumns}
              dataSource={security.userAccounts.localUsers}
              rowKey="username"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          ) : (
            <Empty description="No user accounts data" />
          )}
        </Card>
      )}

      {/* Patch Status Section */}
      {security.patchStatus && (
        <Card
          title={
            <Space>
              <WarningOutlined />
              <span>Patch Compliance</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
          extra={
            <Space>
              {security.patchStatus.pendingReboot && (
                <Tag color="warning">Pending Reboot</Tag>
              )}
              {security.patchStatus.windowsUpdateEnabled !== undefined && (
                <Tag color={security.patchStatus.windowsUpdateEnabled ? 'success' : 'error'}>
                  Windows Update: {security.patchStatus.windowsUpdateEnabled ? 'Enabled' : 'Disabled'}
                </Tag>
              )}
            </Space>
          }
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#fff1f0', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                  {security.patchStatus.criticalUpdates ?? 0}
                </div>
                <Text type="secondary">Critical</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#fff7e6', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                  {security.patchStatus.securityUpdates ?? 0}
                </div>
                <Text type="secondary">Security</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {security.patchStatus.otherUpdates ?? 0}
                </div>
                <Text type="secondary">Other</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#f6ffed', border: 'none' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {security.patchStatus.pendingUpdates ?? 0}
                </div>
                <Text type="secondary">Pending</Text>
              </Card>
            </Col>
          </Row>

          {security.patchStatus.lastScanDate && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                Last Scan: {new Date(security.patchStatus.lastScanDate).toLocaleString()}
                {security.patchStatus.lastScanRelative && ` (${security.patchStatus.lastScanRelative})`}
              </Text>
            </div>
          )}

          {security.patchStatus.missingPatches && security.patchStatus.missingPatches.length > 0 && (
            <>
              <Divider titlePlacement="left" style={{ marginTop: 0 }}>Missing Patches</Divider>
              <Table
                columns={missingPatchColumns}
                dataSource={security.patchStatus.missingPatches}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </>
          )}
        </Card>
      )}

      {/* Additional Security Settings */}
      <Card title="Additional Security Settings" size="small">
        <Row gutter={[16, 16]}>
          {security.screenLockEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">Screen Lock</Text>
              <div>
                <Badge
                  status={security.screenLockEnabled ? 'success' : 'warning'}
                  text={security.screenLockEnabled ? 'Enabled' : 'Disabled'}
                />
              </div>
              {security.screenLockTimeout !== undefined && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Timeout: {security.screenLockTimeout}s
                </Text>
              )}
            </Col>
          )}
          {security.remoteDesktopEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">Remote Desktop</Text>
              <div>
                <Badge
                  status={security.remoteDesktopEnabled ? 'warning' : 'success'}
                  text={security.remoteDesktopEnabled ? 'Enabled' : 'Disabled'}
                />
              </div>
            </Col>
          )}
          {security.sshEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">SSH</Text>
              <div>
                <Badge
                  status={security.sshEnabled ? 'processing' : 'default'}
                  text={security.sshEnabled ? 'Enabled' : 'Disabled'}
                />
              </div>
            </Col>
          )}
          {security.sipEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">System Integrity Protection</Text>
              <div>
                <Badge
                  status={security.sipEnabled ? 'success' : 'error'}
                  text={security.sipEnabled ? 'Enabled' : 'Disabled'}
                />
              </div>
            </Col>
          )}
          {security.gatekeeperEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">Gatekeeper</Text>
              <div>
                <Badge
                  status={security.gatekeeperEnabled ? 'success' : 'error'}
                  text={security.gatekeeperEnabled ? 'Enabled' : 'Disabled'}
                />
              </div>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};
