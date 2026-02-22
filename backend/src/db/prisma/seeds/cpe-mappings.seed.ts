/**
 * CPE Mapping Seed Data
 *
 * Phase 6: Seed CPE Mappings
 *
 * Maps agent-reported software names to CPE vendor/product identifiers
 * for accurate vulnerability correlation.
 *
 * Sources:
 * - NVD CPE Dictionary
 * - Common package manager naming conventions
 * - Observed agent reports
 */

export interface CpeMappingSeed {
  agentName: string;
  agentVendor?: string | null;
  platform?: string | null;
  packageManager?: string | null;
  cpeVendor: string;
  cpeProduct: string;
  confidence?: number;
  notes?: string;
}

export const CPE_MAPPINGS: CpeMappingSeed[] = [
  // ============================================
  // Web Browsers
  // ============================================

  // Google Chrome
  { agentName: 'Google Chrome', agentVendor: 'Google LLC', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'all', confidence: 1.0 },
  { agentName: 'Google Chrome', agentVendor: 'Google', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'all', confidence: 1.0 },
  { agentName: 'Google Chrome', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'all', confidence: 0.95 },
  { agentName: 'chrome', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'linux', confidence: 0.9 },
  { agentName: 'chromium', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'linux', confidence: 0.85 },
  { agentName: 'chromium-browser', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'linux', packageManager: 'dpkg', confidence: 0.85 },
  { agentName: 'chromium-browser', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'linux', packageManager: 'rpm', confidence: 0.85 },

  // Microsoft Edge
  { agentName: 'Microsoft Edge', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'edge', platform: 'all', confidence: 1.0 },
  { agentName: 'Microsoft Edge', agentVendor: 'Microsoft', cpeVendor: 'microsoft', cpeProduct: 'edge', platform: 'all', confidence: 1.0 },
  { agentName: 'microsoft-edge-stable', cpeVendor: 'microsoft', cpeProduct: 'edge', platform: 'linux', confidence: 0.95 },

  // Mozilla Firefox
  { agentName: 'Mozilla Firefox', agentVendor: 'Mozilla', cpeVendor: 'mozilla', cpeProduct: 'firefox', platform: 'all', confidence: 1.0 },
  { agentName: 'Mozilla Firefox', agentVendor: 'Mozilla Corporation', cpeVendor: 'mozilla', cpeProduct: 'firefox', platform: 'all', confidence: 1.0 },
  { agentName: 'Firefox', agentVendor: 'Mozilla', cpeVendor: 'mozilla', cpeProduct: 'firefox', platform: 'all', confidence: 1.0 },
  { agentName: 'Firefox', cpeVendor: 'mozilla', cpeProduct: 'firefox', platform: 'all', confidence: 0.95 },
  { agentName: 'firefox', agentVendor: 'Mozilla Foundation', cpeVendor: 'mozilla', cpeProduct: 'firefox', platform: 'linux', confidence: 1.0 },
  { agentName: 'firefox', cpeVendor: 'mozilla', cpeProduct: 'firefox', platform: 'linux', confidence: 0.95 },
  { agentName: 'firefox-esr', cpeVendor: 'mozilla', cpeProduct: 'firefox_esr', platform: 'linux', confidence: 0.95 },

  // Safari
  { agentName: 'Safari', agentVendor: 'Apple Inc.', cpeVendor: 'apple', cpeProduct: 'safari', platform: 'darwin', confidence: 1.0 },
  { agentName: 'Safari', agentVendor: 'Apple', cpeVendor: 'apple', cpeProduct: 'safari', platform: 'darwin', confidence: 1.0 },

  // ============================================
  // SSL/TLS Libraries
  // ============================================

  // OpenSSL
  { agentName: 'OpenSSL', agentVendor: 'OpenSSL Project', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'all', confidence: 1.0 },
  { agentName: 'openssl', agentVendor: 'OpenSSL Project', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'all', confidence: 1.0 },
  { agentName: 'openssl', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'all', confidence: 1.0 },
  { agentName: 'OpenSSL', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'all', confidence: 1.0 },
  { agentName: 'libssl', agentVendor: 'OpenSSL Project', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'linux', confidence: 1.0 },
  { agentName: 'libssl3', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'libssl1.1', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'libssl1.0.0', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'openssl-libs', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'linux', packageManager: 'rpm', confidence: 0.95 },
  { agentName: 'openssl-devel', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'linux', packageManager: 'rpm', confidence: 0.9 },
  { agentName: 'libssl-dev', cpeVendor: 'openssl', cpeProduct: 'openssl', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },

  // LibreSSL (OpenBSD fork)
  { agentName: 'libressl', cpeVendor: 'openbsd', cpeProduct: 'libressl', platform: 'all', confidence: 1.0 },

  // ============================================
  // cURL
  // ============================================

  { agentName: 'curl', cpeVendor: 'haxx', cpeProduct: 'curl', platform: 'all', confidence: 1.0 },
  { agentName: 'cURL', cpeVendor: 'haxx', cpeProduct: 'curl', platform: 'all', confidence: 1.0 },
  { agentName: 'libcurl4', cpeVendor: 'haxx', cpeProduct: 'curl', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'libcurl4-openssl-dev', cpeVendor: 'haxx', cpeProduct: 'curl', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },
  { agentName: 'libcurl3', cpeVendor: 'haxx', cpeProduct: 'curl', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'libcurl', cpeVendor: 'haxx', cpeProduct: 'curl', platform: 'linux', packageManager: 'rpm', confidence: 0.95 },
  { agentName: 'curl-minimal', cpeVendor: 'haxx', cpeProduct: 'curl', platform: 'linux', packageManager: 'rpm', confidence: 0.9 },

  // ============================================
  // Web Servers
  // ============================================

  // nginx
  { agentName: 'nginx', cpeVendor: 'f5', cpeProduct: 'nginx', platform: 'all', confidence: 1.0 },
  { agentName: 'nginx-core', cpeVendor: 'f5', cpeProduct: 'nginx', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'nginx-common', cpeVendor: 'f5', cpeProduct: 'nginx', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },
  { agentName: 'nginx-full', cpeVendor: 'f5', cpeProduct: 'nginx', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'nginx-light', cpeVendor: 'f5', cpeProduct: 'nginx', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },

  // Apache HTTP Server
  { agentName: 'apache2', cpeVendor: 'apache', cpeProduct: 'http_server', platform: 'linux', packageManager: 'dpkg', confidence: 1.0 },
  { agentName: 'apache2-bin', cpeVendor: 'apache', cpeProduct: 'http_server', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'httpd', cpeVendor: 'apache', cpeProduct: 'http_server', platform: 'linux', packageManager: 'rpm', confidence: 1.0 },
  { agentName: 'Apache HTTP Server', cpeVendor: 'apache', cpeProduct: 'http_server', platform: 'all', confidence: 1.0 },

  // ============================================
  // Databases
  // ============================================

  // PostgreSQL
  { agentName: 'postgresql', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'all', confidence: 1.0 },
  { agentName: 'PostgreSQL', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'all', confidence: 1.0 },
  { agentName: 'postgresql-16', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'linux', confidence: 0.95 },
  { agentName: 'postgresql-15', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'linux', confidence: 0.95 },
  { agentName: 'postgresql-14', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'linux', confidence: 0.95 },
  { agentName: 'postgresql-13', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'linux', confidence: 0.95 },
  { agentName: 'postgresql-client', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'linux', confidence: 0.9 },
  { agentName: 'libpq5', cpeVendor: 'postgresql', cpeProduct: 'postgresql', platform: 'linux', packageManager: 'dpkg', confidence: 0.85 },

  // MySQL
  { agentName: 'mysql', cpeVendor: 'oracle', cpeProduct: 'mysql', platform: 'all', confidence: 1.0 },
  { agentName: 'MySQL', cpeVendor: 'oracle', cpeProduct: 'mysql', platform: 'all', confidence: 1.0 },
  { agentName: 'mysql-server', cpeVendor: 'oracle', cpeProduct: 'mysql', platform: 'linux', confidence: 1.0 },
  { agentName: 'mysql-client', cpeVendor: 'oracle', cpeProduct: 'mysql', platform: 'linux', confidence: 0.9 },
  { agentName: 'mysql-community-server', cpeVendor: 'oracle', cpeProduct: 'mysql', platform: 'linux', packageManager: 'rpm', confidence: 1.0 },
  { agentName: 'libmysqlclient21', cpeVendor: 'oracle', cpeProduct: 'mysql', platform: 'linux', packageManager: 'dpkg', confidence: 0.85 },

  // MariaDB
  { agentName: 'mariadb', cpeVendor: 'mariadb', cpeProduct: 'mariadb', platform: 'all', confidence: 1.0 },
  { agentName: 'MariaDB', cpeVendor: 'mariadb', cpeProduct: 'mariadb', platform: 'all', confidence: 1.0 },
  { agentName: 'mariadb-server', cpeVendor: 'mariadb', cpeProduct: 'mariadb', platform: 'linux', confidence: 1.0 },
  { agentName: 'mariadb-client', cpeVendor: 'mariadb', cpeProduct: 'mariadb', platform: 'linux', confidence: 0.9 },

  // Redis
  { agentName: 'redis', cpeVendor: 'redis', cpeProduct: 'redis', platform: 'all', confidence: 1.0 },
  { agentName: 'Redis', cpeVendor: 'redis', cpeProduct: 'redis', platform: 'all', confidence: 1.0 },
  { agentName: 'redis-server', cpeVendor: 'redis', cpeProduct: 'redis', platform: 'linux', confidence: 1.0 },
  { agentName: 'redis-tools', cpeVendor: 'redis', cpeProduct: 'redis', platform: 'linux', confidence: 0.9 },

  // MongoDB
  { agentName: 'mongodb', cpeVendor: 'mongodb', cpeProduct: 'mongodb', platform: 'all', confidence: 1.0 },
  { agentName: 'MongoDB', cpeVendor: 'mongodb', cpeProduct: 'mongodb', platform: 'all', confidence: 1.0 },
  { agentName: 'mongodb-org-server', cpeVendor: 'mongodb', cpeProduct: 'mongodb', platform: 'linux', confidence: 1.0 },
  { agentName: 'mongod', cpeVendor: 'mongodb', cpeProduct: 'mongodb', platform: 'linux', confidence: 0.95 },

  // SQLite
  { agentName: 'sqlite3', cpeVendor: 'sqlite', cpeProduct: 'sqlite', platform: 'all', confidence: 1.0 },
  { agentName: 'libsqlite3-0', cpeVendor: 'sqlite', cpeProduct: 'sqlite', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },

  // ============================================
  // Programming Languages & Runtimes
  // ============================================

  // Node.js
  { agentName: 'Node.js', agentVendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js', platform: 'all', confidence: 1.0 },
  { agentName: 'nodejs', agentVendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js', platform: 'all', confidence: 1.0 },
  { agentName: 'node', agentVendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js', platform: 'all', confidence: 1.0 },
  { agentName: 'nodejs', cpeVendor: 'nodejs', cpeProduct: 'node.js', platform: 'all', confidence: 1.0 },
  { agentName: 'Node.js', cpeVendor: 'nodejs', cpeProduct: 'node.js', platform: 'all', confidence: 1.0 },
  { agentName: 'node', cpeVendor: 'nodejs', cpeProduct: 'node.js', platform: 'all', confidence: 0.95 },

  // Python
  { agentName: 'python3', cpeVendor: 'python', cpeProduct: 'python', platform: 'linux', confidence: 1.0 },
  { agentName: 'python', cpeVendor: 'python', cpeProduct: 'python', platform: 'all', confidence: 1.0 },
  { agentName: 'Python', agentVendor: 'Python Software Foundation', cpeVendor: 'python', cpeProduct: 'python', platform: 'all', confidence: 1.0 },
  { agentName: 'python3.11', cpeVendor: 'python', cpeProduct: 'python', platform: 'linux', confidence: 0.95 },
  { agentName: 'python3.10', cpeVendor: 'python', cpeProduct: 'python', platform: 'linux', confidence: 0.95 },
  { agentName: 'python3.9', cpeVendor: 'python', cpeProduct: 'python', platform: 'linux', confidence: 0.95 },
  { agentName: 'python3.8', cpeVendor: 'python', cpeProduct: 'python', platform: 'linux', confidence: 0.95 },
  { agentName: 'libpython3.11', cpeVendor: 'python', cpeProduct: 'python', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },

  // Java/OpenJDK
  { agentName: 'openjdk', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'all', confidence: 0.95 },
  { agentName: 'OpenJDK', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'all', confidence: 0.95 },
  { agentName: 'openjdk-21-jre', cpeVendor: 'oracle', cpeProduct: 'jre', platform: 'linux', confidence: 0.95 },
  { agentName: 'openjdk-17-jre', cpeVendor: 'oracle', cpeProduct: 'jre', platform: 'linux', confidence: 0.95 },
  { agentName: 'openjdk-11-jre', cpeVendor: 'oracle', cpeProduct: 'jre', platform: 'linux', confidence: 0.95 },
  { agentName: 'openjdk-21-jdk', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'linux', confidence: 0.95 },
  { agentName: 'openjdk-17-jdk', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'linux', confidence: 0.95 },
  { agentName: 'openjdk-11-jdk', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'linux', confidence: 0.95 },
  { agentName: 'java-21-openjdk', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'linux', packageManager: 'rpm', confidence: 0.95 },
  { agentName: 'java-17-openjdk', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'linux', packageManager: 'rpm', confidence: 0.95 },
  { agentName: 'java-11-openjdk', cpeVendor: 'oracle', cpeProduct: 'jdk', platform: 'linux', packageManager: 'rpm', confidence: 0.95 },

  // PHP
  { agentName: 'php', cpeVendor: 'php', cpeProduct: 'php', platform: 'all', confidence: 1.0 },
  { agentName: 'PHP', cpeVendor: 'php', cpeProduct: 'php', platform: 'all', confidence: 1.0 },
  { agentName: 'php8.2', cpeVendor: 'php', cpeProduct: 'php', platform: 'linux', confidence: 0.95 },
  { agentName: 'php8.1', cpeVendor: 'php', cpeProduct: 'php', platform: 'linux', confidence: 0.95 },
  { agentName: 'php8.0', cpeVendor: 'php', cpeProduct: 'php', platform: 'linux', confidence: 0.95 },
  { agentName: 'php-fpm', cpeVendor: 'php', cpeProduct: 'php', platform: 'linux', confidence: 0.95 },
  { agentName: 'libphp8.2', cpeVendor: 'php', cpeProduct: 'php', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },

  // Ruby
  { agentName: 'ruby', cpeVendor: 'ruby-lang', cpeProduct: 'ruby', platform: 'all', confidence: 1.0 },
  { agentName: 'Ruby', cpeVendor: 'ruby-lang', cpeProduct: 'ruby', platform: 'all', confidence: 1.0 },
  { agentName: 'ruby3.2', cpeVendor: 'ruby-lang', cpeProduct: 'ruby', platform: 'linux', confidence: 0.95 },
  { agentName: 'ruby3.1', cpeVendor: 'ruby-lang', cpeProduct: 'ruby', platform: 'linux', confidence: 0.95 },
  { agentName: 'ruby3.0', cpeVendor: 'ruby-lang', cpeProduct: 'ruby', platform: 'linux', confidence: 0.95 },

  // Go
  { agentName: 'golang', cpeVendor: 'golang', cpeProduct: 'go', platform: 'all', confidence: 1.0 },
  { agentName: 'go', cpeVendor: 'golang', cpeProduct: 'go', platform: 'all', confidence: 0.95 },
  { agentName: 'golang-go', cpeVendor: 'golang', cpeProduct: 'go', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },

  // Rust
  { agentName: 'rust', cpeVendor: 'rust-lang', cpeProduct: 'rust', platform: 'all', confidence: 1.0 },
  { agentName: 'rustc', cpeVendor: 'rust-lang', cpeProduct: 'rust', platform: 'all', confidence: 0.95 },

  // ============================================
  // SSH/Security Tools
  // ============================================

  // OpenSSH
  { agentName: 'openssh', cpeVendor: 'openbsd', cpeProduct: 'openssh', platform: 'all', confidence: 1.0 },
  { agentName: 'OpenSSH', cpeVendor: 'openbsd', cpeProduct: 'openssh', platform: 'all', confidence: 1.0 },
  { agentName: 'openssh-client', cpeVendor: 'openbsd', cpeProduct: 'openssh', platform: 'linux', packageManager: 'dpkg', confidence: 1.0 },
  { agentName: 'openssh-server', cpeVendor: 'openbsd', cpeProduct: 'openssh', platform: 'linux', packageManager: 'dpkg', confidence: 1.0 },
  { agentName: 'openssh-clients', cpeVendor: 'openbsd', cpeProduct: 'openssh', platform: 'linux', packageManager: 'rpm', confidence: 1.0 },
  { agentName: 'openssh-server', cpeVendor: 'openbsd', cpeProduct: 'openssh', platform: 'linux', packageManager: 'rpm', confidence: 1.0 },

  // sudo
  { agentName: 'sudo', cpeVendor: 'sudo_project', cpeProduct: 'sudo', platform: 'all', confidence: 1.0 },

  // GnuPG
  { agentName: 'gnupg', cpeVendor: 'gnupg', cpeProduct: 'gnupg', platform: 'all', confidence: 1.0 },
  { agentName: 'gnupg2', cpeVendor: 'gnupg', cpeProduct: 'gnupg', platform: 'linux', confidence: 0.95 },
  { agentName: 'gpg', cpeVendor: 'gnupg', cpeProduct: 'gnupg', platform: 'all', confidence: 0.9 },

  // ============================================
  // Compression Libraries
  // ============================================

  // zlib
  { agentName: 'zlib', cpeVendor: 'zlib', cpeProduct: 'zlib', platform: 'all', confidence: 1.0 },
  { agentName: 'zlib1g', cpeVendor: 'zlib', cpeProduct: 'zlib', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
  { agentName: 'zlib-devel', cpeVendor: 'zlib', cpeProduct: 'zlib', platform: 'linux', packageManager: 'rpm', confidence: 0.9 },

  // xz/lzma
  { agentName: 'xz-utils', cpeVendor: 'tukaani', cpeProduct: 'xz', platform: 'linux', packageManager: 'dpkg', confidence: 1.0 },
  { agentName: 'xz', cpeVendor: 'tukaani', cpeProduct: 'xz', platform: 'linux', packageManager: 'rpm', confidence: 1.0 },
  { agentName: 'liblzma5', cpeVendor: 'tukaani', cpeProduct: 'xz', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },

  // bzip2
  { agentName: 'bzip2', cpeVendor: 'bzip', cpeProduct: 'bzip2', platform: 'all', confidence: 1.0 },
  { agentName: 'libbz2-1.0', cpeVendor: 'bzip', cpeProduct: 'bzip2', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },

  // ============================================
  // XML/JSON Libraries
  // ============================================

  // libxml2
  { agentName: 'libxml2', cpeVendor: 'xmlsoft', cpeProduct: 'libxml2', platform: 'all', confidence: 1.0 },
  { agentName: 'libxml2-dev', cpeVendor: 'xmlsoft', cpeProduct: 'libxml2', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },

  // expat
  { agentName: 'expat', cpeVendor: 'libexpat_project', cpeProduct: 'libexpat', platform: 'all', confidence: 1.0 },
  { agentName: 'libexpat1', cpeVendor: 'libexpat_project', cpeProduct: 'libexpat', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },

  // ============================================
  // Container & Orchestration
  // ============================================

  // Docker
  { agentName: 'docker', cpeVendor: 'docker', cpeProduct: 'docker', platform: 'all', confidence: 1.0 },
  { agentName: 'Docker', cpeVendor: 'docker', cpeProduct: 'docker', platform: 'all', confidence: 1.0 },
  { agentName: 'docker-ce', cpeVendor: 'docker', cpeProduct: 'docker', platform: 'linux', confidence: 1.0 },
  { agentName: 'docker-ce-cli', cpeVendor: 'docker', cpeProduct: 'docker', platform: 'linux', confidence: 0.95 },
  { agentName: 'containerd.io', cpeVendor: 'linuxfoundation', cpeProduct: 'containerd', platform: 'linux', confidence: 1.0 },

  // Kubernetes
  { agentName: 'kubectl', cpeVendor: 'kubernetes', cpeProduct: 'kubernetes', platform: 'all', confidence: 0.9 },
  { agentName: 'kubelet', cpeVendor: 'kubernetes', cpeProduct: 'kubernetes', platform: 'linux', confidence: 0.95 },
  { agentName: 'kubeadm', cpeVendor: 'kubernetes', cpeProduct: 'kubernetes', platform: 'linux', confidence: 0.9 },

  // ============================================
  // System Libraries (glibc, etc.)
  // ============================================

  // glibc
  { agentName: 'libc6', cpeVendor: 'gnu', cpeProduct: 'glibc', platform: 'linux', packageManager: 'dpkg', confidence: 1.0 },
  { agentName: 'glibc', cpeVendor: 'gnu', cpeProduct: 'glibc', platform: 'linux', packageManager: 'rpm', confidence: 1.0 },
  { agentName: 'glibc-common', cpeVendor: 'gnu', cpeProduct: 'glibc', platform: 'linux', packageManager: 'rpm', confidence: 0.95 },

  // systemd
  { agentName: 'systemd', cpeVendor: 'systemd_project', cpeProduct: 'systemd', platform: 'linux', confidence: 1.0 },
  { agentName: 'libsystemd0', cpeVendor: 'systemd_project', cpeProduct: 'systemd', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },

  // ============================================
  // Networking
  // ============================================

  // OpenVPN
  { agentName: 'openvpn', cpeVendor: 'openvpn', cpeProduct: 'openvpn', platform: 'all', confidence: 1.0 },
  { agentName: 'OpenVPN', cpeVendor: 'openvpn', cpeProduct: 'openvpn', platform: 'all', confidence: 1.0 },

  // WireGuard
  { agentName: 'wireguard', cpeVendor: 'wireguard', cpeProduct: 'wireguard', platform: 'all', confidence: 1.0 },
  { agentName: 'wireguard-tools', cpeVendor: 'wireguard', cpeProduct: 'wireguard', platform: 'linux', confidence: 0.95 },

  // ============================================
  // Monitoring & Logging
  // ============================================

  // Grafana
  { agentName: 'grafana', cpeVendor: 'grafana', cpeProduct: 'grafana', platform: 'all', confidence: 1.0 },
  { agentName: 'Grafana', cpeVendor: 'grafana', cpeProduct: 'grafana', platform: 'all', confidence: 1.0 },

  // Prometheus
  { agentName: 'prometheus', cpeVendor: 'prometheus', cpeProduct: 'prometheus', platform: 'all', confidence: 1.0 },

  // Elasticsearch
  { agentName: 'elasticsearch', cpeVendor: 'elastic', cpeProduct: 'elasticsearch', platform: 'all', confidence: 1.0 },
  { agentName: 'Elasticsearch', cpeVendor: 'elastic', cpeProduct: 'elasticsearch', platform: 'all', confidence: 1.0 },

  // Logstash
  { agentName: 'logstash', cpeVendor: 'elastic', cpeProduct: 'logstash', platform: 'all', confidence: 1.0 },

  // Kibana
  { agentName: 'kibana', cpeVendor: 'elastic', cpeProduct: 'kibana', platform: 'all', confidence: 1.0 },

  // ============================================
  // Message Queues
  // ============================================

  // RabbitMQ
  { agentName: 'rabbitmq-server', cpeVendor: 'vmware', cpeProduct: 'rabbitmq', platform: 'linux', confidence: 1.0 },
  { agentName: 'RabbitMQ', cpeVendor: 'vmware', cpeProduct: 'rabbitmq', platform: 'all', confidence: 1.0 },

  // Apache Kafka
  { agentName: 'kafka', cpeVendor: 'apache', cpeProduct: 'kafka', platform: 'all', confidence: 1.0 },

  // ============================================
  // Version Control
  // ============================================

  // Git
  { agentName: 'git', cpeVendor: 'git-scm', cpeProduct: 'git', platform: 'all', confidence: 1.0 },
  { agentName: 'Git', cpeVendor: 'git-scm', cpeProduct: 'git', platform: 'all', confidence: 1.0 },
  { agentName: 'git-core', cpeVendor: 'git-scm', cpeProduct: 'git', platform: 'linux', confidence: 0.95 },

  // ============================================
  // Package Managers
  // ============================================

  // npm (Node)
  { agentName: 'npm', cpeVendor: 'npmjs', cpeProduct: 'npm', platform: 'all', confidence: 1.0 },

  // pip (Python)
  { agentName: 'pip', cpeVendor: 'pypa', cpeProduct: 'pip', platform: 'all', confidence: 1.0 },
  { agentName: 'python3-pip', cpeVendor: 'pypa', cpeProduct: 'pip', platform: 'linux', confidence: 0.95 },

  // ============================================
  // Office & Productivity (Windows)
  // ============================================

  // Microsoft Office
  { agentName: 'Microsoft Office', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'office', platform: 'windows', confidence: 1.0 },
  { agentName: 'Microsoft Word', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'word', platform: 'windows', confidence: 1.0 },
  { agentName: 'Microsoft Excel', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'excel', platform: 'windows', confidence: 1.0 },
  { agentName: 'Microsoft Outlook', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'outlook', platform: 'windows', confidence: 1.0 },
  { agentName: 'Microsoft PowerPoint', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'powerpoint', platform: 'windows', confidence: 1.0 },

  // Adobe products
  { agentName: 'Adobe Acrobat Reader DC', agentVendor: 'Adobe Inc.', cpeVendor: 'adobe', cpeProduct: 'acrobat_reader_dc', platform: 'all', confidence: 1.0 },
  { agentName: 'Adobe Acrobat Reader', agentVendor: 'Adobe', cpeVendor: 'adobe', cpeProduct: 'acrobat_reader', platform: 'all', confidence: 1.0 },
  { agentName: 'Adobe Flash Player', agentVendor: 'Adobe', cpeVendor: 'adobe', cpeProduct: 'flash_player', platform: 'all', confidence: 1.0 },

  // ============================================
  // Virtualization
  // ============================================

  // VirtualBox
  { agentName: 'VirtualBox', agentVendor: 'Oracle Corporation', cpeVendor: 'oracle', cpeProduct: 'vm_virtualbox', platform: 'all', confidence: 1.0 },
  { agentName: 'virtualbox', cpeVendor: 'oracle', cpeProduct: 'vm_virtualbox', platform: 'linux', confidence: 1.0 },

  // VMware
  { agentName: 'VMware Workstation', agentVendor: 'VMware, Inc.', cpeVendor: 'vmware', cpeProduct: 'workstation', platform: 'all', confidence: 1.0 },
  { agentName: 'VMware Player', agentVendor: 'VMware, Inc.', cpeVendor: 'vmware', cpeProduct: 'player', platform: 'all', confidence: 1.0 },

  // QEMU/KVM
  { agentName: 'qemu', cpeVendor: 'qemu', cpeProduct: 'qemu', platform: 'linux', confidence: 1.0 },
  { agentName: 'qemu-kvm', cpeVendor: 'qemu', cpeProduct: 'qemu', platform: 'linux', confidence: 0.95 },
  { agentName: 'qemu-system-x86', cpeVendor: 'qemu', cpeProduct: 'qemu', platform: 'linux', confidence: 0.95 },

  // ============================================
  // Hub Software (PatchIQ Software Packages)
  // ============================================

  // 7-Zip
  { agentName: '7-Zip', agentVendor: 'Igor Pavlov', cpeVendor: '7-zip', cpeProduct: '7-zip', platform: 'windows', confidence: 1.0 },
  { agentName: '7zip', agentVendor: 'Igor Pavlov', cpeVendor: '7-zip', cpeProduct: '7-zip', platform: 'windows', confidence: 1.0 },
  { agentName: '7zip', cpeVendor: '7-zip', cpeProduct: '7-zip', platform: 'all', confidence: 0.95 },
  { agentName: 'p7zip', agentVendor: 'Igor Pavlov', cpeVendor: '7-zip', cpeProduct: '7-zip', platform: 'linux', confidence: 1.0 },
  { agentName: 'p7zip', cpeVendor: '7-zip', cpeProduct: '7-zip', platform: 'linux', confidence: 0.9 },
  { agentName: 'p7zip-full', cpeVendor: '7-zip', cpeProduct: '7-zip', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },

  // VLC Media Player
  { agentName: 'VLC media player', agentVendor: 'VideoLAN', cpeVendor: 'videolan', cpeProduct: 'vlc_media_player', platform: 'all', confidence: 1.0 },
  { agentName: 'VLC', cpeVendor: 'videolan', cpeProduct: 'vlc_media_player', platform: 'all', confidence: 0.95 },
  { agentName: 'vlc', cpeVendor: 'videolan', cpeProduct: 'vlc_media_player', platform: 'linux', confidence: 0.95 },

  // Visual Studio Code
  { agentName: 'Microsoft Visual Studio Code', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'visual_studio_code', platform: 'all', confidence: 1.0 },
  { agentName: 'Visual Studio Code', agentVendor: 'Microsoft', cpeVendor: 'microsoft', cpeProduct: 'visual_studio_code', platform: 'all', confidence: 1.0 },
  { agentName: 'code', cpeVendor: 'microsoft', cpeProduct: 'visual_studio_code', platform: 'linux', confidence: 0.9 },

  // Google Chrome (linux package names)
  { agentName: 'google-chrome-stable', cpeVendor: 'google', cpeProduct: 'chrome', platform: 'linux', packageManager: 'dpkg', confidence: 1.0 },

  // TeamViewer
  { agentName: 'TeamViewer', agentVendor: 'TeamViewer', cpeVendor: 'teamviewer', cpeProduct: 'teamviewer', platform: 'all', confidence: 1.0 },
  { agentName: 'teamviewer', cpeVendor: 'teamviewer', cpeProduct: 'teamviewer', platform: 'linux', confidence: 0.95 },

  // Slack
  { agentName: 'Slack', agentVendor: 'Slack Technologies', cpeVendor: 'slack', cpeProduct: 'slack', platform: 'all', confidence: 0.8, notes: 'Electron app — few NVD CVEs' },
  { agentName: 'slack-desktop', cpeVendor: 'slack', cpeProduct: 'slack', platform: 'linux', confidence: 0.8 },

  // Notepad++
  { agentName: 'Notepad++', agentVendor: 'Notepad++ Team', cpeVendor: 'notepad\\+\\+', cpeProduct: 'notepad\\+\\+', platform: 'windows', confidence: 1.0 },
  { agentName: 'notepad-plus-plus', agentVendor: 'Notepad++ Team', cpeVendor: 'notepad\\+\\+', cpeProduct: 'notepad\\+\\+', platform: 'windows', confidence: 1.0 },
  { agentName: 'Notepad++ (64-bit x64)', agentVendor: 'Notepad++ Team', cpeVendor: 'notepad\\+\\+', cpeProduct: 'notepad\\+\\+', platform: 'windows', confidence: 1.0 },
  { agentName: 'notepadpp', cpeVendor: 'notepad\\+\\+', cpeProduct: 'notepad\\+\\+', platform: 'windows', confidence: 0.95 },

  // ============================================
  // Desktop Applications (from unmatched reports)
  // ============================================

  // Docker Desktop (Windows/macOS installer, distinct from docker-ce)
  { agentName: 'Docker Desktop', agentVendor: 'Docker Inc.', cpeVendor: 'docker', cpeProduct: 'docker_desktop', platform: 'all', confidence: 1.0 },
  { agentName: 'Docker Desktop', agentVendor: 'Docker, Inc.', cpeVendor: 'docker', cpeProduct: 'docker_desktop', platform: 'all', confidence: 1.0 },

  // Microsoft Edge WebView2 Runtime
  { agentName: 'Microsoft Edge WebView2 Runtime', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'edge', platform: 'windows', confidence: 0.85, notes: 'WebView2 shares Edge Chromium engine and CVEs' },

  // Go Programming Language (agent reports long display name)
  { agentName: 'Go Programming Language', agentVendor: 'https://go.dev', cpeVendor: 'golang', cpeProduct: 'go', platform: 'all', confidence: 1.0 },
  { agentName: 'Go Programming Language amd64', agentVendor: 'https://go.dev', cpeVendor: 'golang', cpeProduct: 'go', platform: 'all', confidence: 1.0 },

  // UltraViewer
  { agentName: 'UltraViewer', agentVendor: 'DucFabulous', cpeVendor: 'ultraviewer', cpeProduct: 'ultraviewer', platform: 'windows', confidence: 1.0 },

  // Zoom
  { agentName: 'Zoom', agentVendor: 'Zoom Video Communications, Inc.', cpeVendor: 'zoom', cpeProduct: 'zoom', platform: 'all', confidence: 1.0 },
  { agentName: 'Zoom Workplace', agentVendor: 'Zoom Video Communications, Inc.', cpeVendor: 'zoom', cpeProduct: 'zoom', platform: 'all', confidence: 1.0 },
  { agentName: 'zoom', cpeVendor: 'zoom', cpeProduct: 'zoom', platform: 'linux', confidence: 0.95 },

  // AnyDesk
  { agentName: 'AnyDesk', agentVendor: 'AnyDesk Software GmbH', cpeVendor: 'anydesk', cpeProduct: 'anydesk', platform: 'all', confidence: 1.0 },
  { agentName: 'anydesk', cpeVendor: 'anydesk', cpeProduct: 'anydesk', platform: 'linux', confidence: 0.95 },

  // Discord
  { agentName: 'Discord', agentVendor: 'Discord Inc.', cpeVendor: 'discord', cpeProduct: 'discord', platform: 'all', confidence: 0.8, notes: 'Electron app — few NVD CVEs' },

  // Postman
  { agentName: 'Postman', agentVendor: 'Postman', cpeVendor: 'postman', cpeProduct: 'postman', platform: 'all', confidence: 0.8, notes: 'Electron app — few NVD CVEs' },

  // FileZilla
  { agentName: 'FileZilla Client', agentVendor: 'Tim Kosse', cpeVendor: 'filezilla-project', cpeProduct: 'filezilla_client', platform: 'all', confidence: 1.0 },
  { agentName: 'FileZilla', cpeVendor: 'filezilla-project', cpeProduct: 'filezilla_client', platform: 'all', confidence: 0.95 },
  { agentName: 'filezilla', cpeVendor: 'filezilla-project', cpeProduct: 'filezilla_client', platform: 'linux', confidence: 0.95 },

  // WinSCP
  { agentName: 'WinSCP', agentVendor: 'Martin Prikryl', cpeVendor: 'winscp', cpeProduct: 'winscp', platform: 'windows', confidence: 1.0 },

  // PuTTY
  { agentName: 'PuTTY', agentVendor: 'Simon Tatham', cpeVendor: 'putty', cpeProduct: 'putty', platform: 'windows', confidence: 1.0 },
  { agentName: 'PuTTY release', cpeVendor: 'putty', cpeProduct: 'putty', platform: 'windows', confidence: 0.95 },

  // KeePass
  { agentName: 'KeePass', agentVendor: 'Dominik Reichl', cpeVendor: 'keepass', cpeProduct: 'keepass', platform: 'windows', confidence: 1.0 },
  { agentName: 'KeePassXC', cpeVendor: 'keepassxc', cpeProduct: 'keepassxc', platform: 'all', confidence: 1.0 },

  // Terraform
  { agentName: 'Terraform', agentVendor: 'HashiCorp', cpeVendor: 'hashicorp', cpeProduct: 'terraform', platform: 'all', confidence: 1.0 },
  { agentName: 'terraform', cpeVendor: 'hashicorp', cpeProduct: 'terraform', platform: 'all', confidence: 0.95 },

  // Ansible
  { agentName: 'ansible', cpeVendor: 'redhat', cpeProduct: 'ansible', platform: 'all', confidence: 1.0 },
  { agentName: 'ansible-core', cpeVendor: 'redhat', cpeProduct: 'ansible', platform: 'linux', confidence: 0.95 },

  // Jenkins
  { agentName: 'jenkins', cpeVendor: 'jenkins', cpeProduct: 'jenkins', platform: 'all', confidence: 1.0 },
  { agentName: 'Jenkins', cpeVendor: 'jenkins', cpeProduct: 'jenkins', platform: 'all', confidence: 1.0 },

  // 7-Zip (additional Windows installer variant)
  { agentName: '7-Zip 24.09 (x64)', agentVendor: 'Igor Pavlov', cpeVendor: '7-zip', cpeProduct: '7-zip', platform: 'windows', confidence: 1.0 },

  // ============================================
  // Object Storage & Infrastructure
  // ============================================

  // MinIO
  { agentName: 'minio', cpeVendor: 'minio', cpeProduct: 'minio', platform: 'all', confidence: 1.0 },
  { agentName: 'MinIO', cpeVendor: 'minio', cpeProduct: 'minio', platform: 'all', confidence: 1.0 },

  // etcd
  { agentName: 'etcd', cpeVendor: 'etcd', cpeProduct: 'etcd', platform: 'all', confidence: 1.0 },

  // Consul
  { agentName: 'consul', cpeVendor: 'hashicorp', cpeProduct: 'consul', platform: 'all', confidence: 1.0 },

  // Vault
  { agentName: 'vault', cpeVendor: 'hashicorp', cpeProduct: 'vault', platform: 'all', confidence: 1.0 },

  // ============================================
  // Windows System Components
  // ============================================

  // .NET Framework / Runtime
  { agentName: 'Microsoft .NET Framework', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: '.net_framework', platform: 'windows', confidence: 1.0 },
  { agentName: 'Microsoft .NET Runtime', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: '.net', platform: 'windows', confidence: 1.0 },
  { agentName: 'dotnet-runtime', cpeVendor: 'microsoft', cpeProduct: '.net', platform: 'all', confidence: 0.95 },
  { agentName: 'dotnet-sdk', cpeVendor: 'microsoft', cpeProduct: '.net', platform: 'all', confidence: 0.9 },
  { agentName: 'aspnetcore-runtime', cpeVendor: 'microsoft', cpeProduct: 'asp.net_core', platform: 'all', confidence: 0.95 },

  // Visual C++ Redistributable
  { agentName: 'Microsoft Visual C++ Redistributable', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'visual_c++', platform: 'windows', confidence: 0.9 },

  // Windows Defender
  { agentName: 'Windows Defender', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'windows_defender', platform: 'windows', confidence: 1.0 },

  // PowerShell
  { agentName: 'PowerShell', agentVendor: 'Microsoft Corporation', cpeVendor: 'microsoft', cpeProduct: 'powershell', platform: 'all', confidence: 1.0 },
  { agentName: 'powershell', cpeVendor: 'microsoft', cpeProduct: 'powershell', platform: 'all', confidence: 0.95 },

  // ============================================
  // Additional Enterprise Software
  // ============================================

  // Nginx Unit
  { agentName: 'unit', cpeVendor: 'f5', cpeProduct: 'nginx_unit', platform: 'linux', confidence: 0.85 },

  // HAProxy
  { agentName: 'haproxy', cpeVendor: 'haproxy', cpeProduct: 'haproxy', platform: 'linux', confidence: 1.0 },

  // Traefik
  { agentName: 'traefik', cpeVendor: 'traefik', cpeProduct: 'traefik', platform: 'all', confidence: 1.0 },

  // Tomcat
  { agentName: 'tomcat', cpeVendor: 'apache', cpeProduct: 'tomcat', platform: 'all', confidence: 1.0 },
  { agentName: 'tomcat9', cpeVendor: 'apache', cpeProduct: 'tomcat', platform: 'linux', confidence: 0.95 },
  { agentName: 'tomcat10', cpeVendor: 'apache', cpeProduct: 'tomcat', platform: 'linux', confidence: 0.95 },

  // Samba
  { agentName: 'samba', cpeVendor: 'samba', cpeProduct: 'samba', platform: 'linux', confidence: 1.0 },
  { agentName: 'samba-common', cpeVendor: 'samba', cpeProduct: 'samba', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },

  // BIND DNS
  { agentName: 'bind9', cpeVendor: 'isc', cpeProduct: 'bind', platform: 'linux', packageManager: 'dpkg', confidence: 1.0 },
  { agentName: 'bind', cpeVendor: 'isc', cpeProduct: 'bind', platform: 'linux', packageManager: 'rpm', confidence: 1.0 },

  // Wireshark
  { agentName: 'Wireshark', agentVendor: 'The Wireshark developers', cpeVendor: 'wireshark', cpeProduct: 'wireshark', platform: 'all', confidence: 1.0 },
  { agentName: 'wireshark', cpeVendor: 'wireshark', cpeProduct: 'wireshark', platform: 'linux', confidence: 0.95 },

  // Nmap
  { agentName: 'nmap', cpeVendor: 'nmap', cpeProduct: 'nmap', platform: 'all', confidence: 1.0 },

  // ImageMagick
  { agentName: 'imagemagick', cpeVendor: 'imagemagick', cpeProduct: 'imagemagick', platform: 'all', confidence: 1.0 },
  { agentName: 'libmagickcore', cpeVendor: 'imagemagick', cpeProduct: 'imagemagick', platform: 'linux', packageManager: 'dpkg', confidence: 0.9 },

  // FFmpeg
  { agentName: 'ffmpeg', cpeVendor: 'ffmpeg', cpeProduct: 'ffmpeg', platform: 'all', confidence: 1.0 },
  { agentName: 'libavcodec', cpeVendor: 'ffmpeg', cpeProduct: 'ffmpeg', platform: 'linux', packageManager: 'dpkg', confidence: 0.85 },

  // GIMP
  { agentName: 'GIMP', agentVendor: 'The GIMP Team', cpeVendor: 'gimp', cpeProduct: 'gimp', platform: 'all', confidence: 1.0 },
  { agentName: 'gimp', cpeVendor: 'gimp', cpeProduct: 'gimp', platform: 'linux', confidence: 0.95 },

  // Brave Browser
  { agentName: 'Brave', agentVendor: 'Brave Software Inc', cpeVendor: 'brave', cpeProduct: 'brave', platform: 'all', confidence: 1.0 },
  { agentName: 'brave-browser', cpeVendor: 'brave', cpeProduct: 'brave', platform: 'linux', confidence: 0.95 },

  // Signal
  { agentName: 'Signal', agentVendor: 'Signal Messenger, LLC', cpeVendor: 'signal', cpeProduct: 'signal-desktop', platform: 'all', confidence: 0.8 },

  // Thunderbird
  { agentName: 'Mozilla Thunderbird', agentVendor: 'Mozilla', cpeVendor: 'mozilla', cpeProduct: 'thunderbird', platform: 'all', confidence: 1.0 },
  { agentName: 'thunderbird', cpeVendor: 'mozilla', cpeProduct: 'thunderbird', platform: 'linux', confidence: 0.95 },

  // LibreOffice
  { agentName: 'LibreOffice', agentVendor: 'The Document Foundation', cpeVendor: 'libreoffice', cpeProduct: 'libreoffice', platform: 'all', confidence: 1.0 },
  { agentName: 'libreoffice-core', cpeVendor: 'libreoffice', cpeProduct: 'libreoffice', platform: 'linux', packageManager: 'dpkg', confidence: 0.95 },
];

/**
 * Seed function to add CPE mappings to database
 */
export async function seedCpeMappings(prisma: import('@prisma/client').PrismaClient): Promise<number> {
  let created = 0;

  for (const mapping of CPE_MAPPINGS) {
    try {
      // Check if mapping already exists (handle nullable fields properly)
      const existing = await prisma.cpeMapping.findFirst({
        where: {
          agentName: mapping.agentName,
          agentVendor: mapping.agentVendor || null,
          platform: mapping.platform || null,
          packageManager: mapping.packageManager || null,
        },
      });

      if (existing) {
        // Update existing mapping
        await prisma.cpeMapping.update({
          where: { id: existing.id },
          data: {
            cpeVendor: mapping.cpeVendor,
            cpeProduct: mapping.cpeProduct,
            confidence: mapping.confidence ?? 1.0,
            notes: mapping.notes,
          },
        });
      } else {
        // Create new mapping
        await prisma.cpeMapping.create({
          data: {
            agentName: mapping.agentName,
            agentVendor: mapping.agentVendor || null,
            platform: mapping.platform || null,
            packageManager: mapping.packageManager || null,
            cpeVendor: mapping.cpeVendor,
            cpeProduct: mapping.cpeProduct,
            confidence: mapping.confidence ?? 1.0,
            source: 'seed',
            notes: mapping.notes,
            isActive: true,
          },
        });
      }
      created++;
    } catch (error) {
      // Skip duplicates or constraint violations
      console.warn(`Skipping CPE mapping for "${mapping.agentName}":`, (error as Error).message);
    }
  }

  return created;
}
