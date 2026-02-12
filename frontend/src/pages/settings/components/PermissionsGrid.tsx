import { Checkbox, Typography } from 'antd';
import type { Permission } from '../../../types/settings.types';

const { Text } = Typography;

const PERMISSION_MODULES = [
  { key: 'patches', label: 'Patches' },
  { key: 'assets', label: 'Assets' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

const PERMISSION_ACTIONS = ['view', 'add', 'edit', 'delete'];

// eslint-disable-next-line react-refresh/only-export-components
export { PERMISSION_MODULES, PERMISSION_ACTIONS };

interface PermissionsGridProps {
  permissions: Permission[];
  onPermissionsChange: (permissions: Permission[]) => void;
}

export const PermissionsGrid = ({ permissions, onPermissionsChange }: PermissionsGridProps) => {
  const isPermissionChecked = (moduleKey: string, action: string): boolean => {
    const modulePermission = permissions.find((p) => p.module === moduleKey);
    return modulePermission ? modulePermission.actions.includes(action) : false;
  };

  const isModuleFullySelected = (moduleKey: string): boolean => {
    const modulePermission = permissions.find((p) => p.module === moduleKey);
    if (!modulePermission) return false;
    return PERMISSION_ACTIONS.every((action) => modulePermission.actions.includes(action));
  };

  const handlePermissionChange = (moduleKey: string, action: string, checked: boolean) => {
    const newPermissions = [...permissions];
    const moduleIndex = newPermissions.findIndex((p) => p.module === moduleKey);

    if (moduleIndex >= 0) {
      if (checked) {
        if (!newPermissions[moduleIndex].actions.includes(action)) {
          newPermissions[moduleIndex].actions = [...newPermissions[moduleIndex].actions, action];
        }
      } else {
        newPermissions[moduleIndex].actions = newPermissions[moduleIndex].actions.filter((a) => a !== action);
      }
    } else {
      newPermissions.push({ module: moduleKey, actions: checked ? [action] : [] });
    }

    onPermissionsChange(newPermissions);
  };

  const handleSelectAllModule = (moduleKey: string, checked: boolean) => {
    const newPermissions = [...permissions];
    const moduleIndex = newPermissions.findIndex((p) => p.module === moduleKey);

    if (checked) {
      if (moduleIndex >= 0) {
        newPermissions[moduleIndex].actions = [...PERMISSION_ACTIONS];
      } else {
        newPermissions.push({ module: moduleKey, actions: [...PERMISSION_ACTIONS] });
      }
    } else {
      if (moduleIndex >= 0) {
        newPermissions[moduleIndex].actions = [];
      }
    }

    onPermissionsChange(newPermissions);
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px', padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr) 80px', gap: '12px', marginBottom: '12px', fontWeight: 500 }}>
        <div>Module</div>
        <div style={{ textAlign: 'center' }}>View</div>
        <div style={{ textAlign: 'center' }}>Add</div>
        <div style={{ textAlign: 'center' }}>Edit</div>
        <div style={{ textAlign: 'center' }}>Delete</div>
        <div style={{ textAlign: 'center' }}>Select All</div>
      </div>

      {PERMISSION_MODULES.map((module) => (
        <div key={module.key} style={{ display: 'grid', gridTemplateColumns: '200px repeat(4, 1fr) 80px', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
          <div><Text strong>{module.label}</Text></div>
          {PERMISSION_ACTIONS.map((action) => (
            <div key={action} style={{ textAlign: 'center' }}>
              <Checkbox
                checked={isPermissionChecked(module.key, action)}
                onChange={(e) => handlePermissionChange(module.key, action, e.target.checked)}
              />
            </div>
          ))}
          <div style={{ textAlign: 'center' }}>
            <Checkbox
              checked={isModuleFullySelected(module.key)}
              onChange={(e) => handleSelectAllModule(module.key, e.target.checked)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
