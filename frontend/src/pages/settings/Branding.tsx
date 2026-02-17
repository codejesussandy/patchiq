import { useState, useRef } from 'react';
import { CloudUploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { App,
  Button, Typography, Space, Card, Spin } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { useBrandingSettings, useUpdateBranding } from '../../hooks/useSettings';

const { Title, Text } = Typography;

interface BrandingData {
  logoUrl?: string;
  companyName?: string;
}

export const Branding = () => {
  const { message } = App.useApp();
  const { data: fetchedBranding, isLoading: loading } = useBrandingSettings();
  const updateBrandingMutation = useUpdateBranding();
  const [logoFile, setLogoFile] = useState<RcFile | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [brandingData, setBrandingData] = useState<BrandingData>({
    companyName: 'SkenzerIQ',
  });

  // Sync fetched branding to local state once loaded
  if (fetchedBranding && !initialized) {
    setBrandingData(fetchedBranding || { companyName: 'SkenzerIQ' });
    if (fetchedBranding?.logoUrl) {
      setLogoPreview(fetchedBranding.logoUrl);
    }
    setInitialized(true);
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidImageFile(file)) {
        processFile(file as RcFile);
      } else {
        message.error('Please upload a valid image file (PNG, JPG, GIF, SVG)');
      }
    }
  };

  const isValidImageFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    const validExtensions = /\.(png|jpg|jpeg|gif|svg)$/i;
    return validTypes.includes(file.type) || validExtensions.test(file.name);
  };

  const processFile = (file: RcFile) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setLogoPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidImageFile(file)) {
        processFile(file as RcFile);
      } else {
        message.error('Please upload a valid image file (PNG, JPG, GIF, SVG)');
      }
    }
  };

  const handleClickUploadArea = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!logoFile) {
      message.warning('Please select a logo image');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('companyName', brandingData.companyName || 'SkenzerIQ');

      await updateBrandingMutation.mutateAsync(formData);
      message.success('Branding settings updated successfully');
      setLogoFile(null);
      setInitialized(false);
    } catch {
      message.error('Failed to update branding settings');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Branding</Title>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin />
        </div>
      ) : (
        <div style={{ maxWidth: '900px' }}>
          {/* Preview Section */}
          <Card style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ fontSize: '14px', color: '#8c8c8c', textTransform: 'uppercase' }}>
                Preview
              </Text>
            </div>

            <div
              style={{
                padding: '32px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                minHeight: '200px',
              }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  style={{
                    maxHeight: '150px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">{brandingData.companyName || 'SkenzerIQ'}</Text>
                </div>
              )}
            </div>
          </Card>

          {/* Upload Section */}
          <Card>
            <div
              ref={dragRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleClickUploadArea}
              style={{
                padding: '48px 32px',
                border: `2px dashed ${dragActive ? '#1890ff' : '#d9d9d9'}`,
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: dragActive ? '#f0f5ff' : '#fafafa',
              }}
            >
              <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}>
                <CloudUploadOutlined />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  Click or drag file to this area to upload
                </Text>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  Please select logo image
                </Text>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary" style={{ fontSize: '16px', display: 'block' }}>
                  Support for a single upload
                </Text>
              </div>

              {logoFile && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
                  <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text style={{ fontSize: '16px', color: '#0050b3' }}>
                      Selected: {logoFile.name}
                    </Text>
                  </Space>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/svg+xml,.png,.jpg,.jpeg,.gif,.svg"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            {/* Action Buttons */}
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              {logoFile && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleRemoveLogo}
                  disabled={updateBrandingMutation.isPending}
                >
                  Remove
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={updateBrandingMutation.isPending}
                disabled={!logoFile}
              >
                Update
              </Button>
            </div>
          </Card>

          {/* Info Section */}
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f6f8fa', borderRadius: '8px' }}>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              <strong>Note:</strong> Upload your company logo in PNG, JPG, GIF, or SVG format. The logo will be displayed as your company branding throughout the application.
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};
