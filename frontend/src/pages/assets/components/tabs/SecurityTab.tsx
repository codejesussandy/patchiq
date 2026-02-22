import {
  LockOutlined,
  SafetyOutlined,
  UserOutlined,
  SecurityScanOutlined,
  WarningOutlined } from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Spin,
  Empty,
  Badge,
  Divider } from 'antd';
import { Tag } from 'antd';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetSecurity } from '../../../../hooks/useAssets';
import {
  driveColumns,
  firewallProfileColumns,
  antivirusColumns,
  userColumns,
  missingPatchColumns,
} from './security/securityColumns';
import { SecuritySummaryCards } from './security/SecuritySummaryCards';

const { Text } = Typography;

interface SecurityTabProps {
  assetId: string;
}

export const SecurityTab = ({ assetId }: SecurityTabProps) => {
  const { data: security, isLoading, isError } = useAssetSecurity(assetId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !security) {
    return <Empty description={isError ? 'Failed to load security information' : 'No security data available'} />;
  }

  return (
    <div>
      <SecuritySummaryCards
        encryption={security.encryption}
        firewall={security.firewall}
        antivirus={security.antivirus}
        secureBootEnabled={security.secureBootEnabled}
        uacEnabled={security.uacEnabled}
      />

      {/* Encryption Section */}
      {security.encryption && (
        <Card
          title={<Space><LockOutlined /><span>Drive Encryption</span></Space>}
          size="small"
          style={{ marginBottom: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}
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
            <DataTable columns={driveColumns} data={security.encryption.drives} rowKey="mountPoint" pagination={false} size="small" />
          ) : (
            <Empty description="No drive encryption data" />
          )}
        </Card>
      )}

      {/* Firewall Section */}
      {security.firewall && (
        <Card
          title={<Space><SafetyOutlined /><span>Firewall Status</span></Space>}
          size="small"
          style={{ marginBottom: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}
          extra={
            <Space>
              {security.firewall.stealthModeEnabled && <Tag color="blue">Stealth Mode</Tag>}
              {security.firewall.blockAllIncoming && <Tag color="red">Block All Incoming</Tag>}
              {security.firewall.loggingEnabled && <Tag>Logging</Tag>}
            </Space>
          }
        >
          {security.firewall.profiles && security.firewall.profiles.length > 0 ? (
            <DataTable columns={firewallProfileColumns} data={security.firewall.profiles} rowKey="name" pagination={false} size="small" />
          ) : (
            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary">Status</Text>
                <div>
                  <Badge status={security.firewall.enabled ? 'success' : 'error'} text={security.firewall.enabled ? 'Enabled' : 'Disabled'} />
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
          title={<Space><SecurityScanOutlined /><span>Antivirus & XDR</span></Space>}
          size="small"
          style={{ marginBottom: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}
          extra={security.antivirus.xdrInstalled && <Tag color="blue">{security.antivirus.xdrProductName || 'XDR Installed'}</Tag>}
        >
          {security.antivirus.products && security.antivirus.products.length > 0 ? (
            <DataTable columns={antivirusColumns} data={security.antivirus.products} rowKey="name" pagination={false} size="small" />
          ) : (
            <Empty description="No antivirus products detected" />
          )}
        </Card>
      )}

      {/* User Accounts Section */}
      {security.userAccounts && (
        <Card
          title={<Space><UserOutlined /><span>Local User Accounts</span></Space>}
          size="small"
          style={{ marginBottom: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}
          extra={
            <Space>
              {security.userAccounts.localAdminCount !== undefined && (
                <Tag color={security.userAccounts.localAdminCount > 2 ? 'warning' : 'default'}>
                  {security.userAccounts.localAdminCount} Admin(s)
                </Tag>
              )}
              {security.userAccounts.guestAccountEnabled && <Tag color="error">Guest Enabled</Tag>}
              {security.userAccounts.autoLoginEnabled && <Tag color="warning">Auto-Login: {security.userAccounts.autoLoginUser}</Tag>}
            </Space>
          }
        >
          {security.userAccounts.localUsers && security.userAccounts.localUsers.length > 0 ? (
            <DataTable columns={userColumns} data={security.userAccounts.localUsers} rowKey="username" pagination={{ pageSize: 5 }} size="small" />
          ) : (
            <Empty description="No user accounts data" />
          )}
        </Card>
      )}

      {/* Patch Status Section */}
      {security.patchStatus && (
        <Card
          title={<Space><WarningOutlined /><span>Patch Compliance</span></Space>}
          size="small"
          style={{ marginBottom: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}
          extra={
            <Space>
              {security.patchStatus.pendingReboot && <Tag color="warning">Pending Reboot</Tag>}
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
              <Card size="small" style={{ textAlign: 'center', background: '#fff1f0', border: '1px solid #fde8e8', borderRadius: 6 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>{security.patchStatus.criticalUpdates ?? 0}</div>
                <Text type="secondary">Critical</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#fff7e6', border: '1px solid #fde8c8', borderRadius: 6 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>{security.patchStatus.securityUpdates ?? 0}</div>
                <Text type="secondary">Security</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff', border: '1px solid #d0e8ff', borderRadius: 6 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{security.patchStatus.otherUpdates ?? 0}</div>
                <Text type="secondary">Other</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ textAlign: 'center', background: '#f6ffed', border: '1px solid #d9f0d0', borderRadius: 6 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{security.patchStatus.pendingUpdates ?? 0}</div>
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
              <DataTable columns={missingPatchColumns} data={security.patchStatus.missingPatches} rowKey="id" pagination={{ pageSize: 5 }} size="small" />
            </>
          )}
        </Card>
      )}

      {/* Additional Security Settings */}
      <Card title="Additional Security Settings" size="small" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} styles={{ header: { backgroundColor: '#eef0f4', borderBottom: '1px solid #e5e7eb' } }}>
        <Row gutter={[16, 16]}>
          {security.screenLockEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">Screen Lock</Text>
              <div><Badge status={security.screenLockEnabled ? 'success' : 'warning'} text={security.screenLockEnabled ? 'Enabled' : 'Disabled'} /></div>
              {security.screenLockTimeout !== undefined && <Text type="secondary" style={{ fontSize: 11 }}>Timeout: {security.screenLockTimeout}s</Text>}
            </Col>
          )}
          {security.remoteDesktopEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">Remote Desktop</Text>
              <div><Badge status={security.remoteDesktopEnabled ? 'warning' : 'success'} text={security.remoteDesktopEnabled ? 'Enabled' : 'Disabled'} /></div>
            </Col>
          )}
          {security.sshEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">SSH</Text>
              <div><Badge status={security.sshEnabled ? 'processing' : 'default'} text={security.sshEnabled ? 'Enabled' : 'Disabled'} /></div>
            </Col>
          )}
          {security.sipEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">System Integrity Protection</Text>
              <div><Badge status={security.sipEnabled ? 'success' : 'error'} text={security.sipEnabled ? 'Enabled' : 'Disabled'} /></div>
            </Col>
          )}
          {security.gatekeeperEnabled !== undefined && (
            <Col span={6}>
              <Text type="secondary">Gatekeeper</Text>
              <div><Badge status={security.gatekeeperEnabled ? 'success' : 'error'} text={security.gatekeeperEnabled ? 'Enabled' : 'Disabled'} /></div>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
};
