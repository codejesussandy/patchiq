import { useState } from 'react';
import {
  WindowsOutlined,
  AppleOutlined,
  DesktopOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  App,
  Tabs,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Collapse,
  Input,
  Tooltip,
  Button,
} from 'antd';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetSoftware } from '../../../../hooks/useAssets';
import type { Asset } from '../../../../types/asset.types';

const { Text } = Typography;
const { Panel } = Collapse;

interface SoftwareTabProps {
  assetId: string;
  asset?: Asset | null;
}

const exportToCSV = (
  data: Record<string, unknown>[],
  columns: { key: string; title: string }[],
  filename: string,
  message: ReturnType<typeof App.useApp>['message']
) => {
  if (data.length === 0) { message.warning('No data to export'); return; }
  const headers = columns.map((col) => col.title);
  const keys = columns.map((col) => col.key);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      keys.map((key) => {
        const value = row[key];
        const stringValue = value == null ? '' : String(value);
        const escaped = stringValue.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') ? `"${escaped}"` : escaped;
      }).join(',')
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

export const SoftwareTab = ({ assetId, asset }: SoftwareTabProps) => {
  const { message } = App.useApp();
  const { data: software, isLoading: loadingSoftware } = useAssetSoftware(assetId);
  const [appVendorFilters, setAppVendorFilters] = useState<string[]>([]);
  const [appPatchStatusFilters, setAppPatchStatusFilters] = useState<string[]>([]);

  if (loadingSoftware) return <div>Loading software data...</div>;
  if (!software) return <div>No software data available</div>;

  const uniqueVendors = [...new Set(software.applications.map((app) => app.vendor).filter(Boolean))];
  const userApps = software.applications.filter((app) => !app.isSystemApp);
  const systemApps = software.applications.filter((app) => app.isSystemApp);

  const applicationColumns = [
    {
      title: 'Application Name', dataIndex: 'name', key: 'name',
      render: (text: string) => (
        <Space>
          <div style={{ width: 32, height: 32, background: '#ff0000', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>A</div>
          <div><div>{text}</div><Text type="secondary" style={{ fontSize: '11px' }}>xxx xxx xxx</Text></div>
        </Space>
      ),
    },
    {
      title: 'Vendor', dataIndex: 'vendor', key: 'vendor',
      filters: uniqueVendors.map((vendor) => ({ text: vendor, value: vendor })),
      filteredValue: appVendorFilters.length > 0 ? appVendorFilters : null,
      onFilter: (value: unknown, record: { vendor?: string }) => record.vendor === value,
    },
    { title: 'Version', dataIndex: 'version', key: 'version' },
    {
      title: 'Patch Status', dataIndex: 'patchStatus', key: 'patchStatus',
      filters: [{ text: 'Available', value: 'Available' }, { text: 'Not Available', value: 'Not Available' }],
      filteredValue: appPatchStatusFilters.length > 0 ? appPatchStatusFilters : null,
      onFilter: (value: unknown, record: { patchStatus?: string }) => record.patchStatus === value,
      render: (status: string) => (
        <Space><span style={{ color: status === 'Available' ? '#52c41a' : '#d9d9d9' }}>&#x25CF;</span><span>{status || 'Unknown'}</span></Space>
      ),
    },
    { title: 'Last Patched', dataIndex: 'lastPatched', key: 'lastPatched' },
    { title: 'App Installed On', dataIndex: 'appInstalledOn', key: 'appInstalledOn' },
  ];

  const serviceColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Display Name', dataIndex: 'displayName', key: 'displayName', ellipsis: true },
    {
      title: 'State', dataIndex: 'state', key: 'state',
      render: (state: string) => (
        <Space><span style={{ color: state === 'Running' ? '#52c41a' : '#d9d9d9' }}>&#x25CF;</span><span>{state || 'Unknown'}</span></Space>
      ),
    },
    { title: 'Startup Type', dataIndex: 'startupType', key: 'startupType', render: (type: string) => type || '-' },
  ];

  const startupProgramsAsServices = (software.startupPrograms || []).map((prog: { id: string; name: string; command?: string; enabled?: boolean }) => ({
    id: `startup-${prog.id}`, name: prog.name, displayName: prog.command || prog.name,
    state: prog.enabled ? 'Enabled' : 'Disabled', startupType: 'Startup Program', isStartupProgram: true,
  }));
  const allServices = [...software.services, ...startupProgramsAsServices];

  const handleAppTableChange = (_pagination: unknown, filters: Record<string, (string | number | boolean)[] | null>) => {
    setAppVendorFilters((filters.vendor as string[]) || []);
    setAppPatchStatusFilters((filters.patchStatus as string[]) || []);
  };

  const clearAppFilters = () => { setAppVendorFilters([]); setAppPatchStatusFilters([]); };
  const hasActiveFilters = appVendorFilters.length > 0 || appPatchStatusFilters.length > 0;

  const hostname = asset?.name || 'asset';
  const exportColumns = [
    { key: 'name', title: 'Application Name' }, { key: 'vendor', title: 'Vendor' },
    { key: 'version', title: 'Version' }, { key: 'patchStatus', title: 'Patch Status' },
    { key: 'lastPatched', title: 'Last Patched' }, { key: 'appInstalledOn', title: 'Installed On' },
  ];
  const serviceExportColumns = [
    { key: 'name', title: 'Service Name' }, { key: 'displayName', title: 'Display Name' },
    { key: 'state', title: 'State' }, { key: 'startupType', title: 'Startup Type' },
  ];

  const getOSIcon = () => {
    const osName = software?.os?.name?.toLowerCase() || asset?.osType?.toLowerCase() || '';
    if (osName.includes('mac') || osName.includes('darwin')) return <AppleOutlined style={{ color: '#000', fontSize: '16px' }} />;
    if (osName.includes('windows')) return <WindowsOutlined style={{ color: '#1890ff', fontSize: '16px' }} />;
    if (osName.includes('linux') || osName.includes('ubuntu')) return <DesktopOutlined style={{ color: '#E95420', fontSize: '16px' }} />;
    return <DesktopOutlined style={{ fontSize: '16px' }} />;
  };

  const getOSDisplayName = () => {
    if (software?.os?.name && software?.os?.version) return `${software.os.name} ${software.os.version}`;
    if (asset?.osType && asset?.osVersion) return `${asset.osType} ${asset.osVersion}`;
    return 'Operating System';
  };

  const getLicenseStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'licensed': return 'green';
      case 'trial': return 'blue';
      case 'graceperiod': return 'orange';
      case 'expired': case 'unlicensed': return 'red';
      default: return 'default';
    }
  };

  const getLicenseTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'perpetual': return 'green';
      case 'subscription': return 'blue';
      case 'trial': return 'orange';
      case 'freeware': case 'opensource': return 'cyan';
      case 'oem': case 'volume': return 'purple';
      default: return 'default';
    }
  };

  const licensedApps = software.applications.filter(
    (app) => app.license && (app.license.status || app.license.type || app.license.key)
  );

  const licenseColumns = [
    {
      title: 'Application', dataIndex: 'name', key: 'name', width: 200,
      render: (name: string, record: (typeof licensedApps)[0]) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.vendor && <Text type="secondary" style={{ fontSize: 16 }}>{record.vendor}</Text>}
        </Space>
      ),
    },
    { title: 'License Type', dataIndex: ['license', 'type'], key: 'type', width: 120, render: (type?: string) => type ? <Tag color={getLicenseTypeColor(type)}>{type}</Tag> : '-' },
    { title: 'Status', dataIndex: ['license', 'status'], key: 'status', width: 100, render: (status?: string) => status ? <Tag color={getLicenseStatusColor(status)}>{status}</Tag> : '-' },
    { title: 'License Key', dataIndex: ['license', 'key'], key: 'key', width: 220, render: (key?: string) => key ? <Text code style={{ fontSize: 11 }}>{key}</Text> : '-' },
    {
      title: 'Expiration', dataIndex: ['license', 'expirationDate'], key: 'expiration', width: 140,
      render: (date: string | undefined, record: (typeof licensedApps)[0]) => {
        if (!date) return '-';
        const days = record.license?.daysRemaining;
        return (
          <Space orientation="vertical" size={0}>
            <Text>{new Date(date).toLocaleDateString()}</Text>
            {days !== undefined && <Text type={days <= 30 ? 'danger' : 'secondary'} style={{ fontSize: 11 }}>{days} days remaining</Text>}
          </Space>
        );
      },
    },
    { title: 'Licensed To', dataIndex: ['license', 'licensedTo'], key: 'licensedTo', width: 150, render: (value?: string) => value || '-' },
    { title: 'Channel', dataIndex: ['license', 'channel'], key: 'channel', width: 100, render: (channel?: string) => channel ? <Tag>{channel}</Tag> : '-' },
  ];

  const softwareSubTabs = [
    {
      key: 'applications', label: `Applications (${userApps.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Input.Search placeholder="Search" style={{ width: 300 }} />
              {hasActiveFilters && <Button size="small" onClick={clearAppFilters}>Clear Filters</Button>}
            </Space>
            <Tooltip title="Export to CSV"><Button icon={<DownloadOutlined />} onClick={() => exportToCSV(userApps, exportColumns, `${hostname}-applications.csv`, message)} /></Tooltip>
          </div>
          <DataTable columns={applicationColumns} data={userApps} rowKey="id" onChange={handleAppTableChange} pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (total) => `Total ${total} applications found` }} size="small" />
        </div>
      ),
    },
    {
      key: 'system-apps', label: `System Apps (${systemApps.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Input.Search placeholder="Search" style={{ width: 300 }} />
            <Tooltip title="Export to CSV"><Button icon={<DownloadOutlined />} onClick={() => exportToCSV(systemApps, exportColumns, `${hostname}-system-apps.csv`, message)} /></Tooltip>
          </div>
          <DataTable columns={applicationColumns} data={systemApps} rowKey="id" pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (total) => `Total ${total} system apps found` }} size="small" />
        </div>
      ),
    },
    {
      key: 'services', label: `Services (${allServices.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Input.Search placeholder="Search" style={{ width: 300 }} />
            <Tooltip title="Export to CSV"><Button icon={<DownloadOutlined />} onClick={() => exportToCSV(allServices, serviceExportColumns, `${hostname}-services.csv`, message)} /></Tooltip>
          </div>
          <DataTable columns={serviceColumns} data={allServices} rowKey="id" pagination={{ pageSize: 25, showTotal: (total) => `Total ${total} services found` }} size="small" />
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Operating System Details */}
      <Collapse defaultActiveKey={['os']} style={{ marginBottom: 16 }}>
        <Panel header={<Space>{getOSIcon()}<Text strong>{getOSDisplayName()}</Text></Space>} key="os">
          <Row gutter={[16, 8]}>
            <Col span={6}><Text type="secondary">Operating System</Text><div>{software?.os?.name || asset?.osType || '-'}</div></Col>
            <Col span={6}><Text type="secondary">Version</Text><div>{software?.os?.version || asset?.osVersion || '-'}</div></Col>
            <Col span={6}><Text type="secondary">Hostname</Text><div>{asset?.name || '-'}</div></Col>
            <Col span={6}><Text type="secondary">Manufacturer</Text><div>{asset?.manufacturer || '-'}</div></Col>
            <Col span={6}><Text type="secondary">Model</Text><div>{asset?.model || '-'}</div></Col>
            <Col span={6}><Text type="secondary">Serial Number</Text><div>{asset?.serialNumber || '-'}</div></Col>
            <Col span={6}><Text type="secondary">Status</Text><div><Tag color={asset?.operationalStatus === 'CONNECTED' ? 'green' : 'orange'}>{asset?.operationalStatus || '-'}</Tag></div></Col>
            <Col span={6}><Text type="secondary">Last Updated</Text><div>{asset?.updatedAt ? new Date(asset.updatedAt).toLocaleString() : '-'}</div></Col>
          </Row>
        </Panel>
      </Collapse>

      <Collapse defaultActiveKey={[]} style={{ marginBottom: 16 }}>
        <Panel
          header={<Space><Text strong>Software Licenses</Text>{software.os?.licenseStatus && <Tag color="blue">OS: {software.os.licenseStatus}</Tag>}</Space>}
          key="licenses"
        >
          {software.os?.licenseStatus && (
            <Card size="small" title={<Space><DesktopOutlined /><Text strong>Operating System License</Text></Space>} style={{ marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={6}><Text type="secondary">OS Name</Text><div><Text strong>{software.os.name}</Text></div></Col>
                <Col span={4}><Text type="secondary">Version</Text><div>{software.os.version || '-'}</div></Col>
                <Col span={4}><Text type="secondary">Build</Text><div>{software.os.buildNumber || '-'}</div></Col>
                <Col span={4}><Text type="secondary">Architecture</Text><div>{software.os.architecture || '-'}</div></Col>
                <Col span={6}><Text type="secondary">License Status</Text><div><Tag color={software.os.licenseStatus?.toLowerCase() === 'licensed' ? 'green' : software.os.licenseStatus?.toLowerCase() === 'trial' ? 'orange' : 'red'}>{software.os.licenseStatus}</Tag></div></Col>
              </Row>
            </Card>
          )}

          {licensedApps.length === 0 && !software.os?.licenseStatus && (
            <Text type="secondary">No license information collected. License data is detected for commercial software like Microsoft Office, Adobe products, and other licensed applications.</Text>
          )}
          {licensedApps.length > 0 && (
            <>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Application Licenses ({licensedApps.length})</Text>
              <DataTable columns={licenseColumns} data={licensedApps} rowKey="id" size="small" pagination={{ pageSize: 10, showSizeChanger: true }} scroll={{ x: 1000 }} />
            </>
          )}
        </Panel>
      </Collapse>

      <Tabs items={softwareSubTabs} />
    </div>
  );
};
