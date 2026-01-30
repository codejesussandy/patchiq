import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WHITELIST_SOURCES } from '../../modules/patch-repository/whitelist-sources.seed';
import { seedCpeMappings } from './seeds/cpe-mappings.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // ============================================
  // Organization Structure
  // ============================================

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { name: 'Default Organization' },
    update: {},
    create: {
      name: 'Default Organization',
      description: 'Default organization for PatchIQ',
      isDefault: true,
    },
  });
  console.log('Created default organization:', org.name);

  // Create default branch
  const branch = await prisma.branch.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'Headquarters',
      },
    },
    update: {},
    create: {
      name: 'Headquarters',
      description: 'Main headquarters branch',
      organizationId: org.id,
      isDefault: true,
    },
  });
  console.log('Created default branch:', branch.name);

  // Create default department
  const department = await prisma.department.upsert({
    where: {
      branchId_name: {
        branchId: branch.id,
        name: 'IT Department',
      },
    },
    update: {},
    create: {
      name: 'IT Department',
      description: 'Information Technology Department',
      branchId: branch.id,
    },
  });
  console.log('Created default department:', department.name);

  // Create default location
  const location = await prisma.location.upsert({
    where: { name: 'Main Office' },
    update: {},
    create: {
      name: 'Main Office',
      address: '123 Main Street',
      city: 'San Francisco',
      country: 'USA',
      timezone: 'America/Los_Angeles',
    },
  });
  console.log('Created default location:', location.name);

  // ============================================
  // Roles
  // ============================================

  // Create admin role
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Full system access',
      isSystem: true,
      permissions: {
        agents: { view: true, add: true, edit: true, delete: true },
        assets: { view: true, add: true, edit: true, delete: true },
        patches: { view: true, add: true, edit: true, delete: true },
        vulnerabilities: { view: true, add: true, edit: true, delete: true },
        jobs: { view: true, add: true, edit: true, delete: true },
        discovery: { view: true, add: true, edit: true, delete: true },
        reports: { view: true, add: true, edit: true, delete: true },
        dashboard: { view: true, add: true, edit: true, delete: true },
        settings: { view: true, add: true, edit: true, delete: true },
      },
    },
  });
  console.log('Created admin role');

  // Create user role
  await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Basic user access',
      isSystem: true,
      permissions: {
        agents: { view: true, add: false, edit: false, delete: false },
        assets: { view: true, add: false, edit: false, delete: false },
        patches: { view: true, add: false, edit: false, delete: false },
        vulnerabilities: { view: true, add: false, edit: false, delete: false },
        jobs: { view: true, add: false, edit: false, delete: false },
        discovery: { view: true, add: false, edit: false, delete: false },
        reports: { view: true, add: false, edit: false, delete: false },
        dashboard: { view: true, add: false, edit: false, delete: false },
        settings: { view: false, add: false, edit: false, delete: false },
      },
    },
  });
  console.log('Created user role');

  // ============================================
  // Users
  // ============================================

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@patchiq.io' },
    update: {},
    create: {
      email: 'admin@patchiq.io',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      role: 'admin',
      organizationId: org.id,
      departmentId: department.id,
      locationId: location.id,
      isActive: true,
      isOnboarded: true,
    },
  });
  console.log('Created admin user:', adminUser.email);

  // Create demo user
  const demoPasswordHash = await bcrypt.hash('demo123', 12);
  await prisma.user.upsert({
    where: { email: 'demo@patchiq.io' },
    update: {},
    create: {
      email: 'demo@patchiq.io',
      passwordHash: demoPasswordHash,
      name: 'Demo User',
      role: 'user',
      organizationId: org.id,
      departmentId: department.id,
      locationId: location.id,
      isActive: true,
      isOnboarded: true,
    },
  });
  console.log('Created demo user: demo@patchiq.io');

  // ============================================
  // Tags
  // ============================================

  const tags = [
    { name: 'Production', color: '#ef4444', priority: 10, compliance: true },
    { name: 'Development', color: '#3b82f6', priority: 5, compliance: false },
    { name: 'Testing', color: '#f59e0b', priority: 3, compliance: false },
    { name: 'Critical', color: '#dc2626', priority: 15, compliance: true },
    { name: 'PCI-DSS', color: '#8b5cf6', priority: 8, compliance: true },
    { name: 'HIPAA', color: '#06b6d4', priority: 8, compliance: true },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log('Created', tags.length, 'tags');

  // NOTE: Vulnerabilities are populated from real CVE database sync (NVD, CISA KEV, etc.)
  // No fake vulnerability data is seeded. Run CVE sync to populate vulnerabilities.

  // ============================================
  // Sample Patches
  // ============================================

  const patches = [
    // ---- Microsoft Windows ----
    {
      patchId: 'KB5034441',
      title: 'Windows 11 Security Update February 2024',
      software: 'Windows 11 Security Update',
      description: 'This security update addresses vulnerabilities in Windows 11.',
      severity: 'CRITICAL',
      category: 'Security Updates',
      vendor: 'Microsoft',
      product: 'Windows 11',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-13'),
      rebootRequired: true,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'MS24-FEB-01',
      kbNumber: 'KB5034441',
      endpoints: 42,
      tags: ['Security', 'Critical'],
      cveNumbers: ['CVE-2024-21351', 'CVE-2024-21412'],
      operationalStatusSince: new Date('2024-02-15'),
    },
    {
      patchId: 'KB5034442',
      title: 'Windows 11 Cumulative Update February 2024',
      software: 'Windows 11 Cumulative Update',
      description: 'This cumulative update includes feature and security fixes.',
      severity: 'HIGH',
      category: 'Critical Updates',
      vendor: 'Microsoft',
      product: 'Windows 11',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-13'),
      rebootRequired: true,
      testStatus: 'pending',
      approvalStatus: 'pending',
      bulletinId: 'MS24-FEB-02',
      kbNumber: 'KB5034442',
      endpoints: 38,
      tags: ['Cumulative'],
      cveNumbers: ['CVE-2024-21338'],
      operationalStatusSince: new Date('2024-02-14'),
    },
    {
      patchId: 'KB5035853',
      title: 'Windows Server 2022 Security Update March 2024',
      software: 'Windows Server 2022 Security Update',
      description: 'Security update for Windows Server 2022 addressing privilege escalation.',
      severity: 'CRITICAL',
      category: 'Security Updates',
      vendor: 'Microsoft',
      product: 'Windows Server 2022',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-03-12'),
      rebootRequired: true,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'MS24-MAR-01',
      kbNumber: 'KB5035853',
      endpoints: 15,
      tags: ['Security', 'Server'],
      cveNumbers: ['CVE-2024-21407', 'CVE-2024-26170'],
      operationalStatusSince: new Date('2024-03-14'),
    },
    {
      patchId: 'KB5034763',
      title: 'Windows 10 22H2 Quality Update January 2024',
      software: 'Windows 10 Quality Update',
      description: 'Monthly quality rollup for Windows 10 version 22H2.',
      severity: 'Medium',
      category: 'Critical Updates',
      vendor: 'Microsoft',
      product: 'Windows 10',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-01-09'),
      rebootRequired: true,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'MS24-JAN-03',
      kbNumber: 'KB5034763',
      endpoints: 67,
      tags: ['Quality Rollup'],
      cveNumbers: [],
      operationalStatusSince: new Date('2024-01-11'),
    },
    {
      patchId: 'KB5035845',
      title: '.NET Framework 4.8.1 Security Update',
      software: '.NET Framework 4.8.1 Security Update',
      description: 'Security and reliability update for .NET Framework.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'Microsoft',
      product: '.NET Framework',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-03-12'),
      rebootRequired: false,
      testStatus: 'pending',
      approvalStatus: 'pending',
      bulletinId: 'MS24-MAR-NET',
      kbNumber: 'KB5035845',
      endpoints: 55,
      tags: ['Security', 'Third Party'],
      cveNumbers: ['CVE-2024-21392'],
      operationalStatusSince: new Date('2024-03-13'),
    },

    // ---- Apple macOS ----
    {
      patchId: 'macOS-14.3.1',
      title: 'macOS Sonoma 14.3.1 Security Update',
      software: 'macOS Sonoma 14.3.1',
      description: 'This update provides important security fixes for macOS Sonoma.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'Apple',
      product: 'macOS Sonoma',
      os: 'MacOS',
      platform: 'MacOS',
      architecture: 'Universal',
      releaseDate: new Date('2024-02-08'),
      rebootRequired: true,
      testStatus: 'untested',
      approvalStatus: 'pending',
      bulletinId: 'APPLE-SA-2024-02-08',
      kbNumber: 'macOS-14.3.1',
      endpoints: 12,
      tags: ['Security'],
      cveNumbers: ['CVE-2024-23222', 'CVE-2024-23223'],
      operationalStatusSince: new Date('2024-02-10'),
    },
    {
      patchId: 'macOS-14.4',
      title: 'macOS Sonoma 14.4 Update',
      software: 'macOS Sonoma 14.4',
      description: 'Feature update with security fixes for macOS Sonoma.',
      severity: 'Medium',
      category: 'Application Updates',
      vendor: 'Apple',
      product: 'macOS Sonoma',
      os: 'MacOS',
      platform: 'MacOS',
      architecture: 'Universal',
      releaseDate: new Date('2024-03-07'),
      rebootRequired: true,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'APPLE-SA-2024-03-07',
      kbNumber: 'macOS-14.4',
      endpoints: 12,
      tags: ['Feature Update'],
      cveNumbers: ['CVE-2024-23296'],
      operationalStatusSince: new Date('2024-03-09'),
    },

    // ---- Ubuntu / Linux ----
    {
      patchId: 'USN-6609-1',
      title: 'Ubuntu 22.04 LTS Linux Kernel Security Update',
      software: 'Linux Kernel 5.15 Security Update',
      description: 'Kernel security update addressing multiple vulnerabilities in Ubuntu 22.04.',
      severity: 'CRITICAL',
      category: 'Security Updates',
      vendor: 'Canonical',
      product: 'Ubuntu 22.04 LTS',
      os: 'Ubuntu',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-01-25'),
      rebootRequired: true,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'USN-6609-1',
      kbNumber: 'USN-6609-1',
      endpoints: 23,
      tags: ['Security', 'Kernel'],
      cveNumbers: ['CVE-2023-6931', 'CVE-2023-6932'],
      operationalStatusSince: new Date('2024-01-27'),
    },
    {
      patchId: 'USN-6680-1',
      title: 'Ubuntu 22.04 OpenSSL Security Update',
      software: 'OpenSSL 3.0.13 Security Update',
      description: 'Fixes denial-of-service vulnerability in OpenSSL.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'Canonical',
      product: 'Ubuntu 22.04 LTS',
      os: 'Ubuntu',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-03-04'),
      rebootRequired: false,
      testStatus: 'pending',
      approvalStatus: 'pending',
      bulletinId: 'USN-6680-1',
      kbNumber: 'USN-6680-1',
      endpoints: 23,
      tags: ['Security', 'Third Party'],
      cveNumbers: ['CVE-2024-0727'],
      operationalStatusSince: new Date('2024-03-05'),
    },
    {
      patchId: 'RHSA-2024:1063',
      title: 'Red Hat Enterprise Linux 9 Kernel Security Update',
      software: 'RHEL 9 Kernel Security Update',
      description: 'Important kernel security update for RHEL 9.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'Red Hat',
      product: 'RHEL 9',
      os: 'Linux',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-28'),
      rebootRequired: true,
      testStatus: 'untested',
      approvalStatus: 'pending',
      bulletinId: 'RHSA-2024:1063',
      kbNumber: 'RHSA-2024:1063',
      endpoints: 8,
      tags: ['Security', 'Kernel'],
      cveNumbers: ['CVE-2024-0646', 'CVE-2024-1086'],
      operationalStatusSince: new Date('2024-03-01'),
    },

    // ---- Browsers (Chrome, Firefox) ----
    {
      patchId: 'CHROME-122.0.6261.57',
      title: 'Google Chrome 122 Stable Channel Update',
      software: 'Google Chrome 122.0.6261.57',
      description: 'Fixes 12 security vulnerabilities including high-severity V8 bug.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'Google',
      product: 'Chrome',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-20'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'CHROME-2024-02',
      kbNumber: 'CHROME-122.0.6261.57',
      endpoints: 85,
      tags: ['Third Party', 'Browser'],
      cveNumbers: ['CVE-2024-1670', 'CVE-2024-1671', 'CVE-2024-1672'],
      operationalStatusSince: new Date('2024-02-21'),
    },
    {
      patchId: 'FIREFOX-123.0',
      title: 'Mozilla Firefox 123.0 Security Update',
      software: 'Mozilla Firefox 123.0',
      description: 'Addresses multiple memory safety bugs and use-after-free vulnerability.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'Mozilla',
      product: 'Firefox',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-20'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'MFSA-2024-05',
      kbNumber: 'FIREFOX-123.0',
      endpoints: 52,
      tags: ['Third Party', 'Browser'],
      cveNumbers: ['CVE-2024-1546', 'CVE-2024-1547'],
      operationalStatusSince: new Date('2024-02-22'),
    },

    // ---- Enterprise Suites (Adobe, Zoom) ----
    {
      patchId: 'APSB24-07',
      title: 'Adobe Acrobat Reader DC 24.001.20604 Security Update',
      software: 'Adobe Acrobat Reader DC 24.001.20604',
      description: 'Fixes critical code execution vulnerability in Acrobat Reader.',
      severity: 'CRITICAL',
      category: 'Security Updates',
      vendor: 'Adobe',
      product: 'Acrobat Reader DC',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-13'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'APSB24-07',
      kbNumber: 'APSB24-07',
      endpoints: 78,
      tags: ['Third Party', 'Critical'],
      cveNumbers: ['CVE-2024-20726', 'CVE-2024-20727'],
      operationalStatusSince: new Date('2024-02-15'),
    },
    {
      patchId: 'ZOOM-5.17.5',
      title: 'Zoom Workplace Desktop Client 5.17.5',
      software: 'Zoom Workplace 5.17.5',
      description: 'Security update addressing improper input validation.',
      severity: 'Medium',
      category: 'Application Updates',
      vendor: 'Zoom',
      product: 'Zoom Workplace',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-13'),
      rebootRequired: false,
      testStatus: 'untested',
      approvalStatus: 'pending',
      bulletinId: 'ZSB-24005',
      kbNumber: 'ZOOM-5.17.5',
      endpoints: 90,
      tags: ['Third Party'],
      cveNumbers: ['CVE-2024-24691'],
      operationalStatusSince: new Date('2024-02-14'),
    },

    // ---- Drivers / Firmware ----
    {
      patchId: 'NVIDIA-550.54.14',
      title: 'NVIDIA GPU Display Driver 550.54.14',
      software: 'NVIDIA Display Driver 550.54.14',
      description: 'Security update for NVIDIA GPU display driver.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'NVIDIA',
      product: 'GPU Display Driver',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-22'),
      rebootRequired: true,
      testStatus: 'pending',
      approvalStatus: 'pending',
      bulletinId: 'NVIDIA-2024-02',
      kbNumber: 'NVIDIA-550.54.14',
      endpoints: 34,
      tags: ['Third Party', 'Driver'],
      cveNumbers: ['CVE-2024-0071', 'CVE-2024-0072'],
      operationalStatusSince: new Date('2024-02-24'),
    },
    {
      patchId: 'INTEL-SA-01011',
      title: 'Intel Chipset INF Utility Driver Update',
      software: 'Intel Chipset INF Utility 10.1.19444',
      description: 'Addresses potential security vulnerability in Intel Chipset drivers.',
      severity: 'Medium',
      category: 'Application Updates',
      vendor: 'Intel',
      product: 'Chipset INF Utility',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-01-09'),
      rebootRequired: true,
      testStatus: 'untested',
      approvalStatus: 'pending',
      bulletinId: 'INTEL-SA-01011',
      kbNumber: 'INTEL-SA-01011',
      endpoints: 28,
      tags: ['Third Party', 'Driver'],
      cveNumbers: ['CVE-2023-47855'],
      operationalStatusSince: new Date('2024-01-11'),
    },

    // ---- Runtimes / Development ----
    {
      patchId: 'JAVA-21.0.2',
      title: 'Azul Zulu JDK 21.0.2 Critical Patch Update',
      software: 'Azul Zulu JDK 21.0.2',
      description: 'January 2024 Critical Patch Update for Java SE.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'Azul',
      product: 'Zulu JDK',
      os: 'Linux',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-01-16'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'AZUL-2024-01',
      kbNumber: 'JAVA-21.0.2',
      endpoints: 19,
      tags: ['Third Party', 'Runtime'],
      cveNumbers: ['CVE-2024-20918', 'CVE-2024-20919'],
      operationalStatusSince: new Date('2024-01-18'),
    },
    {
      patchId: 'NODEJS-20.11.1',
      title: 'Node.js 20.11.1 LTS Security Release',
      software: 'Node.js 20.11.1 LTS',
      description: 'Security release addressing HTTP request smuggling.',
      severity: 'HIGH',
      category: 'Security Updates',
      vendor: 'OpenJS Foundation',
      product: 'Node.js',
      os: 'Linux',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-14'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'NODEJS-FEB-2024',
      kbNumber: 'NODEJS-20.11.1',
      endpoints: 14,
      tags: ['Third Party', 'Runtime'],
      cveNumbers: ['CVE-2024-22019', 'CVE-2024-21896'],
      operationalStatusSince: new Date('2024-02-15'),
    },
    {
      patchId: 'PYTHON-3.12.2',
      title: 'Python 3.12.2 Security Maintenance Release',
      software: 'Python 3.12.2',
      description: 'Security maintenance release for Python 3.12 branch.',
      severity: 'Medium',
      category: 'Application Updates',
      vendor: 'Python Software Foundation',
      product: 'Python',
      os: 'Linux',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-06'),
      rebootRequired: false,
      testStatus: 'pending',
      approvalStatus: 'pending',
      bulletinId: 'PSF-2024-02',
      kbNumber: 'PYTHON-3.12.2',
      endpoints: 11,
      tags: ['Third Party', 'Runtime'],
      cveNumbers: ['CVE-2023-52425'],
      operationalStatusSince: new Date('2024-02-07'),
    },

    // ---- Security / Antivirus ----
    {
      patchId: 'DEFENDER-4.18.24010',
      title: 'Microsoft Defender Antivirus Platform Update',
      software: 'Microsoft Defender Platform 4.18.24010',
      description: 'Monthly platform update for Microsoft Defender Antivirus.',
      severity: 'Medium',
      category: 'Security Updates',
      vendor: 'Microsoft',
      product: 'Defender Antivirus',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-01-23'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'DEFENDER-2024-01',
      kbNumber: 'DEFENDER-4.18.24010',
      endpoints: 95,
      tags: ['Security', 'Antivirus'],
      cveNumbers: [],
      operationalStatusSince: new Date('2024-01-24'),
    },

    // ---- Communication Tools ----
    {
      patchId: 'TEAMS-24033.811',
      title: 'Microsoft Teams Desktop Client Update',
      software: 'Microsoft Teams 24033.811',
      description: 'Monthly update with performance improvements and bug fixes.',
      severity: 'Low',
      category: 'Application Updates',
      vendor: 'Microsoft',
      product: 'Teams',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-01'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'TEAMS-2024-02',
      kbNumber: 'TEAMS-24033.811',
      endpoints: 88,
      tags: ['Third Party'],
      cveNumbers: [],
      operationalStatusSince: new Date('2024-02-02'),
    },
    {
      patchId: 'SLACK-4.36.140',
      title: 'Slack Desktop 4.36.140 Update',
      software: 'Slack Desktop 4.36.140',
      description: 'Security and performance update for Slack desktop client.',
      severity: 'Low',
      category: 'Application Updates',
      vendor: 'Salesforce',
      product: 'Slack',
      os: 'MacOS',
      platform: 'MacOS',
      architecture: 'Universal',
      releaseDate: new Date('2024-02-15'),
      rebootRequired: false,
      testStatus: 'untested',
      approvalStatus: 'pending',
      bulletinId: 'SLACK-2024-02',
      kbNumber: 'SLACK-4.36.140',
      endpoints: 30,
      tags: ['Third Party'],
      cveNumbers: [],
      operationalStatusSince: new Date('2024-02-16'),
    },

    // ---- Utilities ----
    {
      patchId: '7ZIP-24.01',
      title: '7-Zip 24.01 Security Update',
      software: '7-Zip 24.01',
      description: 'Addresses arbitrary code execution vulnerability via crafted archives.',
      severity: 'CRITICAL',
      category: 'Security Updates',
      vendor: 'Igor Pavlov',
      product: '7-Zip',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-01-30'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: '7ZIP-2024-01',
      kbNumber: '7ZIP-24.01',
      endpoints: 72,
      tags: ['Third Party', 'Critical'],
      cveNumbers: ['CVE-2023-52168', 'CVE-2023-52169'],
      operationalStatusSince: new Date('2024-01-31'),
    },
    {
      patchId: 'VSCODE-1.87.0',
      title: 'Visual Studio Code 1.87.0 February 2024',
      software: 'Visual Studio Code 1.87.0',
      description: 'Monthly release with new features and security fixes.',
      severity: 'Low',
      category: 'Application Updates',
      vendor: 'Microsoft',
      product: 'Visual Studio Code',
      os: 'Linux',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-29'),
      rebootRequired: false,
      testStatus: 'untested',
      approvalStatus: 'pending',
      bulletinId: 'VSCODE-2024-02',
      kbNumber: 'VSCODE-1.87.0',
      endpoints: 16,
      tags: ['Third Party', 'Development'],
      cveNumbers: [],
      operationalStatusSince: new Date('2024-03-01'),
    },

    // ---- Virtualization ----
    {
      patchId: 'DOCKER-25.0.3',
      title: 'Docker Desktop 4.28.0 (Docker Engine 25.0.3)',
      software: 'Docker Desktop 4.28.0',
      description: 'Fixes container escape vulnerability in runc.',
      severity: 'CRITICAL',
      category: 'Security Updates',
      vendor: 'Docker',
      product: 'Docker Desktop',
      os: 'Linux',
      platform: 'Linux',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-01'),
      rebootRequired: false,
      testStatus: 'passed',
      approvalStatus: 'approved',
      bulletinId: 'DOCKER-2024-02',
      kbNumber: 'DOCKER-25.0.3',
      endpoints: 9,
      tags: ['Third Party', 'Critical', 'Container'],
      cveNumbers: ['CVE-2024-21626'],
      operationalStatusSince: new Date('2024-02-02'),
    },

    // ---- Dell / HP Firmware ----
    {
      patchId: 'DELL-BIOS-2.18.0',
      title: 'Dell Latitude 5540 BIOS Update 2.18.0',
      software: 'Dell Latitude 5540 BIOS 2.18.0',
      description: 'BIOS update addressing Spectre variant mitigation improvements.',
      severity: 'Medium',
      category: 'Critical Updates',
      vendor: 'Dell',
      product: 'Latitude 5540',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-02-20'),
      rebootRequired: true,
      testStatus: 'pending',
      approvalStatus: 'pending',
      bulletinId: 'DSA-2024-042',
      kbNumber: 'DELL-BIOS-2.18.0',
      endpoints: 18,
      tags: ['Firmware', 'BIOS'],
      cveNumbers: ['CVE-2023-28746'],
      operationalStatusSince: new Date('2024-02-22'),
    },
    {
      patchId: 'HP-SP148780',
      title: 'HP ProBook 450 G10 System BIOS Update',
      software: 'HP ProBook 450 G10 BIOS F.14',
      description: 'Critical BIOS update for HP ProBook 450 G10 systems.',
      severity: 'HIGH',
      category: 'Critical Updates',
      vendor: 'HP',
      product: 'ProBook 450 G10',
      os: 'Windows',
      platform: 'Windows',
      architecture: '64 BIT',
      releaseDate: new Date('2024-01-18'),
      rebootRequired: true,
      testStatus: 'untested',
      approvalStatus: 'pending',
      bulletinId: 'HPSBHF03919',
      kbNumber: 'HP-SP148780',
      endpoints: 22,
      tags: ['Firmware', 'BIOS'],
      cveNumbers: ['CVE-2023-45229', 'CVE-2023-45230'],
      operationalStatusSince: new Date('2024-01-20'),
    },
  ];

  for (const patch of patches) {
    await prisma.patch.upsert({
      where: { patchId: patch.patchId },
      update: {},
      create: patch,
    });
  }
  console.log('Created', patches.length, 'sample patches');

  // ============================================
  // Computer Groups
  // ============================================

  const computerGroups = [
    { name: 'Windows Workstations', description: 'All Windows desktop and laptop endpoints', endpoints: [], endpointCount: 0 },
    { name: 'Linux Servers', description: 'Production and staging Linux servers', endpoints: [], endpointCount: 0 },
    { name: 'macOS Devices', description: 'All macOS endpoints (MacBook, iMac)', endpoints: [], endpointCount: 0 },
    { name: 'Engineering', description: 'Engineering department endpoints', endpoints: [], endpointCount: 0 },
    { name: 'Finance', description: 'Finance department endpoints', endpoints: [], endpointCount: 0 },
    { name: 'HR', description: 'Human Resources department endpoints', endpoints: [], endpointCount: 0 },
    { name: 'Production Servers', description: 'Critical production infrastructure', endpoints: [], endpointCount: 0 },
    { name: 'Test Environment', description: 'QA and test lab machines', endpoints: [], endpointCount: 0 },
  ];

  for (const group of computerGroups) {
    const existing = await prisma.computerGroup.findFirst({ where: { name: group.name } });
    if (!existing) {
      await prisma.computerGroup.create({ data: group });
    }
  }
  console.log('Created', computerGroups.length, 'computer groups');

  // ============================================
  // Deployment Policies
  // ============================================

  const deploymentPolicies = [
    { policyId: 'POL-0001', name: 'Immediate Critical', description: 'Deploy critical patches immediately without delay', type: 'INSTANT', supportedModule: 'All', relatedType: 'Critical' },
    { policyId: 'POL-0002', name: 'Scheduled Maintenance Window', description: 'Deploy during weekly maintenance window (Sunday 2-6 AM)', type: 'SCHEDULE', supportedModule: 'Patch', relatedType: 'No Relation' },
    { policyId: 'POL-0003', name: 'Test First Policy', description: 'Deploy to test group first, then production after 48h', type: 'SCHEDULE', supportedModule: 'All', relatedType: 'Important' },
    { policyId: 'POL-0004', name: 'Security Updates Only', description: 'Automatic deployment for security-classified patches', type: 'INSTANT', supportedModule: 'Security', relatedType: 'Critical' },
    { policyId: 'POL-0005', name: 'Monthly Rollup', description: 'Deploy cumulative updates on the second Tuesday of each month', type: 'SCHEDULE', supportedModule: 'Patch', relatedType: 'Optional' },
  ];

  for (const policy of deploymentPolicies) {
    await prisma.deploymentPolicy.upsert({
      where: { policyId: policy.policyId },
      update: {},
      create: policy,
    });
  }
  console.log('Created', deploymentPolicies.length, 'deployment policies');

  // ============================================
  // Settings
  // ============================================

  // Create default settings
  const defaultSettings = [
    {
      key: 'session.absolute_timeout_hours',
      value: 8,
      category: 'session',
    },
    {
      key: 'session.idle_timeout_minutes',
      value: 30,
      category: 'session',
    },
    {
      key: 'agent.heartbeat_interval_seconds',
      value: 60,
      category: 'agent',
    },
    {
      key: 'agent.command_poll_seconds',
      value: 30,
      category: 'agent',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('Created', defaultSettings.length, 'default settings');

  // Create alert configurations
  const alertConfigs = [
    {
      type: 'email',
      enabled: true,
      config: { recipients: ['admin@patchiq.io'], severity: ['CRITICAL', 'HIGH'] },
    },
    {
      type: 'slack',
      enabled: false,
      config: { webhookUrl: '', channel: '#security-alerts' },
    },
  ];

  for (const alert of alertConfigs) {
    const existing = await prisma.alertConfig.findFirst({ where: { type: alert.type } });
    if (!existing) {
      await prisma.alertConfig.create({ data: alert });
    }
  }
  console.log('Created', alertConfigs.length, 'alert configurations');

  // ============================================
  // Patch Repository Sources (Whitelist)
  // ============================================

  console.log('\nSeeding patch repository whitelist sources...');

  let patchSourcesCreated = 0;
  for (const source of WHITELIST_SOURCES) {
    try {
      await prisma.patchSource.upsert({
        where: {
          vendor_name: {
            vendor: source.vendor,
            name: source.name,
          },
        },
        update: {
          category: source.category,
          platform: source.platform,
          baseUrl: source.baseUrl,
          urlPatterns: source.urlPatterns || [],
          priority: source.priority || 50,
          isEnabled: source.isEnabled ?? true,
          requiresAuth: source.requiresAuth || false,
          authType: source.authType,
          authConfig: source.authConfig,
          syncSchedule: source.syncSchedule,
          metadata: source.metadata,
        },
        create: {
          name: source.name,
          vendor: source.vendor,
          category: source.category,
          platform: source.platform,
          baseUrl: source.baseUrl,
          urlPatterns: source.urlPatterns || [],
          priority: source.priority || 50,
          isEnabled: source.isEnabled ?? true,
          requiresAuth: source.requiresAuth || false,
          authType: source.authType,
          authConfig: source.authConfig,
          syncSchedule: source.syncSchedule,
          metadata: source.metadata,
        },
      });
      patchSourcesCreated++;
    } catch (error) {
      console.error(`Failed to seed patch source "${source.name}":`, error);
    }
  }
  console.log('Created/Updated', patchSourcesCreated, 'patch repository sources');

  // ============================================
  // CPE Mappings (Vulnerability Correlation)
  // ============================================

  console.log('\nSeeding CPE mappings for vulnerability correlation...');
  const cpeMappingsCreated = await seedCpeMappings(prisma);
  console.log('Created/Updated', cpeMappingsCreated, 'CPE mappings');

  // ============================================
  // Agent Versions
  // ============================================

  console.log('\nSeeding agent versions...');
  const agentVersions = [
    { platform: 'Windows', architecture: 'amd64', version: '1.0.0' },
    { platform: 'Linux', architecture: 'amd64', version: '1.0.0' },
    { platform: 'Linux', architecture: 'arm64', version: '1.0.0' },
    { platform: 'Mac', architecture: 'amd64', version: '1.0.0' },
    { platform: 'Mac', architecture: 'arm64', version: '1.0.0' },
  ];

  for (const av of agentVersions) {
    await prisma.agentVersion.upsert({
      where: {
        platform_architecture_version: {
          platform: av.platform,
          architecture: av.architecture,
          version: av.version,
        },
      },
      update: {},
      create: {
        platform: av.platform,
        architecture: av.architecture,
        version: av.version,
        lastUpdatedAt: new Date(),
      },
    });
  }
  console.log('Created', agentVersions.length, 'agent versions');

  // Asset alerts are now created by the real-time alert evaluation engine
  // (see backend/src/modules/alerts/alert-evaluation.service.ts)

  console.log('\nDatabase seed completed successfully!');
  console.log('\n=== Login Credentials ===');
  console.log('Admin: admin@patchiq.io / admin123');
  console.log('Demo:  demo@patchiq.io / demo123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
