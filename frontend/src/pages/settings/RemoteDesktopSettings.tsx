import { useState } from 'react';
import { App,
  Button, Typography, Switch, Spin, Segmented } from 'antd';
import { useRemoteDesktopSettings, useUpdateRemoteDesktopSettings, useResetRemoteDesktopSettings } from '../../hooks/useSettings';

const { Title, Text } = Typography;

export const RemoteDesktopSettings = () => {
  const { message } = App.useApp();
  const { data: settings, isLoading: loading } = useRemoteDesktopSettings();
  const updateSettingsMutation = useUpdateRemoteDesktopSettings();
  const resetSettingsMutation = useResetRemoteDesktopSettings();
  const [formData, setFormData] = useState({
    connectionType: 'Local' as 'Local' | 'Remote',
    remoteSessionIndicator: false,
    userConsent: false,
  });
  const [initialized, setInitialized] = useState(false);

  // Sync fetched settings to local state once loaded
  if (settings && !initialized) {
    setFormData({
      connectionType: settings.connectionType,
      remoteSessionIndicator: settings.remoteSessionIndicator,
      userConsent: settings.userConsent,
    });
    setInitialized(true);
  }

  const handleConnectionTypeChange = (value: string | number) => {
    setFormData({
      ...formData,
      connectionType: value as 'Local' | 'Remote',
    });
  };

  const handleRemoteSessionIndicatorChange = (checked: boolean) => {
    setFormData({
      ...formData,
      remoteSessionIndicator: checked,
    });
  };

  const handleUserConsentChange = (checked: boolean) => {
    setFormData({
      ...formData,
      userConsent: checked,
    });
  };

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync(formData);
      message.success('Remote Desktop Settings updated successfully');
    } catch {
      message.error('Failed to update remote desktop settings');
    }
  };

  const handleReset = async () => {
    try {
      await resetSettingsMutation.mutateAsync();
      message.success('Remote Desktop Settings reset to defaults');
      setInitialized(false);
    } catch {
      message.error('Failed to reset remote desktop settings');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={3} style={{ margin: 0 }}>Remote Desktop Settings</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Configure remote desktop access settings</Text>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin />
        </div>
      ) : (
        <div style={{ maxWidth: '900px' }}>
          {/* Connection Type */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ fontSize: '14px' }}>
                <span style={{ color: '#ff4d4f' }}>*</span> Connection Type
              </Text>
            </div>
            <Segmented
              value={formData.connectionType}
              onChange={handleConnectionTypeChange}
              options={['Local', 'Remote']}
              style={{ padding: '4px', backgroundColor: '#f5f5f5' }}
            />
          </div>

          {/* Remote Session Indicator */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: '14px' }}>
              Remote Session Indicator
            </Text>
            <Switch
              checked={formData.remoteSessionIndicator}
              onChange={handleRemoteSessionIndicatorChange}
            />
          </div>

          {/* User Consent */}
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: '14px' }}>
              User Consent
            </Text>
            <Switch
              checked={formData.userConsent}
              onChange={handleUserConsentChange}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              onClick={handleSave}
              type="primary"
              loading={updateSettingsMutation.isPending}
            >
              Save
            </Button>
            <Button
              onClick={handleReset}
              disabled={updateSettingsMutation.isPending}
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
