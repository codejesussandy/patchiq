/**
 * Software Catalog Populator Service
 *
 * Fetches popular software from various sources (Chocolatey, Homebrew, npm, PyPI)
 * and populates the database with a master software catalog.
 * This catalog is used for:
 * - Matching agent-reported software
 * - Correlating patches with installed software
 * - Vulnerability scanning
 */

import axios from 'axios';
import { prisma } from '../../db/client';

interface SoftwareCatalogEntry {
  name: string;
  displayName: string;
  vendor: string;
  version: string;
  platform: string; // windows, macos, linux
  category?: string;
  source: string; // chocolatey, homebrew, npm, pypi
  downloadUrl?: string;
  homepage?: string;
  description?: string;
}

export class SoftwareCatalogPopulatorService {
  /**
   * Populate software catalog from Chocolatey (Windows)
   */
  async populateFromChocolatey(limit = 100): Promise<number> {
    console.log(`Fetching top ${limit} packages from Chocolatey...`);

    try {
      // Chocolatey OData API - get most popular packages
      const response = await axios.get(
        `https://community.chocolatey.org/api/v2/Packages()`,
        {
          params: {
            $filter: "IsLatestVersion eq true and IsPrerelease eq false",
            $orderby: 'DownloadCount desc',
            $top: limit,
            $select: 'Id,Version,Title,Authors,Description,ProjectUrl,DownloadCount',
          },
          headers: { Accept: 'application/json' },
          timeout: 30000,
        }
      );

      const packages = response.data.value || [];
      console.log(`Found ${packages.length} Chocolatey packages`);

      let created = 0;
      for (const pkg of packages) {
        try {
          await prisma.softwarePackage.upsert({
            where: { packageId: `CHOCO-${pkg.Id}` },
            update: {
              version: pkg.Version,
              displayName: pkg.Title || pkg.Id,
            },
            create: {
              packageId: `CHOCO-${pkg.Id}`,
              name: pkg.Id.toLowerCase(),
              displayName: pkg.Title || pkg.Id,
              version: pkg.Version,
              vendor: pkg.Authors || 'Unknown',
              platform: 'windows',
              category: this.categorizePackage(pkg.Id, pkg.Title),
              installSource: 'chocolatey',
              installCommand: `choco install ${pkg.Id} -y`,
              description: pkg.Description?.substring(0, 500),
              downloadUrl: pkg.ProjectUrl,
              tags: ['chocolatey', `downloads:${pkg.DownloadCount}`],
            },
          });
          created++;
        } catch (err) {
          console.error(`Failed to insert ${pkg.Id}:`, err);
        }
      }

      console.log(`✓ Created/updated ${created} Chocolatey packages`);
      return created;
    } catch (error: any) {
      console.error('Chocolatey fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Populate software catalog from Homebrew (macOS)
   */
  async populateFromHomebrew(limit = 100): Promise<number> {
    console.log(`Fetching packages from Homebrew...`);

    try {
      // Homebrew Formulae API
      const [formulaeRes, casksRes] = await Promise.all([
        axios.get('https://formulae.brew.sh/api/formula.json', { timeout: 30000 }),
        axios.get('https://formulae.brew.sh/api/cask.json', { timeout: 30000 }),
      ]);

      // Get top formulae by analytics
      const formulae = (formulaeRes.data || [])
        .sort((a: any, b: any) => (b.analytics?.install['30d'] || 0) - (a.analytics?.install['30d'] || 0))
        .slice(0, limit);

      // Get top casks
      const casks = (casksRes.data || [])
        .sort((a: any, b: any) => (b.analytics?.install['30d'] || 0) - (a.analytics?.install['30d'] || 0))
        .slice(0, limit);

      console.log(`Found ${formulae.length} formulae, ${casks.length} casks`);

      let created = 0;

      // Process formulae (command-line tools)
      for (const formula of formulae) {
        try {
          await prisma.softwarePackage.upsert({
            where: { packageId: `BREW-${formula.name}` },
            update: {
              version: formula.versions?.stable || 'latest',
              displayName: formula.full_name || formula.name,
            },
            create: {
              packageId: `BREW-${formula.name}`,
              name: formula.name,
              displayName: formula.full_name || formula.name,
              version: formula.versions?.stable || 'latest',
              vendor: 'Homebrew',
              platform: 'macos',
              category: 'cli-tool',
              installSource: 'brew',
              installCommand: `brew install ${formula.name}`,
              description: formula.desc?.substring(0, 500),
              downloadUrl: formula.homepage,
              tags: ['homebrew', 'formula', formula.license || 'unknown'],
            },
          });
          created++;
        } catch (err) {
          console.error(`Failed to insert formula ${formula.name}:`, err);
        }
      }

      // Process casks (GUI applications)
      for (const cask of casks) {
        try {
          await prisma.softwarePackage.upsert({
            where: { packageId: `BREW-CASK-${cask.token}` },
            update: {
              version: cask.version || 'latest',
              displayName: cask.name?.[0] || cask.token,
            },
            create: {
              packageId: `BREW-CASK-${cask.token}`,
              name: cask.token,
              displayName: cask.name?.[0] || cask.token,
              version: cask.version || 'latest',
              vendor: 'Homebrew Cask',
              platform: 'macos',
              category: this.categorizePackage(cask.token, cask.name?.[0]),
              installSource: 'brew',
              installCommand: `brew install --cask ${cask.token}`,
              description: cask.desc?.substring(0, 500),
              downloadUrl: cask.homepage,
              tags: ['homebrew', 'cask'],
            },
          });
          created++;
        } catch (err) {
          console.error(`Failed to insert cask ${cask.token}:`, err);
        }
      }

      console.log(`✓ Created/updated ${created} Homebrew packages`);
      return created;
    } catch (error: any) {
      console.error('Homebrew fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Populate software catalog from npm (Node.js packages)
   */
  async populateFromNpm(packages: string[]): Promise<number> {
    console.log(`Fetching ${packages.length} packages from npm...`);

    let created = 0;

    for (const pkgName of packages) {
      try {
        const response = await axios.get(
          `https://registry.npmjs.org/${pkgName}`,
          { timeout: 10000 }
        );

        const pkg = response.data;
        const latestVersion = pkg['dist-tags']?.latest || Object.keys(pkg.versions || {}).pop();

        if (!latestVersion) continue;

        await prisma.softwarePackage.upsert({
          where: { packageId: `NPM-${pkgName}` },
          update: {
            version: latestVersion,
            displayName: pkg.name,
          },
          create: {
            packageId: `NPM-${pkgName}`,
            name: pkg.name,
            displayName: pkg.name,
            version: latestVersion,
            vendor: pkg.author?.name || 'npm',
            platform: 'cross-platform',
            category: 'npm-package',
            installSource: 'npm',
            installCommand: `npm install -g ${pkg.name}`,
            description: pkg.description?.substring(0, 500),
            downloadUrl: pkg.homepage || `https://www.npmjs.com/package/${pkg.name}`,
            tags: ['npm', pkg.license || 'unknown'],
          },
        });
        created++;
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error(`Failed to fetch npm package ${pkgName}:`, err.message);
        }
      }
    }

    console.log(`✓ Created/updated ${created} npm packages`);
    return created;
  }

  /**
   * Populate software catalog from PyPI (Python packages)
   */
  async populateFromPyPI(packages: string[]): Promise<number> {
    console.log(`Fetching ${packages.length} packages from PyPI...`);

    let created = 0;

    for (const pkgName of packages) {
      try {
        const response = await axios.get(
          `https://pypi.org/pypi/${pkgName}/json`,
          { timeout: 10000 }
        );

        const pkg = response.data;
        const info = pkg.info;

        await prisma.softwarePackage.upsert({
          where: { packageId: `PYPI-${pkgName}` },
          update: {
            version: info.version,
            displayName: info.name,
          },
          create: {
            packageId: `PYPI-${pkgName}`,
            name: info.name.toLowerCase(),
            displayName: info.name,
            version: info.version,
            vendor: info.author || 'PyPI',
            platform: 'cross-platform',
            category: 'python-package',
            installSource: 'pip',
            installCommand: `pip install ${info.name}`,
            description: info.summary?.substring(0, 500),
            downloadUrl: info.home_page || info.project_url,
            tags: ['pypi', info.license || 'unknown'],
          },
        });
        created++;
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error(`Failed to fetch PyPI package ${pkgName}:`, err.message);
        }
      }
    }

    console.log(`✓ Created/updated ${created} PyPI packages`);
    return created;
  }

  /**
   * Populate all sources
   */
  async populateAll(): Promise<{ total: number; bySource: Record<string, number> }> {
    console.log('=== Starting Software Catalog Population ===\n');

    const results: Record<string, number> = {};

    // 1. Chocolatey (Windows) - Top 100 popular packages
    try {
      results.chocolatey = await this.populateFromChocolatey(100);
    } catch (err) {
      console.error('Chocolatey population failed:', err);
      results.chocolatey = 0;
    }

    // 2. Homebrew (macOS) - Top 50 formulae + 50 casks
    try {
      results.homebrew = await this.populateFromHomebrew(50);
    } catch (err) {
      console.error('Homebrew population failed:', err);
      results.homebrew = 0;
    }

    // 3. npm (Node.js) - Popular packages
    const popularNpmPackages = [
      'node', 'npm', 'typescript', 'webpack', 'eslint', 'prettier',
      'react', 'vue', 'angular', 'express', 'next', 'vite',
      'jest', 'mocha', 'babel', 'nodemon', 'pm2', 'yarn',
    ];
    try {
      results.npm = await this.populateFromNpm(popularNpmPackages);
    } catch (err) {
      console.error('npm population failed:', err);
      results.npm = 0;
    }

    // 4. PyPI (Python) - Popular packages
    const popularPyPIPackages = [
      'pip', 'setuptools', 'wheel', 'requests', 'numpy', 'pandas',
      'django', 'flask', 'pytest', 'black', 'pylint', 'mypy',
      'sqlalchemy', 'beautifulsoup4', 'pillow', 'matplotlib',
    ];
    try {
      results.pypi = await this.populateFromPyPI(popularPyPIPackages);
    } catch (err) {
      console.error('PyPI population failed:', err);
      results.pypi = 0;
    }

    const total = Object.values(results).reduce((sum, count) => sum + count, 0);

    console.log('\n=== Software Catalog Population Complete ===');
    console.log(`Total packages: ${total}`);
    console.log('By source:', results);

    return { total, bySource: results };
  }

  /**
   * Helper: Categorize package by name/title
   */
  private categorizePackage(name: string, title?: string): string {
    const text = `${name} ${title || ''}`.toLowerCase();

    if (/(chrome|firefox|edge|brave|opera|safari|browser)/i.test(text)) return 'browser';
    if (/(vscode|visual studio|intellij|pycharm|sublime|atom|editor)/i.test(text)) return 'ide';
    if (/(docker|kubernetes|vagrant|virtualbox|vmware)/i.test(text)) return 'devops';
    if (/(git|mercurial|svn|subversion)/i.test(text)) return 'vcs';
    if (/(node|python|java|go|rust|ruby|php)/i.test(text)) return 'runtime';
    if (/(slack|zoom|teams|discord|skype)/i.test(text)) return 'communication';
    if (/(7zip|winrar|winzip|archive|compress)/i.test(text)) return 'utility';
    if (/(office|word|excel|powerpoint|libreoffice)/i.test(text)) return 'productivity';
    if (/(vlc|spotify|itunes|media|player)/i.test(text)) return 'media';
    if (/(antivirus|malware|firewall|security)/i.test(text)) return 'security';

    return 'general';
  }
}

export const softwareCatalogPopulatorService = new SoftwareCatalogPopulatorService();
