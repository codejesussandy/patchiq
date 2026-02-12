import {
  DownloadOutlined,
  AppleOutlined,
  WindowsOutlined,
} from '@ant-design/icons';
import { App, Modal, Button } from 'antd';

interface DownloadAgentModalProps {
  open: boolean;
  onClose: () => void;
}

export const DownloadAgentModal = ({ open, onClose }: DownloadAgentModalProps) => {
  const { message } = App.useApp();

  const handleAgentDownload = async (platform: 'windows' | 'macos' | 'linux') => {
    const platformMap: Record<string, string> = {
      windows: 'Windows',
      macos: 'Mac',
      linux: 'Linux',
    };
    const filenameMap: Record<string, string> = {
      windows: 'patchiq-agent.msi',
      macos: 'patchiq-agent-macos',
      linux: 'patchiq-agent',
    };

    try {
      message.loading({ content: `Downloading ${platform} agent...`, key: 'agent-download' });

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const versionsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agent-versions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!versionsResponse.ok) {
        throw new Error(`Failed to fetch agent versions: ${versionsResponse.statusText}`);
      }

      const versions = await versionsResponse.json();
      const targetPlatform = platformMap[platform];

      const version = versions.find((v: { platform: string; architecture: string }) =>
        v.platform === targetPlatform && v.architecture === 'amd64'
      ) || versions.find((v: { platform: string }) => v.platform === targetPlatform);

      if (!version) {
        throw new Error(`No agent version found for ${platform}`);
      }

      const downloadResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/agent-versions/${version.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json().catch(() => null);
        const errorMsg = errorData?.message || downloadResponse.statusText;
        throw new Error(errorMsg);
      }

      const blob = await downloadResponse.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const contentDisposition = downloadResponse.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      link.download = filenameMatch?.[1] || filenameMap[platform];
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      message.success({ content: `${platform} agent downloaded successfully!`, key: 'agent-download' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : `Failed to download ${platform} agent`;
      message.error({ content: errMsg, key: 'agent-download' });
    }
  };

  return (
    <Modal
      title="Download PatchIQ Agent"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div style={{ padding: '16px 0' }}>
        <p style={{ marginBottom: '24px', color: '#666' }}>
          Download and install the PatchIQ agent on your endpoints to enable asset discovery,
          vulnerability scanning, and patch deployment.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f5f5f5', borderRadius: '8px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <WindowsOutlined style={{ fontSize: '32px', color: '#0078d4' }} />
              <div>
                <div style={{ fontWeight: 600 }}>Windows Agent</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Windows 10/11, Server 2016+</div>
              </div>
            </div>
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleAgentDownload('windows')}>Download</Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f5f5f5', borderRadius: '8px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AppleOutlined style={{ fontSize: '32px', color: '#555' }} />
              <div>
                <div style={{ fontWeight: 600 }}>macOS Agent</div>
                <div style={{ fontSize: '12px', color: '#666' }}>macOS 12 (Monterey) and later</div>
              </div>
            </div>
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleAgentDownload('macos')}>Download</Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', background: '#f5f5f5', borderRadius: '8px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>&#x1F427;</span>
              <div>
                <div style={{ fontWeight: 600 }}>Linux Agent</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Ubuntu 20.04+, RHEL 8+, Debian 11+</div>
              </div>
            </div>
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleAgentDownload('linux')}>Download</Button>
          </div>
        </div>

        <div style={{ marginTop: '24px', padding: '12px', background: '#e6f7ff', borderRadius: '4px', fontSize: '13px' }}>
          <strong>Installation:</strong> After downloading, run the agent with administrator/root privileges.
          The agent will automatically register with the PatchIQ server and appear in the Assets list.
        </div>
      </div>
    </Modal>
  );
};
