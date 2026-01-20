/**
 * Whitelist Patch Sources Seed Data
 * Based on the vendor whitelist documentation
 *
 * These are the approved domains/URLs from which patches can be downloaded.
 * The agent central repository will only download from these whitelisted sources.
 */

import { CreatePatchSourceDto, PatchSourceCategory, PatchSourcePlatform } from './patch-repository.types';

export const WHITELIST_SOURCES: CreatePatchSourceDto[] = [
  // ============================================
  // 1. OPERATING SYSTEM UPDATES
  // ============================================

  // Windows (Microsoft)
  {
    name: 'Microsoft Windows Update',
    vendor: 'Microsoft',
    category: 'os',
    platform: 'windows',
    baseUrl: 'https://windowsupdate.microsoft.com',
    urlPatterns: [
      '*.windowsupdate.microsoft.com',
      '*.update.microsoft.com',
      '*.windowsupdate.com',
      'download.windowsupdate.com',
      'wustat.windows.com',
      'ntservicepack.microsoft.com',
      'download.microsoft.com',
    ],
    priority: 100,
    metadata: {
      description: 'Microsoft Windows Update core service',
      category: 'Core Update Service',
    },
  },
  {
    name: 'Microsoft Delivery Optimization',
    vendor: 'Microsoft',
    category: 'os',
    platform: 'windows',
    baseUrl: 'https://delivery.mp.microsoft.com',
    urlPatterns: [
      '*.do.dsp.mp.microsoft.com',
      '*.dl.delivery.mp.microsoft.com',
      '*.emdl.ws.microsoft.com',
      '*.assets.onestore.ms',
      '*.tlu.dl.delivery.mp.microsoft.com',
    ],
    priority: 95,
    metadata: {
      description: 'Delivery Optimization and Microsoft Store',
      category: 'Delivery Optimization & Store',
    },
  },

  // macOS (Apple)
  {
    name: 'Apple macOS Updates',
    vendor: 'Apple',
    category: 'os',
    platform: 'macos',
    baseUrl: 'https://swscan.apple.com',
    urlPatterns: [
      'swscan.apple.com',
      'swcdn.apple.com',
      'swdist.apple.com',
      'swdownload.apple.com',
      'osrecovery.apple.com',
      'updates-http.cdn-apple.com',
      'updates.cdn-apple.com',
      'itunes.apple.com',
      '*phobos.apple.com',
      'gdmf.apple.com',
    ],
    priority: 100,
    metadata: {
      description: 'Apple macOS core updates, firmware, and App Store',
    },
  },

  // Linux Distributions
  {
    name: 'Red Hat Enterprise Linux',
    vendor: 'Red Hat',
    category: 'os',
    platform: 'linux',
    baseUrl: 'https://cdn.redhat.com',
    urlPatterns: [
      'cdn.redhat.com',
      'subscription.rhsm.redhat.com',
    ],
    priority: 90,
    metadata: { distribution: 'RHEL' },
  },
  {
    name: 'CentOS',
    vendor: 'CentOS',
    category: 'os',
    platform: 'linux',
    baseUrl: 'http://mirror.centos.org',
    urlPatterns: [
      'mirror.centos.org',
      'vault.centos.org',
    ],
    priority: 85,
    metadata: { distribution: 'CentOS / Stream' },
  },
  {
    name: 'Ubuntu',
    vendor: 'Canonical',
    category: 'os',
    platform: 'linux',
    baseUrl: 'http://archive.ubuntu.com',
    urlPatterns: [
      'archive.ubuntu.com',
      'security.ubuntu.com',
    ],
    priority: 90,
    metadata: { distribution: 'Ubuntu', notes: 'Includes ESM' },
  },
  {
    name: 'Debian',
    vendor: 'Debian',
    category: 'os',
    platform: 'linux',
    baseUrl: 'http://ftp.debian.org',
    urlPatterns: [
      'ftp.debian.org',
      'security.debian.org',
    ],
    priority: 85,
    metadata: { distribution: 'Debian' },
  },
  {
    name: 'Pardus',
    vendor: 'TUBITAK',
    category: 'os',
    platform: 'linux',
    baseUrl: 'http://depo.pardus.org.tr',
    urlPatterns: [
      'depo.pardus.org.tr',
      'indir.pardus.org.tr',
    ],
    priority: 70,
    metadata: { distribution: 'Pardus', notes: 'Gov/Enterprise specific (Turkey)' },
  },
  {
    name: 'Oracle Linux',
    vendor: 'Oracle',
    category: 'os',
    platform: 'linux',
    baseUrl: 'https://yum.oracle.com',
    urlPatterns: [
      'yum.oracle.com',
      'linux-update.oracle.com',
    ],
    priority: 85,
    metadata: { distribution: 'Oracle Linux', notes: 'Database Servers' },
  },
  {
    name: 'AlmaLinux',
    vendor: 'AlmaLinux',
    category: 'os',
    platform: 'linux',
    baseUrl: 'https://repo.almalinux.org',
    urlPatterns: ['repo.almalinux.org'],
    priority: 80,
    metadata: { distribution: 'AlmaLinux', notes: 'RHEL replacement' },
  },
  {
    name: 'Rocky Linux',
    vendor: 'Rocky Enterprise Software Foundation',
    category: 'os',
    platform: 'linux',
    baseUrl: 'https://dl.rockylinux.org',
    urlPatterns: ['dl.rockylinux.org'],
    priority: 80,
    metadata: { distribution: 'Rocky Linux', notes: 'RHEL replacement' },
  },
  {
    name: 'Amazon Linux',
    vendor: 'Amazon',
    category: 'os',
    platform: 'linux',
    baseUrl: 'https://repo.us-east-1.amazonaws.com',
    urlPatterns: ['repo.*.amazonaws.com'],
    priority: 85,
    metadata: { distribution: 'Amazon Linux', notes: 'AWS specific' },
  },
  {
    name: 'SUSE Linux Enterprise',
    vendor: 'SUSE',
    category: 'os',
    platform: 'linux',
    baseUrl: 'https://updates.suse.com',
    urlPatterns: [
      'updates.suse.com',
      'download.opensuse.org',
    ],
    priority: 85,
    metadata: { distribution: 'SUSE / OpenSUSE' },
  },
  {
    name: 'Fedora & EPEL',
    vendor: 'Fedora Project',
    category: 'os',
    platform: 'linux',
    baseUrl: 'https://mirrors.fedoraproject.org',
    urlPatterns: [
      'mirrors.fedoraproject.org',
      'dl.fedoraproject.org',
    ],
    priority: 80,
    metadata: { distribution: 'Fedora / EPEL' },
  },
  {
    name: 'Alpine Linux',
    vendor: 'Alpine Linux',
    category: 'os',
    platform: 'linux',
    baseUrl: 'http://dl-cdn.alpinelinux.org',
    urlPatterns: ['dl-cdn.alpinelinux.org'],
    priority: 75,
    metadata: { distribution: 'Alpine Linux', notes: 'Container hosts' },
  },

  // ============================================
  // 2. HARDWARE: BIOS, FIRMWARE & DRIVERS
  // ============================================

  {
    name: 'Dell Firmware & Drivers',
    vendor: 'Dell',
    category: 'firmware',
    platform: 'cross-platform',
    baseUrl: 'https://downloads.dell.com',
    urlPatterns: [
      'downloads.dell.com',
      'ftp.dell.com',
    ],
    priority: 90,
  },
  {
    name: 'HP Firmware & Drivers',
    vendor: 'HP',
    category: 'firmware',
    platform: 'cross-platform',
    baseUrl: 'https://ftp.hp.com',
    urlPatterns: [
      'ftp.hp.com',
      'hpia.hpcloud.hp.com',
    ],
    priority: 90,
  },
  {
    name: 'Lenovo Firmware & Drivers',
    vendor: 'Lenovo',
    category: 'firmware',
    platform: 'cross-platform',
    baseUrl: 'https://download.lenovo.com',
    urlPatterns: [
      'download.lenovo.com',
      'filedownload.lenovo.com',
    ],
    priority: 90,
  },
  {
    name: 'NVIDIA Drivers',
    vendor: 'NVIDIA',
    category: 'firmware',
    platform: 'cross-platform',
    baseUrl: 'https://international.download.nvidia.com',
    urlPatterns: [
      'international.download.nvidia.com',
      'us.download.nvidia.com',
    ],
    priority: 85,
  },
  {
    name: 'Intel Drivers',
    vendor: 'Intel',
    category: 'firmware',
    platform: 'cross-platform',
    baseUrl: 'https://downloadmirror.intel.com',
    urlPatterns: [
      'downloadmirror.intel.com',
      'ds-software-imports.s3.amazonaws.com',
    ],
    priority: 85,
  },
  {
    name: 'AMD Drivers',
    vendor: 'AMD',
    category: 'firmware',
    platform: 'cross-platform',
    baseUrl: 'https://drivers.amd.com',
    urlPatterns: ['drivers.amd.com'],
    priority: 85,
  },

  // ============================================
  // 3. ENTERPRISE SUITES (The "Big 5")
  // ============================================

  {
    name: 'Adobe Creative Cloud & Acrobat',
    vendor: 'Adobe',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://ccmdl.adobe.com',
    urlPatterns: [
      '*.adobe.com',
      '*.adobelogin.com',
      'ardownload2.adobe.com',
      'ccmdl.adobe.com',
      'swupmf.adobe.com',
    ],
    priority: 85,
    metadata: { products: ['Creative Cloud', 'Acrobat Reader'] },
  },
  {
    name: 'Autodesk',
    vendor: 'Autodesk',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://manifest.delivery.autodesk.com',
    urlPatterns: [
      '*.autodesk.com',
      'manifest.delivery.autodesk.com',
      'latests.autodesk.com',
    ],
    priority: 80,
    metadata: { products: ['AutoCAD', 'Revit'] },
  },
  {
    name: 'Microsoft 365',
    vendor: 'Microsoft',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://officecdn.microsoft.com',
    urlPatterns: [
      '*.officecdn.microsoft.com',
      '*.officecdn.microsoft.com.edgesuite.net',
      'config.office.com',
      'msedge.api.cdp.microsoft.com',
      'msedge.sf.dl.delivery.mp.microsoft.com',
    ],
    priority: 95,
    metadata: { products: ['Office', 'Teams', 'Edge'] },
  },
  {
    name: 'Zoom',
    vendor: 'Zoom',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://zoom.us',
    urlPatterns: [
      '*.zoom.us',
      'zoom.us',
    ],
    priority: 80,
    metadata: { products: ['Zoom Standard', 'Zoom VDI'] },
  },
  {
    name: 'Citrix Workspace',
    vendor: 'Citrix',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://downloadplugins.citrix.com',
    urlPatterns: [
      'downloadplugins.citrix.com',
      '*.citrixworkspacesapi.net',
      '*.cloud.com',
    ],
    priority: 80,
    metadata: { products: ['Citrix Workspace', 'VDI'] },
  },

  // ============================================
  // 4. VIRTUALIZATION & CLOUD TOOLS
  // ============================================

  {
    name: 'VMware',
    vendor: 'VMware',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://download3.vmware.com',
    urlPatterns: [
      'download3.vmware.com',
      'packages.vmware.com',
    ],
    priority: 85,
    metadata: { products: ['VMware Horizon'] },
  },
  {
    name: 'VirtualBox',
    vendor: 'Oracle',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://download.virtualbox.org',
    urlPatterns: ['download.virtualbox.org'],
    priority: 70,
  },
  {
    name: 'Azure Virtual Desktop',
    vendor: 'Microsoft',
    category: 'enterprise',
    platform: 'windows',
    baseUrl: 'https://query.prod.cms.rt.microsoft.com',
    urlPatterns: ['query.prod.cms.rt.microsoft.com'],
    priority: 80,
  },
  {
    name: 'Docker Desktop',
    vendor: 'Docker',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://download.docker.com',
    urlPatterns: [
      'download.docker.com',
      'desktop.docker.com',
    ],
    priority: 80,
  },
  {
    name: 'AWS CLI',
    vendor: 'Amazon',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://awscli.amazonaws.com',
    urlPatterns: ['awscli.amazonaws.com'],
    priority: 75,
  },

  // ============================================
  // 5. RUNTIMES & DEVELOPMENT
  // ============================================

  // Java
  {
    name: 'Azul Zulu JDK',
    vendor: 'Azul',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://cdn.azul.com',
    urlPatterns: ['cdn.azul.com'],
    priority: 80,
    metadata: { runtime: 'Java' },
  },
  {
    name: 'Oracle Java',
    vendor: 'Oracle',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://javadl.oracle.com',
    urlPatterns: ['javadl.oracle.com'],
    priority: 80,
    metadata: { runtime: 'Java' },
  },
  {
    name: 'Amazon Corretto',
    vendor: 'Amazon',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://corretto.aws',
    urlPatterns: ['corretto.aws'],
    priority: 80,
    metadata: { runtime: 'Java' },
  },
  {
    name: 'Eclipse Temurin',
    vendor: 'Eclipse Foundation',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://api.adoptium.net',
    urlPatterns: ['api.adoptium.net'],
    priority: 80,
    metadata: { runtime: 'Java' },
  },

  // .NET
  {
    name: 'Microsoft .NET',
    vendor: 'Microsoft',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://dotnetcli.azureedge.net',
    urlPatterns: ['dotnetcli.azureedge.net'],
    priority: 85,
    metadata: { runtime: '.NET Core' },
  },

  // Languages
  {
    name: 'Python',
    vendor: 'Python Software Foundation',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://www.python.org',
    urlPatterns: ['www.python.org'],
    priority: 80,
    metadata: { runtime: 'Python' },
  },
  {
    name: 'Node.js',
    vendor: 'OpenJS Foundation',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://nodejs.org',
    urlPatterns: ['nodejs.org'],
    priority: 80,
    metadata: { runtime: 'Node.js' },
  },
  {
    name: 'Go',
    vendor: 'Google',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://go.dev',
    urlPatterns: ['go.dev'],
    priority: 75,
    metadata: { runtime: 'Go/Golang' },
  },

  // Development Tools
  {
    name: 'Git for Windows',
    vendor: 'Git',
    category: 'utility',
    platform: 'windows',
    baseUrl: 'https://github.com/git-for-windows',
    urlPatterns: ['github.com'],
    priority: 75,
  },
  {
    name: 'Visual Studio Code',
    vendor: 'Microsoft',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://update.code.visualstudio.com',
    urlPatterns: ['update.code.visualstudio.com'],
    priority: 80,
  },
  {
    name: 'JetBrains IDEs',
    vendor: 'JetBrains',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://download.jetbrains.com',
    urlPatterns: ['download.jetbrains.com'],
    priority: 75,
  },
  {
    name: 'Postman',
    vendor: 'Postman',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://dl.pstmn.io',
    urlPatterns: ['dl.pstmn.io'],
    priority: 70,
  },
  {
    name: 'Anaconda',
    vendor: 'Anaconda',
    category: 'runtime',
    platform: 'cross-platform',
    baseUrl: 'https://repo.anaconda.com',
    urlPatterns: ['repo.anaconda.com'],
    priority: 75,
    metadata: { runtime: 'Python/Data Science' },
  },

  // ============================================
  // 6. SECURITY DEFINITIONS (Antivirus)
  // ============================================

  {
    name: 'Microsoft Defender',
    vendor: 'Microsoft',
    category: 'security',
    platform: 'windows',
    baseUrl: 'https://definitionupdates.microsoft.com',
    urlPatterns: [
      'definitionupdates.microsoft.com',
      'go.microsoft.com',
    ],
    priority: 100,
    metadata: { product: 'Windows Defender' },
  },
  {
    name: 'Symantec/Broadcom',
    vendor: 'Broadcom',
    category: 'security',
    platform: 'cross-platform',
    baseUrl: 'https://liveupdate.symantecliveupdate.com',
    urlPatterns: ['liveupdate.symantecliveupdate.com'],
    priority: 85,
  },
  {
    name: 'McAfee/Trellix',
    vendor: 'Trellix',
    category: 'security',
    platform: 'cross-platform',
    baseUrl: 'http://update.nai.com',
    urlPatterns: ['update.nai.com'],
    priority: 85,
  },
  {
    name: 'Trend Micro',
    vendor: 'Trend Micro',
    category: 'security',
    platform: 'cross-platform',
    baseUrl: 'https://activeupdate.trendmicro.com',
    urlPatterns: ['activeupdate.trendmicro.com'],
    priority: 85,
  },
  {
    name: 'Malwarebytes',
    vendor: 'Malwarebytes',
    category: 'security',
    platform: 'cross-platform',
    baseUrl: 'https://data-cdn.mbamupdates.com',
    urlPatterns: ['data-cdn.mbamupdates.com'],
    priority: 80,
  },

  // ============================================
  // 7. BROWSERS & THIRD-PARTY APPLICATIONS
  // ============================================

  // Browsers
  {
    name: 'Google Chrome',
    vendor: 'Google',
    category: 'browser',
    platform: 'cross-platform',
    baseUrl: 'https://dl.google.com',
    urlPatterns: ['dl.google.com'],
    priority: 90,
  },
  {
    name: 'Mozilla Firefox',
    vendor: 'Mozilla',
    category: 'browser',
    platform: 'cross-platform',
    baseUrl: 'https://download.cdn.mozilla.net',
    urlPatterns: ['download.cdn.mozilla.net'],
    priority: 90,
  },
  {
    name: 'Brave Browser',
    vendor: 'Brave Software',
    category: 'browser',
    platform: 'cross-platform',
    baseUrl: 'https://updates-cdn.bravesoftware.com',
    urlPatterns: ['updates-cdn.bravesoftware.com'],
    priority: 75,
  },
  {
    name: 'Opera Browser',
    vendor: 'Opera',
    category: 'browser',
    platform: 'cross-platform',
    baseUrl: 'https://get.geo.opera.com',
    urlPatterns: ['get.geo.opera.com'],
    priority: 70,
  },

  // Communication
  {
    name: 'Slack',
    vendor: 'Salesforce',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://downloads.slack-edge.com',
    urlPatterns: ['downloads.slack-edge.com'],
    priority: 80,
  },
  {
    name: 'Microsoft Teams',
    vendor: 'Microsoft',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://statics.teams.cdn.office.net',
    urlPatterns: ['statics.teams.cdn.office.net'],
    priority: 90,
  },
  {
    name: 'Cisco Webex',
    vendor: 'Cisco',
    category: 'enterprise',
    platform: 'cross-platform',
    baseUrl: 'https://akamaicdn.webex.com',
    urlPatterns: ['akamaicdn.webex.com'],
    priority: 80,
  },
  {
    name: 'Discord',
    vendor: 'Discord',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://dl.discordapp.net',
    urlPatterns: ['dl.discordapp.net'],
    priority: 65,
  },
  {
    name: 'WhatsApp Desktop',
    vendor: 'Meta',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://web.whatsapp.com',
    urlPatterns: ['web.whatsapp.com'],
    priority: 65,
  },

  // Utilities
  {
    name: '7-Zip',
    vendor: '7-Zip',
    category: 'utility',
    platform: 'windows',
    baseUrl: 'https://7-zip.org',
    urlPatterns: ['7-zip.org'],
    priority: 70,
  },
  {
    name: 'WinRAR',
    vendor: 'RARLAB',
    category: 'utility',
    platform: 'windows',
    baseUrl: 'https://www.rarlab.com',
    urlPatterns: ['www.rarlab.com'],
    priority: 70,
  },
  {
    name: 'Notepad++',
    vendor: 'Notepad++',
    category: 'utility',
    platform: 'windows',
    baseUrl: 'https://github.com/notepad-plus-plus',
    urlPatterns: ['github.com'],
    priority: 70,
  },
  {
    name: 'VLC Media Player',
    vendor: 'VideoLAN',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://get.videolan.org',
    urlPatterns: ['get.videolan.org'],
    priority: 70,
  },
  {
    name: 'FileZilla',
    vendor: 'FileZilla Project',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://dl3.cdn.filezilla-project.org',
    urlPatterns: ['*.cdn.filezilla-project.org'],
    priority: 65,
  },
  {
    name: 'TeamViewer',
    vendor: 'TeamViewer',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://download.teamviewer.com',
    urlPatterns: ['download.teamviewer.com'],
    priority: 75,
  },
  {
    name: 'AnyDesk',
    vendor: 'AnyDesk',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://download.anydesk.com',
    urlPatterns: ['download.anydesk.com'],
    priority: 70,
  },
  {
    name: 'Wireshark',
    vendor: 'Wireshark Foundation',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://1.na.dl.wireshark.org',
    urlPatterns: ['*.dl.wireshark.org'],
    priority: 65,
  },

  // ============================================
  // 8. GENERIC CDNs (The "Catch-All" List)
  // ============================================

  {
    name: 'GitHub Releases',
    vendor: 'GitHub',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://github.com',
    urlPatterns: [
      'github.com',
      'objects.githubusercontent.com',
    ],
    priority: 85,
    metadata: { notes: 'Many tools use GitHub for releases' },
  },
  {
    name: 'SourceForge',
    vendor: 'SourceForge',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://sourceforge.net',
    urlPatterns: ['sourceforge.net', '*.sourceforge.net'],
    priority: 60,
  },
  {
    name: 'Amazon S3 CDN',
    vendor: 'Amazon',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://s3.amazonaws.com',
    urlPatterns: ['*.s3.amazonaws.com'],
    priority: 70,
    metadata: { notes: 'Many tools use S3 for hosting' },
  },
  {
    name: 'Akamai CDN',
    vendor: 'Akamai',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://akamaiedge.net',
    urlPatterns: ['*.akamaiedge.net'],
    priority: 70,
    metadata: { notes: 'Many vendors use Akamai for delivery' },
  },
  {
    name: 'Cloudflare CDN',
    vendor: 'Cloudflare',
    category: 'utility',
    platform: 'cross-platform',
    baseUrl: 'https://cloudflare.com',
    urlPatterns: ['*.cloudflare.com'],
    priority: 70,
    metadata: { notes: 'Many vendors use Cloudflare for delivery' },
  },
];

/**
 * Important Implementation Notes from the whitelist document:
 *
 * 1. SSL Inspection Warning: Do NOT perform Deep Packet Inspection (DPI) on these domains.
 *    Decrypting the traffic breaks the digital signature of the installer files,
 *    causing updates to fail with "Hash Mismatch" or "Certificate Error."
 *
 * 2. Redirects: Configure to follow HTTP 301/302 Redirects. For example, a request to
 *    zoom.us will often redirect to cloudfront.net to deliver the file. Both must be allowed.
 *
 * 3. Traffic Rules: Allow Port 80 (HTTP) and Port 443 (HTTPS) for all domains.
 *
 * 4. Wildcard Requirement: Many vendors use dynamic CDNs. Whitelisting *.domain.com is mandatory.
 */

export default WHITELIST_SOURCES;
