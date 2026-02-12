import {
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { Tag, Typography, Space, Progress, Badge, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { LocalUser, MissingPatch, DriveEncryption, FirewallProfile, AntivirusProduct } from '../../../../../types/security.types';

const { Text } = Typography;

const getEncryptionStatusColor = (status: string) => {
  switch (status) {
    case 'FullyEncrypted': return 'success';
    case 'PartiallyEncrypted': case 'EncryptionInProgress': return 'warning';
    case 'NotEncrypted': case 'DecryptionInProgress': return 'error';
    default: return 'default';
  }
};

const getEncryptionStatusText = (status: string) => {
  switch (status) {
    case 'FullyEncrypted': return 'Fully Encrypted';
    case 'PartiallyEncrypted': return 'Partially Encrypted';
    case 'EncryptionInProgress': return 'Encryption In Progress';
    case 'DecryptionInProgress': return 'Decryption In Progress';
    case 'NotEncrypted': return 'Not Encrypted';
    case 'Suspended': return 'Suspended';
    default: return status;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical': return 'red';
    case 'Important': return 'orange';
    case 'Moderate': return 'gold';
    case 'Low': return 'green';
    default: return 'default';
  }
};

export const driveColumns: ColumnsType<DriveEncryption> = [
  { title: 'Mount Point', dataIndex: 'mountPoint', key: 'mountPoint', width: 100, render: (text: string) => <Text strong>{text}</Text> },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 150, render: (status: string) => <Tag color={getEncryptionStatusColor(status)}>{getEncryptionStatusText(status)}</Tag> },
  { title: 'Encryption Method', dataIndex: 'encryptionMethod', key: 'encryptionMethod', render: (method?: string) => method || '\u2014' },
  { title: 'Progress', dataIndex: 'encryptionPercentage', key: 'encryptionPercentage', width: 150, render: (percent?: number) => percent !== undefined ? <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} /> : '\u2014' },
  { title: 'Protection', dataIndex: 'protectionStatus', key: 'protectionStatus', width: 100, render: (status?: string) => <Badge status={status === 'On' ? 'success' : status === 'Off' ? 'error' : 'default'} text={status || 'Unknown'} /> },
  { title: 'Recovery Key', dataIndex: 'recoveryKeyBackedUp', key: 'recoveryKeyBackedUp', width: 120, render: (backed?: boolean) => backed !== undefined ? (backed ? <Tag color="success">Backed Up</Tag> : <Tag color="warning">Not Backed Up</Tag>) : '\u2014' },
];

export const firewallProfileColumns: ColumnsType<FirewallProfile> = [
  { title: 'Profile', dataIndex: 'name', key: 'name', width: 100 },
  { title: 'Status', dataIndex: 'enabled', key: 'enabled', width: 100, render: (enabled: boolean) => <Badge status={enabled ? 'success' : 'error'} text={enabled ? 'Enabled' : 'Disabled'} /> },
  { title: 'Inbound', dataIndex: 'defaultInboundAction', key: 'defaultInboundAction', render: (action?: string) => <Tag color={action === 'Block' ? 'red' : action === 'Allow' ? 'green' : 'default'}>{action || 'Not Configured'}</Tag> },
  { title: 'Outbound', dataIndex: 'defaultOutboundAction', key: 'defaultOutboundAction', render: (action?: string) => <Tag color={action === 'Block' ? 'red' : action === 'Allow' ? 'green' : 'default'}>{action || 'Not Configured'}</Tag> },
];

export const antivirusColumns: ColumnsType<AntivirusProduct> = [
  {
    title: 'Product', dataIndex: 'name', key: 'name',
    render: (name: string, record) => (
      <Space orientation="vertical" size={0}>
        <Text strong>{name}</Text>
        {record.vendor && <Text type="secondary" style={{ fontSize: '12px' }}>{record.vendor}</Text>}
      </Space>
    ),
  },
  { title: 'Version', dataIndex: 'version', key: 'version', width: 100, render: (version?: string) => version || '\u2014' },
  { title: 'Real-Time', dataIndex: 'realTimeProtection', key: 'realTimeProtection', width: 100, render: (enabled?: boolean) => enabled !== undefined ? (enabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />) : '\u2014' },
  {
    title: 'Definition Date', dataIndex: 'definitionDate', key: 'definitionDate', width: 120,
    render: (date?: string, record?: AntivirusProduct) => (
      <Space orientation="vertical" size={0}>
        <Text>{date ? new Date(date).toLocaleDateString() : '\u2014'}</Text>
        {record?.definitionAge && <Text type="secondary" style={{ fontSize: '11px' }}>{record.definitionAge}</Text>}
      </Space>
    ),
  },
  {
    title: 'Last Scan', dataIndex: 'lastScanDate', key: 'lastScanDate', width: 120,
    render: (date?: string, record?: AntivirusProduct) => (
      <Space orientation="vertical" size={0}>
        <Text>{date ? new Date(date).toLocaleDateString() : '\u2014'}</Text>
        {record?.lastScanType && <Tag style={{ marginTop: 4 }}>{record.lastScanType}</Tag>}
      </Space>
    ),
  },
  { title: 'Threats', dataIndex: 'threatsDetected', key: 'threatsDetected', width: 80, render: (threats?: number) => <Text type={threats && threats > 0 ? 'danger' : 'success'}>{threats ?? 0}</Text> },
];

export const userColumns: ColumnsType<LocalUser> = [
  {
    title: 'Username', dataIndex: 'username', key: 'username',
    render: (username: string, record) => (
      <Space>
        <UserOutlined />
        <Text strong>{username}</Text>
        {record.isAdmin && <Tag color="red">Admin</Tag>}
        {record.isBuiltIn && <Tag>Built-in</Tag>}
      </Space>
    ),
  },
  { title: 'Full Name', dataIndex: 'fullName', key: 'fullName', render: (name?: string) => name || '\u2014' },
  {
    title: 'Status', key: 'status', width: 120,
    render: (_, record) => (
      <Space orientation="vertical" size={0}>
        <Badge status={record.isEnabled ? 'success' : 'default'} text={record.isEnabled ? 'Enabled' : 'Disabled'} />
        {record.isLocked && <Tag color="error">Locked</Tag>}
      </Space>
    ),
  },
  {
    title: 'Password', key: 'password', width: 150,
    render: (_, record) => (
      <Space orientation="vertical" size={0}>
        {record.passwordRequired !== undefined && <Text type="secondary" style={{ fontSize: '12px' }}>Required: {record.passwordRequired ? 'Yes' : 'No'}</Text>}
        {record.passwordAge && <Text type="secondary" style={{ fontSize: '12px' }}>Age: {record.passwordAge}</Text>}
        {record.passwordNeverExpires && <Tag color="warning" style={{ marginTop: 4 }}>Never Expires</Tag>}
      </Space>
    ),
  },
  { title: 'Last Logon', dataIndex: 'lastLogon', key: 'lastLogon', width: 120, render: (date?: string) => date ? new Date(date).toLocaleDateString() : '\u2014' },
  {
    title: 'Groups', dataIndex: 'groups', key: 'groups',
    render: (groups?: string[]) => groups && groups.length > 0 ? (
      <Tooltip title={groups.join(', ')}><Space>{groups.slice(0, 2).map((g) => <Tag key={g}>{g}</Tag>)}{groups.length > 2 && <Tag>+{groups.length - 2}</Tag>}</Space></Tooltip>
    ) : '\u2014',
  },
];

export const missingPatchColumns: ColumnsType<MissingPatch> = [
  { title: 'KB', dataIndex: 'kbNumber', key: 'kbNumber', width: 100, render: (kb?: string) => <Text strong>{kb || '\u2014'}</Text> },
  { title: 'Title', dataIndex: 'title', key: 'title', render: (title: string) => <Tooltip title={title}><Text ellipsis style={{ maxWidth: 300 }}>{title}</Text></Tooltip> },
  { title: 'Severity', dataIndex: 'severity', key: 'severity', width: 100, render: (severity: string) => <Tag color={getSeverityColor(severity)}>{severity}</Tag> },
  { title: 'Release Date', dataIndex: 'publishedAt', key: 'publishedAt', width: 120, render: (date?: string) => date ? new Date(date).toLocaleDateString() : '\u2014' },
  { title: 'Reboot', dataIndex: 'rebootRequired', key: 'rebootRequired', width: 80, render: (required?: boolean) => required ? <Tag color="warning">Required</Tag> : <Tag color="success">No</Tag> },
];
