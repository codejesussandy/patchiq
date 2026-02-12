import { useState } from 'react';
import {
  SearchOutlined,
  CalendarOutlined,
  ReloadOutlined,
  ExportOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  App,
  Tag,
  Typography,
  Space,
  Input,
  Button,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetAlerts } from '../../../../hooks/useAssets';

const { Text } = Typography;

interface AlertsTabProps {
  assetId: string;
}

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
    case 'CRITICAL': return 'red';
    case 'CLEAR': return 'green';
    case 'WARNING': return 'orange';
    case 'INFO': return 'blue';
    default: return 'default';
  }
};

export const AlertsTab = ({ assetId }: AlertsTabProps) => {
  const { message } = App.useApp();
  const { data: alertsResult, isLoading: alertsLoading, refetch: refetchAlerts } = useAssetAlerts(assetId);
  const alertsData = (alertsResult?.data || []) as AlertItem[];

  const [alertsSearchText, setAlertsSearchText] = useState('');
  const [alertsViewMode, setAlertsViewMode] = useState<'list' | 'grid'>('list');

  const filteredAlerts = alertsData.filter(alert =>
    alert.alert.toLowerCase().includes(alertsSearchText.toLowerCase()) ||
    alert.module.toLowerCase().includes(alertsSearchText.toLowerCase()) ||
    alert.attribute.toLowerCase().includes(alertsSearchText.toLowerCase()) ||
    alert.message.toLowerCase().includes(alertsSearchText.toLowerCase())
  );

  const alertsColumns: ColumnsType<AlertItem> = [
    { title: 'Alert', dataIndex: 'alert', key: 'alert', sorter: (a, b) => a.alert.localeCompare(b.alert) },
    {
      title: 'Severity', dataIndex: 'severity', key: 'severity',
      sorter: (a, b) => a.severity.localeCompare(b.severity),
      render: (severity: string) => <Tag color={getAlertSeverityColor(severity)}>{severity}</Tag>,
    },
    { title: 'Module', dataIndex: 'module', key: 'module', sorter: (a, b) => a.module.localeCompare(b.module) },
    { title: 'Attribute', dataIndex: 'attribute', key: 'attribute', sorter: (a, b) => a.attribute.localeCompare(b.attribute) },
    { title: 'Value', dataIndex: 'value', key: 'value', sorter: (a, b) => parseFloat(a.value) - parseFloat(b.value) },
    {
      title: 'Message', dataIndex: 'message', key: 'message',
      sorter: (a, b) => a.message.localeCompare(b.message),
      render: (text: string) => <Text ellipsis style={{ maxWidth: 200 }}>{text}</Text>,
    },
    { title: 'Created On', dataIndex: 'createdOn', key: 'createdOn', sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime() },
  ];

  return (
    <div>
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
          <Button icon={<ReloadOutlined />} onClick={() => refetchAlerts()} loading={alertsLoading}>Refresh</Button>
          <Button icon={<ExportOutlined />} onClick={() => {
            const csvContent = [
              ['Alert', 'Severity', 'Module', 'Attribute', 'Value', 'Message', 'Created On'].join(','),
              ...filteredAlerts.map(a => [a.alert, a.severity, a.module, a.attribute, a.value, `"${a.message}"`, a.createdOn].join(','))
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `asset-alerts-${assetId}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            message.success('Alerts exported');
          }}>Export</Button>
          <Button>Configure Alert</Button>
          <Space>
            <Button type={alertsViewMode === 'list' ? 'primary' : 'default'} icon={<UnorderedListOutlined />} onClick={() => setAlertsViewMode('list')} />
            <Button type={alertsViewMode === 'grid' ? 'primary' : 'default'} icon={<AppstoreOutlined />} onClick={() => setAlertsViewMode('grid')} />
            <Button icon={<SettingOutlined />} />
          </Space>
        </Space>
      </div>

      <DataTable
        columns={alertsColumns}
        data={filteredAlerts}
        rowKey="id"
        loading={alertsLoading}
        pagination={{
          pageSize: 30, showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};
