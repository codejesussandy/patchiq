import { Checkbox } from 'antd';

interface CapabilityCategory {
  name: string;
  capabilities: { label: string; key: string }[];
}

// eslint-disable-next-line react-refresh/only-export-components
export const CAPABILITIES_CATEGORIES: CapabilityCategory[] = [
  {
    name: 'Agents',
    capabilities: [
      { label: 'View Agents', key: 'view_agents' },
      { label: 'Add Agent', key: 'add_agents' },
      { label: 'Edit Agent', key: 'edit_agents' },
      { label: 'Delete Agent', key: 'delete_agents' },
    ],
  },
  {
    name: 'Assets',
    capabilities: [
      { label: 'View Assets', key: 'view_assets' },
      { label: 'Add Asset', key: 'add_assets' },
      { label: 'Edit Asset', key: 'edit_assets' },
      { label: 'Delete Asset', key: 'delete_assets' },
    ],
  },
  {
    name: 'Patches',
    capabilities: [
      { label: 'View Patches', key: 'view_patches' },
      { label: 'Add Patch', key: 'add_patches' },
      { label: 'Edit Patch', key: 'edit_patches' },
      { label: 'Delete Patch', key: 'delete_patches' },
    ],
  },
  {
    name: 'Vulnerabilities',
    capabilities: [
      { label: 'View Vulnerabilities', key: 'view_vulnerabilities' },
      { label: 'Add Vulnerability', key: 'add_vulnerabilities' },
      { label: 'Edit Vulnerability', key: 'edit_vulnerabilities' },
      { label: 'Delete Vulnerability', key: 'delete_vulnerabilities' },
    ],
  },
  {
    name: 'Jobs',
    capabilities: [
      { label: 'View Jobs', key: 'view_jobs' },
      { label: 'Add Job', key: 'add_jobs' },
      { label: 'Edit Job', key: 'edit_jobs' },
      { label: 'Delete Job', key: 'delete_jobs' },
    ],
  },
  {
    name: 'Discovery',
    capabilities: [
      { label: 'View Discovery', key: 'view_discovery' },
      { label: 'Add Discovery', key: 'add_discovery' },
      { label: 'Edit Discovery', key: 'edit_discovery' },
      { label: 'Delete Discovery', key: 'delete_discovery' },
    ],
  },
  {
    name: 'Reports',
    capabilities: [
      { label: 'View Reports', key: 'view_reports' },
      { label: 'Add Report', key: 'add_reports' },
      { label: 'Edit Report', key: 'edit_reports' },
      { label: 'Delete Report', key: 'delete_reports' },
    ],
  },
  {
    name: 'Dashboard',
    capabilities: [
      { label: 'View Dashboard', key: 'view_dashboard' },
      { label: 'Add Dashboard', key: 'add_dashboard' },
      { label: 'Edit Dashboard', key: 'edit_dashboard' },
      { label: 'Delete Dashboard', key: 'delete_dashboard' },
    ],
  },
  {
    name: 'Settings',
    capabilities: [
      { label: 'View Settings', key: 'view_settings' },
      { label: 'Add Settings', key: 'add_settings' },
      { label: 'Edit Settings', key: 'edit_settings' },
      { label: 'Delete Settings', key: 'delete_settings' },
    ],
  },
];

interface RoleCapabilitiesPickerProps {
  selectedCapabilities: string[];
  onCapabilitiesChange: (capabilities: string[]) => void;
  disabled?: boolean;
}

export const RoleCapabilitiesPicker = ({
  selectedCapabilities,
  onCapabilitiesChange,
  disabled = false,
}: RoleCapabilitiesPickerProps) => {
  const totalCount = CAPABILITIES_CATEGORIES.reduce((acc, cat) => acc + cat.capabilities.length, 0);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        height: '400px',
        backgroundColor: '#fafafa',
      }}
    >
      {/* Left column - All available capabilities */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #d9d9d9', overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, padding: '12px 12px 8px 12px', color: '#1890ff', fontSize: '12px', backgroundColor: '#fafafa', zIndex: 10, flexShrink: 0 }}>
          {totalCount} Items
        </div>
        <div style={{ overflowY: 'auto', padding: '0 12px 12px 12px', flex: 1 }}>
          {CAPABILITIES_CATEGORIES.map((category) => (
            <div key={category.name} style={{ marginBottom: '14px' }}>
              <div style={{ fontWeight: 600, fontSize: '12px', color: '#262626', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {category.name}
              </div>
              {category.capabilities.map((cap) => (
                <div
                  key={cap.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    fontSize: '13px',
                    marginBottom: '2px',
                    borderRadius: '3px',
                    transition: 'background-color 0.2s',
                    backgroundColor: selectedCapabilities.includes(cap.key) ? '#e6f7ff' : 'transparent',
                  }}
                >
                  <Checkbox
                    checked={selectedCapabilities.includes(cap.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onCapabilitiesChange([...selectedCapabilities, cap.key]);
                      } else {
                        onCapabilitiesChange(selectedCapabilities.filter((c) => c !== cap.key));
                      }
                    }}
                    disabled={disabled}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: '#262626' }}>{cap.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right column - Selected capabilities */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, padding: '12px 12px 8px 12px', color: '#1890ff', fontSize: '12px', backgroundColor: '#ffffff', zIndex: 10, flexShrink: 0 }}>
          {selectedCapabilities.length} Items
        </div>
        <div style={{ overflowY: 'auto', padding: '0 12px 12px 12px', flex: 1 }}>
          {selectedCapabilities.length === 0 ? (
            <div style={{ color: '#bfbfbf', fontSize: '12px', paddingTop: '16px', textAlign: 'center', fontStyle: 'italic' }}>
              No capabilities selected
            </div>
          ) : (
            selectedCapabilities.map((cap) => (
              <div
                key={cap}
                style={{
                  padding: '6px 8px',
                  fontSize: '13px',
                  color: '#262626',
                  marginBottom: '4px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '3px',
                  borderLeft: '3px solid #1890ff',
                }}
              >
                {cap.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
