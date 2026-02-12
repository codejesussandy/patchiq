/**
 * Network Scanner Utilities
 *
 * Provides CIDR expansion, ping sweep, port scanning,
 * OS/device inference, reverse DNS, and ARP lookup.
 */

import { execFile } from 'child_process';
import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface PingResult {
  ip: string;
  alive: boolean;
  latencyMs?: number;
}

export interface PortResult {
  port: number;
  open: boolean;
}

export const COMMON_PORTS = [22, 80, 135, 443, 445, 3389, 5985, 8080, 8443];

/**
 * Parse CIDR notation into an array of individual IP addresses.
 * Excludes network and broadcast addresses for prefixes <= 30.
 */
export function expandCIDR(cidr: string): string[] {
  const match = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }

  const ipStr = match[1];
  const prefix = parseInt(match[2], 10);

  if (prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix length: /${prefix} (must be 0-32)`);
  }

  const octets = ipStr.split('.');
  for (const octet of octets) {
    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) {
      throw new Error(`Invalid IP octet: ${octet} in ${cidr}`);
    }
  }

  const ipNum = ipToNumber(ipStr);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const hostBits = 32 - prefix;
  const totalHosts = Math.pow(2, hostBits);

  // /32 = single host
  if (prefix === 32) {
    return [numberToIp(network)];
  }

  // /31 = point-to-point link, both addresses usable
  if (prefix === 31) {
    return [numberToIp(network), numberToIp((network + 1) >>> 0)];
  }

  // For /30 and larger, exclude network and broadcast
  const ips: string[] = [];
  for (let i = 1; i < totalHosts - 1; i++) {
    ips.push(numberToIp((network + i) >>> 0));
  }

  return ips;
}

/**
 * Ping sweep a list of IPs using system ping command.
 */
export async function pingSweep(
  ips: string[],
  options?: { timeout?: number; concurrency?: number }
): Promise<PingResult[]> {
  const concurrency = options?.concurrency ?? 50;
  const timeout = options?.timeout ?? 5000;
  const results: PingResult[] = [];

  for (let i = 0; i < ips.length; i += concurrency) {
    const batch = ips.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((ip) => pingHost(ip, timeout))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Scan a list of ports on a single host using TCP connect.
 */
export async function portScan(
  host: string,
  ports: number[],
  options?: { timeout?: number }
): Promise<PortResult[]> {
  const timeout = options?.timeout ?? 3000;

  return Promise.all(
    ports.map((port) => scanPort(host, port, timeout))
  );
}

/**
 * Infer OS from open ports.
 */
export function inferOS(openPorts: number[]): string | null {
  const has = (p: number) => openPorts.includes(p);

  if (has(135) && has(445) && has(3389)) return 'WINDOWS';
  if (has(22) && has(5900)) return 'MACOS';
  if (has(22) && !has(135) && !has(445)) return 'LINUX';

  return null;
}

/**
 * Infer device type from open ports.
 */
export function inferDeviceType(openPorts: number[]): string {
  const has = (p: number) => openPorts.includes(p);

  // SNMP → network device
  if (has(161)) return 'NETWORK_DEVICE';
  // Printer
  if (has(9100)) return 'PRINTER';
  // Multiple web ports → server
  const webPorts = [80, 443, 8080, 8443].filter((p) => has(p));
  if (webPorts.length >= 2) return 'SERVER';
  // RDP + SMB → workstation
  if (has(3389) && has(445)) return 'WORKSTATION';

  return 'UNKNOWN';
}

/**
 * Reverse DNS lookup for an IP address.
 */
export async function reverseDNS(ip: string): Promise<string | null> {
  try {
    const hostnames = await dns.promises.reverse(ip);
    return hostnames[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Get MAC address from ARP table for an IP.
 */
export async function getARPEntry(ip: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('arp', ['-n', ip], { timeout: 5000 });
    // Parse MAC from arp output — formats vary by OS
    // Linux: "192.168.1.1 ether aa:bb:cc:dd:ee:ff C eth0"
    // macOS: "? (192.168.1.1) at aa:bb:cc:dd:ee:ff on en0"
    const macMatch = stdout.match(/([0-9a-fA-F]{1,2}[:-]){5}[0-9a-fA-F]{1,2}/);
    return macMatch ? macMatch[0] : null;
  } catch {
    return null;
  }
}

// ==================== Internal Helpers ====================

function ipToNumber(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join('.');
}

async function pingHost(ip: string, timeout: number): Promise<PingResult> {
  const timeoutSec = Math.max(1, Math.ceil(timeout / 1000));
  // Works on both macOS and Linux
  const args = ['-c', '1', '-W', String(timeoutSec), ip];

  try {
    const startMs = Date.now();
    await execFileAsync('ping', args, { timeout: timeout + 1000 });
    const latencyMs = Date.now() - startMs;
    return { ip, alive: true, latencyMs };
  } catch {
    return { ip, alive: false };
  }
}

function scanPort(host: string, port: number, timeout: number): Promise<PortResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ port, open });
    };

    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}
