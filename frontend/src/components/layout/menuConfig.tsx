import type { ReactNode } from 'react';
import {
  SettingOutlined,
  UserOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  EditOutlined,
  FolderOutlined,
  FileTextOutlined,
  DesktopOutlined,
  WindowsOutlined,
  AppleOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  BugOutlined,
  SecurityScanOutlined,
  WarningOutlined,
  ExceptionOutlined,
  BellOutlined,
} from '@ant-design/icons';

export interface MenuItem {
  key: string;
  icon?: ReactNode;
  label: string | ReactNode;
  children?: MenuItem[];
}

export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_EXPANDED_WIDTH = 224;
export const CATEGORY_PANEL_WIDTH = 220;

export const topMenuItems = [
  { key: '/dashboard', label: 'Dashboard' },
  { key: '/assets', label: 'Assets' },
  { key: '/patches', label: 'Patches' },
  { key: '/vulnerability', label: 'Vulnerability' },
  { key: '/reports', label: 'Reports' },
];

export const patchesTabItems: MenuItem[] = [
  { key: 'all-patches', icon: <FolderOutlined />, label: 'All Patches' },
  { key: 'patch-deployed', icon: <CreditCardOutlined />, label: 'Patch Deployments' },
  { key: 'patch-test-approve', icon: <EnvironmentOutlined />, label: 'Patch Test and Approve' },
  { key: 'zero-touch', icon: <EnvironmentOutlined />, label: 'Zero Touch Deployment' },
  { key: 'patch-jobs', icon: <SafetyOutlined />, label: 'Patch Jobs' },
];

export const assetTabItems: MenuItem[] = [
  { key: 'all-assets', icon: <FolderOutlined />, label: 'All Assets' },
  { key: 'software-inventory', icon: <FileTextOutlined />, label: 'Software Inventory' },
  { key: 'software-license', icon: <DesktopOutlined />, label: 'Software Licenses' },
  { key: 'software-hub', icon: <AppstoreOutlined />, label: 'Software Hub' },
];

export const osCategories: MenuItem[] = [
  { key: 'os-windows', icon: <WindowsOutlined />, label: 'Windows' },
  { key: 'os-macos', icon: <AppleOutlined />, label: 'Mac' },
  { key: 'os-linux', icon: <DesktopOutlined />, label: 'Linux' },
];

export const vulnerabilityMenuItems: MenuItem[] = [
  { key: 'zero-day-vulnerabilities', icon: <SecurityScanOutlined />, label: 'Zero Day Vulnerabilities' },
  { key: 'vulnerabilities', icon: <WarningOutlined />, label: 'Vulnerabilities' },
  { key: 'manage-exception', icon: <ExceptionOutlined />, label: 'Manage Exception' },
  { key: 'vulnerability-jobs', icon: <BugOutlined />, label: 'Vulnerability Jobs' },
];

export const settingsMenuItems: MenuItem[] = [
  {
    key: 'user-management',
    icon: <UserOutlined />,
    label: 'User Management',
    children: [
      { key: 'user-management-organization', label: 'Organization' },
      { key: 'user-management-location', label: 'Location' },
      { key: 'user-management-roles', label: 'User Roles' },
      { key: 'user-management-users', label: 'Users' },
      { key: 'user-management-password-policies', label: 'Password Policies' },
    ],
  },
  {
    key: 'system-settings',
    icon: <SettingOutlined />,
    label: 'Company Configuration',
    children: [
      { key: 'system-settings-branding', label: 'Branding' },
      { key: 'system-settings-vendor-logo', label: 'Vendor Logo' },
      { key: 'system-settings-mail-server', label: 'Mail Server Configurations' },
      { key: 'system-settings-proxy-server', label: 'Proxy Server Configurations' },
      { key: 'system-settings-ldap-server', label: 'LDAP Server Configurations' },
      { key: 'system-settings-risk-score', label: 'Risk Score Settings' },
      { key: 'system-settings-remote-desktop', label: 'Remote Desktop Settings' },
      { key: 'system-settings-server', label: 'Server Settings' },
    ],
  },
  { key: 'notification-preferences', icon: <BellOutlined />, label: 'Notification Preferences' },
  { key: 'vulnerability-preference', icon: <FileTextOutlined />, label: 'Vulnerability Preference' },
  { key: 'market-place', icon: <FolderOutlined />, label: 'Market Place' },
  {
    key: 'discovery',
    icon: <UserOutlined />,
    label: 'Discovery',
    children: [
      { key: 'discovery-ip-discovery', label: 'IP Discovery' },
      { key: 'discovery-device-credentials', label: 'Device Credentials' },
    ],
  },
  {
    key: 'agent-management',
    icon: <DesktopOutlined />,
    label: 'Agent Management',
    children: [
      { key: 'agent-management-approval-settings', label: 'Agent Approval Settings' },
      { key: 'agent-management-versions', label: 'Agent Versions' },
      { key: 'agent-management-configuration', label: 'Agent Configuration' },
      { key: 'agent-management-approvals', label: 'Agent Approvals' },
      { key: 'agent-management-enroll-secret', label: 'Enroll Secret' },
      { key: 'agent-management-red-hat-nomination', label: 'Red Hat Agent Nomination' },
    ],
  },
  { key: 'jobs', icon: <WindowsOutlined />, label: 'Jobs' },
  {
    key: 'patch-management',
    icon: <EditOutlined />,
    label: 'Patch Management',
    children: [
      { key: 'patch-management-patch-preferences', label: 'Patch Preferences' },
      { key: 'patch-management-distribution-server', label: 'Distribution Server' },
    ],
  },
  { key: 'policy-management', icon: <CreditCardOutlined />, label: 'Alert Management' },
  { key: 'audit', icon: <FileTextOutlined />, label: 'Audit' },
  { key: 'platform-license', icon: <CreditCardOutlined />, label: 'Platform License' },
];

/** Map sidebar menu keys to their route paths */
export const sideMenuRoutes: Record<string, string> = {
  // Vulnerability
  'zero-day-vulnerabilities': '/vulnerability/zero-day-vulnerabilities',
  'vulnerabilities': '/vulnerability/vulnerabilities',
  'manage-exception': '/vulnerability/manage-exception',
  'vulnerability-jobs': '/vulnerability/vulnerability-jobs/list',
  // Discovery
  'discovery-ip-discovery': '/discovery/ip-discovery',
  'discovery-device-credentials': '/discovery/device-credentials',
  // User Management
  'user-management': '/settings/user-management/organization',
  'user-management-organization': '/settings/user-management/organization',
  'user-management-location': '/settings/user-management/location',
  'user-management-roles': '/settings/user-management/user-roles',
  'user-management-users': '/settings/user-management/users',
  'user-management-password-policies': '/settings/user-management/password-policies',
  // System Settings
  'system-settings': '/settings/system-settings/branding',
  'system-settings-branding': '/settings/system-settings/branding',
  'system-settings-vendor-logo': '/settings/system-settings/vendor-logo',
  'system-settings-mail-server': '/settings/system-settings/mail-server',
  'system-settings-proxy-server': '/settings/system-settings/proxy-server',
  'system-settings-ldap-server': '/settings/system-settings/ldap-server',
  'system-settings-risk-score': '/settings/system-settings/risk-score',
  'system-settings-remote-desktop': '/settings/system-settings/remote-desktop',
  'system-settings-server': '/settings/system-settings/server-settings',
  // Agent Management
  'agent-management': '/settings/agent-management/approval-settings',
  'agent-management-approval-settings': '/settings/agent-management/approval-settings',
  'agent-management-versions': '/settings/agent-management/versions',
  'agent-management-configuration': '/settings/agent-management/configuration',
  'agent-management-approvals': '/settings/agent-management/approvals',
  'agent-management-enroll-secret': '/settings/agent-management/enroll-secret',
  'agent-management-red-hat-nomination': '/settings/agent-management/red-hat-nomination',
  // Patch Management
  'patch-management': '/settings/patch-management',
  'patch-management-patch-preferences': '/settings/patch-management/patch-preferences',
  'patch-management-distribution-server': '/settings/patch-management/distribution-server',
  // Top-level settings
  'notification-preferences': '/settings/notification-preferences',
  'vulnerability-preference': '/settings/vulnerability-preference',
  'market-place': '/settings/market-place',
  'discovery': '/discovery/ip-discovery',
  'jobs': '/settings/jobs',
  'policy-management': '/settings/policy-management',
  'audit': '/settings/audit',
  'platform-license': '/settings/platform-license',
};

/** Reverse map: route path → selected side menu key */
export const routeToSideMenuKey: Record<string, string> = {};
for (const [key, path] of Object.entries(sideMenuRoutes)) {
  // Only map leaf keys (not parent group keys like 'user-management')
  if (key.includes('-') || !['user-management', 'system-settings', 'agent-management', 'patch-management', 'discovery'].includes(key)) {
    routeToSideMenuKey[path] = key;
  }
}

/** Asset tab → route mapping */
export const assetTabRoutes: Record<string, string> = {
  'all-assets': '/assets',
  'software-inventory': '/assets/software-inventory',
  'software-license': '/assets/software-license',
  'software-hub': '/assets/hub',
};

/** Patch tab → route mapping */
export const patchTabRoutes: Record<string, string> = {
  'all-patches': '/patches',
  'patch-deployed': '/patches/deployed',
  'patch-test-approve': '/patches/test-approve',
  'zero-touch': '/patches/zero-touch',
  'patch-jobs': '/patches/patch-jobs',
};

/** OS filter key → search param value */
export const osFilterMap: Record<string, string> = {
  'windows': 'Windows',
  'macos': 'MacOS',
  'linux': 'Linux',
};

/** Reverse OS map for getSelectedSideMenu */
export const osParamToKey: Record<string, string> = {
  'Windows': 'os-windows',
  'MacOS': 'os-macos',
  'Linux': 'os-linux',
};
