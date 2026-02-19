/**
 * Shared helpers for deployment executor sub-services
 */

/**
 * Map agent OS to a default package manager source
 */
export function getDefaultSourceForOS(os: string): string {
  switch (os.toLowerCase()) {
    case 'windows':
      return 'winget';
    case 'linux':
    case 'ubuntu':
    case 'debian':
      return 'apt';
    case 'macos':
    case 'darwin':
      return 'brew';
    case 'fedora':
    case 'rhel':
    case 'centos':
      return 'dnf';
    default:
      return 'apt';
  }
}
