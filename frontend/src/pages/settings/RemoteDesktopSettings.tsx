import { useState, useEffect } from 'react';
import { Button, message, Typography, Space, Switch, Spin, Segmented } from 'antd';
import { settingsService } from '../../services/settings.service';
import type { RemoteDesktopSettings as RemoteDesktopSettingsType } from '../../types/settings.types';

const { Title, Text } = Typography;

export const RemoteDesktopSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RemoteDesktopSettingsType | null>(null);
  const [formData, setFormData] = useState({
    connectionType: 'Local' as 'Local' | 'Remote',
    remoteSessionIndicator: false,
    userConsent: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getRemoteDesktopSettings();
      setSettings(data);
      setFormData({
        connectionType: data.connectionType,
        remoteSessionIndicator: data.remoteSessionIndicator,
        userConsent: data.userConsent,
      });
    } catch (error) {
      console.error('Error fetching remote desktop settings:', error);
      message.error('Failed to load remote desktop settings');
    } finally {
      setLoading(false);
    }
  };

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
    setSaving(true);
    try {
      await settingsService.updateRemoteDesktopSettings(formData);
      message.success('Remote Desktop Settings updated successfully');
      await fetchSettings();
    } catch (error) {
      console.error('Error updating remote desktop settings:', error);
      message.error('Failed to update remote desktop settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await settingsService.resetRemoteDesktopSettings();
      message.success('Remote Desktop Settings reset to defaults');
      await fetchSettings();
    } catch (error) {
      console.error('Error resetting remote desktop settings:', error);
      message.error('Failed to reset remote desktop settings');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Remote Desktop Settings</Title>
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
              loading={saving}
            >
              Save
            </Button>
            <Button
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
