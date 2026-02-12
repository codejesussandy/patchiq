import { useState } from 'react';
import { SaveOutlined } from '@ant-design/icons';
import { Typography, Switch, Button, App, Spin } from 'antd';
import { DataTable } from '../../components/shared/DataTable';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../hooks/useNotifications';
import type { NotificationPreferences as Prefs } from '../../services/notification.service';

const { Title, Text } = Typography;

const categories = [
  { key: 'agent', label: 'Agent', description: 'Agent registration, status changes, errors' },
  { key: 'deployment', label: 'Deployment', description: 'Patch and software deployment results' },
  { key: 'vulnerability', label: 'Vulnerability', description: 'New vulnerability detections' },
  { key: 'alert', label: 'Alert', description: 'Alert triggers and resolutions' },
  { key: 'system', label: 'System', description: 'System-wide events and updates' },
];

const defaultPrefs: Prefs = {
  agentInApp: true,
  agentEmail: false,
  deploymentInApp: true,
  deploymentEmail: false,
  vulnerabilityInApp: true,
  vulnerabilityEmail: true,
  alertInApp: true,
  alertEmail: true,
  systemInApp: true,
  systemEmail: false };

export const NotificationPreferences = () => {
  const { message } = App.useApp();
  const { data: fetchedPrefs, isLoading: loading } = useNotificationPreferences();
  const updatePrefsMutation = useUpdateNotificationPreferences();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [initialized, setInitialized] = useState(false);

  // Sync fetched prefs to local state once loaded
  if (fetchedPrefs && !initialized) {
    setPrefs(fetchedPrefs);
    setInitialized(true);
  }

  const handleToggle = (key: keyof Prefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      const updated = await updatePrefsMutation.mutateAsync(prefs);
      if (updated) setPrefs(updated);
      message.success('Notification preferences saved');
    } catch {
      message.error('Failed to save preferences');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const tableData = categories.map((cat) => ({
    key: cat.key,
    category: cat.label,
    description: cat.description,
    inAppKey: `${cat.key}InApp` as keyof Prefs,
    emailKey: `${cat.key}Email` as keyof Prefs }));

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      width: 160,
      render: (text: string, record: typeof tableData[0]) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
        </div>
      ) },
    {
      title: 'In-App',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: typeof tableData[0]) => (
        <Switch
          checked={prefs[record.inAppKey]}
          onChange={(v) => handleToggle(record.inAppKey, v)}
        />
      ) },
    {
      title: 'Email',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: typeof tableData[0]) => (
        <Switch
          checked={prefs[record.emailKey]}
          onChange={(v) => handleToggle(record.emailKey, v)}
        />
      ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Notification Preferences</Title>
          <Text type="secondary">Choose how you receive notifications for each category</Text>
        </div>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={updatePrefsMutation.isPending}>
          Save Preferences
        </Button>
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        pagination={false}
        size="middle"
        style={{ maxWidth: 600 }}
      />

      <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
        Email notifications require a configured mail server (Settings &gt; Company Configuration &gt; Mail Server).
      </Text>
    </div>
  );
};
