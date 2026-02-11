import type { SoftwareTemplate } from './catalog';

export interface VendorFetchResult {
  latestVersion: string;
  downloadUrl: string;
  releaseDate?: string;
  fileName?: string;
  architecture?: string;
  os?: string;
  checksumSha256?: string;
  releaseNotes?: string;
  fileSize?: number;
}

type ParserFn = (
  template: SoftwareTemplate,
  os: string,
  arch: string
) => Promise<VendorFetchResult>;

// Helper to map our OS names to common platform identifiers
function mapOs(os: string): { win: boolean; mac: boolean; linux: boolean } {
  const lower = os.toLowerCase();
  return {
    win: lower === 'windows',
    mac: lower === 'macos',
    linux: lower === 'linux' || lower === 'ubuntu',
  };
}

function mapArch(arch: string): { x64: boolean; arm64: boolean } {
  const lower = (arch || 'x64').toLowerCase();
  return {
    x64: lower === 'x64' || lower === 'x86_64' || lower === 'amd64',
    arm64: lower === 'arm64' || lower === 'aarch64',
  };
}

async function fetchJson(url: string): Promise<any> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'PatchIQ/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  return resp.json();
}

async function fetchText(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'PatchIQ/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  return resp.text();
}

// ============================================
// Parser: Node.js
// ============================================
const nodejsParser: ParserFn = async (_tmpl, os, arch) => {
  const data = await fetchJson('https://nodejs.org/dist/index.json');
  // Find latest LTS version
  const lts = data.find((r: any) => r.lts !== false);
  if (!lts) throw new Error('No LTS version found');

  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);
  const version = lts.version; // e.g. "v22.14.0"
  const ver = version.replace(/^v/, '');

  let fileName: string;
  let downloadUrl: string;
  if (win) {
    fileName = arm64 ? `node-${version}-arm64.msi` : `node-${version}-x64.msi`;
    downloadUrl = `https://nodejs.org/dist/${version}/${fileName}`;
  } else if (mac) {
    fileName = arm64 ? `node-${version}-darwin-arm64.tar.gz` : `node-${version}-darwin-x64.tar.gz`;
    downloadUrl = `https://nodejs.org/dist/${version}/${fileName}`;
  } else {
    fileName = arm64 ? `node-${version}-linux-arm64.tar.xz` : `node-${version}-linux-x64.tar.xz`;
    downloadUrl = `https://nodejs.org/dist/${version}/${fileName}`;
  }

  return {
    latestVersion: ver,
    downloadUrl,
    fileName,
    releaseDate: lts.date,
    os,
    architecture: arm64 ? 'arm64' : 'x64',
  };
};

// ============================================
// Parser: Go
// ============================================
const golangParser: ParserFn = async (_tmpl, os, arch) => {
  const data = await fetchJson('https://go.dev/dl/?mode=json');
  const latest = data[0];
  if (!latest) throw new Error('No Go release found');

  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);
  const version = latest.version.replace(/^go/, ''); // "go1.23.5" → "1.23.5"

  const osKey = win ? 'windows' : mac ? 'darwin' : 'linux';
  const archKey = arm64 ? 'arm64' : 'amd64';
  const ext = win ? '.msi' : '.tar.gz';
  const fileName = `${latest.version}.${osKey}-${archKey}${ext}`;

  // Find matching file in release
  const file = latest.files?.find((f: any) => f.filename === fileName);

  return {
    latestVersion: version,
    downloadUrl: `https://go.dev/dl/${fileName}`,
    fileName,
    checksumSha256: file?.sha256,
    fileSize: file?.size,
    os,
    architecture: archKey,
  };
};

// ============================================
// Parser: Python (directory index)
// ============================================
const pythonParser: ParserFn = async (_tmpl, os, arch) => {
  const html = await fetchText('https://www.python.org/ftp/python/');
  const versions = [...html.matchAll(/href="(\d+\.\d+\.\d+)\/"/g)]
    .map((m) => m[1])
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return pb[i] - pa[i];
      }
      return 0;
    });

  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  // Find highest version that has an actual installer
  for (const version of versions) {
    let fileName: string;
    if (win) {
      fileName = arm64 ? `python-${version}-arm64.exe` : `python-${version}-amd64.exe`;
    } else if (mac) {
      fileName = `python-${version}-macos11.pkg`;
    } else {
      fileName = `Python-${version}.tar.xz`;
    }
    const url = `https://www.python.org/ftp/python/${version}/${fileName}`;
    try {
      const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        return { latestVersion: version, downloadUrl: url, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
      }
    } catch { /* try next version */ }
  }

  throw new Error('No Python version with installer found');
};

// ============================================
// Parser: Eclipse Temurin (Adoptium REST API)
// ============================================
const temurinParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);
  const osKey = win ? 'windows' : mac ? 'mac' : 'linux';
  const archKey = arm64 ? 'aarch64' : 'x64';

  const data = await fetchJson(
    `https://api.adoptium.net/v3/assets/latest/21/hotspot?os=${osKey}&architecture=${archKey}&image_type=jdk`
  );

  if (!data || data.length === 0) throw new Error('No Temurin release found');

  const release = data[0];
  const binary = release.binary;
  const pkg = binary?.package;

  return {
    latestVersion: release.version?.semver || release.release_name,
    downloadUrl: pkg?.link || '',
    fileName: pkg?.name,
    checksumSha256: pkg?.checksum,
    fileSize: pkg?.size,
    releaseDate: binary?.updated_at?.split('T')[0],
    os,
    architecture: archKey,
  };
};

// ============================================
// Parser: 7-Zip (HTML scrape)
// ============================================
const sevenZipParser: ParserFn = async (_tmpl, os, arch) => {
  const html = await fetchText('https://www.7-zip.org/download.html');
  // Extract version from page
  const versionMatch = html.match(/Download 7-Zip (\d+\.\d+)/);
  const version = versionMatch?.[1];
  if (!version) throw new Error('Could not parse 7-Zip version');

  const { win } = mapOs(os);
  const { arm64 } = mapArch(arch);
  const versionCompact = version.replace('.', '');

  let fileName: string;
  let downloadUrl: string;
  if (win) {
    fileName = arm64 ? `7z${versionCompact}-arm64.exe` : `7z${versionCompact}-x64.exe`;
    downloadUrl = `https://www.7-zip.org/a/${fileName}`;
  } else {
    fileName = `7z${versionCompact}-linux-x64.tar.xz`;
    downloadUrl = `https://www.7-zip.org/a/${fileName}`;
  }

  return {
    latestVersion: version,
    downloadUrl,
    fileName,
    os,
    architecture: arm64 ? 'arm64' : 'x64',
  };
};

// ============================================
// Parser: GitHub Releases (reusable)
// ============================================
const githubReleasesParser: ParserFn = async (tmpl, os, arch) => {
  const data = await fetchJson(tmpl.apiUrl);
  const version = (data.tag_name || data.name || '').replace(/^v/, '');
  if (!version) throw new Error('No version found in GitHub release');

  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  // Find matching asset
  const assets: any[] = data.assets || [];
  let asset: any = null;

  if (win) {
    const archPattern = arm64 ? /arm64/i : /x64|64-bit|amd64/i;
    asset = assets.find(
      (a: any) => /\.exe$/i.test(a.name) && archPattern.test(a.name)
    ) || assets.find((a: any) => /\.exe$/i.test(a.name));
  } else if (mac) {
    asset = assets.find((a: any) => /\.(dmg|pkg)/i.test(a.name));
  } else {
    asset = assets.find(
      (a: any) => /\.(tar\.gz|AppImage|deb)/i.test(a.name) && /x64|amd64|x86_64/i.test(a.name)
    ) || assets.find((a: any) => /\.(tar\.gz|AppImage|deb)/i.test(a.name));
  }

  return {
    latestVersion: version,
    downloadUrl: asset?.browser_download_url || data.html_url || '',
    fileName: asset?.name,
    fileSize: asset?.size,
    releaseDate: data.published_at?.split('T')[0],
    releaseNotes: (data.body || '').slice(0, 500),
    os,
    architecture: arm64 ? 'arm64' : 'x64',
  };
};

// ============================================
// Parser: VS Code
// ============================================
const vscodeParser: ParserFn = async (_tmpl, os, arch) => {
  const versions = await fetchJson('https://update.code.visualstudio.com/api/releases/stable');
  const version = versions?.[0];
  if (!version) throw new Error('No VS Code version found');

  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  let platform: string;
  if (win) platform = arm64 ? 'win32-arm64' : 'win32-x64';
  else if (mac) platform = arm64 ? 'darwin-arm64' : 'darwin';
  else platform = arm64 ? 'linux-deb-arm64' : 'linux-deb-x64';

  const ext = win ? '.exe' : mac ? '.dmg' : '.deb';
  const downloadUrl = `https://update.code.visualstudio.com/latest/${platform}/stable`;

  return {
    latestVersion: version,
    downloadUrl,
    fileName: `vscode-${version}-${platform}${ext}`,
    os,
    architecture: arm64 ? 'arm64' : 'x64',
  };
};

// ============================================
// Parser: Firefox
// ============================================
const firefoxParser: ParserFn = async (_tmpl, os, arch) => {
  const data = await fetchJson('https://product-details.mozilla.org/1.0/firefox_versions.json');
  const version = data.LATEST_FIREFOX_VERSION;
  if (!version) throw new Error('No Firefox version found');

  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  let osKey: string;
  let ext: string;
  let filePrefix: string;
  if (win) {
    osKey = arm64 ? 'win-aarch64' : 'win64';
    ext = '.exe';
    filePrefix = 'Firefox Setup';
  } else if (mac) {
    osKey = 'mac';
    ext = '.dmg';
    filePrefix = 'Firefox';
  } else {
    osKey = 'linux-x86_64';
    ext = '.tar.xz';
    filePrefix = 'firefox';
  }

  const downloadUrl = `https://download.cdn.mozilla.net/pub/firefox/releases/${version}/${osKey}/en-US/`;
  const fileName = osKey.startsWith('linux') ? `${filePrefix}-${version}${ext}` : `${filePrefix} ${version}${ext}`;

  return {
    latestVersion: version,
    downloadUrl: `${downloadUrl}${encodeURIComponent(fileName)}`,
    fileName,
    os,
    architecture: arm64 ? 'arm64' : 'x64',
  };
};

// ============================================
// Parser: VLC
// ============================================
const vlcParser: ParserFn = async (_tmpl, os, _arch) => {
  // Try multiple mirrors (some are unreachable from Docker)
  let html: string = '';
  let mirrorBaseUrl = '';
  const mirrors = [
    { base: 'https://download.videolan.org/pub/videolan/vlc', list: 'https://download.videolan.org/pub/videolan/vlc/' },
    { base: 'https://mirror.init7.net/videolan/vlc', list: 'https://mirror.init7.net/videolan/vlc/' },
    { base: 'https://ftp.halifax.rwth-aachen.de/videolan/vlc', list: 'https://ftp.halifax.rwth-aachen.de/videolan/vlc/' },
  ];
  for (const m of mirrors) {
    try {
      html = await fetchText(m.list);
      mirrorBaseUrl = m.base;
      break;
    } catch { continue; }
  }
  if (!html) throw new Error('VLC download servers unreachable from this network.');

  // Extract version directories, find latest
  const versions = [...html.matchAll(/href="(\d+\.\d+\.\d+)\/"/g)]
    .map((m) => m[1])
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return pb[i] - pa[i];
      }
      return 0;
    });

  const version = versions[0];
  if (!version) throw new Error('Could not find VLC version');

  const { win, mac } = mapOs(os);
  let fileName: string;
  let downloadUrl: string;
  const mirrorBase = mirrorBaseUrl;

  if (win) {
    fileName = `vlc-${version}-win64.exe`;
    downloadUrl = `${mirrorBase}/${version}/win64/${fileName}`;
  } else if (mac) {
    fileName = `vlc-${version}-arm64.dmg`;
    downloadUrl = `${mirrorBase}/${version}/macosx/${fileName}`;
  } else {
    fileName = `vlc-${version}.tar.xz`;
    downloadUrl = `${mirrorBase}/${version}/${fileName}`;
  }

  return {
    latestVersion: version,
    downloadUrl,
    fileName,
    os,
  };
};

// ============================================
// Parser: Discord (direct download, resolve version from redirect)
// ============================================
const discordParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = 'https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64';
    fileName = 'DiscordSetup.exe';
  } else if (mac) {
    downloadUrl = 'https://discord.com/api/download?platform=osx';
    fileName = 'Discord.dmg';
  } else {
    downloadUrl = 'https://discord.com/api/download?platform=linux&format=deb';
    fileName = 'discord.deb';
  }

  // Try to get version from HEAD redirect
  let version = 'latest';
  try {
    const resp = await fetch(downloadUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const finalUrl = resp.url;
    const vMatch = finalUrl.match(/(\d+\.\d+\.\d+)/);
    if (vMatch) version = vMatch[1];
  } catch { /* use latest */ }

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser: Postman
// ============================================
const postmanParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = arm64
      ? 'https://dl.pstmn.io/download/latest/win64'
      : 'https://dl.pstmn.io/download/latest/win64';
    fileName = 'Postman-win64-Setup.exe';
  } else if (mac) {
    downloadUrl = arm64
      ? 'https://dl.pstmn.io/download/latest/osx_arm64'
      : 'https://dl.pstmn.io/download/latest/osx_64';
    fileName = 'Postman-mac.zip';
  } else {
    downloadUrl = 'https://dl.pstmn.io/download/latest/linux_64';
    fileName = 'Postman-linux-x64.tar.gz';
  }

  // Resolve version from redirect URL
  let version = 'latest';
  try {
    const resp = await fetch(downloadUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const vMatch = resp.url.match(/(\d+\.\d+\.\d+)/);
    if (vMatch) version = vMatch[1];
  } catch { /* use latest */ }

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser: Brave Browser (GitHub releases)
// ============================================
const braveParser: ParserFn = async (_tmpl, os, arch) => {
  const data = await fetchJson('https://api.github.com/repos/brave/brave-browser/releases/latest');
  const version = (data.tag_name || '').replace(/^v/, '');
  if (!version) throw new Error('No Brave version found');

  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);
  const assets: any[] = data.assets || [];

  let asset: any;
  if (win) {
    asset = assets.find((a: any) => /BraveBrowserStandalone.*Setup.*\.exe$/i.test(a.name) && (arm64 ? /arm64/i.test(a.name) : !/arm64/i.test(a.name)));
    if (!asset) asset = assets.find((a: any) => /BraveBrowser.*\.exe$/i.test(a.name));
  } else if (mac) {
    asset = assets.find((a: any) => /\.dmg$/i.test(a.name) && (arm64 ? /arm64/i.test(a.name) : !/arm64/i.test(a.name)));
  } else {
    asset = assets.find((a: any) => /\.deb$/i.test(a.name) && /amd64/i.test(a.name));
  }

  return {
    latestVersion: version,
    downloadUrl: asset?.browser_download_url || '',
    fileName: asset?.name,
    fileSize: asset?.size,
    releaseDate: data.published_at?.split('T')[0],
    os,
    architecture: arm64 ? 'arm64' : 'x64',
  };
};

// ============================================
// Parser: Slack (direct download)
// ============================================
const slackParser: ParserFn = async (_tmpl, os, _arch) => {
  const { win, mac } = mapOs(os);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = 'https://slack.com/ssb/download-win64-msi';
    fileName = 'Slack-Setup.msi';
  } else if (mac) {
    downloadUrl = 'https://slack.com/ssb/download-osx';
    fileName = 'Slack.dmg';
  } else {
    // Linux URL doesn't work via slack.com redirect, so resolve version from Windows URL first
    downloadUrl = 'https://slack.com/ssb/download-linux-deb';
    fileName = 'slack-desktop-amd64.deb';
  }

  let version = 'latest';
  try {
    // Resolve version from Windows redirect (always works)
    const winResp = await fetch('https://slack.com/ssb/download-win64-msi', { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const finalUrl = winResp.url || '';
    const vMatch = finalUrl.match(/(\d+\.\d+\.\d+)/);
    if (vMatch) {
      version = vMatch[1];
      if (win) {
        downloadUrl = finalUrl;
      } else if (mac) {
        // macOS redirect works fine, but use CDN if possible
        const macResp = await fetch(downloadUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
        if (macResp.url.includes('slack-edge.com')) downloadUrl = macResp.url;
      } else {
        // Linux: construct CDN URL directly
        downloadUrl = `https://downloads.slack-edge.com/desktop-releases/linux/x64/${version}/slack-desktop-${version}-amd64.deb`;
        fileName = `slack-desktop-${version}-amd64.deb`;
      }
    }
  } catch { /* use latest */ }

  return { latestVersion: version, downloadUrl, fileName, os };
};

// ============================================
// Parser: Microsoft Teams (direct download)
// ============================================
const teamsParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = arm64
      ? 'https://go.microsoft.com/fwlink/?linkid=2196106&clcid=0x409&culture=en-us&country=us'
      : 'https://go.microsoft.com/fwlink/?linkid=2196060&clcid=0x409&culture=en-us&country=us';
    fileName = 'Teams_windows_x64.msix';
  } else if (mac) {
    downloadUrl = 'https://go.microsoft.com/fwlink/?linkid=2249065';
    fileName = 'MicrosoftTeams.pkg';
  } else {
    downloadUrl = 'https://go.microsoft.com/fwlink/?linkid=2196120';
    fileName = 'teams.deb';
  }

  let version = 'latest';
  try {
    const resp = await fetch(downloadUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const vMatch = resp.url.match(/(\d+\.\d+\.\d+[\.\d]*)/);
    if (vMatch) version = vMatch[1];
  } catch { /* use latest */ }

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser: AnyDesk (direct download)
// ============================================
const anydeskParser: ParserFn = async (_tmpl, os, _arch) => {
  const { win, mac } = mapOs(os);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = 'https://download.anydesk.com/AnyDesk.exe';
    fileName = 'AnyDesk.exe';
  } else if (mac) {
    downloadUrl = 'https://download.anydesk.com/anydesk.dmg';
    fileName = 'AnyDesk.dmg';
  } else {
    downloadUrl = 'https://download.anydesk.com/linux/anydesk_6.3.2-1_amd64.deb';
    fileName = 'anydesk.deb';
  }

  // Try to resolve version from download page
  let version = 'latest';
  try {
    const html = await fetchText('https://anydesk.com/en/downloads/windows');
    const vMatch = html.match(/v\s*(\d+\.\d+\.\d+)/i);
    if (vMatch) version = vMatch[1];
  } catch { /* use latest */ }

  return { latestVersion: version, downloadUrl, fileName, os };
};

// ============================================
// Parser: TeamViewer (direct download)
// ============================================
const teamviewerParser: ParserFn = async (_tmpl, os, _arch) => {
  const { win, mac } = mapOs(os);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = 'https://download.teamviewer.com/download/TeamViewer_Setup_x64.exe';
    fileName = 'TeamViewer_Setup_x64.exe';
  } else if (mac) {
    downloadUrl = 'https://download.teamviewer.com/download/TeamViewer.dmg';
    fileName = 'TeamViewer.dmg';
  } else {
    downloadUrl = 'https://download.teamviewer.com/download/linux/teamviewer_amd64.deb';
    fileName = 'teamviewer_amd64.deb';
  }

  let version = 'latest';
  try {
    const resp = await fetch(downloadUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const vMatch = resp.url.match(/(\d+\.\d+\.\d+)/);
    if (vMatch) version = vMatch[1];
  } catch { /* use latest */ }

  return { latestVersion: version, downloadUrl, fileName, os };
};

// ============================================
// Parser: VirtualBox (directory scrape)
// ============================================
const virtualboxParser: ParserFn = async (_tmpl, os, _arch) => {
  const html = await fetchText('https://download.virtualbox.org/virtualbox/');
  const versions = [...html.matchAll(/href="(\d+\.\d+\.\d+)\/"/g)]
    .map((m) => m[1])
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) { if (pa[i] !== pb[i]) return pb[i] - pa[i]; }
      return 0;
    });

  const version = versions[0];
  if (!version) throw new Error('Could not find VirtualBox version');

  const { win, mac } = mapOs(os);

  // Fetch the version-specific page to find exact filenames
  let fileName: string;
  let downloadUrl: string;
  if (win) {
    fileName = `VirtualBox-${version}-Win.exe`;
    // VirtualBox uses build numbers, try to find exact file
    try {
      const versionHtml = await fetchText(`https://download.virtualbox.org/virtualbox/${version}/`);
      const winMatch = versionHtml.match(/href="(VirtualBox-[\d.]+-\d+-Win\.exe)"/);
      if (winMatch) fileName = winMatch[1];
    } catch { /* use guessed name */ }
    downloadUrl = `https://download.virtualbox.org/virtualbox/${version}/${fileName}`;
  } else if (mac) {
    fileName = `VirtualBox-${version}-macOS.dmg`;
    try {
      const versionHtml = await fetchText(`https://download.virtualbox.org/virtualbox/${version}/`);
      const macMatch = versionHtml.match(/href="(VirtualBox-[\d.]+-\d+-(macOS|OSX)\.dmg)"/i);
      if (macMatch) fileName = macMatch[1];
    } catch {}
    downloadUrl = `https://download.virtualbox.org/virtualbox/${version}/${fileName}`;
  } else {
    // Linux .deb filenames include build number and distro; scrape the directory listing
    fileName = `virtualbox-${version}_amd64.deb`;
    try {
      const versionHtml = await fetchText(`https://download.virtualbox.org/virtualbox/${version}/`);
      // Match patterns like: virtualbox-7.2_7.2.6-166999~Ubuntu~noble_amd64.deb
      const linuxMatch = versionHtml.match(/href="(virtualbox-[\d.]+_[\d.]+-\d+~[^"]*_amd64\.deb)"/i);
      if (linuxMatch) fileName = linuxMatch[1];
    } catch { /* use guessed name */ }
    downloadUrl = `https://download.virtualbox.org/virtualbox/${version}/${fileName}`;
  }

  return { latestVersion: version, downloadUrl, fileName, os };
};

// ============================================
// Parser: FileZilla (HTML scrape)
// ============================================
const filezillaParser: ParserFn = async (_tmpl, os, _arch) => {
  const { win, mac } = mapOs(os);

  // Get version from the download page
  let version = 'latest';
  try {
    const html = await fetchText('https://filezilla-project.org/download.php?show_all=1');
    const vMatch = html.match(/FileZilla_(\d+\.\d+[\.\d]*)/);
    if (vMatch) version = vMatch[1];
  } catch {}

  // Use SourceForge mirror which doesn't require tokens
  let downloadUrl: string;
  let fileName: string;
  if (version !== 'latest') {
    if (win) {
      fileName = `FileZilla_${version}_win64-setup.exe`;
      downloadUrl = `https://sourceforge.net/projects/filezilla/files/FileZilla_Client/${version}/${fileName}/download`;
    } else if (mac) {
      fileName = `FileZilla_${version}_macosx-x86.app.tar.bz2`;
      downloadUrl = `https://sourceforge.net/projects/filezilla/files/FileZilla_Client/${version}/${fileName}/download`;
    } else {
      fileName = `FileZilla_${version}_x86_64-linux-gnu.tar.xz`;
      downloadUrl = `https://sourceforge.net/projects/filezilla/files/FileZilla_Client/${version}/${fileName}/download`;
    }
  } else {
    downloadUrl = 'https://sourceforge.net/projects/filezilla/files/latest/download';
    fileName = win ? 'FileZilla-setup.exe' : mac ? 'FileZilla.tar.bz2' : 'FileZilla-linux.tar.xz';
  }

  return { latestVersion: version, downloadUrl, fileName, os };
};

// ============================================
// Parser: Docker Desktop (direct download)
// ============================================
const dockerParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe';
    fileName = 'Docker Desktop Installer.exe';
  } else if (mac) {
    downloadUrl = arm64
      ? 'https://desktop.docker.com/mac/main/arm64/Docker.dmg'
      : 'https://desktop.docker.com/mac/main/amd64/Docker.dmg';
    fileName = 'Docker.dmg';
  } else {
    downloadUrl = 'https://desktop.docker.com/linux/main/amd64/docker-desktop-amd64.deb';
    fileName = 'docker-desktop-amd64.deb';
  }

  // Get version from Docker's appcast feed
  let version = 'latest';
  try {
    const xml = await fetchText('https://desktop.docker.com/win/main/amd64/appcast.xml');
    const vMatch = xml.match(/sparkle:shortVersionString="(\d+\.\d+\.\d+)"/);
    if (vMatch) version = vMatch[1];
  } catch {}

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser: Wireshark (directory scrape)
// ============================================
const wiresharkParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  // Get version from their download page
  let version = 'latest';
  try {
    const html = await fetchText('https://www.wireshark.org/download.html');
    const vMatch = html.match(/Wireshark[- ]*(\d+\.\d+\.\d+)/i) || html.match(/(\d+\.\d+\.\d+)/);
    if (vMatch) version = vMatch[1];
  } catch {}

  let downloadUrl: string;
  let fileName: string;
  if (version !== 'latest') {
    if (win) {
      fileName = arm64 ? `Wireshark-${version}-arm64.exe` : `Wireshark-${version}-x64.exe`;
      downloadUrl = `https://www.wireshark.org/download/win64/${fileName}`;
    } else if (mac) {
      fileName = `Wireshark ${version}.dmg`;
      downloadUrl = `https://www.wireshark.org/download/osx/${encodeURIComponent(fileName)}`;
    } else {
      fileName = `wireshark_${version}-1_amd64.deb`;
      downloadUrl = `https://www.wireshark.org/download/src/wireshark-${version}.tar.xz`;
    }
  } else {
    downloadUrl = 'https://www.wireshark.org/download.html';
    fileName = 'wireshark-installer';
  }

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser: Opera (directory scrape)
// ============================================
const operaParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  // Probe known version candidates via CDN mirror (ftp.opera.com unreachable from some networks)
  const cdnBase = 'https://download3.operacdn.com/ftp/pub/opera/desktop';
  let version: string | null = null;
  const candidates = ['127.0.5778.14', '127.0.5778.11', '126.0.5750.59', '126.0.5750.43'];
  for (const v of candidates) {
    try {
      const testFile = `Opera_${v}_Autoupdate_x64.exe`;
      const resp = await fetch(`${cdnBase}/${v}/win/${testFile}`, {
        method: 'HEAD', signal: AbortSignal.timeout(8000),
      });
      if (resp.ok && parseInt(resp.headers.get('content-length') || '0') > 1000000) {
        version = v;
        break;
      }
    } catch { continue; }
  }

  if (!version) throw new Error('Could not find Opera version');

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    fileName = arm64 ? `Opera_${version}_Autoupdate_arm64.exe` : `Opera_${version}_Autoupdate_x64.exe`;
    downloadUrl = `${cdnBase}/${version}/win/${fileName}`;
  } else if (mac) {
    fileName = `Opera_${version}_Setup.dmg`;
    downloadUrl = `${cdnBase}/${version}/mac/${fileName}`;
  } else {
    fileName = `opera-stable_${version}_amd64.deb`;
    downloadUrl = `${cdnBase}/${version}/linux/${fileName}`;
  }

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser: WinRAR (HTML scrape)
// ============================================
const winrarParser: ParserFn = async (_tmpl, os, arch) => {
  const html = await fetchText('https://www.rarlab.com/download.htm');
  const { arm64 } = mapArch(arch);

  // Version is in filename like winrar-x64-720
  const vMatch = html.match(/winrar-x64-(\d+)/);
  if (!vMatch) throw new Error('Could not find WinRAR version');
  const vCompact = vMatch[1]; // e.g. "720"
  const version = vCompact.length === 3
    ? `${vCompact[0]}.${vCompact.slice(1)}` // "720" → "7.20"
    : `${vCompact.slice(0, 2)}.${vCompact.slice(2)}`; // "7100" → "71.00"

  const fileName = arm64 ? `winrar-arm-${vCompact}.exe` : `winrar-x64-${vCompact}.exe`;
  const downloadUrl = `https://www.rarlab.com/rar/${fileName}`;

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser: Anaconda (directory scrape)
// ============================================
const anacondaParser: ParserFn = async (_tmpl, os, arch) => {
  const html = await fetchText('https://repo.anaconda.com/archive/');
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  // Find latest Anaconda3 version
  let pattern: RegExp;
  if (win) {
    pattern = /href="(Anaconda3-([\d.]+)-Windows-x86_64\.exe)"/g;
  } else if (mac) {
    pattern = arm64
      ? /href="(Anaconda3-([\d.]+)-MacOSX-arm64\.pkg)"/g
      : /href="(Anaconda3-([\d.]+)-MacOSX-x86_64\.pkg)"/g;
  } else {
    pattern = /href="(Anaconda3-([\d.]+)-Linux-x86_64\.sh)"/g;
  }

  const matches = [...html.matchAll(pattern)];
  if (matches.length === 0) throw new Error('No Anaconda version found');

  // Get the last match (latest)
  const lastMatch = matches[matches.length - 1];
  const fileName = lastMatch[1];
  const version = lastMatch[2];

  return {
    latestVersion: version,
    downloadUrl: `https://repo.anaconda.com/archive/${fileName}`,
    fileName,
    os,
    architecture: arm64 ? 'arm64' : 'x64',
  };
};

// ============================================
// Parser: AWS CLI (direct download, known URLs)
// ============================================
const awscliParser: ParserFn = async (_tmpl, os, _arch) => {
  const { win, mac } = mapOs(os);

  let downloadUrl: string;
  let fileName: string;
  if (win) {
    downloadUrl = 'https://awscli.amazonaws.com/AWSCLIV2.msi';
    fileName = 'AWSCLIV2.msi';
  } else if (mac) {
    downloadUrl = 'https://awscli.amazonaws.com/AWSCLIV2.pkg';
    fileName = 'AWSCLIV2.pkg';
  } else {
    downloadUrl = 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip';
    fileName = 'awscli-exe-linux-x86_64.zip';
  }

  // Resolve version
  let version = 'latest';
  try {
    const changelog = await fetchText('https://raw.githubusercontent.com/aws/aws-cli/v2/CHANGELOG.rst');
    const vMatch = changelog.match(/^(\d+\.\d+\.\d+)/m);
    if (vMatch) version = vMatch[1];
  } catch {}

  return { latestVersion: version, downloadUrl, fileName, os };
};

// ============================================
// Parser: .NET Runtime (releases API)
// ============================================
const dotnetParser: ParserFn = async (_tmpl, os, arch) => {
  const { win, mac } = mapOs(os);
  const { arm64 } = mapArch(arch);

  // Use the releases index API
  const data = await fetchJson('https://dotnetcli.blob.core.windows.net/dotnet/release-metadata/releases-index.json');
  // Find latest LTS
  const lts = data['releases-index']?.find((r: any) => r['support-phase'] === 'active');
  if (!lts) throw new Error('No .NET LTS release found');

  const channel = lts['channel-version']; // e.g. "8.0"
  const version = lts['latest-runtime']; // e.g. "8.0.12"

  const rid = win ? (arm64 ? 'win-arm64' : 'win-x64') :
    mac ? (arm64 ? 'osx-arm64' : 'osx-x64') :
    (arm64 ? 'linux-arm64' : 'linux-x64');

  const ext = win ? '.exe' : mac ? '.pkg' : '.tar.gz';
  const fileName = `dotnet-runtime-${version}-${rid}${ext}`;
  const downloadUrl = `https://dotnetcli.blob.core.windows.net/dotnet/Runtime/${version}/${fileName}`;

  return { latestVersion: version, downloadUrl, fileName, os, architecture: arm64 ? 'arm64' : 'x64' };
};

// ============================================
// Parser Registry
// ============================================
const parsers: Record<string, ParserFn> = {
  'nodejs': nodejsParser,
  'golang': golangParser,
  'python': pythonParser,
  'temurin': temurinParser,
  '7zip': sevenZipParser,
  'github-releases': githubReleasesParser,
  'vscode': vscodeParser,
  'firefox': firefoxParser,
  'vlc': vlcParser,
  'discord': discordParser,
  'postman': postmanParser,
  'brave': braveParser,
  'slack': slackParser,
  'teams': teamsParser,
  'anydesk': anydeskParser,
  'teamviewer': teamviewerParser,
  'virtualbox': virtualboxParser,
  'filezilla': filezillaParser,
  'docker': dockerParser,
  'wireshark': wiresharkParser,
  'opera': operaParser,
  'winrar': winrarParser,
  'anaconda': anacondaParser,
  'awscli': awscliParser,
  'dotnet': dotnetParser,
};

export async function fetchLatestVersion(
  template: SoftwareTemplate,
  os: string,
  arch: string = 'x64'
): Promise<VendorFetchResult> {
  const parser = parsers[template.parserId];
  if (!parser) {
    throw new Error(`No parser available for "${template.parserId}"`);
  }
  return parser(template, os, arch);
}
