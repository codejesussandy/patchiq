/**
 * Add missing SoftwarePackage records for Linux and macOS
 * so we have 5 apps × 3 versions for each OS.
 *
 * After running this, run build-hub-bundles.ts to download installers and create bundles.
 *
 * Usage: cd backend && npx tsx src/db/prisma/seeds/add-missing-packages.ts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface PackageDef {
  name: string;
  displayName: string;
  version: string;
  vendor: string;
  category: string;
  platform: string;
  architecture: string;
  fileName: string;
  downloadUrl: string;
  installArgs: string | null;
  description: string;
  cpeVendor: string;
  cpeProduct: string;
}

// ── Additional Linux packages ──────────────────────────────────────────────
// Need: Go +2 versions, VSCode +2 versions, Terraform (new, 3 versions), Consul (new, 3 versions)
const LINUX_ADDITIONS: PackageDef[] = [
  // Go — additional versions
  {
    name: 'golang', displayName: 'Go', version: '1.21.13', vendor: 'Google',
    category: 'runtime', platform: 'linux', architecture: 'x64',
    fileName: 'go1.21.13.linux-amd64.tar.gz',
    downloadUrl: 'https://go.dev/dl/go1.21.13.linux-amd64.tar.gz',
    installArgs: null, description: 'Go programming language',
    cpeVendor: 'golang', cpeProduct: 'go',
  },
  {
    name: 'golang', displayName: 'Go', version: '1.22.10', vendor: 'Google',
    category: 'runtime', platform: 'linux', architecture: 'x64',
    fileName: 'go1.22.10.linux-amd64.tar.gz',
    downloadUrl: 'https://go.dev/dl/go1.22.10.linux-amd64.tar.gz',
    installArgs: null, description: 'Go programming language',
    cpeVendor: 'golang', cpeProduct: 'go',
  },
  // VSCode — additional versions
  {
    name: 'vscode', displayName: 'Visual Studio Code', version: '1.94.2', vendor: 'Microsoft',
    category: 'developer-tools', platform: 'linux', architecture: 'x64',
    fileName: 'code_1.94.2_amd64.deb',
    downloadUrl: 'https://update.code.visualstudio.com/1.94.2/linux-deb-x64/stable',
    installArgs: null, description: 'Code editor by Microsoft',
    cpeVendor: 'microsoft', cpeProduct: 'visual_studio_code',
  },
  {
    name: 'vscode', displayName: 'Visual Studio Code', version: '1.95.3', vendor: 'Microsoft',
    category: 'developer-tools', platform: 'linux', architecture: 'x64',
    fileName: 'code_1.95.3_amd64.deb',
    downloadUrl: 'https://update.code.visualstudio.com/1.95.3/linux-deb-x64/stable',
    installArgs: null, description: 'Code editor by Microsoft',
    cpeVendor: 'microsoft', cpeProduct: 'visual_studio_code',
  },
  // Terraform — new app, 3 versions (zip containing single binary)
  {
    name: 'terraform', displayName: 'Terraform', version: '1.8.5', vendor: 'HashiCorp',
    category: 'developer-tools', platform: 'linux', architecture: 'x64',
    fileName: 'terraform_1.8.5_linux_amd64.zip',
    downloadUrl: 'https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip',
    installArgs: null, description: 'Infrastructure as code tool',
    cpeVendor: 'hashicorp', cpeProduct: 'terraform',
  },
  {
    name: 'terraform', displayName: 'Terraform', version: '1.9.8', vendor: 'HashiCorp',
    category: 'developer-tools', platform: 'linux', architecture: 'x64',
    fileName: 'terraform_1.9.8_linux_amd64.zip',
    downloadUrl: 'https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip',
    installArgs: null, description: 'Infrastructure as code tool',
    cpeVendor: 'hashicorp', cpeProduct: 'terraform',
  },
  {
    name: 'terraform', displayName: 'Terraform', version: '1.10.3', vendor: 'HashiCorp',
    category: 'developer-tools', platform: 'linux', architecture: 'x64',
    fileName: 'terraform_1.10.3_linux_amd64.zip',
    downloadUrl: 'https://releases.hashicorp.com/terraform/1.10.3/terraform_1.10.3_linux_amd64.zip',
    installArgs: null, description: 'Infrastructure as code tool',
    cpeVendor: 'hashicorp', cpeProduct: 'terraform',
  },
  // Vault — new app, 3 versions (zip containing single binary)
  {
    name: 'vault', displayName: 'Vault', version: '1.15.6', vendor: 'HashiCorp',
    category: 'security', platform: 'linux', architecture: 'x64',
    fileName: 'vault_1.15.6_linux_amd64.zip',
    downloadUrl: 'https://releases.hashicorp.com/vault/1.15.6/vault_1.15.6_linux_amd64.zip',
    installArgs: null, description: 'Secrets management tool',
    cpeVendor: 'hashicorp', cpeProduct: 'vault',
  },
  {
    name: 'vault', displayName: 'Vault', version: '1.16.3', vendor: 'HashiCorp',
    category: 'security', platform: 'linux', architecture: 'x64',
    fileName: 'vault_1.16.3_linux_amd64.zip',
    downloadUrl: 'https://releases.hashicorp.com/vault/1.16.3/vault_1.16.3_linux_amd64.zip',
    installArgs: null, description: 'Secrets management tool',
    cpeVendor: 'hashicorp', cpeProduct: 'vault',
  },
  {
    name: 'vault', displayName: 'Vault', version: '1.17.6', vendor: 'HashiCorp',
    category: 'security', platform: 'linux', architecture: 'x64',
    fileName: 'vault_1.17.6_linux_amd64.zip',
    downloadUrl: 'https://releases.hashicorp.com/vault/1.17.6/vault_1.17.6_linux_amd64.zip',
    installArgs: null, description: 'Secrets management tool',
    cpeVendor: 'hashicorp', cpeProduct: 'vault',
  },
];

// ── Additional macOS packages ──────────────────────────────────────────────
// Need: Firefox +2 versions, GIMP +2 versions, Terraform (new, 3 versions)
const MACOS_ADDITIONS: PackageDef[] = [
  // Firefox — additional versions
  {
    name: 'firefox', displayName: 'Mozilla Firefox', version: '132.0', vendor: 'Mozilla',
    category: 'browser', platform: 'macos', architecture: 'universal',
    fileName: 'Firefox 132.0.dmg',
    downloadUrl: 'https://ftp.mozilla.org/pub/firefox/releases/132.0/mac/en-US/Firefox%20132.0.dmg',
    installArgs: null, description: 'Web browser by Mozilla',
    cpeVendor: 'mozilla', cpeProduct: 'firefox',
  },
  {
    name: 'firefox', displayName: 'Mozilla Firefox', version: '133.0', vendor: 'Mozilla',
    category: 'browser', platform: 'macos', architecture: 'universal',
    fileName: 'Firefox 133.0.dmg',
    downloadUrl: 'https://ftp.mozilla.org/pub/firefox/releases/133.0/mac/en-US/Firefox%20133.0.dmg',
    installArgs: null, description: 'Web browser by Mozilla',
    cpeVendor: 'mozilla', cpeProduct: 'firefox',
  },
  // GIMP — additional versions
  {
    name: 'gimp', displayName: 'GIMP', version: '2.10.36', vendor: 'GIMP Team',
    category: 'utility', platform: 'macos', architecture: 'x86_64',
    fileName: 'gimp-2.10.36-x86_64.dmg',
    downloadUrl: 'https://download.gimp.org/gimp/v2.10/osx/gimp-2.10.36-x86_64.dmg',
    installArgs: null, description: 'GNU Image Manipulation Program',
    cpeVendor: 'gimp', cpeProduct: 'gimp',
  },
  {
    name: 'gimp', displayName: 'GIMP', version: '2.10.34', vendor: 'GIMP Team',
    category: 'utility', platform: 'macos', architecture: 'x86_64',
    fileName: 'gimp-2.10.34-x86_64.dmg',
    downloadUrl: 'https://download.gimp.org/gimp/v2.10/osx/gimp-2.10.34-x86_64.dmg',
    installArgs: null, description: 'GNU Image Manipulation Program',
    cpeVendor: 'gimp', cpeProduct: 'gimp',
  },
  // Terraform macOS — new app, 3 versions
  {
    name: 'terraform', displayName: 'Terraform', version: '1.8.5', vendor: 'HashiCorp',
    category: 'developer-tools', platform: 'macos', architecture: 'arm64',
    fileName: 'terraform_1.8.5_darwin_arm64.zip',
    downloadUrl: 'https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_darwin_arm64.zip',
    installArgs: null, description: 'Infrastructure as code tool',
    cpeVendor: 'hashicorp', cpeProduct: 'terraform',
  },
  {
    name: 'terraform', displayName: 'Terraform', version: '1.9.8', vendor: 'HashiCorp',
    category: 'developer-tools', platform: 'macos', architecture: 'arm64',
    fileName: 'terraform_1.9.8_darwin_arm64.zip',
    downloadUrl: 'https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_darwin_arm64.zip',
    installArgs: null, description: 'Infrastructure as code tool',
    cpeVendor: 'hashicorp', cpeProduct: 'terraform',
  },
  {
    name: 'terraform', displayName: 'Terraform', version: '1.10.3', vendor: 'HashiCorp',
    category: 'developer-tools', platform: 'macos', architecture: 'arm64',
    fileName: 'terraform_1.10.3_darwin_arm64.zip',
    downloadUrl: 'https://releases.hashicorp.com/terraform/1.10.3/terraform_1.10.3_darwin_arm64.zip',
    installArgs: null, description: 'Infrastructure as code tool',
    cpeVendor: 'hashicorp', cpeProduct: 'terraform',
  },
];

async function main() {
  console.log('=== Adding Missing SoftwarePackage Records ===\n');

  const allPackages = [...LINUX_ADDITIONS, ...MACOS_ADDITIONS];
  let created = 0;
  let skipped = 0;

  for (const pkg of allPackages) {
    // Check if already exists
    const existing = await prisma.softwarePackage.findFirst({
      where: { name: pkg.name, version: pkg.version, platform: pkg.platform },
    });

    if (existing) {
      console.log(`  SKIP: ${pkg.displayName} ${pkg.version} (${pkg.platform}) — already exists`);
      skipped++;
      continue;
    }

    const count = await prisma.softwarePackage.count();
    const packageId = `PKG-${pkg.platform.toUpperCase().slice(0, 3)}-${String(count + 1).padStart(4, '0')}`;

    await prisma.softwarePackage.create({
      data: {
        id: uuidv4(),
        packageId,
        name: pkg.name,
        displayName: pkg.displayName,
        version: pkg.version,
        vendor: pkg.vendor,
        category: pkg.category,
        platform: pkg.platform,
        architecture: pkg.architecture,
        installSource: 'bundle',
        installArgs: pkg.installArgs,
        silentInstall: true,
        requiresReboot: false,
        requiresRoot: pkg.platform !== 'windows',
        fileName: pkg.fileName,
        downloadUrl: pkg.downloadUrl,
        description: pkg.description,
        supportsRollback: false,
        isActive: true,
        isVerified: false,
        scriptsIncluded: false,
        cpeVendor: pkg.cpeVendor,
        cpeProduct: pkg.cpeProduct,
      },
    });

    console.log(`  CREATE: ${packageId} — ${pkg.displayName} ${pkg.version} (${pkg.platform})`);
    created++;
  }

  console.log(`\n=== Done: ${created} created, ${skipped} skipped ===`);
  console.log('\nNext: Run build-hub-bundles.ts to download installers and create bundles');
  console.log('  npx tsx src/db/prisma/seeds/build-hub-bundles.ts\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
